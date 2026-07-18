/**
 * MastercamPluginAdapterEngine — Mastercam NET-Hook SDK Bridge (U-CAM89)
 * =========================================================================
 *
 * Adapts PRISMVerificationPluginEngine for Mastercam (X8 through 2025) via:
 *   - NET-Hook SDK DLL: MastercamPRISMHook.dll (.NET assembly loaded by Mastercam)
 *   - Operation Manager tree event subscription (OM_* callbacks)
 *   - Chain/toolpath/tool access via Mastercam.IO namespace
 *
 * Mastercam API Structure:
 *   - Mastercam.App.Application: Root application entry
 *   - Mastercam.IO.OperationsManager: Access operation tree
 *   - Mastercam.Database.Operation: Individual toolpath op
 *   - Mastercam.Database.Tool: Tool definition from tool library
 *   - Mastercam.Database.Chain: Geometry chain for toolpath
 *   - Operation types: 2D (contour, pocket, face, drill), 3D (Surface Rough/Finish,
 *     Dynamic, OptiRough, Area Clearance), Multiaxis (Swarf, Morph, Parallel-to-multi),
 *     Lathe (rough, finish, groove, thread, cutoff), Wire EDM, Router
 *
 * Integration Points:
 *   - NET-Hook load: Register OM event handlers
 *   - Chain selected: Validate geometry before toolpath gen
 *   - Operation added/modified: Physics pre-flight check
 *   - Regen toolpath: Post-calc analysis + overlay injection
 *   - Post processor: Inject PRISM comments into .NC output
 *
 * Mastercam vs Fusion 360:
 *   - NET-Hook (.NET DLL, in-process) vs JSON-RPC WebSocket (out-of-process)
 *   - Dynamic Motion (signature HSM strategy) vs Adaptive Clearing
 *   - Operation Manager tree (GUI + API) vs Fusion browser tree
 *   - Chain-based geometry vs direct face selection
 *
 * References:
 *   - Mastercam NET-Hook SDK Documentation (CNC Software Inc.)
 *   - Mastercam.IO API Reference
 *   - Dynamic Motion Technology whitepaper (HSM / trochoidal)
 *
 * @module engines/MastercamPluginAdapterEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM89
 */

import { z } from "zod";
import { PRISMVerificationPluginEngine } from "./PRISMVerificationPluginEngine.js";

// ── Mastercam Data Schemas ──────────────────────────────────────────────────

export const MCToolSchema = z.object({
  tool_id: z.string(),
  tool_number: z.number(),
  tool_type: z.enum([
    // Milling
    "flat end mill", "ball end mill", "bull nose end mill", "face mill",
    "chamfer mill", "thread mill", "drill", "center drill", "spot drill",
    "tap", "reamer", "boring bar", "probe",
    "lollipop mill", "radius mill", "slot mill", "dovetail mill", "form mill",
    // Lathe
    "lathe general turning", "lathe threading", "lathe grooving",
    "lathe boring", "lathe drilling", "lathe cutoff",
    // Wire EDM
    "wire electrode"
  ]),
  diameter: z.number().positive().describe("Tool diameter in mm"),
  flute_count: z.number().int().positive(),
  flute_length: z.number().positive(),
  overall_length: z.number().positive(),
  shaft_diameter: z.number().positive(),
  corner_radius: z.number().min(0).optional(),
  helix_angle: z.number().optional(),
  material: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd", "diamond coated"]),
  coating: z.string().optional(),
  holder_id: z.string().optional(),
  /** Mastercam tool library source file (.tooldb or legacy .tls) */
  library_source: z.string().optional(),
});

export const MCChainSchema = z.object({
  chain_id: z.number(),
  chain_type: z.enum(["open", "closed", "point", "surface", "solid face"]),
  entity_count: z.number().int().positive(),
  length_mm: z.number().positive().optional(),
  area_mm2: z.number().positive().optional(),
});

