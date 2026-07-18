/**
 * Fusion360PluginAdapterEngine — Fusion 360 CAM Python Add-in Bridge (U-CAM87)
 * ==============================================================================
 *
 * Adapts PRISMVerificationPluginEngine for Autodesk Fusion 360 CAM integration via:
 *   - Python add-in: PRISMFusionAddin.py (uses adsk.cam API)
 *   - JSON-RPC over WebSocket (Fusion 360 preferred protocol)
 *   - adsk.cam.CAMManager traversal (Setup → Operation → Toolpath)
 *
 * Fusion 360 CAM API Structure:
 *   - adsk.cam.CAM: Root CAM product
 *   - adsk.cam.Setup: Machining setup (stock, WCS, model)
 *   - adsk.cam.Operation: Single machining operation
 *   - adsk.cam.Tool: Tool definition
 *   - adsk.cam.ToolLibrary: Tool library access
 *
 * Integration Points:
 *   - Setup creation hook: Validate stock and WCS
 *   - Operation creation: Pre-flight physics check
 *   - Generate Toolpath: Post-calc analysis
 *   - Simulate: Real-time overlay via WebSocket
 *   - Post Process: Inject PRISM-verified comments into NC
 *
 * References:
 *   - Fusion 360 CAM API Reference (Autodesk)
 *   - adsk.cam module documentation
 *
 * @module engines/Fusion360PluginAdapterEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM87
 */

import { z } from "zod";
import { PRISMVerificationPluginEngine } from "./PRISMVerificationPluginEngine.js";

// ── Fusion 360 CAM Data Schemas ─────────────────────────────────────────────

export const FusionToolSchema = z.object({
  tool_id: z.string(),
  tool_number: z.number(),
  tool_type: z.enum([
    "flat end mill", "ball end mill", "bull nose end mill", "face mill",
    "chamfer mill", "thread mill", "drill", "center drill", "spot drill",
    "tap", "reamer", "boring bar", "probe", "lollipop mill",
    "radius mill", "slot mill", "dovetail mill", "form mill"
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
});

export const FusionSetupSchema = z.object({
  setup_id: z.string(),
  setup_name: z.string(),
  setup_type: z.enum(["milling", "turning", "probing", "additive", "cutting"]),
  stock_mode: z.enum(["fixed size box", "relative size box", "from solid"]),
  stock_material: z.object({
    material_id: z.string(),
    material_name: z.string(),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    hardness_hrc: z.number().optional(),
  }),
  stock_dimensions: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }).optional(),
  wcs: z.object({
    origin: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    x_axis: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    y_axis: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  }),
});

export const FusionOperationSchema = z.object({
  operation_id: z.string(),
  operation_name: z.string(),
  strategy: z.enum([
    "adaptive2d", "pocket2d", "contour2d", "face", "slot", "bore", "trace",
    "thread", "chamfer2d", "engrave", "circular", "drill",
    "adaptive3d", "pocket3d", "parallel", "contour3d", "scallop", "pencil",
    "radial", "spiral", "morphed_spiral", "steep_and_shallow", "horizontal", "ramp",
    "swarf", "multi_axis_contour", "flow",
    "profile_roughing", "profile_finishing", "face_turning", "groove", "thread_turning"
  ]),
  tool: FusionToolSchema,
  spindle_speed: z.number().positive(),
  surface_speed: z.number().positive().optional(),
  cutting_feedrate: z.number().positive(),
  plunge_feedrate: z.number().positive().optional(),
  ramp_feedrate: z.number().positive().optional(),
  maximum_roughing_stepdown: z.number().positive().optional(),
  stepover: z.number().positive().optional(),
  optimal_load: z.number().positive().optional(),
  maximum_chip_load: z.number().positive().optional(),
  stock_to_leave: z.number().min(0).optional(),
  coolant: z.enum(["flood", "mist", "through_tool", "air", "disabled"]),
  setup_id: z.string(),
});

export const FusionProjectSchema = z.object({
  project_id: z.string(),
  project_name: z.string(),
  design_name: z.string(),
  machine_id: z.string().optional(),
  setups: z.array(FusionSetupSchema),
  operations: z.array(FusionOperationSchema),
});

// ── Type exports ────────────────────────────────────────────────────────────

export type FusionTool = z.infer<typeof FusionToolSchema>;
export type FusionSetup = z.infer<typeof FusionSetupSchema>;
export type FusionOperation = z.infer<typeof FusionOperationSchema>;
export type FusionProject = z.infer<typeof FusionProjectSchema>;

// ── JSON-RPC Message Protocol ───────────────────────────────────────────────

