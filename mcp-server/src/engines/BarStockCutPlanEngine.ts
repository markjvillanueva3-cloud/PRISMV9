/**
 * BarStockCutPlanEngine
 * =======================
 *
 * 1D bin-packing for bar stock. Given a list of required part lengths
 * (with quantities) and available bar stock lengths, produces an optimal
 * cut plan minimizing remnant / maximizing yield.
 *
 * Uses First-Fit-Decreasing (FFD) heuristic — fast, near-optimal for
 * typical shop part lists. Accounts for kerf (saw blade thickness).
 *
 * Not to be confused with `NestingEngine` (2D sheet nesting).
 *
 * Formula:
 *   bar_yield = Σ(part_len × qty) / Σ(bar_len × bars_used)
 *   parts_per_bar = floor((bar_len - grip_end) / (part_len + cutoff + kerf))
 *
 * @module engines/BarStockCutPlanEngine
 * @milestone LATHE-PRO-MS6
 */

export interface CutRequirement {
  id: string;
  part_length_mm: number;
  quantity: number;
  /** Facing allowance per part (default 0) */
  facing_allowance_mm?: number;
  /** Cutoff (parting) width per part (default 3 mm) */
  cutoff_width_mm?: number;
}

export interface BarStockOption {
  id: string;
  length_mm: number;
  /** Unusable grip end (material held by chuck + unprobe-able region) */
  grip_allowance_mm?: number;
  cost_per_bar_usd?: number;
}

export interface CutPlanInput {
  requirements: CutRequirement[];
  bar_options: BarStockOption[];
  /** Saw blade kerf between cuts (default 3 mm) */
  kerf_mm?: number;
}

export interface CutAssignment {
  bar_option_id: string;
  bar_index: number;
  cuts: Array<{
    requirement_id: string;
    count: number;
  }>;
  used_mm: number;
  remnant_mm: number;
  utilization_pct: number;
}

export interface CutPlanResult {
  assignments: CutAssignment[];
  summary: {
    total_parts: number;
    total_bars: number;
    total_material_mm: number;
    used_material_mm: number;
    total_remnant_mm: number;
    overall_yield_pct: number;
    estimated_cost_usd?: number;
  };
  unfulfilled: Array<{ requirement_id: string; shortage: number }>;
}