export const MCOperationSchema = z.object({
  operation_id: z.string(),
  operation_number: z.number().int(),
  operation_name: z.string(),
  operation_type: z.enum([
    // 2D milling
    "contour", "pocket", "face", "drill", "circle_mill", "slot_mill",
    "engrave", "thread_mill", "tap", "ream", "bore",
    "2d_high_speed", "2d_dynamic_mill", "2d_dynamic_contour", "2d_peel_mill",
    // 3D milling
    "surface_rough_parallel", "surface_rough_radial", "surface_rough_project",
    "surface_rough_flowline", "surface_rough_contour", "surface_rough_restmill",
    "surface_rough_pocket", "surface_rough_plunge",
    "surface_finish_parallel", "surface_finish_radial", "surface_finish_project",
    "surface_finish_flowline", "surface_finish_contour", "surface_finish_scallop",
    "surface_finish_pencil", "surface_finish_leftover", "surface_finish_shallow",
    "surface_finish_steep",
    "area_clearance", "opti_rough", "core_roughing", "waterline",
    "hybrid_finish", "raster_finish", "blend_finish",
    "3d_dynamic_opti_rough", "3d_dynamic_opti_core",
    // Multiaxis
    "multiaxis_swarf", "multiaxis_morph", "multiaxis_parallel_to_curve",
    "multiaxis_parallel_to_multiple_curves", "multiaxis_flow",
    "multiaxis_roughing", "multiaxis_drill_curve",
    // Lathe
    "lathe_rough", "lathe_finish", "lathe_groove", "lathe_thread",
    "lathe_drill", "lathe_cutoff", "lathe_quick_groove", "lathe_face",
    "lathe_canned_rough", "lathe_canned_finish",
    // Wire EDM
    "wire_contour", "wire_nocore", "wire_4axis", "wire_taper"
  ]),
  tool: MCToolSchema,
  chains: z.array(MCChainSchema).optional(),
  spindle_speed: z.number().positive(),
  surface_speed: z.number().positive().optional(),
  cutting_feedrate: z.number().positive(),
  plunge_feedrate: z.number().positive().optional(),
  retract_feedrate: z.number().positive().optional(),
  max_stepdown: z.number().positive().optional(),
  stepover: z.number().positive().optional(),
  stock_to_leave_xy: z.number().min(0).optional(),
  stock_to_leave_z: z.number().min(0).optional(),
  coolant: z.enum(["flood", "mist", "tool", "off"]),
  /** Dynamic Motion specific — Mastercam HSM signature technology */
  dynamic_motion: z.object({
    stepover_amount: z.number().positive(),
    back_feedrate_factor: z.number().min(0.1).max(1).describe("0-1 multiplier"),
    trochoidal_engagement: z.number().min(0).max(1).describe("Engagement angle fraction"),
  }).optional(),
  /** Material group for Mastercam feed/speed library */
  material_group_id: z.string().optional(),
});

export const MCMachineGroupSchema = z.object({
  group_id: z.string(),
  group_name: z.string(),
  machine_type: z.enum(["mill", "lathe", "mill_turn", "wire_edm", "router", "design"]),
  /** Mastercam .mcam-content — stock model reference */
  stock_setup: z.object({
    stock_type: z.enum(["rectangular", "cylindrical", "from_solid", "custom"]),
    dimensions: z.object({
      x: z.number().positive(),
      y: z.number().positive(),
      z: z.number().positive(),
    }).optional(),
    material_id: z.string(),
    material_name: z.string(),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    hardness_hrc: z.number().optional(),
  }),
  wcs: z.object({
    origin: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    x_axis: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    y_axis: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  }),
  post_processor: z.string().describe("Mastercam .pst file reference"),
});

export const MCProjectSchema = z.object({
  project_id: z.string(),
  mcam_filename: z.string().describe("Mastercam .mcam file reference"),
  mastercam_version: z.string().default("2025").describe("e.g., X8, X9, 2017, 2025"),
  machine_groups: z.array(MCMachineGroupSchema),
  operations: z.array(MCOperationSchema),
  machine_id: z.string().optional(),
});

// ── Type exports ────────────────────────────────────────────────────────────

