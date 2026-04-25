/**
 * BarFeedPitchOptimizerEngine
 * =============================
 *
 * Bar-feed pitch and utilization optimizer for lathe/Swiss workflows.
 * Given a part length (plus cut-off kerf) and a bar length, computes:
 *   - parts per bar (floor of usable length / part pitch)
 *   - end remnant (unusable tail)
 *   - material-utilization % (part mass / bar mass)
 *   - bars required for a batch
 *   - optional: selection among candidate bar diameters for min waste
 *
 * Formulas:
 *   pitch_mm   = part_length_mm + cutoff_kerf_mm
 *   usable_mm  = bar_length_mm - bar_collet_loss_mm - end_feed_loss_mm
 *   parts      = floor(usable_mm / pitch_mm)
 *   remnant_mm = usable_mm - parts * pitch_mm
 *   util_pct   = (parts * part_length_mm) / bar_length_mm
 *
 * Distinct from the 2-D sheet nester (width × height bottom-left-fill):
 * this engine solves the 1-D bar-feed problem with lathe-specific losses
 * (collet grip, feed-back dead zone, head facing allowance).
 *
 * References:
 *   - ISO 6983 / Sandvik Cutting Tools Technical Guide (feed-chuck losses)
 *   - Swiss lathe convention: collet grip + feed-back distance both eat bar
 *
 * @module engines/BarFeedPitchOptimizerEngine
 * @milestone LATHE-PRO-MS10
 */

export interface BarFeedPitchInput {
  part_length_mm: number;
  quantity_needed: number;
  /** Bar length (mm) */
  bar_length_mm: number;
  /** Kerf consumed per cutoff (default 2 mm for 2 mm cutoff tool) */
  cutoff_kerf_mm?: number;
  /** Collet/feed-back loss at bar tail (Swiss: one grip length + feed-back dead zone) */
  bar_end_loss_mm?: number;
  /** Initial facing allowance consumed at bar head */
  bar_head_face_mm?: number;
  /** Candidate bar diameters (mm) to evaluate — if omitted, use bar_diameter_mm */
  candidate_bar_diameters_mm?: number[];
  /** Fixed bar diameter if no candidates */
  bar_diameter_mm?: number;
  /** Part max diameter — needed if evaluating bar candidates (skip candidates < part_max) */
  part_max_diameter_mm?: number;
  /** Material density kg/m³ (default 7850, carbon steel) */
  material_density_kgm3?: number;
  /** Material price per kg */
  material_price_per_kg?: number;
  /** Part mass override (if already computed elsewhere) */
  part_mass_kg?: number;
}

export interface BarPitchCandidate {
  bar_diameter_mm: number;
  parts_per_bar: number;
  remnant_mm: number;
  bars_required: number;
  utilization_pct: number;
  total_bar_mass_kg: number;
  part_total_mass_kg: number;
  waste_mass_kg: number;
  waste_cost: number;
  score: number; // higher = better (lower waste, better utilization)
}

export interface BarFeedPitchResult {
  best: BarPitchCandidate | null;
  candidates: BarPitchCandidate[];
  pitch_mm: number;
  usable_length_mm: number;
  reasoning: string[];
}

class BarFeedPitchOptimizerEngineImpl {
  optimize(i: BarFeedPitchInput): BarFeedPitchResult {
    const reasoning: string[] = [];
    const kerf = i.cutoff_kerf_mm ?? 2.0;
    const endLoss = i.bar_end_loss_mm ?? 50.0; // 50mm typical Swiss feed-back
    const headLoss = i.bar_head_face_mm ?? 3.0;
    const density = i.material_density_kgm3 ?? 7850;
    const pricePerKg = i.material_price_per_kg ?? 0;

    if (i.part_length_mm <= 0) throw new Error("part_length_mm must be > 0");
    if (i.bar_length_mm <= 0) throw new Error("bar_length_mm must be > 0");

    const pitch = i.part_length_mm + kerf;
    const usable = Math.max(0, i.bar_length_mm - endLoss - headLoss);
    reasoning.push(`Pitch ${pitch}mm, usable ${usable}mm (after ${endLoss}mm end + ${headLoss}mm head loss)`);

    const bars = i.candidate_bar_diameters_mm && i.candidate_bar_diameters_mm.length > 0
      ? i.candidate_bar_diameters_mm
      : i.bar_diameter_mm !== undefined
        ? [i.bar_diameter_mm]
        : [];

    if (bars.length === 0) {
      throw new Error("Must provide bar_diameter_mm or candidate_bar_diameters_mm");
    }

    const candidates: BarPitchCandidate[] = [];
    for (const dBar of bars) {
      if (i.part_max_diameter_mm !== undefined && dBar < i.part_max_diameter_mm) {
        reasoning.push(`Skip Ø${dBar}mm: smaller than part max Ø${i.part_max_diameter_mm}mm`);
        continue;
      }
      const parts = Math.max(0, Math.floor(usable / pitch));
      const remnant = parts > 0 ? usable - parts * pitch : usable;
      const barsNeeded = parts > 0 ? Math.ceil(i.quantity_needed / parts) : Infinity;

      const barVolume_m3 = Math.PI * (dBar / 2000) ** 2 * (i.bar_length_mm / 1000);
      const barMass = barVolume_m3 * density;
      const totalBarMass = barMass * barsNeeded;

      const partMass = i.part_mass_kg !== undefined
        ? i.part_mass_kg
        : Math.PI * (dBar / 2000) ** 2 * (i.part_length_mm / 1000) * density;
      const partTotalMass = partMass * Math.min(parts * barsNeeded, i.quantity_needed);

      const wasteMass = Math.max(0, totalBarMass - partTotalMass);
      const wasteCost = wasteMass * pricePerKg;
      const util = i.bar_length_mm > 0 ? (parts * i.part_length_mm) / i.bar_length_mm : 0;

      // Score: utilization (0..1) minus bar-cost penalty
      const score = util - (barsNeeded === Infinity ? 1 : barsNeeded / (i.quantity_needed + 1)) * 0.1;

      candidates.push({
        bar_diameter_mm: dBar,
        parts_per_bar: parts,
        remnant_mm: remnant,
        bars_required: barsNeeded,
        utilization_pct: util * 100,
        total_bar_mass_kg: totalBarMass,
        part_total_mass_kg: partTotalMass,
        waste_mass_kg: wasteMass,
        waste_cost: wasteCost,
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates.length > 0 ? candidates[0]! : null;
    if (best) reasoning.push(`Best Ø${best.bar_diameter_mm}mm → ${best.parts_per_bar} parts/bar @ ${best.utilization_pct.toFixed(1)}% util`);

    return {
      best,
      candidates,
      pitch_mm: pitch,
      usable_length_mm: usable,
      reasoning,
    };
  }

  getStats(): { reference: string } {
    return {
      reference: "ISO 6983; Sandvik Cutting Tools Technical Guide (collet/feed losses)",
    };
  }
}

export const barFeedPitchOptimizerEngine = new BarFeedPitchOptimizerEngineImpl();
export type { BarFeedPitchOptimizerEngineImpl };
