/**
 * LathePartingChipClearanceEngine
 * =================================
 *
 * Evaluates chip clearance + coolant access for parting-off and deep
 * grooving operations. Parting slots are narrow and deep, making chip
 * extraction the limiting factor — a chip that can't escape packs into
 * the slot, pushes the blade sideways, and snaps it.
 *
 * Complements PartingGroovingEngine (which computes cutting parameters
 * speed/feed at decreasing diameter). This engine focuses on the
 * evacuation side: slot-aspect-ratio risk, coolant reach, peck-cycle
 * design.
 *
 * Key heuristics:
 *   - Slot aspect ratio AR = depth / width. AR > 5 → chip-pack risk
 *   - Coolant penetration: jet reach Lj ≈ C · sqrt(P) · d_nozzle where
 *     C ≈ 40 (empirical, water-base), P in bar, d in mm
 *   - Needs: Lj ≥ slot_depth for adequate flushing
 *   - Peck depth recommendation: min(0.5 × blade_width, 2 mm)
 *   - Chip volume per peck = width × doc × peck_depth
 *
 * References:
 *   - Sandvik parting & grooving handbook (C-1000:18)
 *   - ISCAR "DoGrip" deep grooving application guide
 *   - Klocke F. "Manufacturing Processes 1: Cutting" (2011)
 *
 * @module engines/LathePartingChipClearanceEngine
 * @milestone LATHE-PRO-MS7
 */

export interface PartingChipInput {
  /** Parting blade / grooving insert width (mm) */
  blade_width_mm: number;
  /** Slot depth from OD to bottom (mm). For parting: OD/2 */
  slot_depth_mm: number;
  /** Bar OD (mm) */
  bar_od_mm: number;
  /** Feed rate (mm/rev) */
  feed_mm_rev: number;
  /** Cutting speed at OD (m/min) */
  vc_m_min: number;
  /** Coolant pressure (bar) */
  coolant_pressure_bar: number;
  /** Nozzle orifice diameter (mm) */
  nozzle_diameter_mm?: number;
  /** Is coolant pointed into the slot (axial) vs generic flood? */
  coolant_targeted?: boolean;
  /** Material ISO group — affects chip stickiness */
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Existing peck depth if any (mm); undefined = continuous */
  peck_depth_mm?: number;
}

export type ClearanceVerdict = "safe" | "marginal" | "high_risk" | "unsafe";

export interface PartingChipResult {
  verdict: ClearanceVerdict;
  aspect_ratio: number;
  coolant_reach_mm: number;
  coolant_adequate: boolean;
  recommended_peck_depth_mm: number;
  recommended_peck_count: number;
  recommended_dwell_sec: number;
  chip_volume_per_peck_mm3: number;
  risk_factors: string[];
  recommendations: string[];
  estimated_extra_cycle_sec: number;
}