export type MCTool = z.infer<typeof MCToolSchema>;
export type MCChain = z.infer<typeof MCChainSchema>;
export type MCOperation = z.infer<typeof MCOperationSchema>;
export type MCMachineGroup = z.infer<typeof MCMachineGroupSchema>;
export type MCProject = z.infer<typeof MCProjectSchema>;

// ── NET-Hook Event Protocol ─────────────────────────────────────────────────

export const MCEventSchema = z.object({
  event_type: z.enum([
    "nethook.load",
    "project.opened",
    "machine_group.created",
    "chain.selected",
    "operation.created",
    "operation.modified",
    "operation.regenerating",
    "operation.regenerated",
    "tool.changed",
    "post.start",
    "post.complete",
    "analysis.request"
  ]),
  payload: z.record(z.string(), z.unknown()),
  event_id: z.number(),
});

export type MCEvent = z.infer<typeof MCEventSchema>;

// ── Analysis Results ────────────────────────────────────────────────────────

export interface MCAnalysisResult {
  operation_id: string;
  operation_number: number;
  prism_session_id: string;
  analysis_time_ms: number;

  physics: {
    force_n: number;
    chatter_stable: boolean;
    deflection_mm: number;
    temperature_c: number;
    tool_life_remaining_pct: number;
  };

  recommendations: {
    suggested_spindle_speed: number | null;
    suggested_feedrate: number | null;
    suggested_stepdown: number | null;
    /** Dynamic Motion adjustment for HSM strategies */
    suggested_dynamic_engagement: number | null;
    rationale: string[];
  };

  safety: {
    score: number;
    verdict: "PASS" | "WARNING" | "FAIL";
    hard_stop: boolean;
    limiting_factor: string;
  };

  mastercam_annotations: {
    /** NC comment for .NC postprocessor output */
    nc_comment: string;
    /** Operation Manager tree icon override (color-coded by verdict) */
    tree_icon_state: "green" | "yellow" | "red";
    /** Operation rename suffix (appended to name for visual feedback) */
    operation_suffix: string;
  };
}

// ── Engine Implementation ───────────────────────────────────────────────────

export class MastercamPluginAdapterEngine {
  private static activeSessions: Map<string, { project: MCProject; prismSessionId: string }> = new Map();

  /**
   * Handle project opened event from Mastercam NET-Hook
   */
  static onProjectOpened(project: MCProject): { prismSessionId: string; status: string } {
    const session = PRISMVerificationPluginEngine.createSession({
      cam_system: "mastercam",
      part_number: project.mcam_filename,
      machine_id: project.machine_id ?? "UNKNOWN",
    });

    this.activeSessions.set(project.project_id, {
      project,
      prismSessionId: session.session_id,
    });

    return {
      prismSessionId: session.session_id,
      status: "initialized",
    };
  }

  /**
   * Analyze operation before Mastercam regenerates toolpath
   */
  static analyzeOperation(
    projectId: string,
    operation: MCOperation
  ): MCAnalysisResult {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      throw new Error(`No active PRISM session for project ${projectId}`);
    }

    const startTime = Date.now();
    // Mastercam uses MachineGroup for stock/material — use first group for now
    const machineGroup = sessionData.project.machine_groups[0];
    if (!machineGroup) {
      throw new Error(`No machine group in project ${projectId}`);
    }

    const point = this.convertToOperationPoint(operation, machineGroup);
    const overlay = PRISMVerificationPluginEngine.analyzePoint(
      sessionData.prismSessionId,
      point
    );

