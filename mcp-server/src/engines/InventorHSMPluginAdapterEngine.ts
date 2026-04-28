/**
 * InventorHSMPluginAdapterEngine — Autodesk Inventor HSM COM Add-in Bridge (U-CAM88)
 * ====================================================================================
 *
 * Adapts PRISMVerificationPluginEngine for Autodesk Inventor HSM (Inventor CAM) via:
 *   - COM Add-in: PRISMInventorHSMAddin.dll (IStandardAddInServer)
 *   - iLogic rule integration (parametric rule-based verification)
 *   - HSMWorks CAM API (Autodesk.HSM.DOM namespace)
 *
 * Inventor HSM API Structure:
 *   - Inventor.Document: root iPart/iAssembly document
 *   - HSM.CAMSetup: machining setup (stock, WCS, fixture)
 *   - HSM.Operation: individual machining op (2D/3D/turning/probing/iMachining)
 *   - HSM.ToolLibrary: tool crib access
 *   - iLogic Rule: parametric verification hook (VB.NET-like)
 *
 * Integration Points:
 *   - Add-in Activate: Register COM listeners for HSM events
 *   - Setup creation: Inject iLogic rule for pre-flight checks
 *   - Operation modified: Physics analysis via COM → PRISM bridge
 *   - Generate NC: Inject PRISM-verified comments into post output
 *   - iLogic rule trigger: Bidirectional parameter updates
 *
 * Inventor HSM vs Fusion 360 CAM:
 *   - HSM inherits SolidCAM's iMachining 2D/3D (trochoidal adaptive)
 *   - iLogic rules are unique to Inventor (parametric VB.NET scripting)
 *   - COM Add-in protocol (not WebSocket) — synchronous calls
 *   - Supports iPart/iAssembly families (parameter-driven part variations)
 *
 * References:
 *   - Inventor iLogic Developer Guide (Autodesk)
 *   - HSMWorks API Reference
 *   - SolidCAM iMachining algorithm (integrated into HSM)
 *
 * @module engines/InventorHSMPluginAdapterEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM88
 */

import { z } from "zod";
import { PRISMVerificationPluginEngine } from "./PRISMVerificationPluginEngine.js";

// ── Inventor HSM Data Schemas ───────────────────────────────────────────────