class LathePartingChipClearanceEngineImpl {
  evaluate(i: PartingChipInput): PartingChipResult {
    const risks: string[] = [];
    const recs: string[] = [];

    const w = Math.max(0.5, i.blade_width_mm);
    const depth = Math.max(1, i.slot_depth_mm);
    const aspect = depth / w;

    // Coolant jet reach (empirical, water-base):
    //   Lj ≈ 40 × sqrt(P_bar) × d_nozzle_mm
    // With targeted coolant aimed into slot, assume 0.8× effective (some
    // deflects off blade); generic flood: 0.4×.
    const dN = i.nozzle_diameter_mm ?? 2.5;
    const jet = 40 * Math.sqrt(Math.max(0.1, i.coolant_pressure_bar)) * dN;
    const reachFactor = i.coolant_targeted === false ? 0.4 : 0.8;
    const reach = jet * reachFactor;
    const coolantOk = reach >= depth;

    // Aspect risk
    if (aspect > 8) {
      risks.push(`AR ${aspect.toFixed(1)} very high — deep narrow slot, chip packing likely`);
    } else if (aspect > 5) {
      risks.push(`AR ${aspect.toFixed(1)} moderate — chip evacuation marginal`);
    }

    if (!coolantOk) {
      risks.push(
        `Coolant jet reaches ${round1(reach)}mm but slot is ${depth}mm deep — chips not flushed to bottom`
      );
    }

    // Material stickiness
    if (i.material_iso_group === "M") {
      risks.push("Austenitic stainless — gummy chips adhere to blade flanks");
    }
    if (i.material_iso_group === "N") {
      risks.push("Aluminum — long ductile chips pack easily in parting slot");
    }
    if (i.material_iso_group === "S") {
      risks.push("Superalloy — work-hardening amplifies chip-pack force");
    }

    // Peck cycle recommendation
    const recPeckDepth = Math.min(0.5 * w, 2, Math.max(0.3, 0.6 * w));
    const suggestedPeck = i.peck_depth_mm ?? recPeckDepth;
    const peckCount = Math.max(1, Math.ceil(depth / Math.max(0.3, suggestedPeck)));
    const recDwell = aspect > 5 ? 0.3 : 0.1; // sec retract dwell

    // Chip volume per peck (mm³): kerf_width × peck_depth × arc_length ≈
    // blade_width × peck × (π × D_mean). Use mean diameter at half-depth.
    const meanD = i.bar_od_mm - depth; // approximate
    const circ = Math.PI * Math.max(1, meanD);
    const chipVol = w * suggestedPeck * circ;

    // Recommendations
    if (aspect > 5 || !coolantOk) {
      recs.push(`Use peck cycle: depth ${round1(suggestedPeck)}mm × ${peckCount} pecks with ${recDwell}s retract dwell`);
    }
    if (!coolantOk) {
      const needP = Math.pow(depth / (40 * dN * reachFactor), 2);
      recs.push(`Increase coolant pressure to ≥${Math.ceil(needP)} bar for jet reach to slot bottom`);
    }
    if (aspect > 8) {
      recs.push("Consider stepped blade or plunge-turn (G75) strategy instead of straight parting");
    }
    if (i.feed_mm_rev > 0.08 && aspect > 5) {
      recs.push(`Reduce feed below 0.08 mm/rev near slot center to shorten chips`);
    }
    if (!i.coolant_targeted) {
      recs.push("Aim coolant nozzle axially into slot (coherent jet) — not generic flood");
    }

    // Extra cycle time penalty from pecking
    const rpm = (1000 * i.vc_m_min) / (Math.PI * Math.max(1, i.bar_od_mm));
    const feedMmMin = rpm * Math.max(0.01, i.feed_mm_rev);
    const cutTimeSec = (depth / feedMmMin) * 60;
    const rapidReturnPerPeck = 0.3; // sec
    const extraSec = i.peck_depth_mm === undefined
      ? peckCount * (rapidReturnPerPeck + recDwell) - cutTimeSec * 0
      : 0;

    // Verdict
    let verdict: ClearanceVerdict;
    if (aspect <= 3 && coolantOk) verdict = "safe";
    else if (aspect <= 6 && coolantOk) verdict = "marginal";
    else if (aspect > 10 || (!coolantOk && i.material_iso_group === "M")) verdict = "unsafe";
    else verdict = "high_risk";

    return {
      verdict,
      aspect_ratio: round2(aspect),
      coolant_reach_mm: round1(reach),
      coolant_adequate: coolantOk,
      recommended_peck_depth_mm: round2(recPeckDepth),
      recommended_peck_count: peckCount,
      recommended_dwell_sec: recDwell,
      chip_volume_per_peck_mm3: round1(chipVol),
      risk_factors: risks,
      recommendations: recs,
      estimated_extra_cycle_sec: round1(Math.max(0, extraSec)),
    };
  }

  getStats(): { model: string; iso_groups_supported: string[]; formulas: string[] } {
    return {
      model: "Aspect-ratio + coolant-jet-reach + material-stickiness composite",
      iso_groups_supported: ["P", "M", "K", "N", "S", "H"],
      formulas: [
        "AR = depth / width",
        "Lj ≈ 40 × sqrt(P_bar) × d_nozzle_mm (water-base coolant)",
        "peck_depth = min(0.5×width, 2mm)",
        "chip_volume = width × peck_depth × π × D_mean",
      ],
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

export const lathePartingChipClearanceEngine = new LathePartingChipClearanceEngineImpl();
export type { LathePartingChipClearanceEngineImpl };