class BarStockCutPlanEngineImpl {
  plan(input: CutPlanInput): CutPlanResult {
    const kerf = input.kerf_mm ?? 3;
    const assignments: CutAssignment[] = [];
    const unfulfilled: Array<{ requirement_id: string; shortage: number }> = [];

    // FFD: expand each requirement into per-part entries, sort desc by length, then pack
    const parts: Array<{ reqId: string; lengthWithAllowance: number }> = [];
    for (const req of input.requirements) {
      const facing = req.facing_allowance_mm ?? 0;
      const cutoff = req.cutoff_width_mm ?? 3;
      // Each part consumes: length + facing + cutoff. Between parts, additionally kerf.
      const perPart = req.part_length_mm + facing + cutoff;
      for (let k = 0; k < req.quantity; k++) {
        parts.push({ reqId: req.id, lengthWithAllowance: perPart });
      }
    }
    parts.sort((a, b) => b.lengthWithAllowance - a.lengthWithAllowance);

    // Pick cheapest per mm bar option (if costs given) else the longest
    const sortedBars = [...input.bar_options].sort((a, b) => {
      const costPerMmA = a.cost_per_bar_usd ? a.cost_per_bar_usd / a.length_mm : 1 / a.length_mm;
      const costPerMmB = b.cost_per_bar_usd ? b.cost_per_bar_usd / b.length_mm : 1 / b.length_mm;
      return costPerMmA - costPerMmB;
    });

    let barIdx = 0;
    let barInFlight: CutAssignment | null = null;
    let currentBar: BarStockOption | null = null;
    let availableOnBar = 0;

    const openNewBar = () => {
      currentBar = sortedBars[0] ?? null;
      if (!currentBar) return;
      const grip = currentBar.grip_allowance_mm ?? 20;
      availableOnBar = currentBar.length_mm - grip;
      barInFlight = {
        bar_option_id: currentBar.id,
        bar_index: barIdx++,
        cuts: [],
        used_mm: 0,
        remnant_mm: availableOnBar,
        utilization_pct: 0,
      };
    };

    openNewBar();

    for (const p of parts) {
      if (!currentBar || !barInFlight) {
        unfulfilled.push({ requirement_id: p.reqId, shortage: p.lengthWithAllowance });
        continue;
      }
      // Alias to narrowed locals — TS can't track barInFlight across the
      // openNewBar() closure call (closure has an early-return path), so the
      // re-narrowed type collapses to `never` without explicit aliasing.
      // Mutations on `flight` still propagate via shared reference.
      let flight: CutAssignment = barInFlight;
      let bar: BarStockOption = currentBar;

      // Need part + kerf if not first on bar. Only the part itself
      // counts as "used"; kerf is waste that reduces availableOnBar.
      const kerfPrefix = flight.cuts.length > 0 ? kerf : 0;
      const need = p.lengthWithAllowance + kerfPrefix;
      if (need > availableOnBar) {
        // close current bar, open new
        flight.remnant_mm = availableOnBar;
        flight.utilization_pct = round1((flight.used_mm / bar.length_mm) * 100);
        assignments.push(flight);
        openNewBar();
        if (!currentBar || !barInFlight) {
          unfulfilled.push({ requirement_id: p.reqId, shortage: p.lengthWithAllowance });
          continue;
        }
        // Re-alias after openNewBar mutated the outer refs
        flight = barInFlight;
        bar = currentBar;
        // Retry on fresh bar (no kerf prefix)
        if (p.lengthWithAllowance > availableOnBar) {
          unfulfilled.push({
            requirement_id: p.reqId,
            shortage: p.lengthWithAllowance - availableOnBar,
          });
          continue;
        }
        flight.used_mm += p.lengthWithAllowance;
        availableOnBar -= p.lengthWithAllowance;
      } else {
        flight.used_mm += p.lengthWithAllowance;
        availableOnBar -= need;
      }
      // Increment cut count
      const existing = flight.cuts.find((c) => c.requirement_id === p.reqId);
      if (existing) existing.count++;
      else flight.cuts.push({ requirement_id: p.reqId, count: 1 });
    }

    if (barInFlight && currentBar) {
      const flight: CutAssignment = barInFlight;
      const bar: BarStockOption = currentBar;
      flight.remnant_mm = availableOnBar;
      flight.utilization_pct = round1((flight.used_mm / bar.length_mm) * 100);
      assignments.push(flight);
    }

    // Build summary
    let totalParts = 0;
    let totalMaterial = 0;
    let usedMaterial = 0;
    let totalCost = 0;
    let hasCost = false;
    for (const a of assignments) {
      totalParts += a.cuts.reduce((s, c) => s + c.count, 0);
      const bar = input.bar_options.find((b) => b.id === a.bar_option_id)!;
      totalMaterial += bar.length_mm;
      usedMaterial += a.used_mm;
      if (bar.cost_per_bar_usd !== undefined) {
        totalCost += bar.cost_per_bar_usd;
        hasCost = true;
      }
    }

    return {
      assignments,
      summary: {
        total_parts: totalParts,
        total_bars: assignments.length,
        total_material_mm: totalMaterial,
        used_material_mm: round1(usedMaterial),
        total_remnant_mm: round1(totalMaterial - usedMaterial),
        overall_yield_pct:
          totalMaterial > 0 ? round1((usedMaterial / totalMaterial) * 100) : 0,
        estimated_cost_usd: hasCost ? round2(totalCost) : undefined,
      },
      unfulfilled,
    };
  }

  /**
   * Simple parts-per-bar calc (no kerf optimization) — useful for quick quotes.
   */
  partsPerBar(
    barLengthMm: number,
    partLengthMm: number,
    options?: {
      grip_allowance_mm?: number;
      facing_allowance_mm?: number;
      cutoff_width_mm?: number;
      kerf_mm?: number;
    }
  ): { count: number; remnant_mm: number; utilization_pct: number } {
    const grip = options?.grip_allowance_mm ?? 20;
    const facing = options?.facing_allowance_mm ?? 0;
    const cutoff = options?.cutoff_width_mm ?? 3;
    const kerf = options?.kerf_mm ?? 3;
    const usable = barLengthMm - grip;
    const perPart = partLengthMm + facing + cutoff;
    if (perPart <= 0 || usable <= 0) return { count: 0, remnant_mm: barLengthMm, utilization_pct: 0 };
    // N parts consume: N*perPart + (N-1)*kerf → solve N*(perPart + kerf) - kerf ≤ usable
    const count = Math.max(0, Math.floor((usable + kerf) / (perPart + kerf)));
    const used = count > 0 ? count * perPart + (count - 1) * kerf : 0;
    const remnant = barLengthMm - used - grip;
    const util = barLengthMm > 0 ? round1((used / barLengthMm) * 100) : 0;
    return { count, remnant_mm: round1(remnant), utilization_pct: util };
  }

  getStats(): { algorithm: string; features: string[] } {
    return {
      algorithm: "First-Fit-Decreasing (FFD) 1D bin packing",
      features: [
        "kerf allowance",
        "grip end clamp allowance",
        "facing + cutoff per part",
        "multi-bar cost-per-mm bar selection",
        "unfulfilled reporting",
      ],
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

export const barStockCutPlanEngine = new BarStockCutPlanEngineImpl();
export type { BarStockCutPlanEngineImpl };
