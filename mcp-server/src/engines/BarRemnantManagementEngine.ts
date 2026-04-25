/**
 * BarRemnantManagementEngine
 * ============================
 *
 * Bar remnant inventory + reuse feasibility.
 *
 * After a lathe job finishes, the un-consumed tail of each bar becomes
 * a remnant. This engine:
 *   - Records remnants into an in-memory inventory (persisted by caller)
 *   - Given a new job (part_length, qty, bar_diameter), finds remnants
 *     that can satisfy part or all of the job
 *   - Recommends reuse vs scrap (threshold: min feasible length)
 *   - Tracks material lot/heat traceability forward
 *
 * Algorithm:
 *   1. Filter inventory by diameter match (allow ±tol_mm) and material
 *   2. For each match: parts_from_remnant = floor((L - end_loss)/pitch)
 *   3. Greedy assignment largest-first until quantity_needed met
 *   4. Report: used remnants, remaining qty, savings vs fresh bar
 *
 * Distinction from existing:
 *   - BarFeedPitchOptimizerEngine: fresh bar purchase optimization
 *   - This engine: reuses leftover bar inventory across jobs
 *
 * References:
 *   - Sandvik/Kennametal shop-floor practice (remnant racks)
 *   - ISO 9001 §8.3 control of products — remnant traceability
 *
 * @module engines/BarRemnantManagementEngine
 * @milestone LATHE-PRO-MS10
 */

export interface BarRemnant {
  id: string;
  material: string;
  /** Diameter mm */
  diameter_mm: number;
  /** Remaining length mm */
  length_mm: number;
  /** Material heat/lot for traceability */
  heat_lot?: string;
  /** Location label (rack/bin) */
  location?: string;
  /** Date created */
  created_date?: string;
}

export interface RemnantJobRequest {
  part_length_mm: number;
  quantity_needed: number;
  diameter_mm: number;
  material: string;
  /** ± tolerance on diameter match (default 0.5 mm) */
  diameter_tol_mm?: number;
  /** Cutoff kerf + head face */
  cutoff_kerf_mm?: number;
  bar_head_face_mm?: number;
  /** Min feasible remnant length — below this, scrap (default 150 mm) */
  min_feasible_length_mm?: number;
  /** Price per kg for savings calc */
  material_price_per_kg?: number;
  /** Density kg/m³ (default 7850 carbon steel) */
  material_density_kgm3?: number;
}

export interface RemnantAssignment {
  remnant_id: string;
  parts_from_remnant: number;
  residual_length_mm: number;
  residual_scrap: boolean;
}

export interface RemnantPlan {
  assignments: RemnantAssignment[];
  total_parts_from_remnants: number;
  quantity_remaining: number;
  parts_from_fresh_bar_needed: number;
  savings_mass_kg: number;
  savings_cost: number;
  new_remnants: BarRemnant[];
  reasoning: string[];
}

class BarRemnantManagementEngineImpl {
  /** Evaluate reuse plan for a job against current remnant inventory. */
  plan(inventory: BarRemnant[], job: RemnantJobRequest): RemnantPlan {
    const reasoning: string[] = [];
    const tol = job.diameter_tol_mm ?? 0.5;
    const kerf = job.cutoff_kerf_mm ?? 2;
    const headFace = job.bar_head_face_mm ?? 3;
    const minFeasible = job.min_feasible_length_mm ?? 150;
    const density = job.material_density_kgm3 ?? 7850;
    const price = job.material_price_per_kg ?? 0;

    const pitch = job.part_length_mm + kerf;

    // Filter compatible remnants
    const candidates = inventory
      .filter((r) =>
        r.material === job.material &&
        Math.abs(r.diameter_mm - job.diameter_mm) <= tol &&
        r.length_mm >= headFace + pitch,
      )
      .sort((a, b) => b.length_mm - a.length_mm);

    reasoning.push(`${candidates.length} compatible remnants (Ø≈${job.diameter_mm}±${tol}mm ${job.material})`);

    const assignments: RemnantAssignment[] = [];
    const newRemnants: BarRemnant[] = [];
    let remaining = job.quantity_needed;

    for (const r of candidates) {
      if (remaining <= 0) break;
      const usable = r.length_mm - headFace;
      const maxParts = Math.floor(usable / pitch);
      if (maxParts <= 0) continue;
      const parts = Math.min(maxParts, remaining);
      const consumed = parts * pitch;
      const residual = r.length_mm - headFace - consumed;
      const scrap = residual < minFeasible;

      assignments.push({
        remnant_id: r.id,
        parts_from_remnant: parts,
        residual_length_mm: residual,
        residual_scrap: scrap,
      });

      if (!scrap && residual > 0) {
        newRemnants.push({
          id: `${r.id}_R`,
          material: r.material,
          diameter_mm: r.diameter_mm,
          length_mm: residual,
          heat_lot: r.heat_lot,
          location: r.location,
          created_date: new Date().toISOString(),
        });
      }

      remaining -= parts;
    }

    const totalFromRemnants = assignments.reduce((s, a) => s + a.parts_from_remnant, 0);
    const partsFromFresh = Math.max(0, remaining);

    // Savings: mass of part-length bar material reused (not purchased fresh)
    const partVolume_m3 = Math.PI * (job.diameter_mm / 2000) ** 2 * (job.part_length_mm / 1000);
    const savingsMass = partVolume_m3 * density * totalFromRemnants;
    const savingsCost = savingsMass * price;

    reasoning.push(`Reused ${totalFromRemnants} parts from remnants, ${partsFromFresh} to come from fresh bar`);

    return {
      assignments,
      total_parts_from_remnants: totalFromRemnants,
      quantity_remaining: remaining,
      parts_from_fresh_bar_needed: partsFromFresh,
      savings_mass_kg: savingsMass,
      savings_cost: savingsCost,
      new_remnants: newRemnants,
      reasoning,
    };
  }

  /** After a fresh-bar job produces remnants, return a BarRemnant record. */
  recordRemnant(opts: {
    id: string;
    material: string;
    diameter_mm: number;
    length_mm: number;
    heat_lot?: string;
    location?: string;
  }): BarRemnant {
    return {
      ...opts,
      created_date: new Date().toISOString(),
    };
  }

  /** Total count of feasible remnants for a given material+diameter. */
  countFeasible(inventory: BarRemnant[], material: string, dia: number, tol = 0.5, minLen = 150): number {
    return inventory.filter((r) =>
      r.material === material &&
      Math.abs(r.diameter_mm - dia) <= tol &&
      r.length_mm >= minLen,
    ).length;
  }

  getStats(): { reference: string; default_min_feasible_mm: number } {
    return {
      reference: "Sandvik/Kennametal shop practice; ISO 9001 §8.3 traceability",
      default_min_feasible_mm: 150,
    };
  }
}

export const barRemnantManagementEngine = new BarRemnantManagementEngineImpl();
export type { BarRemnantManagementEngineImpl };
