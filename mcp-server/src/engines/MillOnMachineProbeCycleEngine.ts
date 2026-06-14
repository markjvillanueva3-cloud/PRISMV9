/**
 * MillOnMachineProbeCycleEngine
 * ================================
 *
 * Library of on-machine-verification (OMV) probe cycles for milling
 * machines. Mill parity for LatheOnMachineProbeCycleEngine but with the
 * full XYZ Cartesian probe-cycle taxonomy substituted for lathe's
 * X/Z-only set.
 *
 * Cycles supported (10, vs lathe 6):
 *   - bore_diameter_4point   — MILL-CANONICAL: XY 4-point true diameter + center
 *   - boss_diameter_4point   — MILL-CANONICAL: XY 4-point OD of boss
 *   - bore_center_xy         — MILL-CANONICAL: 2-axis center-find for WCS update
 *   - web_width              — MILL-CANONICAL: width between 2 walls (X or Y)
 *   - corner_3point          — MILL-CANONICAL: outside corner X+Y for datum
 *   - pocket_corner          — MILL-CANONICAL: inside corner of pocket
 *   - surface_z_measure      — top-surface Z probe
 *   - rotary_axis_zero       — MILL-CANONICAL: 4th-axis A/B/C rotary calibration
 *   - work_offset_xy_bump    — write back to active WCS (X/Y components)
 *   - tool_length_probe      — tool-length offset write (top of touch-setter)
 *
 * G-code pattern (Renishaw Inspection Plus mill macros):
 *   G65 P<macro> X<nominal> Y<nominal> Z<nominal> ...
 *
 * Output:
 *   - NC snippet that can be merged into an existing program or run as MDI
 *   - Estimated cycle time (probe speed + approach + retract)
 *   - Applicability checks (probe length, mill spindle clearance)
 *
 * Distinct from existing:
 *   - LatheOnMachineProbeCycleEngine : X/Z-only lathe probe cycles
 *   - SpeedFeedEngine                : cut parameters, not probe sequences
 *   - SPCProcessCapability            : post-inspection statistics
 *   - This engine                    : Renishaw G65 macro library for mill OMV
 *
 * References:
 *   - Renishaw Inspection Plus Mill Programming Manual (H-2000-6222 mill section)
 *   - Heidenhain TNC 640 Touch Probe Cycles (Cycle 400 series)
 *   - Blum LC50-Digilog probe reference
 *
 * @module engines/MillOnMachineProbeCycleEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-ON-MACHINE-PROBE (iter82)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Renishaw default probe feed rate (mm/min). */
export const DEFAULT_PROBE_FEED_MM_MIN = 1000;
/** Default Z approach above target (mm). */
export const DEFAULT_APPROACH_MM = 5;
/** Default fixed handshake/overhead per probe routine (s). */
export const PROBE_HANDSHAKE_S = 2.0;
/** Minimum stylus length for mill (mm) — needs to clear collet/holder. */
export const MIN_MILL_STYLUS_LENGTH_MM = 25;
/** Z-clear above part for safe approach (mm). */
export const SAFE_Z_CLEAR_MM = 25;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillProbeCycleType =
  | "bore_diameter_4point"
  | "boss_diameter_4point"
  | "bore_center_xy"
  | "web_width"
  | "corner_3point"
  | "pocket_corner"
  | "surface_z_measure"
  | "rotary_axis_zero"
  | "work_offset_xy_bump"
  | "tool_length_probe";

export type MillProbeAxis = "X" | "Y" | "Z" | "A" | "B" | "C";

export interface MillProbeCycleInput {
  cycle: MillProbeCycleType;
  /** Nominal dimension (mm) — diameter for bore/boss, width for web, Z for surface */
  nominal_mm: number;
  /** ± tolerance (mm) — one-sided for unilateral */
  tol_mm: number;
  /** Probe feed mm/min (default DEFAULT_PROBE_FEED_MM_MIN) */
  probe_feed_mm_min?: number;
  /** Approach rapid above target (mm) */
  approach_mm?: number;
  /** Macro number override (Renishaw default per cycle) */
  macro_override?: number;
  /** Active WCS (default G54) */
  wcs?: "G54" | "G55" | "G56" | "G57" | "G58" | "G59";
  /** Axis (for single-axis probes) */
  axis?: MillProbeAxis;
  /** Probe stylus length (mm) — for clearance check */
  probe_stylus_length_mm?: number;
  /** Center X coordinate of feature (mm) — for bore/pocket cycles */
  feature_center_x_mm?: number;
  /** Center Y coordinate of feature (mm) */
  feature_center_y_mm?: number;
}