export const HSMToolSchema = z.object({
  tool_id: z.string(),
  tool_number: z.number(),
  tool_type: z.enum([
    "flat end mill", "ball end mill", "bull nose end mill", "face mill",
    "chamfer mill", "thread mill", "drill", "center drill", "spot drill",
    "tap", "reamer", "boring bar", "probe", "turning general",
    "turning threading", "turning grooving", "turning boring",
    "lollipop mill", "radius mill", "slot mill", "dovetail mill", "form mill"
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
  /** HSM supports custom tool assemblies with multiple segments */
  segments: z.array(z.object({
    type: z.enum(["shaft", "shoulder", "cutting"]),
    length: z.number().positive(),
    diameter: z.number().positive(),
  })).optional(),
});

export const HSMFixtureSchema = z.object({
  fixture_id: z.string(),
  fixture_type: z.enum(["vise", "chuck", "collet", "plate", "custom"]),
  model_reference: z.string().optional().describe("iPart/iAssembly reference"),
  /** iLogic parameter bindings — fixture dimensions driven by part params */
  ilogic_params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const HSMSetupSchema = z.object({
  setup_id: z.string(),
  setup_name: z.string(),
  setup_type: z.enum(["milling", "turning", "probing", "cutting", "mill_turn"]),
  stock_mode: z.enum(["fixed size box", "relative size box", "from solid", "from model"]),
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
  fixture: HSMFixtureSchema.optional(),
  /** iLogic pre-flight rule — runs before operation analysis */
  ilogic_preflight_rule: z.string().optional(),
});

export const HSMOperationSchema = z.object({
  operation_id: z.string(),
  operation_name: z.string(),
  strategy: z.enum([
    // 2D strategies
    "adaptive2d", "pocket2d", "contour2d", "face", "slot", "bore", "trace",
    "thread", "chamfer2d", "engrave", "circular", "drill",
    // 3D strategies
    "adaptive3d", "pocket3d", "parallel", "contour3d", "scallop", "pencil",
    "radial", "spiral", "morphed_spiral", "steep_and_shallow", "horizontal", "ramp",
    // Multi-axis
    "swarf", "multi_axis_contour", "flow", "rotary",
    // Turning
    "profile_roughing", "profile_finishing", "face_turning", "groove",
    "thread_turning", "cutoff", "part_off",
    // Probing
    "probe_wcs", "probe_geometry", "probe_surface",
    // iMachining (SolidCAM technology in HSM)
    "imachining_2d", "imachining_3d", "imachining_rest"
  ]),
  tool: HSMToolSchema,
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
  /** iMachining-specific parameters (when strategy is imachining_*) */
  imachining: z.object({
    machining_level: z.number().int().min(1).max(8).describe("iMachining aggressiveness 1-8"),
    material_technology_id: z.string().optional(),
    wall_quality: z.enum(["rough", "semi_finish", "finish"]).optional(),
  }).optional(),
  /** iLogic rule for parametric operation verification */
  ilogic_verify_rule: z.string().optional(),
});

export const HSMProjectSchema = z.object({
  project_id: z.string(),
  project_name: z.string(),
  ipart_filename: z.string().describe("Inventor .ipt/.iam file reference"),
  is_ipart_family: z.boolean().default(false).describe("True for iPart family member"),
  active_ipart_member: z.string().optional().describe("Active member name if iPart family"),
  machine_id: z.string().optional(),
  setups: z.array(HSMSetupSchema),
  operations: z.array(HSMOperationSchema),
  /** Global iLogic parameters (drive fixture/part/operation dimensions) */
  ilogic_parameters: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

// ── Type exports ────────────────────────────────────────────────────────────

export type HSMTool = z.infer<typeof HSMToolSchema>;
export type HSMFixture = z.infer<typeof HSMFixtureSchema>;
export type HSMSetup = z.infer<typeof HSMSetupSchema>;
export type HSMOperation = z.infer<typeof HSMOperationSchema>;
export type HSMProject = z.infer<typeof HSMProjectSchema>;

// ── COM Message Protocol (Synchronous) ──────────────────────────────────────

export const HSMCOMRequestSchema = z.object({
  method: z.enum([
    "addin.activate",
    "project.opened",
    "setup.created",
    "setup.modified",
    "operation.created",
    "operation.modified",
    "toolpath.generating",
    "toolpath.generated",
    "postprocess.start",
    "postprocess.complete",
    "ilogic.rule_trigger",
    "ipart.member_changed",
    "analysis.request"
  ]),
  params: z.record(z.string(), z.unknown()),
  sequence_id: z.number(),
});

export type HSMCOMRequest = z.infer<typeof HSMCOMRequestSchema>;

// ── iLogic Rule Result ──────────────────────────────────────────────────────

export interface ILogicRuleResult {
  rule_name: string;
  passed: boolean;
  parameter_updates: Record<string, string | number>;
  messages: string[];
  severity: "INFO" | "WARNING" | "ERROR";
}

// ── Analysis Results ────────────────────────────────────────────────────────

export interface HSMAnalysisResult {
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
    suggested_imachining_level: number | null;
    rationale: string[];
  };

  safety: {
    score: number;
    verdict: "PASS" | "WARNING" | "FAIL";
    hard_stop: boolean;
    limiting_factor: string;
  };

  ilogic_annotations: {
    /** iLogic-compatible parameter updates (param name → new value) */
    parameter_updates: Record<string, string | number>;
    /** Generated iLogic rule body to inject into iPart */
    verification_rule: string;
    /** Comment text to inject into NC output */
    nc_comment: string;
  };
}

// ── Engine Implementation ───────────────────────────────────────────────────

export class InventorHSMPluginAdapterEngine {
  private static activeSessions: Map<string, { project: HSMProject; prismSessionId: string }> = new Map();

  /**
   * Handle project opened event from Inventor HSM COM add-in
   */
  static onProjectOpened(project: HSMProject): { prismSessionId: string; status: string } {
    const session = PRISMVerificationPluginEngine.createSession({
      cam_system: "inventor_hsm",
      part_number: project.ipart_filename,
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
   * Analyze operation before HSM generates toolpath
   */
  static analyzeOperation(
    projectId: string,
    operation: HSMOperation
  ): HSMAnalysisResult {
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
  static analyzeProject(projectId: string): HSMProjectAnalysis {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      throw new Error(`No active PRISM session for project ${projectId}`);
    }

    const results: HSMAnalysisResult[] = [];
    let worstSafety = 1.0;
    const operationsBySetup = new Map<string, number>();
    const iMachiningOps = sessionData.project.operations.filter((o) => o.strategy.startsWith("imachining")).length;

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
      imachining_operations: iMachiningOps,
      is_ipart_family: sessionData.project.is_ipart_family,
      active_ipart_member: sessionData.project.active_ipart_member,
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
   * Trigger iLogic rule evaluation — parameter-driven verification
   * Called when Inventor detects parameter changes in iPart/iAssembly
   */
  static triggerILogicRule(
    projectId: string,
    ruleName: string,
    parameters: Record<string, string | number>
  ): ILogicRuleResult {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      return {
        rule_name: ruleName,
        passed: false,
        parameter_updates: {},
        messages: [`No active PRISM session for project ${projectId}`],
        severity: "ERROR",
      };
    }

    // Re-analyze project with new parameters — iLogic rule returns
    // parameter updates derived from worst-case physics across project
    const analysis = this.analyzeProject(projectId);
    const parameterUpdates: Record<string, string | number> = {};
    const messages: string[] = [];

    // Collect suggested parameter updates from all operations
    for (const result of analysis.results) {
      if (result.recommendations.suggested_spindle_speed !== null) {
        parameterUpdates[`${result.operation_id}_rpm`] = result.recommendations.suggested_spindle_speed;
      }
      if (result.recommendations.suggested_feedrate !== null) {
        parameterUpdates[`${result.operation_id}_feed`] = result.recommendations.suggested_feedrate;
      }
      if (result.recommendations.rationale.length > 0) {
        messages.push(...result.recommendations.rationale.map((r) => `[${result.operation_id}] ${r}`));
      }
    }

    const severity: "INFO" | "WARNING" | "ERROR" =
      analysis.summary.overall_verdict === "BLOCKED" ? "ERROR" :
      analysis.summary.overall_verdict === "REVIEW" ? "WARNING" : "INFO";

    return {
      rule_name: ruleName,
      passed: analysis.summary.overall_verdict !== "BLOCKED",
      parameter_updates: { ...parameters, ...parameterUpdates },
      messages,
      severity,
    };
  }

  /**
   * Handle iPart member change — re-analyze with new member parameters
   */
  static onIPartMemberChanged(
    projectId: string,
    newMemberName: string,
    newParameters: Record<string, string | number>
  ): { re_verified: boolean; analysis: HSMProjectAnalysis | null } {
    const sessionData = this.activeSessions.get(projectId);
    if (!sessionData) {
      return { re_verified: false, analysis: null };
    }

    // Update active member
    sessionData.project.active_ipart_member = newMemberName;
    sessionData.project.ilogic_parameters = {
      ...sessionData.project.ilogic_parameters,
      ...newParameters,
    };

    const analysis = this.analyzeProject(projectId);
    return { re_verified: true, analysis };
  }

  /**
   * Handle COM request from Inventor HSM add-in
   */
  static handleCOMRequest(request: HSMCOMRequest): {
    success: boolean;
    result?: unknown;
    error?: string;
    sequence_id: number;
  } {
    try {
      let result: unknown;

      switch (request.method) {
        case "addin.activate":
          result = { activated: true, version: "1.0.0" };
          break;

        case "project.opened":
          result = this.onProjectOpened(request.params as unknown as HSMProject);
          break;

        case "operation.created":
        case "operation.modified":
          result = this.analyzeOperation(
            request.params.project_id as string,
            request.params.operation as HSMOperation
          );
          break;

        case "toolpath.generating":
          result = this.analyzeProject(request.params.project_id as string);
          break;

        case "postprocess.start":
          result = this.generateNCHeader(request.params.project_id as string);
          break;

        case "ilogic.rule_trigger":
          result = this.triggerILogicRule(
            request.params.project_id as string,
            request.params.rule_name as string,
            request.params.parameters as Record<string, string | number>
          );
          break;

        case "ipart.member_changed":
          result = this.onIPartMemberChanged(
            request.params.project_id as string,
            request.params.new_member_name as string,
            request.params.new_parameters as Record<string, string | number>
          );
          break;

        default:
          return {
            success: false,
            error: `Method not found: ${request.method}`,
            sequence_id: request.sequence_id,
          };
      }

      return { success: true, result, sequence_id: request.sequence_id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
        sequence_id: request.sequence_id,
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
      `(  Project: ${sessionData.project.ipart_filename})`,
      `(  Session: ${sessionData.prismSessionId})`,
      `(  Timestamp: ${new Date().toISOString()})`,
      `(  Operations: ${analysis.total_operations} verified)`,
    ];

    if (sessionData.project.is_ipart_family && sessionData.project.active_ipart_member) {
      lines.push(`(  iPart Member: ${sessionData.project.active_ipart_member})`);
    }

    if (analysis.imachining_operations > 0) {
      lines.push(`(  iMachining Ops: ${analysis.imachining_operations})`);
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

  // ── Private Helpers ───────────────────────────────────────────────────────

  private static convertToOperationPoint(
    operation: HSMOperation,
    setup: HSMSetup
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
    operation: HSMOperation,
    prismSessionId: string,
    overlay: unknown,
    analysisTimeMs: number
  ): HSMAnalysisResult {
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
    let suggestedIMachiningLevel: number | null = null;

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

    // iMachining-specific: downgrade aggressiveness level on instability
    if (operation.imachining && (!o.chatter.stable || o.force.value > 4000)) {
      const currentLevel = operation.imachining.machining_level;
      suggestedIMachiningLevel = Math.max(1, currentLevel - 2);
      rationale.push(`iMachining L${currentLevel} → L${suggestedIMachiningLevel} for stability`);
    }

    const parameterUpdates: Record<string, string | number> = {};
    if (suggestedSpindle !== null) parameterUpdates[`${operation.operation_id}_rpm`] = suggestedSpindle;
    if (suggestedFeedrate !== null) parameterUpdates[`${operation.operation_id}_feed`] = suggestedFeedrate;
    if (suggestedStepdown !== null) parameterUpdates[`${operation.operation_id}_stepdown`] = suggestedStepdown;
    if (suggestedIMachiningLevel !== null) parameterUpdates[`${operation.operation_id}_imachining_level`] = suggestedIMachiningLevel;

    const verificationRule = this.generateILogicRule(operation, o.safety_score.verdict, rationale);
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
        suggested_imachining_level: suggestedIMachiningLevel,
        rationale,
      },

      safety: {
        score: o.safety_score.value,
        verdict: o.safety_score.verdict as "PASS" | "WARNING" | "FAIL",
        hard_stop: o.safety_score.hard_stop,
        limiting_factor: o.safety_score.limiting_factor,
      },

      ilogic_annotations: {
        parameter_updates: parameterUpdates,
        verification_rule: verificationRule,
        nc_comment: ncComment,
      },
    };
  }

  /**
   * Generate iLogic rule body (VB.NET-like syntax) for embedding in iPart
   * Rule fires when parameters change — re-validates against PRISM physics
   */
  private static generateILogicRule(
    operation: HSMOperation,
    verdict: string,
    rationale: string[]
  ): string {
    const lines = [
      `' PRISM-generated iLogic verification rule for ${operation.operation_id}`,
      `' Verdict: ${verdict}`,
      `Sub Main()`,
      `    Dim opId As String = "${operation.operation_id}"`,
      `    Dim verdict As String = "${verdict}"`,
      ``,
      `    ' Physics verdict from PRISM`,
      `    If verdict = "FAIL" Then`,
      `        MessageBox.Show("PRISM: Operation " & opId & " failed safety check. Review rationale.", "PRISM Safety", MessageBoxButtons.OK, MessageBoxIcon.Error)`,
      `    ElseIf verdict = "WARNING" Then`,
      `        MessageBox.Show("PRISM: Operation " & opId & " has warnings.", "PRISM Safety", MessageBoxButtons.OK, MessageBoxIcon.Warning)`,
      `    End If`,
      ``,
    ];

    if (rationale.length > 0) {
      lines.push(`    ' Recommendations:`);
      for (const r of rationale) {
        lines.push(`    ' - ${r}`);
      }
      lines.push(``);
    }

    lines.push(`End Sub`);
    return lines.join("\n");
  }

  // ═════════════════════════════════════════════════════════════════════
  // U-CAM87-HSM — Outbound iLogic envelope builders (PRISM → Inventor HSM)
  // ═════════════════════════════════════════════════════════════════════
  //
  // Round-4 B2-NEW fix. Inventor HSM is COM + iLogic; unlike Fusion's
  // JSON-RPC or Mastercam's NET-Hook, HSM mutations happen via iLogic VB.NET
  // rule text + parameter bindings. Each builder emits the rule snippet the
  // HSM plugin appends to the active document's iLogic rule set, plus a
  // parameter-update bundle. The plugin replays them via HSM's COM API.
  //
  // Separation-of-concerns pattern identical to Fusion/Mastercam: PRISM
  // builds deterministic envelopes (hermetic-testable), plugin executes them
  // against live Inventor HSM.
  //
  // Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.5-FOLLOWUP U-CAM87-HSM.

  private static outboundIlogicId = 1;

  static buildSetupCreateEnvelope(params: {
    project_id: string;
    setup_name: string;
    wcs: { origin: { x: number; y: number; z: number }; x_axis?: string; z_axis?: string };
    stock_mode: "box" | "cylinder" | "from_part";
    stock_dimensions?: { x: number; y: number; z: number };
    stock_material_id?: string;
  }): {
    protocol: "com-ilogic";
    method: "HSM.Setup.Create";
    project_id: string;
    params: typeof params;
    ilogic_rule: string;
    id: number;
  } {
    if (!params.setup_name) throw new Error("HSM.Setup.Create requires setup_name");
    const rule = [
      `Sub Main()`,
      `  Dim hsm = ThisApplication.CommandManager.GetAddIn("HSM").Automation`,
      `  Dim setup = hsm.Setups.Add("${params.setup_name.replace(/"/g, '\\"')}")`,
      `  setup.WCS.Origin.Set(${params.wcs.origin.x}, ${params.wcs.origin.y}, ${params.wcs.origin.z})`,
      `  setup.Stock.Mode = "${params.stock_mode}"`,
      params.stock_dimensions
        ? `  setup.Stock.Dimensions.Set(${params.stock_dimensions.x}, ${params.stock_dimensions.y}, ${params.stock_dimensions.z})`
        : `  ' stock_dimensions not set`,
      params.stock_material_id
        ? `  setup.Stock.MaterialId = "${params.stock_material_id}"`
        : `  ' stock_material_id not set`,
      `End Sub`,
    ].join("\n");
    return {
      protocol: "com-ilogic",
      method: "HSM.Setup.Create",
      project_id: params.project_id,
      params,
      ilogic_rule: rule,
      id: this.outboundIlogicId++,
    };
  }

  static buildOperationCreateEnvelope(params: {
    project_id: string;
    setup_id: string;
    strategy:
      | "adaptive_clearing"
      | "pocket_2d"
      | "contour_2d"
      | "parallel_3d"
      | "scallop_3d"
      | "pencil_3d"
      | "drill"
      | "bore"
      | "thread_mill"
      | "imachining_2d"
      | "imachining_3d";
    tool_id: string;
    geometry_refs: string[];
    parameters: {
      spindle_speed: number;
      cutting_feedrate: number;
      plunge_feedrate?: number;
      ramp_feedrate?: number;
      stepdown?: number;
      stepover?: number;
      coolant?: "flood" | "mist" | "through_tool" | "off";
    };
  }): {
    protocol: "com-ilogic";
    method: "HSM.Operation.Create";
    project_id: string;
    params: typeof params;
    ilogic_rule: string;
    id: number;
  } {
    if (!params.tool_id) throw new Error("HSM.Operation.Create requires tool_id");
    if (!params.geometry_refs || params.geometry_refs.length === 0) {
      throw new Error("HSM.Operation.Create requires at least one geometry_ref");
    }
    if (!(params.parameters.spindle_speed > 0)) {
      throw new Error("HSM.Operation.Create requires positive spindle_speed");
    }
    if (!(params.parameters.cutting_feedrate > 0)) {
      throw new Error("HSM.Operation.Create requires positive cutting_feedrate");
    }
    const geoList = params.geometry_refs.map((g) => `"${g.replace(/"/g, '\\"')}"`).join(", ");
    const rule = [
      `Sub Main()`,
      `  Dim hsm = ThisApplication.CommandManager.GetAddIn("HSM").Automation`,
      `  Dim setup = hsm.Setups.ItemById("${params.setup_id.replace(/"/g, '\\"')}")`,
      `  Dim op = setup.Operations.Add("${params.strategy}")`,
      `  op.ToolId = "${params.tool_id.replace(/"/g, '\\"')}"`,
      `  op.Geometry.SetRefs(Array(${geoList}))`,
      `  op.Spindle.SpeedRPM = ${params.parameters.spindle_speed}`,
      `  op.Feed.CuttingMMPerMin = ${params.parameters.cutting_feedrate}`,
      params.parameters.plunge_feedrate !== undefined
        ? `  op.Feed.PlungeMMPerMin = ${params.parameters.plunge_feedrate}`
        : `  ' plunge_feedrate not set`,
      params.parameters.stepdown !== undefined
        ? `  op.Geometry.StepDown = ${params.parameters.stepdown}`
        : `  ' stepdown not set`,
      params.parameters.stepover !== undefined
        ? `  op.Geometry.StepOver = ${params.parameters.stepover}`
        : `  ' stepover not set`,
      params.parameters.coolant
        ? `  op.Coolant.Mode = "${params.parameters.coolant}"`
        : `  ' coolant not set`,
      `End Sub`,
    ].join("\n");
    return {
      protocol: "com-ilogic",
      method: "HSM.Operation.Create",
      project_id: params.project_id,
      params,
      ilogic_rule: rule,
      id: this.outboundIlogicId++,
    };
  }

  static buildToolLibraryAddEnvelope(params: {
    project_id: string;
    tool: {
      tool_id: string;
      tool_type: "endmill" | "ballmill" | "bullnose" | "drill" | "tap" | "reamer" | "insert";
      diameter_mm: number;
      flutes?: number;
      corner_radius_mm?: number;
      material: "hss" | "carbide" | "ceramic" | "cbn" | "pcd";
      holder_id?: string;
    };
  }): {
    protocol: "com-ilogic";
    method: "HSM.ToolLibrary.Add";
    project_id: string;
    params: typeof params;
    ilogic_rule: string;
    id: number;
  } {
    if (!params.tool.tool_id) throw new Error("HSM.ToolLibrary.Add requires tool.tool_id");
    if (!(params.tool.diameter_mm > 0)) throw new Error("HSM.ToolLibrary.Add requires positive diameter_mm");
    const rule = [
      `Sub Main()`,
      `  Dim hsm = ThisApplication.CommandManager.GetAddIn("HSM").Automation`,
      `  Dim tool = hsm.ToolLibrary.Add("${params.tool.tool_id}", "${params.tool.tool_type}")`,
      `  tool.Diameter = ${params.tool.diameter_mm}`,
      `  tool.Material = "${params.tool.material}"`,
      params.tool.flutes !== undefined ? `  tool.Flutes = ${params.tool.flutes}` : `  ' flutes not set`,
      params.tool.corner_radius_mm !== undefined
        ? `  tool.CornerRadius = ${params.tool.corner_radius_mm}`
        : `  ' corner_radius_mm not set`,
      params.tool.holder_id ? `  tool.HolderId = "${params.tool.holder_id}"` : `  ' holder_id not set`,
      `End Sub`,
    ].join("\n");
    return {
      protocol: "com-ilogic",
      method: "HSM.ToolLibrary.Add",
      project_id: params.project_id,
      params,
      ilogic_rule: rule,
      id: this.outboundIlogicId++,
    };
  }

  static buildStockSetupEnvelope(params: {
    project_id: string;
    setup_id: string;
    stock: {
      mode: "box" | "cylinder" | "from_part";
      dimensions?: { x: number; y: number; z: number };
      cylinder?: { diameter: number; length: number };
      material_id?: string;
      hardness_hrc?: number;
    };
  }): {
    protocol: "com-ilogic";
    method: "HSM.Stock.Update";
    project_id: string;
    params: typeof params;
    ilogic_rule: string;
    id: number;
  } {
    const rule = [
      `Sub Main()`,
      `  Dim hsm = ThisApplication.CommandManager.GetAddIn("HSM").Automation`,
      `  Dim setup = hsm.Setups.ItemById("${params.setup_id.replace(/"/g, '\\"')}")`,
      `  setup.Stock.Mode = "${params.stock.mode}"`,
      params.stock.dimensions
        ? `  setup.Stock.Dimensions.Set(${params.stock.dimensions.x}, ${params.stock.dimensions.y}, ${params.stock.dimensions.z})`
        : `  ' dimensions not set`,
      params.stock.cylinder
        ? `  setup.Stock.CylinderDiameter = ${params.stock.cylinder.diameter} : setup.Stock.CylinderLength = ${params.stock.cylinder.length}`
        : `  ' cylinder not set`,
      params.stock.material_id ? `  setup.Stock.MaterialId = "${params.stock.material_id}"` : `  ' material_id not set`,
      params.stock.hardness_hrc !== undefined ? `  setup.Stock.HardnessHRC = ${params.stock.hardness_hrc}` : `  ' hardness not set`,
      `End Sub`,
    ].join("\n");
    return {
      protocol: "com-ilogic",
      method: "HSM.Stock.Update",
      project_id: params.project_id,
      params,
      ilogic_rule: rule,
      id: this.outboundIlogicId++,
    };
  }

  static buildPostProcessEnvelope(params: {
    project_id: string;
    setup_id: string;
    post_cps_path: string;
    output_nc_path: string;
    target_machine_id: string;
  }): {
    protocol: "com-ilogic";
    method: "HSM.Post.Run";
    project_id: string;
    params: typeof params;
    ilogic_rule: string;
    id: number;
  } {
    if (!params.post_cps_path) throw new Error("HSM.Post.Run requires post_cps_path");
    if (!params.output_nc_path) throw new Error("HSM.Post.Run requires output_nc_path");
    const rule = [
      `Sub Main()`,
      `  Dim hsm = ThisApplication.CommandManager.GetAddIn("HSM").Automation`,
      `  Dim setup = hsm.Setups.ItemById("${params.setup_id.replace(/"/g, '\\"')}")`,
      `  hsm.PostProcessor.Load("${params.post_cps_path.replace(/\\/g, '\\\\')}")`,
      `  hsm.PostProcessor.RunAgainst(setup, "${params.output_nc_path.replace(/\\/g, '\\\\')}")`,
      `End Sub`,
    ].join("\n");
    return {
      protocol: "com-ilogic",
      method: "HSM.Post.Run",
      project_id: params.project_id,
      params,
      ilogic_rule: rule,
      id: this.outboundIlogicId++,
    };
  }

  /** Reset the outbound iLogic id counter — test-only utility. */
  static __resetOutboundIlogicId(): void {
    this.outboundIlogicId = 1;
  }
}

// ── Supporting Types ────────────────────────────────────────────────────────

export interface HSMProjectAnalysis {
  project_id: string;
  prism_session_id: string;
  total_operations: number;
  total_setups: number;
  imachining_operations: number;
  is_ipart_family: boolean;
  active_ipart_member?: string;
  results: HSMAnalysisResult[];
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

export const inventorHSMPluginAdapterEngine = new (InventorHSMPluginAdapterEngine as unknown as { new(): InventorHSMPluginAdapterEngine })();