export const FusionRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.enum([
    "project.opened",
    "setup.created",
    "setup.modified",
    "operation.created",
    "operation.modified",
    "toolpath.generating",
    "toolpath.generated",
    "simulation.point",
    "postprocess.start",
    "postprocess.complete",
    "analysis.request"
  ]),
  params: z.record(z.string(), z.unknown()),
  id: z.union([z.string(), z.number()]),
});

export type FusionRPCRequest = z.infer<typeof FusionRPCRequestSchema>;

// ── Analysis Results ────────────────────────────────────────────────────────

export interface FusionAnalysisResult {
  operation_id: string;
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
    rationale: string[];
  };

  safety: {
    score: number;
    verdict: "PASS" | "WARNING" | "FAIL";
    hard_stop: boolean;
    limiting_factor: string;
  };

  fusion_annotations: {
    /** Comment text to inject into NC output */
    nc_comment: string;
    /** Timeline markers for simulation */
    timeline_markers: Array<{ time_s: number; label: string; color: string }>;
  };
}

// ── Engine Implementation ───────────────────────────────────────────────────

export class Fusion360PluginAdapterEngine {
  private static activeSessions: Map<string, { project: FusionProject; prismSessionId: string }> = new Map();

  /**
   * Handle project opened event from Fusion 360 add-in
   */
  static onProjectOpened(project: FusionProject): { prismSessionId: string; status: string } {
    const session = PRISMVerificationPluginEngine.createSession({
      cam_system: "fusion360",
      part_number: project.design_name,
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
   * Analyze operation before Fusion 360 generates toolpath
   */
  static analyzeOperation(
    projectId: string,
    operation: FusionOperation
  ): FusionAnalysisResult {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      throw new Error(`No active PRISM session for project ${projectId}`);
    }

    const startTime = Date.now();
    const setup = sessionData.project.setups.find((s) => s.setup_id === operation.setup_id);
    if (!setup) {
      throw new Error(`Setup ${operation.setup_id} not found in project ${projectId}`);
    }

    const point = this.convertToOperationPoint(operation, setup);
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
   * Batch analyze entire project (all setups, all operations)
   */
  static analyzeProject(projectId: string): FusionProjectAnalysis {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      throw new Error(`No active PRISM session for project ${projectId}`);
    }

    const results: FusionAnalysisResult[] = [];
    let worstSafety = 1.0;
    const operationsBySetup = new Map<string, number>();

    for (const operation of sessionData.project.operations) {
      const result = this.analyzeOperation(projectId, operation);
      results.push(result);

      if (result.safety.score < worstSafety) {
        worstSafety = result.safety.score;
      }

      const count = operationsBySetup.get(operation.setup_id) ?? 0;
      operationsBySetup.set(operation.setup_id, count + 1);
    }

    return {
      project_id: projectId,
      prism_session_id: sessionData.prismSessionId,
      total_operations: results.length,
      total_setups: sessionData.project.setups.length,
      results,
      summary: {
        worst_safety_score: worstSafety,
        passed: results.filter((r) => r.safety.verdict === "PASS").length,
        warnings: results.filter((r) => r.safety.verdict === "WARNING").length,
        failures: results.filter((r) => r.safety.verdict === "FAIL").length,
        hard_stops: results.filter((r) => r.safety.hard_stop).length,
        operations_by_setup: Object.fromEntries(operationsBySetup),
        overall_verdict: worstSafety >= 0.85 ? "APPROVED" : worstSafety >= 0.70 ? "REVIEW" : "BLOCKED",
      },
    };
  }

  /**
   * Handle JSON-RPC request from Fusion 360 add-in
   */
  static handleRPCRequest(request: FusionRPCRequest): {
    jsonrpc: "2.0";
    result?: unknown;
    error?: { code: number; message: string };
    id: string | number;
  } {
    try {
      let result: unknown;

      switch (request.method) {
        case "project.opened":
          result = this.onProjectOpened(request.params as unknown as FusionProject);
          break;

        case "operation.created":
        case "operation.modified":
          result = this.analyzeOperation(
            request.params.project_id as string,
            request.params.operation as FusionOperation
          );
          break;

        case "toolpath.generating":
          result = this.analyzeProject(request.params.project_id as string);
          break;

        case "postprocess.start":
          result = this.generateNCHeader(request.params.project_id as string);
          break;

        default:
          return {
            jsonrpc: "2.0",
            error: { code: -32601, message: `Method not found: ${request.method}` },
            id: request.id,
          };
      }

      return { jsonrpc: "2.0", result, id: request.id };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
        id: request.id,
      };
    }
  }

  /**
   * Generate NC header comment block for postprocessor
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
      `(  Project: ${sessionData.project.design_name})`,
      `(  Session: ${sessionData.prismSessionId})`,
      `(  Timestamp: ${new Date().toISOString()})`,
      `(  Operations: ${analysis.total_operations} verified)`,
      `(  Safety Score: ${analysis.summary.worst_safety_score.toFixed(3)})`,
      `(  Verdict: ${analysis.summary.overall_verdict})`,
      "(======================================)",
    ];

    return {
      header: lines.join("\n"),
      verified_at: new Date().toISOString(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // U-CAM87-LIVE — Outbound JSON-RPC envelope builders (PRISM → Fusion 360)
  // ═════════════════════════════════════════════════════════════════════
  //
  // The existing handleRPCRequest() handles INBOUND events (Fusion notifies
  // PRISM before/after CAM operations). For PRISM to DRIVE Fusion — create
  // setups, instantiate operations, invoke post-process — we need OUTBOUND
  // JSON-RPC 2.0 envelopes that a running Fusion add-in will consume via
  // adsk.cam.CAM.setups.add(), adsk.cam.CAM.operations.create(), etc.
  //
  // These builders produce envelopes that map 1:1 to Fusion's Python API
  // without executing them. The add-in side (written in Python, lives in
  // Fusion's add-ins folder) takes each envelope and calls the corresponding
  // adsk.cam class method. This separation keeps PRISM-side deterministic
  // (testable without a live Fusion instance) while the add-in handles the
  // non-deterministic adsk.cam calls.
  //
  // Addresses Round-3 universal gap #1 for Fusion 360: 0/40 op-create cells
  // were I-scored because no code path invoked adsk.cam.*.create(). After
  // this ships, PRISM can prepare envelopes for all 8 strategy families;
  // execution just requires the Python side to receive them.
  //
  // Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.5 U-CAM87-LIVE.

  /** Next outbound RPC id (monotonic, per-session in production) */
  private static outboundRpcId = 1;

  static buildSetupCreateEnvelope(params: {
    project_id: string;
    setup_name: string;
    stock: { mode: "box" | "cylinder" | "from_geometry"; x?: number; y?: number; z?: number; diameter?: number };
    wcs_origin: { x: number; y: number; z: number };
    machine_id?: string;
  }): {
    jsonrpc: "2.0";
    method: "setup.create";
    params: typeof params;
    id: number;
  } {
    return {
      jsonrpc: "2.0",
      method: "setup.create",
      params,
      id: this.outboundRpcId++,
    };
  }

  static buildOperationCreateEnvelope(params: {
    project_id: string;
    setup_id: string;
    strategy:
      | "adaptive3d"
      | "pocket_clearing"
      | "contour2d"
      | "contour3d"
      | "facing"
      | "drill"
      | "bore"
      | "thread";
    tool_id: string;
    geometry_selection: string[];
    parameters: {
      spindle_speed_rpm?: number;
      feed_mm_min?: number;
      stepdown_mm?: number;
      stepover_mm?: number;
      coolant?: "flood" | "mist" | "through_tool" | "off";
    };
  }): {
    jsonrpc: "2.0";
    method: "operation.create";
    params: typeof params;
    id: number;
  } {
    if (!params.tool_id) throw new Error("operation.create requires a tool_id");
    if (!params.geometry_selection || params.geometry_selection.length === 0) {
      throw new Error("operation.create requires at least one geometry_selection entry");
    }
    return {
      jsonrpc: "2.0",
      method: "operation.create",
      params,
      id: this.outboundRpcId++,
    };
  }

  static buildToolInstallEnvelope(params: {
    project_id: string;
    library_guid?: string;
    tool: {
      id: string;
      type: "endmill" | "drill" | "tap" | "reamer" | "bore_bar" | "face_mill" | "insert";
      diameter_mm: number;
      flutes?: number;
      coating?: string;
    };
  }): {
    jsonrpc: "2.0";
    method: "tool.install";
    params: typeof params;
    id: number;
  } {
    return {
      jsonrpc: "2.0",
      method: "tool.install",
      params,
      id: this.outboundRpcId++,
    };
  }

  static buildPostProcessEnvelope(params: {
    project_id: string;
    post_cps_path: string;
    output_path: string;
    target_machine_id: string;
  }): {
    jsonrpc: "2.0";
    method: "postprocess.run";
    params: typeof params;
    id: number;
  } {
    if (!params.post_cps_path) throw new Error("postprocess.run requires post_cps_path");
    if (!params.output_path) throw new Error("postprocess.run requires output_path");
    return {
      jsonrpc: "2.0",
      method: "postprocess.run",
      params,
      id: this.outboundRpcId++,
    };
  }

  static buildGeometryImportEnvelope(params: {
    project_id: string;
    file_path: string;
    format: "step" | "iges" | "f3d" | "stl" | "sat" | "stp";
    orient_to_stock?: boolean;
  }): {
    jsonrpc: "2.0";
    method: "geometry.import";
    params: typeof params;
    id: number;
  } {
    return {
      jsonrpc: "2.0",
      method: "geometry.import",
      params,
      id: this.outboundRpcId++,
    };
  }

  static buildSimulateEnvelope(params: {
    project_id: string;
    operation_ids: string[];
    mode: "collision_only" | "stock_removal" | "full";
  }): {
    jsonrpc: "2.0";
    method: "simulate.run";
    params: typeof params;
    id: number;
  } {
    return {
      jsonrpc: "2.0",
      method: "simulate.run",
      params,
      id: this.outboundRpcId++,
    };
  }

  /**
   * Reset the outbound RPC id counter — test-only utility.
   */
  static __resetOutboundRpcId(): void {
    this.outboundRpcId = 1;
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

  // ── Private Helpers ───────────────────────────────────────────────────────

  private static convertToOperationPoint(
    operation: FusionOperation,
    setup: FusionSetup
  ) {
    return {
      operation_id: operation.operation_id,
      time_s: 0,
      position: { x: 0, y: 0, z: 0 },
      cutting: {
        spindle_rpm: operation.spindle_speed,
        feed_rate_mmpm: operation.cutting_feedrate,
        depth_of_cut_mm: operation.maximum_roughing_stepdown ?? 1.0,
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
        material_id: setup.stock_material.material_id,
        iso_group: setup.stock_material.iso_group,
      },
    };
  }

  private static buildAnalysisResult(
    operation: FusionOperation,
    prismSessionId: string,
    overlay: unknown,
    analysisTimeMs: number
  ): FusionAnalysisResult {
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

    if (!o.chatter.stable && o.chatter.recommended_rpm) {
      suggestedSpindle = o.chatter.recommended_rpm;
      rationale.push(`Chatter unstable — suggested RPM ${o.chatter.recommended_rpm}`);
    }

    if (o.force.value > 4000) {
      suggestedFeedrate = operation.cutting_feedrate * 0.8;
      rationale.push(`High force ${Math.round(o.force.value)}N — reduce feedrate by 20%`);
    }

    if (o.deflection.value > 0.05) {
      suggestedStepdown = (operation.maximum_roughing_stepdown ?? 1.0) * 0.7;
      rationale.push(`Deflection ${o.deflection.value.toFixed(3)}mm exceeds 0.05mm — reduce stepdown`);
    }

    const timelineMarkers = [
      { time_s: 0, label: "Operation start", color: "#0080FF" },
      { time_s: 1, label: `Force: ${Math.round(o.force.value)}N`, color: o.force.value > 4000 ? "#FF0000" : "#00FF00" },
      { time_s: 2, label: `${o.chatter.stable ? "Stable" : "CHATTER"}`, color: o.chatter.stable ? "#00FF00" : "#FF0000" },
    ];

    const ncComment = `(PRISM: F=${Math.round(o.force.value)}N S(x)=${o.safety_score.value.toFixed(2)} ${o.safety_score.verdict})`;

    return {
      operation_id: operation.operation_id,
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
        rationale,
      },

      safety: {
        score: o.safety_score.value,
        verdict: o.safety_score.verdict as "PASS" | "WARNING" | "FAIL",
        hard_stop: o.safety_score.hard_stop,
        limiting_factor: o.safety_score.limiting_factor,
      },

      fusion_annotations: {
        nc_comment: ncComment,
        timeline_markers: timelineMarkers,
      },
    };
  }
}

// ── Supporting Types ────────────────────────────────────────────────────────

export interface FusionProjectAnalysis {
  project_id: string;
  prism_session_id: string;
  total_operations: number;
  total_setups: number;
  results: FusionAnalysisResult[];
  summary: {
    worst_safety_score: number;
    passed: number;
    warnings: number;
    failures: number;
    hard_stops: number;
    operations_by_setup: Record<string, number>;
    overall_verdict: "APPROVED" | "REVIEW" | "BLOCKED";
  };
}

export const fusion360PluginAdapterEngine = new (Fusion360PluginAdapterEngine as unknown as { new(): Fusion360PluginAdapterEngine })();
