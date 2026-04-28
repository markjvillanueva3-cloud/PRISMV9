/**
 * HyperMillPluginAdapterEngine — hyperMILL COM/.NET Plugin Bridge (U-CAM86)
 * ===========================================================================
 *
 * Adapts PRISMVerificationPluginEngine for hyperMILL integration via:
 *   - .NET COM DLL: HyperMillPRISMPlugin.dll
 *   - XML-RPC message format (hyperMILL internal protocol)
 *   - Operation tree traversal (JobList → Operation → Toolpath)
 *
 * hyperMILL API Structure:
 *   - HMProject: Root project container
 *   - HMJobList: Job/operation list container
 *   - HMOperation: Single machining operation (2D, 3D, 5-axis)
 *   - HMToolpath: Generated toolpath data
 *   - HMTool: Tool definition (diameter, flutes, material)
 *   - HMStock: Stock definition (material, ISO group)
 *
 * Integration Points:
 *   - Pre-calculation hook: Before toolpath generation
 *   - Post-calculation hook: After toolpath, before NC output
 *   - Simulation overlay: Real-time physics during verification
 *   - Report injection: Add PRISM metrics to setup sheet
 *
 * References:
 *   - hyperMILL API Reference (OPEN MIND Technologies)
 *   - hyperCAD-S Automation Center documentation
 *
 * @module engines/HyperMillPluginAdapterEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM86
 */

import { z } from "zod";
import { PRISMVerificationPluginEngine } from "./PRISMVerificationPluginEngine.js";

// ── hyperMILL Data Schemas ──────────────────────────────────────────────────

export const HMToolSchema = z.object({
  tool_id: z.string(),
  tool_number: z.number(),
  tool_type: z.enum([
    "endmill", "ballnose", "bullnose", "facemill", "drill",
    "tap", "reamer", "boring_bar", "slot_drill", "chamfer",
    "thread_mill", "form_tool", "lollipop", "barrel"
  ]),
  diameter_mm: z.number().positive(),
  flutes: z.number().int().positive(),
  flute_length_mm: z.number().positive(),
  overall_length_mm: z.number().positive(),
  shank_diameter_mm: z.number().positive(),
  corner_radius_mm: z.number().min(0).optional(),
  helix_angle_deg: z.number().optional(),
  material: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]),
  coating: z.string().optional(),
});

export const HMStockSchema = z.object({
  material_id: z.string(),
  material_name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  hardness_hrc: z.number().optional(),
  tensile_strength_mpa: z.number().optional(),
});

export const HMOperationSchema = z.object({
  operation_id: z.string(),
  operation_name: z.string(),
  operation_type: z.enum([
    "roughing", "finishing", "semi_finishing", "rest_roughing",
    "profile", "pocket", "drilling", "tapping", "boring",
    "face", "slot", "thread", "chamfer", "deburr",
    "3d_roughing", "3d_finishing", "3d_rest", "3d_pencil",
    "5axis_swarf", "5axis_flowline", "5axis_contour", "5axis_multiaxis"
  ]),
  spindle_rpm: z.number().positive(),
  feed_rate_mmpm: z.number().positive(),
  depth_of_cut_mm: z.number().positive(),
  width_of_cut_mm: z.number().positive(),
  stepover_mm: z.number().positive().optional(),
  stepdown_mm: z.number().positive().optional(),
  lead_angle_deg: z.number().optional(),
  tilt_angle_deg: z.number().optional(),
  tool: HMToolSchema,
  stock: HMStockSchema,
  coolant: z.enum(["flood", "mist", "through_tool", "air", "mql", "none"]),
});

export const HMJobListSchema = z.object({
  joblist_id: z.string(),
  joblist_name: z.string(),
  machine_id: z.string(),
  machine_name: z.string(),
  operations: z.array(HMOperationSchema),
  total_machining_time_s: z.number().optional(),
});

export const HMProjectSchema = z.object({
  project_id: z.string(),
  project_name: z.string(),
  part_number: z.string(),
  revision: z.string().optional(),
  joblists: z.array(HMJobListSchema),
  created_at: z.string(),
  modified_at: z.string(),
});

// ── Type exports ────────────────────────────────────────────────────────────

export type HMTool = z.infer<typeof HMToolSchema>;
export type HMStock = z.infer<typeof HMStockSchema>;
export type HMOperation = z.infer<typeof HMOperationSchema>;
export type HMJobList = z.infer<typeof HMJobListSchema>;
export type HMProject = z.infer<typeof HMProjectSchema>;