    return this.buildAnalysisResult(
      operation,
      sessionData.prismSessionId,
      overlay,
      Date.now() - startTime
    );
  }

  /**
   * Batch analyze entire Mastercam project
   */
  static analyzeProject(projectId: string): MCProjectAnalysis {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      throw new Error(`No active PRISM session for project ${projectId}`);
    }

    const results: MCAnalysisResult[] = [];
    let worstSafety = 1.0;
    const operationsByGroup = new Map<string, number>();
    const dynamicMotionOps = sessionData.project.operations.filter((o) => o.dynamic_motion || o.operation_type.includes("dynamic")).length;

    for (const operation of sessionData.project.operations) {
      const result = this.analyzeOperation(projectId, operation);
      results.push(result);

      if (result.safety.score < worstSafety) {
        worstSafety = result.safety.score;
      }

      // Mastercam groups operations by machine group (first group for simplicity)
      const groupId = sessionData.project.machine_groups[0]?.group_id ?? "DEFAULT";
      const count = operationsByGroup.get(groupId) ?? 0;
      operationsByGroup.set(groupId, count + 1);
    }

    return {
      project_id: projectId,
      prism_session_id: sessionData.prismSessionId,
      mastercam_version: sessionData.project.mastercam_version,
      total_operations: results.length,
      total_machine_groups: sessionData.project.machine_groups.length,
      dynamic_motion_operations: dynamicMotionOps,
      results,
      summary: {
        worst_safety_score: worstSafety,
        passed: results.filter((r) => r.safety.verdict === "PASS").length,
        warnings: results.filter((r) => r.safety.verdict === "WARNING").length,
        failures: results.filter((r) => r.safety.verdict === "FAIL").length,
        hard_stops: results.filter((r) => r.safety.hard_stop).length,
        operations_by_group: Object.fromEntries(operationsByGroup),
        overall_verdict: worstSafety >= 0.85 ? "APPROVED" : worstSafety >= 0.70 ? "REVIEW" : "BLOCKED",
      },
    };
  }

  /**
   * Validate chain geometry before toolpath generation
   */
  static validateChain(
    projectId: string,
    chain: MCChain
  ): { valid: boolean; issues: string[] } {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      return { valid: false, issues: [`No active PRISM session for project ${projectId}`] };
    }

    const issues: string[] = [];

    // Geometry sanity checks
    if (chain.entity_count === 0) {
      issues.push("Chain has no entities");
    }

    if (chain.chain_type === "closed" && chain.length_mm && chain.area_mm2) {
      // Compactness check: closed chain area should be proportional to perimeter^2
      const compactness = (4 * Math.PI * chain.area_mm2) / (chain.length_mm * chain.length_mm);
      if (compactness < 0.05) {
        issues.push(`Chain has very low compactness (${compactness.toFixed(3)}) — geometry may be degenerate`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Handle Mastercam NET-Hook event
   */
  static handleEvent(event: MCEvent): {
    success: boolean;
    result?: unknown;
    error?: string;
    event_id: number;
  } {
    try {
      let result: unknown;

      switch (event.event_type) {
        case "nethook.load":
          result = { loaded: true, sdk_version: "NET-Hook 2025.1", prism_version: "1.0.0" };
          break;

        case "project.opened":
          result = this.onProjectOpened(event.payload as unknown as MCProject);
          break;

        case "operation.created":
        case "operation.modified":
        case "operation.regenerating":
          result = this.analyzeOperation(
            event.payload.project_id as string,
            event.payload.operation as MCOperation
          );
          break;

        case "operation.regenerated":
          result = this.analyzeProject(event.payload.project_id as string);
          break;

        case "chain.selected":
          result = this.validateChain(
            event.payload.project_id as string,
            event.payload.chain as MCChain
          );
          break;

        case "post.start":
          result = this.generateNCHeader(event.payload.project_id as string);
          break;

        default:
          return {
            success: false,
            error: `Unknown event type: ${event.event_type}`,
            event_id: event.event_id,
          };
      }

      return { success: true, result, event_id: event.event_id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
        event_id: event.event_id,
      };
    }
  }

  /**
   * Generate NC header for Mastercam post processor injection
   */
  static generateNCHeader(projectId: string): { header: string; verified_at: string } {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      return { header: "", verified_at: new Date().toISOString() };
    }

    const analysis = this.analyzeProject(projectId);
    const lines = [
      "(======================================)",
      "(  PRISM Verification Header          )",
      `(  File: ${sessionData.project.mcam_filename})`,
      `(  Mastercam: ${sessionData.project.mastercam_version})`,
      `(  Session: ${sessionData.prismSessionId})`,
      `(  Timestamp: ${new Date().toISOString()})`,
      `(  Operations: ${analysis.total_operations} verified)`,
    ];

    if (analysis.dynamic_motion_operations > 0) {
      lines.push(`(  Dynamic Motion Ops: ${analysis.dynamic_motion_operations})`);
    }

    lines.push(
      `(  Safety Score: ${analysis.summary.worst_safety_score.toFixed(3)})`,
      `(  Verdict: ${analysis.summary.overall_verdict})`,
      "(======================================)"
    );

    return {
      header: lines.join("\n"),
      verified_at: new Date().toISOString(),
    };
  }

  /**
   * Close project session
   */
  static onProjectClosed(projectId: string): { finalVerdict: string } | null {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) return null;

    const result = PRISMVerificationPluginEngine.completeSession(sessionData.prismSessionId);
    this.activeSessions.delete(projectId);

    return { finalVerdict: result.final_verdict };
  }

  // ═════════════════════════════════════════════════════════════════════
  // U-CAM89-EXTEND — Outbound NET-Hook command envelopes (PRISM → Mastercam)
  // ═════════════════════════════════════════════════════════════════════
  //
  // The existing handleEvent() is INBOUND (Mastercam notifies PRISM after
  // user actions in the UI). For PRISM to DRIVE Mastercam — create machine
  // groups, instantiate operations on chains, set parameters, invoke post-
  // processor — we need OUTBOUND NET-Hook command envelopes that the
  // Mastercam NET-Hook DLL consumes via Mastercam.IO.Operation tree
  // mutation, Mastercam.IO.MachineGroup.Create(), etc.
  //
  // These builders produce envelopes mapping 1:1 to Mastercam's .NET API
  // without executing them. The NET-Hook DLL side (a C# DLL loaded by
  // Mastercam X8+) reads each envelope and calls the corresponding SDK
  // method. Same separation-of-concerns pattern as U-CAM87-LIVE for Fusion
  // 360: PRISM-side deterministic (hermetic testable), add-in side handles
  // non-deterministic SDK calls.
  //
  // Addresses Round-3 Mastercam unique blocker: adapter was read-only with
  // zero CREATE verbs. After this ships, PRISM can author machine groups,
  // instantiate operations for 8 strategy families, set parameters, and
  // invoke the Mastercam MP post-processor — the largest single-unit
  // confidence boost in the Round-3 roadmap projection.
  //
  // Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.5 U-CAM89-EXTEND.

  /** Next outbound command id (monotonic) */
  private static outboundCommandId = 1;

  static buildMachineGroupCreateEnvelope(params: {
    project_id: string;
    machine_group_name: string;
    post_processor_path: string;
    stock_setup: {
      mode: "box" | "cylinder" | "file";
      dimensions?: { x: number; y: number; z: number };
      cylinder?: { diameter: number; length: number };
      stock_file?: string;
      material_id?: string;
      material_name?: string;
    };
    wcs_origin: { x: number; y: number; z: number };
  }): {
    command: "MachineGroup.Create";
    protocol: "nethook";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.post_processor_path) {
      throw new Error("MachineGroup.Create requires post_processor_path");
    }
    return {
      command: "MachineGroup.Create",
      protocol: "nethook",
      project_id: params.project_id,
      params,
      id: this.outboundCommandId++,
    };
  }

  static buildOperationCreateEnvelope(params: {
    project_id: string;
    machine_group_id: string;
    strategy:
      | "dynamic_mill"
      | "pocket"
      | "contour2d"
      | "surface_rough"
      | "surface_finish"
      | "drill"
      | "bore"
      | "thread_mill"
      | "lathe_rough"
      | "lathe_finish"
      | "lathe_thread";
    tool_id: string;
    chain_ids: string[];
    parameters: {
      spindle_speed: number;
      cutting_feedrate: number;
      max_stepdown?: number;
      stepover_pct?: number;
      entry_type?: "helical" | "ramp" | "plunge" | "pre_drill";
      coolant?: "flood" | "mist" | "through_tool" | "off";
    };
  }): {
    command: "Operation.Create";
    protocol: "nethook";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.tool_id) throw new Error("Operation.Create requires tool_id");
    if (!params.chain_ids || params.chain_ids.length === 0) {
      throw new Error("Operation.Create requires at least one chain_id");
    }
    if (!(params.parameters.spindle_speed > 0)) {
      throw new Error("Operation.Create requires positive spindle_speed");
    }
    if (!(params.parameters.cutting_feedrate > 0)) {
      throw new Error("Operation.Create requires positive cutting_feedrate");
    }
    return {
      command: "Operation.Create",
      protocol: "nethook",
      project_id: params.project_id,
      params,
      id: this.outboundCommandId++,
    };
  }

  static buildToolInstallEnvelope(params: {
    project_id: string;
    machine_group_id: string;
    tool: {
      tool_id: string;
      tool_type: "endmill" | "drill" | "tap" | "reamer" | "boring_bar" | "face_mill" | "insert";
      diameter_mm: number;
      flute_count?: number;
      holder_id?: string;
      magazine_slot?: number;
    };
  }): {
    command: "Tool.Install";
    protocol: "nethook";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.tool.tool_id) throw new Error("Tool.Install requires tool.tool_id");
    if (!(params.tool.diameter_mm > 0)) {
      throw new Error("Tool.Install requires positive diameter_mm");
    }
    return {
      command: "Tool.Install",
      protocol: "nethook",
      project_id: params.project_id,
      params,
      id: this.outboundCommandId++,
    };
  }

  static buildChainSelectEnvelope(params: {
    project_id: string;
    chain_id: string;
    geometry_refs: string[];
    chain_type: "2d_contour" | "2d_pocket_boundary" | "3d_surface" | "drill_points" | "lathe_profile";
  }): {
    command: "Chain.Select";
    protocol: "nethook";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.geometry_refs || params.geometry_refs.length === 0) {
      throw new Error("Chain.Select requires at least one geometry_ref");
    }
    return {
      command: "Chain.Select",
      protocol: "nethook",
      project_id: params.project_id,
      params,
      id: this.outboundCommandId++,
    };
  }

  static buildRegenEnvelope(params: {
    project_id: string;
    operation_ids: string[];
    regen_all?: boolean;
  }): {
    command: "Regen.Operations";
    protocol: "nethook";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    return {
      command: "Regen.Operations",
      protocol: "nethook",
      project_id: params.project_id,
      params,
      id: this.outboundCommandId++,
    };
  }

  static buildPostProcessEnvelope(params: {
    project_id: string;
    machine_group_id: string;
    post_mp_path: string;
    output_nc_path: string;
    target_controller: string;
  }): {
    command: "Post.Run";
    protocol: "nethook";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.post_mp_path) throw new Error("Post.Run requires post_mp_path");
    if (!params.output_nc_path) throw new Error("Post.Run requires output_nc_path");
    return {
      command: "Post.Run",
      protocol: "nethook",
      project_id: params.project_id,
      params,
      id: this.outboundCommandId++,
    };
  }

  /** Reset the outbound command id counter — test-only utility. */
  static __resetOutboundCommandId(): void {
    this.outboundCommandId = 1;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private static convertToOperationPoint(
    operation: MCOperation,
    machineGroup: MCMachineGroup
  ) {
    return {
      operation_id: operation.operation_id,
      time_s: 0,
      position: { x: 0, y: 0, z: 0 },
      cutting: {
        spindle_rpm: operation.spindle_speed,
        feed_rate_mmpm: operation.cutting_feedrate,
        depth_of_cut_mm: operation.max_stepdown ?? 1.0,
        width_of_cut_mm: operation.stepover ?? operation.tool.diameter * 0.5,
      },
      tool: {
        tool_id: operation.tool.tool_id,
        diameter_mm: operation.tool.diameter,
        flutes: operation.tool.flute_count,
        material: operation.tool.material === "diamond coated" ? "carbide" : operation.tool.material,
        overhang_mm: operation.tool.flute_length,
      },
      material: {
        material_id: machineGroup.stock_setup.material_id,
        iso_group: machineGroup.stock_setup.iso_group,
      },
    };
  }

  private static buildAnalysisResult(
    operation: MCOperation,
    prismSessionId: string,
    overlay: unknown,
    analysisTimeMs: number
  ): MCAnalysisResult {
    const o = overlay as {
      force: { value: number };
      chatter: { stable: boolean; recommended_rpm?: number };
      deflection: { value: number };
      temperature: { value: number };
      tool_life: { remaining_pct: number };
      safety_score: { value: number; verdict: string; hard_stop: boolean; limiting_factor: string };
    };

    const rationale: string[] = [];
    let suggestedSpindle: number | null = null;
    let suggestedFeedrate: number | null = null;
    let suggestedStepdown: number | null = null;
    let suggestedDynamicEngagement: number | null = null;

    if (!o.chatter.stable && o.chatter.recommended_rpm) {
      suggestedSpindle = o.chatter.recommended_rpm;
      rationale.push(`Chatter unstable — suggested RPM ${o.chatter.recommended_rpm}`);
    }

    if (o.force.value > 4000) {
      suggestedFeedrate = operation.cutting_feedrate * 0.8;
      rationale.push(`High force ${Math.round(o.force.value)}N — reduce feedrate by 20%`);
    }

    if (o.deflection.value > 0.05) {
      suggestedStepdown = (operation.max_stepdown ?? 1.0) * 0.7;
      rationale.push(`Deflection ${o.deflection.value.toFixed(3)}mm exceeds 0.05mm — reduce stepdown`);
    }

    // Dynamic Motion adjustment: reduce trochoidal engagement when unstable
    if (operation.dynamic_motion && (!o.chatter.stable || o.force.value > 4000)) {
      suggestedDynamicEngagement = Math.max(0.1, operation.dynamic_motion.trochoidal_engagement * 0.7);
      rationale.push(`Dynamic Motion engagement ${operation.dynamic_motion.trochoidal_engagement.toFixed(2)} → ${suggestedDynamicEngagement.toFixed(2)}`);
    }

    const verdict = o.safety_score.verdict;
    const treeIconState: "green" | "yellow" | "red" =
      verdict === "PASS" ? "green" :
      verdict === "WARNING" ? "yellow" : "red";

    const operationSuffix =
      verdict === "PASS" ? "" :
      verdict === "WARNING" ? " [PRISM-REVIEW]" : " [PRISM-BLOCKED]";

    const ncComment = `(PRISM: F=${Math.round(o.force.value)}N S(x)=${o.safety_score.value.toFixed(2)} ${verdict})`;

    return {
      operation_id: operation.operation_id,
      operation_number: operation.operation_number,
      prism_session_id: prismSessionId,
      analysis_time_ms: analysisTimeMs,

      physics: {
        force_n: o.force.value,
        chatter_stable: o.chatter.stable,
        deflection_mm: o.deflection.value,
        temperature_c: o.temperature.value,
        tool_life_remaining_pct: o.tool_life.remaining_pct,
      },

      recommendations: {
        suggested_spindle_speed: suggestedSpindle,
        suggested_feedrate: suggestedFeedrate,
        suggested_stepdown: suggestedStepdown,
        suggested_dynamic_engagement: suggestedDynamicEngagement,
        rationale,
      },

      safety: {
        score: o.safety_score.value,
        verdict: verdict as "PASS" | "WARNING" | "FAIL",
        hard_stop: o.safety_score.hard_stop,
        limiting_factor: o.safety_score.limiting_factor,
      },

      mastercam_annotations: {
        nc_comment: ncComment,
        tree_icon_state: treeIconState,
        operation_suffix: operationSuffix,
      },
    };
  }
}

// ── Supporting Types ────────────────────────────────────────────────────────

export interface MCProjectAnalysis {
  project_id: string;
  prism_session_id: string;
  mastercam_version: string;
  total_operations: number;
  total_machine_groups: number;
  dynamic_motion_operations: number;
  results: MCAnalysisResult[];
  summary: {
    worst_safety_score: number;
    passed: number;
    warnings: number;
    failures: number;
    hard_stops: number;
    operations_by_group: Record<string, number>;
    overall_verdict: "APPROVED" | "REVIEW" | "BLOCKED";
  };
}

export const mastercamPluginAdapterEngine = new (MastercamPluginAdapterEngine as unknown as { new(): MastercamPluginAdapterEngine })();
