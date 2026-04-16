/**
 * LatheOnMachineProbeCycleEngine
 * ================================
 *
 * Library of on-machine-verification (OMV) probe cycles for lathes.
 *
 * Produces G-code macro call sequences for common Renishaw/Marposs
 * probe cycles used to verify geometry mid-cycle or bump work offsets.
 *
 * Cycles supported:
 *   - od_measure    : probe OD at Z, compare to nominal → update wear offset
 *   - id_measure    : probe ID at Z, update wear offset (tool-specific)
 *   - face_z_measure: probe Z-face, update Z work offset
 *   - groove_width  : probe two walls of groove, report width
 *   - thread_start  : probe pitch-line diameter of existing thread
 *   - work_offset_bump: measured deviation → G10 write-back to active WCS
 *
 * G-code pattern (Renishaw Inspection Plus):
 *   G65 P<macro> A<axis> B<nominal> H<tol> ...
 *
 * Output:
 *   - NC snippet that can be merged into an existing program or run as MDI
 *   - Estimated cycle time (probe speed + approach + retract)
 *   - Applicability checks (probe length, collision clearance)
 *
 * Distinct from existing:
 *   - SpeedFeedEngine: computes cut parameters, not probe sequences
 *   - SPCProcessCapability: post-inspection statistics, not the probe
 *     macro itself
 *   - This engine: library of Renishaw G65 macro calls for OMV
 *
 * References:
 *   - Renishaw Inspection Plus Programming Manual (H-2000-6222)
 *   - Marposs VTS PROBE System Reference Manual
 *
 * @module engines/LatheOnMachineProbeCycleEngine
 * @milestone LATHE-PRO-MS11
 */

export type ProbeCycleType =
  | "od_measure"
  | "id_measure"
  | "face_z_measure"
  | "groove_width"
  | "thread_start"
  | "work_offset_bump";

export interface ProbeCycleInput {
  cycle: ProbeCycleType;
  /** Nominal dimension mm (diameter for OD/ID, Z for face, width for groove) */
  nominal_mm: number;
  /** Plus/minus tolerance mm (one-sided for unilateral) */
  tol_mm: number;
  /** Probe feed mm/min (default 1000) */
  probe_feed_mm_min?: number;
  /** Approach rapid mm above target (default 5) */
  approach_mm?: number;
  /** Probe macro number (Renishaw default per cycle) */
  macro_override?: number;
  /** Active WCS for offset bump (default G54) */
  wcs?: "G54" | "G55" | "G56" | "G57" | "G58" | "G59";
  /** Axis for single-axis probes (X or Z; default X for OD/ID) */
  axis?: "X" | "Z";
  /** Probe stylus length mm (for clearance check) */
  probe_stylus_length_mm?: number;
}

export interface ProbeCycleOutput {
  nc_snippet: string;
  macro: number;
  estimated_time_s: number;
  approach_mm: number;
  warnings: string[];
  reasoning: string[];
}

const DEFAULT_MACRO: Record<ProbeCycleType, number> = {
  od_measure: 9821, // single-surface X probe
  id_measure: 9821,
  face_z_measure: 9821, // same single-surface, Z axis
  groove_width: 9823, // 2-point bore/web
  thread_start: 9821,
  work_offset_bump: 9832, // offset update macro
};

class LatheOnMachineProbeCycleEngineImpl {
  generate(i: ProbeCycleInput): ProbeCycleOutput {
    const warnings: string[] = [];
    const reasoning: string[] = [];
    const feed = i.probe_feed_mm_min ?? 1000;
    const approach = i.approach_mm ?? 5;
    const macro = i.macro_override ?? DEFAULT_MACRO[i.cycle];
    const wcs = i.wcs ?? "G54";
    const axis = i.axis ?? (i.cycle === "face_z_measure" ? "Z" : "X");

    // Clearance check: stylus must extend past chuck/turret
    if (i.probe_stylus_length_mm !== undefined && i.probe_stylus_length_mm < 20) {
      warnings.push(`Probe stylus ${i.probe_stylus_length_mm}mm — may not clear chuck/jaws`);
    }

    // NC snippet
    const lines: string[] = [];
    lines.push(`( OMV ${i.cycle} nominal=${i.nominal_mm}mm tol=±${i.tol_mm}mm )`);
    lines.push(wcs);
    switch (i.cycle) {
      case "od_measure":
      case "id_measure":
        lines.push(`G0 X${i.nominal_mm + approach} Z1.0`);
        lines.push(`G65 P${macro} A${axis === "X" ? 1 : 2} B${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
      case "face_z_measure":
        lines.push(`G0 Z${i.nominal_mm + approach}`);
        lines.push(`G65 P${macro} A2 B${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
      case "groove_width":
        lines.push(`G0 X${i.nominal_mm + approach} Z1.0`);
        lines.push(`G65 P${macro} B${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
      case "thread_start":
        lines.push(`G0 X${i.nominal_mm + approach} Z0.0`);
        lines.push(`G65 P${macro} A1 B${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
      case "work_offset_bump":
        lines.push(`G65 P${macro} W${wcs.slice(1)} B${i.nominal_mm} H${i.tol_mm} F${feed}`);
        break;
    }
    const snippet = lines.join("\n");

    // Estimated time: approach + probe + retract
    const probe_travel_mm = approach * 2 + i.tol_mm * 2;
    const estimated_time_s = round2((probe_travel_mm / feed) * 60 + 2.0); // +2s fixed for handshake

    reasoning.push(`Macro P${macro} ${i.cycle} on axis ${axis} @ ${feed}mm/min`);
    reasoning.push(`Approach ${approach}mm, travel ~${probe_travel_mm.toFixed(1)}mm → ${estimated_time_s}s`);

    return {
      nc_snippet: snippet,
      macro,
      estimated_time_s,
      approach_mm: approach,
      warnings,
      reasoning,
    };
  }

  getStats(): { cycles: ProbeCycleType[]; reference: string } {
    return {
      cycles: ["od_measure", "id_measure", "face_z_measure", "groove_width", "thread_start", "work_offset_bump"],
      reference: "Renishaw Inspection Plus H-2000-6222; Marposs VTS Probe Reference Manual",
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const latheOnMachineProbeCycleEngine = new LatheOnMachineProbeCycleEngineImpl();
export type { LatheOnMachineProbeCycleEngineImpl };