// ── Plugin Message Protocol ─────────────────────────────────────────────────

export const HMPluginMessageSchema = z.object({
  message_id: z.string(),
  message_type: z.enum([
    "project_opened",
    "operation_selected",
    "pre_calculate",
    "post_calculate",
    "simulation_point",
    "nc_output_start",
    "nc_output_complete",
    "request_analysis",
    "request_overlay"
  ]),
  timestamp: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export type HMPluginMessage = z.infer<typeof HMPluginMessageSchema>;

// ── Analysis Results ────────────────────────────────────────────────────────

export interface HMAnalysisResult {
  operation_id: string;
  prism_session_id: string;
  analysis_time_ms: number;

  force: {
    peak_n: number;
    average_n: number;
    confidence: number;
    within_limit: boolean;
  };

  chatter: {
    stable: boolean;
    margin_pct: number;
    recommended_rpm: number | null;
  };

  deflection: {
    tool_mm: number;
    part_mm: number;
    total_mm: number;
    within_tolerance: boolean;
  };

  thermal: {
    peak_temp_c: number;
    damage_risk: "none" | "low" | "medium" | "high";
  };

  tool_life: {
    operation_wear_pct: number;
    remaining_pct: number;
    tool_changes_needed: number;
  };

  safety_score: {
    value: number;
    verdict: "PASS" | "WARNING" | "FAIL";
    limiting_factor: string;
  };

  recommendations: string[];
}

// ── Engine Implementation ───────────────────────────────────────────────────

export class HyperMillPluginAdapterEngine {
  private static activeSessions: Map<string, { project: HMProject; prismSessionId: string }> = new Map();

  /**
   * Initialize PRISM integration when hyperMILL project opens
   */
  static onProjectOpened(project: HMProject): { prismSessionId: string; status: string } {
    // Lazy import to avoid circular dependency
    // Uses imported PRISMVerificationPluginEngine

    // Create PRISM verification session
    const session = PRISMVerificationPluginEngine.createSession({
      cam_system: "hypermill",
      part_number: project.part_number,
      machine_id: project.joblists[0]?.machine_id ?? "UNKNOWN",
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
   * Analyze single operation before toolpath calculation
   */
  static analyzeOperationPreCalc(
    projectId: string,
    operation: HMOperation
  ): HMAnalysisResult {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      throw new Error(`No active PRISM session for project ${projectId}`);
    }

    // Uses imported PRISMVerificationPluginEngine
    const startTime = Date.now();

    // Convert hyperMILL operation to PRISM OperationPoint
    const point = this.convertToOperationPoint(operation);
    const overlay = PRISMVerificationPluginEngine.analyzePoint(
      sessionData.prismSessionId,
      point
    );

    return this.convertToAnalysisResult(
      operation.operation_id,
      sessionData.prismSessionId,
      overlay,
      Date.now() - startTime
    );
  }

  /**
   * Batch analyze entire joblist
   */
  static analyzeJobList(
    projectId: string,
    joblist: HMJobList
  ): { results: HMAnalysisResult[]; summary: JobListSummary } {
    const results: HMAnalysisResult[] = [];
    let worstSafetyScore = 1.0;
    let totalMachiningTime = 0;
    let toolChanges = 0;
    const warnings: string[] = [];

    for (const operation of joblist.operations) {
      const result = this.analyzeOperationPreCalc(projectId, operation);
      results.push(result);

      if (result.safety_score.value < worstSafetyScore) {
        worstSafetyScore = result.safety_score.value;
      }

      toolChanges += result.tool_life.tool_changes_needed;

      if (result.safety_score.verdict !== "PASS") {
        warnings.push(
          `${operation.operation_name}: ${result.safety_score.verdict} — ${result.safety_score.limiting_factor}`
        );
      }
    }

    return {
      results,
      summary: {
        total_operations: joblist.operations.length,
        passed: results.filter((r) => r.safety_score.verdict === "PASS").length,
        warnings: results.filter((r) => r.safety_score.verdict === "WARNING").length,
        failed: results.filter((r) => r.safety_score.verdict === "FAIL").length,
        worst_safety_score: worstSafetyScore,
        estimated_tool_changes: toolChanges,
        critical_warnings: warnings,
        overall_verdict: worstSafetyScore >= 0.85 ? "APPROVED" : worstSafetyScore >= 0.70 ? "REVIEW" : "BLOCKED",
      },
    };
  }

  /**
   * Generate overlay data for simulation visualization
   */
  static getSimulationOverlay(
    projectId: string,
    operationId: string,
    timePoints: number[]
  ): SimulationOverlayData[] {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) return [];

    const operation = this.findOperation(sessionData.project, operationId);
    if (!operation) return [];

    // Uses imported PRISMVerificationPluginEngine
    const overlays: SimulationOverlayData[] = [];

    for (const time_s of timePoints) {
      const point = this.convertToOperationPoint(operation, time_s);
      const overlay = PRISMVerificationPluginEngine.analyzePoint(
        sessionData.prismSessionId,
        point
      );

      overlays.push({
        time_s,
        force_n: overlay.force.value,
        stable: overlay.chatter.stable,
        deflection_mm: overlay.deflection.value,
        temp_c: overlay.temperature.value,
        safety: overlay.safety_score.value,
        color: this.safetyToColor(overlay.safety_score.value),
      });
    }

    return overlays;
  }

  /**
   * Close project and finalize session
   */
  static onProjectClosed(projectId: string): { finalVerdict: string; report: unknown } | null {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) return null;

    // Uses imported PRISMVerificationPluginEngine
    const result = PRISMVerificationPluginEngine.completeSession(sessionData.prismSessionId);

    this.activeSessions.delete(projectId);

    return {
      finalVerdict: result.final_verdict,
      report: result,
    };
  }

  /**
   * Handle incoming plugin message
   */
  static handleMessage(message: HMPluginMessage): unknown {
    switch (message.message_type) {
      case "project_opened":
        return this.onProjectOpened(message.payload as unknown as HMProject);

      case "pre_calculate":
        return this.analyzeOperationPreCalc(
          message.payload.project_id as string,
          message.payload.operation as HMOperation
        );

      case "request_overlay":
        return this.getSimulationOverlay(
          message.payload.project_id as string,
          message.payload.operation_id as string,
          message.payload.time_points as number[]
        );

      default:
        return { status: "unhandled", message_type: message.message_type };
    }
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private static convertToOperationPoint(operation: HMOperation, time_s = 0) {
    return {
      operation_id: operation.operation_id,
      time_s,
      position: { x: 0, y: 0, z: 0 },
      cutting: {
        spindle_rpm: operation.spindle_rpm,
        feed_rate_mmpm: operation.feed_rate_mmpm,
        depth_of_cut_mm: operation.depth_of_cut_mm,
        width_of_cut_mm: operation.width_of_cut_mm,
      },
      tool: {
        tool_id: operation.tool.tool_id,
        diameter_mm: operation.tool.diameter_mm,
        flutes: operation.tool.flutes,
        material: operation.tool.material,
        overhang_mm: operation.tool.flute_length_mm,
      },
      material: {
        material_id: operation.stock.material_id,
        iso_group: operation.stock.iso_group,
      },
    };
  }

  private static convertToAnalysisResult(
    operationId: string,
    prismSessionId: string,
    overlay: unknown,
    analysisTimeMs: number
  ): HMAnalysisResult {
    const o = overlay as {
      force: { value: number; confidence: number };
      chatter: { stable: boolean; margin: number; recommended_rpm?: number };
      deflection: { value: number; limit_mm: number };
      temperature: { value: number };
      tool_life: { remaining_pct: number; operations_until_change?: number };
      safety_score: { value: number; verdict: string; limiting_factor: string };
    };

    return {
      operation_id: operationId,
      prism_session_id: prismSessionId,
      analysis_time_ms: analysisTimeMs,

      force: {
        peak_n: o.force.value,
        average_n: o.force.value * 0.7,
        confidence: o.force.confidence,
        within_limit: o.force.value < 5000,
      },

      chatter: {
        stable: o.chatter.stable,
        margin_pct: o.chatter.margin * 100,
        recommended_rpm: o.chatter.recommended_rpm ?? null,
      },

      deflection: {
        tool_mm: o.deflection.value,
        part_mm: o.deflection.value * 0.3,
        total_mm: o.deflection.value * 1.3,
        within_tolerance: o.deflection.value < o.deflection.limit_mm,
      },

      thermal: {
        peak_temp_c: o.temperature.value,
        damage_risk: o.temperature.value > 600 ? "high" : o.temperature.value > 400 ? "medium" : o.temperature.value > 250 ? "low" : "none",
      },

      tool_life: {
        operation_wear_pct: 100 - o.tool_life.remaining_pct,
        remaining_pct: o.tool_life.remaining_pct,
        tool_changes_needed: o.tool_life.operations_until_change ?? 0,
      },

      safety_score: {
        value: o.safety_score.value,
        verdict: o.safety_score.verdict as "PASS" | "WARNING" | "FAIL",
        limiting_factor: o.safety_score.limiting_factor,
      },

      recommendations: this.generateRecommendations(o),
    };
  }

  private static generateRecommendations(overlay: unknown): string[] {
    const recommendations: string[] = [];
    const o = overlay as {
      chatter: { stable: boolean; recommended_rpm?: number };
      deflection: { value: number; limit_mm: number };
      temperature: { value: number };
      tool_life: { remaining_pct: number };
      safety_score: { value: number };
    };

    if (!o.chatter.stable && o.chatter.recommended_rpm) {
      recommendations.push(`Adjust spindle to ${o.chatter.recommended_rpm} RPM for stability`);
    }

    if (o.deflection.value > o.deflection.limit_mm * 0.8) {
      recommendations.push("Reduce DOC or use shorter tool to decrease deflection");
    }

    if (o.temperature.value > 500) {
      recommendations.push("Enable through-tool coolant or reduce cutting speed");
    }

    if (o.tool_life.remaining_pct < 20) {
      recommendations.push("Tool approaching end of life — schedule replacement");
    }

    if (o.safety_score.value < 0.85) {
      recommendations.push("Review parameters — safety margin below recommended threshold");
    }

    return recommendations;
  }

  private static findOperation(project: HMProject, operationId: string): HMOperation | undefined {
    for (const joblist of project.joblists) {
      const op = joblist.operations.find((o) => o.operation_id === operationId);
      if (op) return op;
    }
    return undefined;
  }

  private static safetyToColor(safety: number): string {
    if (safety >= 0.85) return "#00FF00"; // Green
    if (safety >= 0.70) return "#FFFF00"; // Yellow
    return "#FF0000"; // Red
  }

  // ═════════════════════════════════════════════════════════════════════
  // U-CAM87-HM — Outbound XML-RPC envelope builders (PRISM → hyperMILL)
  // ═════════════════════════════════════════════════════════════════════
  //
  // Round-4 B1-NEW fix. Before U-CAM87-HM, hyperMILL adapter was inbound-
  // only (analyzeOperationPreCalc + analyzeJobList + getSimulationOverlay)
  // — hyperMILL notifying PRISM of events, no PRISM-driving-hyperMILL path.
  //
  // These builders produce XML-RPC methodCall envelopes that the compiled
  // HyperMillPRISMPlugin.dll (U-CAM86-DLL) consumes via hyperMILL's
  // Automation Center Python bridge. Separation-of-concerns pattern
  // identical to Fusion (U-CAM87-LIVE) and Mastercam (U-CAM89-EXTEND):
  // PRISM-side deterministic envelope building, DLL-side non-deterministic
  // SDK execution.
  //
  // Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.5-FOLLOWUP U-CAM87-HM.

  /** Next outbound XML-RPC call id (monotonic) */
  private static outboundXmlRpcId = 1;

  static buildOperationCreateEnvelope(params: {
    project_id: string;
    joblist_id: string;
    strategy:
      | "2d_pocket"
      | "2d_contour"
      | "3d_rough"
      | "3d_finish"
      | "3d_rest"
      | "5axis_swarf"
      | "5axis_morphing"
      | "drill"
      | "deep_drill"
      | "tap"
      | "thread_mill"
      | "bore";
    tool_id: string;
    geometry_refs: string[];
    parameters: {
      spindle_rpm: number;
      feed_rate_mmpm: number;
      doc_mm?: number;
      woc_mm?: number;
      coolant?: "flood" | "mist" | "through_tool" | "air" | "mql" | "none";
      stepdown_mm?: number;
      stepover_pct?: number;
    };
  }): {
    protocol: "xml-rpc-com";
    method: "om.cam.Operation.Create";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.tool_id) throw new Error("om.cam.Operation.Create requires tool_id");
    if (!params.geometry_refs || params.geometry_refs.length === 0) {
      throw new Error("om.cam.Operation.Create requires at least one geometry_ref");
    }
    if (!(params.parameters.spindle_rpm > 0)) {
      throw new Error("om.cam.Operation.Create requires positive spindle_rpm");
    }
    if (!(params.parameters.feed_rate_mmpm > 0)) {
      throw new Error("om.cam.Operation.Create requires positive feed_rate_mmpm");
    }
    return {
      protocol: "xml-rpc-com",
      method: "om.cam.Operation.Create",
      project_id: params.project_id,
      params,
      id: this.outboundXmlRpcId++,
    };
  }

  static buildStockEnvelope(params: {
    project_id: string;
    joblist_id: string;
    stock: {
      material: string;
      iso_group: "P" | "M" | "K" | "N" | "S" | "H";
      shape: "box" | "cylinder" | "from_geometry";
      dimensions?: { x: number; y: number; z: number };
      cylinder?: { diameter: number; length: number };
    };
  }): {
    protocol: "xml-rpc-com";
    method: "om.cam.Stock.Set";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.stock.material) throw new Error("om.cam.Stock.Set requires material");
    return {
      protocol: "xml-rpc-com",
      method: "om.cam.Stock.Set",
      project_id: params.project_id,
      params,
      id: this.outboundXmlRpcId++,
    };
  }

  static buildToolInstallEnvelope(params: {
    project_id: string;
    joblist_id: string;
    tool: {
      tool_id: string;
      tool_type: "end_mill" | "ball_mill" | "bull_nose" | "drill" | "tap" | "reamer" | "insert" | "thread_mill";
      diameter_mm: number;
      flutes?: number;
      corner_radius_mm?: number;
      material: "hss" | "carbide" | "ceramic" | "cbn" | "pcd";
      holder_id?: string;
    };
  }): {
    protocol: "xml-rpc-com";
    method: "om.cam.Tool.Install";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.tool.tool_id) throw new Error("om.cam.Tool.Install requires tool.tool_id");
    if (!(params.tool.diameter_mm > 0)) {
      throw new Error("om.cam.Tool.Install requires positive diameter_mm");
    }
    return {
      protocol: "xml-rpc-com",
      method: "om.cam.Tool.Install",
      project_id: params.project_id,
      params,
      id: this.outboundXmlRpcId++,
    };
  }

  static buildJobListEnvelope(params: {
    project_id: string;
    joblist_name: string;
    machine_id: string;
    post_processor_path?: string;
  }): {
    protocol: "xml-rpc-com";
    method: "om.cam.JobList.Create";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.machine_id) throw new Error("om.cam.JobList.Create requires machine_id");
    return {
      protocol: "xml-rpc-com",
      method: "om.cam.JobList.Create",
      project_id: params.project_id,
      params,
      id: this.outboundXmlRpcId++,
    };
  }

  static buildPostProcessEnvelope(params: {
    project_id: string;
    joblist_id: string;
    post_om_path: string;
    output_nc_path: string;
    controller_family: string;
    controller_model: string;
  }): {
    protocol: "xml-rpc-com";
    method: "om.cam.Post.Run";
    project_id: string;
    params: typeof params;
    id: number;
  } {
    if (!params.post_om_path) throw new Error("om.cam.Post.Run requires post_om_path");
    if (!params.output_nc_path) throw new Error("om.cam.Post.Run requires output_nc_path");
    return {
      protocol: "xml-rpc-com",
      method: "om.cam.Post.Run",
      project_id: params.project_id,
      params,
      id: this.outboundXmlRpcId++,
    };
  }

  /** Reset the outbound XML-RPC id counter — test-only utility. */
  static __resetOutboundXmlRpcId(): void {
    this.outboundXmlRpcId = 1;
  }
}

// ── Supporting Types ────────────────────────────────────────────────────────

export interface JobListSummary {
  total_operations: number;
  passed: number;
  warnings: number;
  failed: number;
  worst_safety_score: number;
  estimated_tool_changes: number;
  critical_warnings: string[];
  overall_verdict: "APPROVED" | "REVIEW" | "BLOCKED";
}

export interface SimulationOverlayData {
  time_s: number;
  force_n: number;
  stable: boolean;
  deflection_mm: number;
  temp_c: number;
  safety: number;
  color: string;
}

// ── Singleton Export ────────────────────────────────────────────────────────

export const hyperMillPluginAdapterEngine = new (HyperMillPluginAdapterEngine as unknown as { new(): HyperMillPluginAdapterEngine })();