export interface MillProbeCycleOutput {
  nc_snippet: string;
  macro: number;
  estimated_time_s: number;
  approach_mm: number;
  /** Number of touch-points the macro will execute (1, 2, 3, or 4) */
  touch_count: number;
  warnings: string[];
  reasoning: string[];
}

// Renishaw Inspection Plus default macro numbers (mill side).
const DEFAULT_MACRO: Record<MillProbeCycleType, number> = {
  bore_diameter_4point: 9814,     // 4-point bore find
  boss_diameter_4point: 9814,     // same — outside variant via P-args
  bore_center_xy: 9814,           // center-find composite
  web_width: 9812,                // 2-point web/bore
  corner_3point: 9815,            // 3-point outside corner
  pocket_corner: 9816,            // inside corner
  surface_z_measure: 9811,        // single-surface
  rotary_axis_zero: 9817,         // 4-th axis calibration
  work_offset_xy_bump: 9832,      // offset update
  tool_length_probe: 9853,        // tool-length offset
};

// Touch counts per cycle (drives cycle-time estimate).
const TOUCH_COUNT: Record<MillProbeCycleType, number> = {
  bore_diameter_4point: 4,
  boss_diameter_4point: 4,
  bore_center_xy: 4,
  web_width: 2,
  corner_3point: 3,
  pocket_corner: 2,
  surface_z_measure: 1,
  rotary_axis_zero: 2,
  work_offset_xy_bump: 0, // no physical touch — just G10 write
  tool_length_probe: 1,
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillOnMachineProbeCycleEngineImpl {
  generate(i: MillProbeCycleInput): MillProbeCycleOutput {
    this.validate(i);
    const warnings: string[] = [];
    const reasoning: string[] = [];
    const feed = i.probe_feed_mm_min ?? DEFAULT_PROBE_FEED_MM_MIN;
    const approach = i.approach_mm ?? DEFAULT_APPROACH_MM;
    const macro = i.macro_override ?? DEFAULT_MACRO[i.cycle];
    const wcs = i.wcs ?? "G54";
    const touchCount = TOUCH_COUNT[i.cycle];

    // Clearance check
    if (typeof i.probe_stylus_length_mm === "number" && i.probe_stylus_length_mm < MIN_MILL_STYLUS_LENGTH_MM) {
      warnings.push(
        `Probe stylus ${i.probe_stylus_length_mm}mm < ${MIN_MILL_STYLUS_LENGTH_MM}mm — may not clear collet/holder on mill spindle`,
      );
    }
    // Bore/pocket cycles need center coords
    if ((i.cycle === "bore_diameter_4point" || i.cycle === "bore_center_xy"
         || i.cycle === "pocket_corner") &&
        (i.feature_center_x_mm === undefined || i.feature_center_y_mm === undefined)) {
      warnings.push(`Cycle '${i.cycle}' uses an XY-center — provide feature_center_x_mm/feature_center_y_mm for safe approach`);
    }

    // ── NC snippet generation ─────────────────────────────────────────
    const cx = i.feature_center_x_mm ?? 0;
    const cy = i.feature_center_y_mm ?? 0;
    const lines: string[] = [];
    lines.push(`( OMV ${i.cycle} nominal=${i.nominal_mm}mm tol=±${i.tol_mm}mm )`);
    lines.push(wcs);
    lines.push(`G0 Z${SAFE_Z_CLEAR_MM}.0  ( safe Z )`);

    switch (i.cycle) {
      case "bore_diameter_4point":
      case "bore_center_xy":
        lines.push(`G0 X${cx} Y${cy}`);
        lines.push(`G0 Z${approach}`);
        lines.push(`G65 P${macro} D${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
      case "boss_diameter_4point":
        lines.push(`G0 X${cx + i.nominal_mm / 2 + approach} Y${cy}`);
        lines.push(`G0 Z${approach}`);
        lines.push(`G65 P${macro} D${i.nominal_mm} H${i.tol_mm} F${feed} S1  ( S1 = outside )`);
        break;
      case "web_width": {
        const axis = i.axis ?? "X";
        lines.push(`G0 X${cx} Y${cy}`);
        lines.push(`G0 Z${approach}`);
        lines.push(`G65 P${macro} A${axis === "X" ? 1 : 2} B${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
      }
      case "corner_3point":
        lines.push(`G0 X${cx - approach} Y${cy - approach}`);
        lines.push(`G0 Z${approach}`);
        lines.push(`G65 P${macro} X${cx} Y${cy} H${i.tol_mm} F${feed}`);
        break;
      case "pocket_corner":
        lines.push(`G0 X${cx} Y${cy}`);
        lines.push(`G0 Z${-approach}  ( into pocket )`);
        lines.push(`G65 P${macro} X${cx} Y${cy} H${i.tol_mm} F${feed}`);
        break;
      case "surface_z_measure":
        lines.push(`G0 X${cx} Y${cy}`);
        lines.push(`G0 Z${i.nominal_mm + approach}`);
        lines.push(`G65 P${macro} A3 B${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
      case "rotary_axis_zero": {
        const axis = i.axis ?? "A";
        lines.push(`G0 ${axis}${i.nominal_mm + approach}`);
        lines.push(`G65 P${macro} ${axis}${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
      }
      case "work_offset_xy_bump":
        lines.push(`G65 P${macro} W${wcs.slice(1)} X${cx} Y${cy} H${i.tol_mm}`);
        break;
      case "tool_length_probe":
        lines.push(`G0 X${cx} Y${cy}`);
        lines.push(`G0 Z${SAFE_Z_CLEAR_MM}.0`);
        lines.push(`G65 P${macro} Z${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
    }
    const snippet = lines.join("\n");

    // ── Cycle-time estimate ───────────────────────────────────────────
    // travel ≈ 2 × approach × touch_count + 2 × tol per touch
    const probe_travel_mm = touchCount === 0
      ? 0 // pure G10 write
      : touchCount * (2 * approach + 2 * i.tol_mm);
    // Approx 1.5s repositioning between touches on mill (faster than lathe rotation)
    const reposition_s = Math.max(0, touchCount - 1) * 1.5;
    const estimated_time_s = round2(
      (probe_travel_mm / feed) * 60 + reposition_s + PROBE_HANDSHAKE_S,
    );

    reasoning.push(`Macro P${macro} ${i.cycle} @ ${feed}mm/min`);
    reasoning.push(`Touch points: ${touchCount}; approach ${approach}mm; total travel ~${probe_travel_mm.toFixed(1)}mm`);
    reasoning.push(`Estimated: probe ${((probe_travel_mm / feed) * 60).toFixed(1)}s + reposition ${reposition_s.toFixed(1)}s + handshake ${PROBE_HANDSHAKE_S}s = ${estimated_time_s}s`);

    return {
      nc_snippet: snippet,
      macro,
      estimated_time_s,
      approach_mm: approach,
      touch_count: touchCount,
      warnings,
      reasoning,
    };
  }

  getStats(): {
    cycles: MillProbeCycleType[];
    mill_canonical_cycles: MillProbeCycleType[];
    default_feed_mm_min: number;
    default_approach_mm: number;
    min_stylus_mm: number;
    reference: string;
  } {
    return {
      cycles: [
        "bore_diameter_4point", "boss_diameter_4point", "bore_center_xy",
        "web_width", "corner_3point", "pocket_corner",
        "surface_z_measure", "rotary_axis_zero",
        "work_offset_xy_bump", "tool_length_probe",
      ],
      // 7 cycles not present in lathe taxonomy
      mill_canonical_cycles: [
        "bore_diameter_4point", "boss_diameter_4point", "bore_center_xy",
        "web_width", "corner_3point", "pocket_corner", "rotary_axis_zero",
      ],
      default_feed_mm_min: DEFAULT_PROBE_FEED_MM_MIN,
      default_approach_mm: DEFAULT_APPROACH_MM,
      min_stylus_mm: MIN_MILL_STYLUS_LENGTH_MM,
      reference: "Renishaw Inspection Plus mill H-2000-6222; Heidenhain TNC 640 Cycle 400 series; Blum LC50-Digilog",
    };
  }

  private validate(i: MillProbeCycleInput): void {
    if (!i || typeof i !== "object") throw new TypeError("MillOnMachineProbeCycleEngine.generate: input required");
    if (!(i.nominal_mm > 0) && i.cycle !== "work_offset_xy_bump" && i.cycle !== "rotary_axis_zero") {
      throw new TypeError(`Cycle '${i.cycle}' requires nominal_mm > 0`);
    }
    if (!(i.tol_mm >= 0)) throw new TypeError("tol_mm must be >= 0");
    if (DEFAULT_MACRO[i.cycle] === undefined) throw new TypeError(`Unknown cycle: ${String(i.cycle)}`);
  }
}

export const millOnMachineProbeCycleEngine = new MillOnMachineProbeCycleEngineImpl();
export type { MillOnMachineProbeCycleEngineImpl };
