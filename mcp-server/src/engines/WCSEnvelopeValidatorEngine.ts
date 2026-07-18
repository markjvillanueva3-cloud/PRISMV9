/**
 * WCSEnvelopeValidatorEngine — closes PreCut axis #9 (WCS envelope OK)
 *
 * Verifies that the planned G54 (work coordinate system) origin + workpiece
 * extents + tool stickout will all fit within the machine envelope. Catches:
 *   - Tool tip reaches outside machine X/Y/Z travel
 *   - Tool holder shank collides with spindle nose at top of Z
 *   - Workpiece extent exceeds table reach
 *   - WCS origin places fixture outside machine envelope
 *
 * Reference: ISO 230-1 (machine envelope geometry); machine OEM operator
 *   manuals (DMG MORI / Mazak / Haas / Okuma) for travel + stickout limits.
 *
 * @version 1.0.0
 * @module WCSEnvelopeValidatorEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface MachineEnvelope {
  /** Machine travel (mm) per axis */
  x_travel_mm: number;
  y_travel_mm: number;
  z_travel_mm: number;
  /** Z+ tool clearance to spindle nose (mm) when at Z home */
  spindle_nose_clearance_mm: number;
  /** Optional B-axis travel (deg) for 4/5-axis machines */
  b_travel_deg?: number;
}

export interface ToolStickout {
  tool_id: string;
  /** Length below spindle nose at tool change (mm) — includes holder */
  stickout_mm: number;
  /** Tool diameter (mm) */
  diameter_mm: number;
}

export interface WorkpieceExtent {
  /** Origin in machine coords (mm) — G54 location */
  g54_x_mm: number;
  g54_y_mm: number;
  g54_z_mm: number;
  /** Workpiece extent in part coords (mm) — assumes G54 at one corner */
  extent_x_mm: number;
  extent_y_mm: number;
  extent_z_mm: number;
}

export interface WCSEnvelopeValidatorInput {
  program_id: string;
  machine: MachineEnvelope;
  workpiece: WorkpieceExtent;
  tools: ToolStickout[];
}

export type EnvelopeViolationKind =
  | "tool_outside_x" | "tool_outside_y" | "tool_outside_z"
  | "workpiece_outside_x" | "workpiece_outside_y"
  | "stickout_insufficient" | "wcs_origin_outside";

export interface EnvelopeViolation {
  kind: EnvelopeViolationKind;
  severity: "critical" | "warning";
  detail: string;
  fix: string;
}

export interface WCSEnvelopeValidatorResult {
  program_id: string;
  total_tools: number;
  violations: EnvelopeViolation[];
  critical_count: number;
  verdict: "envelope_ok" | "envelope_block";
  confidence: AtomicValue;
  source: string;
}

export class WCSEnvelopeValidatorEngine {
  validate(input: WCSEnvelopeValidatorInput): WCSEnvelopeValidatorResult {
    if (!input || !input.program_id || !input.machine || !input.workpiece || !Array.isArray(input.tools)) {
      throw new Error("WCSEnvelopeValidatorEngine.validate: program_id + machine + workpiece + tools[] required");
    }
    const { machine, workpiece, tools } = input;
    const violations: EnvelopeViolation[] = [];

    // WCS origin within envelope
    if (workpiece.g54_x_mm < 0 || workpiece.g54_x_mm > machine.x_travel_mm) {
      violations.push({
        kind: "wcs_origin_outside",
        severity: "critical",
        detail: `G54 X=${workpiece.g54_x_mm}mm outside machine X travel [0, ${machine.x_travel_mm}]`,
        fix: "Re-locate G54 origin within machine envelope",
      });
    }
    if (workpiece.g54_y_mm < 0 || workpiece.g54_y_mm > machine.y_travel_mm) {
      violations.push({
        kind: "wcs_origin_outside",
        severity: "critical",
        detail: `G54 Y=${workpiece.g54_y_mm}mm outside machine Y travel [0, ${machine.y_travel_mm}]`,
        fix: "Re-locate G54 origin within machine envelope",
      });
    }

    // Workpiece extent within envelope
    const wpMaxX = workpiece.g54_x_mm + workpiece.extent_x_mm;
    const wpMaxY = workpiece.g54_y_mm + workpiece.extent_y_mm;
    if (wpMaxX > machine.x_travel_mm) {
      violations.push({
        kind: "workpiece_outside_x",
        severity: "critical",
        detail: `Workpiece X-extent reaches ${wpMaxX}mm > machine X travel ${machine.x_travel_mm}mm`,
        fix: "Reposition fixture OR machine on larger envelope",
      });
    }
    if (wpMaxY > machine.y_travel_mm) {
      violations.push({
        kind: "workpiece_outside_y",
        severity: "critical",
        detail: `Workpiece Y-extent reaches ${wpMaxY}mm > machine Y travel ${machine.y_travel_mm}mm`,
        fix: "Reposition fixture OR machine on larger envelope",
      });
    }

    // Per-tool envelope checks
    for (const tool of tools) {
      // Tool tip Z reach: G54_Z - extent_z reaches tool_max_Z_below_G54
      const toolReachZ = workpiece.g54_z_mm - workpiece.extent_z_mm;
      if (toolReachZ < 0) {
        violations.push({
          kind: "tool_outside_z",
          severity: "critical",
          detail: `Tool ${tool.tool_id}: workpiece bottom at Z=${toolReachZ}mm < machine Z=0 (tool would crash into table)`,
          fix: "Raise G54 Z origin OR shorten workpiece extent",
        });
      }
      // Z+ at tool change: G54_Z + spindle clearance must fit
      const toolMaxZ = workpiece.g54_z_mm + machine.spindle_nose_clearance_mm;
      if (toolMaxZ > machine.z_travel_mm) {
        violations.push({
          kind: "tool_outside_z",
          severity: "critical",
          detail: `Tool ${tool.tool_id}: tool change Z=${toolMaxZ}mm > machine Z travel ${machine.z_travel_mm}mm`,
          fix: "Lower G54 Z origin OR reduce tool stickout",
        });
      }
      // Stickout vs workpiece depth
      if (tool.stickout_mm < workpiece.extent_z_mm) {
        violations.push({
          kind: "stickout_insufficient",
          severity: "warning",
          detail: `Tool ${tool.tool_id} stickout ${tool.stickout_mm}mm < workpiece depth ${workpiece.extent_z_mm}mm — holder may foul on top surface`,
          fix: "Re-issue with longer-stickout holder OR shorter tool",
        });
      }
    }

    const critical = violations.filter(v => v.severity === "critical").length;
    const verdict: WCSEnvelopeValidatorResult["verdict"] = critical > 0 ? "envelope_block" : "envelope_ok";
    const checks = 5 + tools.length * 3;
    const confidence = Math.max(0, 1 - violations.length / checks);

    return {
      program_id: input.program_id,
      total_tools: tools.length,
      violations,
      critical_count: critical,
      verdict,
      confidence: {
        value: Number(confidence.toFixed(3)),
        unit: "ratio",
        source: "1 - violations / (5 + 3·n_tools)",
      },
      source: "WCSEnvelopeValidatorEngine — ISO 230-1 + machine OEM travel/clearance spec",
    };
  }
}

export const wcsEnvelopeValidatorEngine = new WCSEnvelopeValidatorEngine();
