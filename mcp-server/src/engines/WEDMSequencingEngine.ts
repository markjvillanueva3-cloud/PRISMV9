/**
 * WEDMSequencingEngine — WEDM AGI Phase 2 / U-P2-09
 *
 * Cut-ordering optimiser: given a batch of wire-EDM cut operations with
 * entry (and optional exit) points, produce an execution order that
 * minimises total non-cutting travel.
 *
 * Algorithm: nearest-neighbour seed + 2-opt refinement (classical TSP
 * heuristics, sufficient for the ≤100-cut scale of a WEDM job).
 *
 * Exit gate (P2-MS3): Sequencing reduces total travel by ≥15 % vs the
 * naive insertion order on mixed workloads.
 */

// ────────────────────────── Types ──────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

export interface WEDMCutOperation {
  id: string;
  start: Point2D;
  end?: Point2D;
}

export interface WEDMSequencingInput {
  cuts: WEDMCutOperation[];
  origin?: Point2D;
  strategy?: "naive" | "nearest_neighbor" | "nn_2opt";
  max_2opt_iters?: number;
}

export interface WEDMSequencingResult {
  order: string[];
  total_travel_mm: number;
  naive_travel_mm: number;
  improvement_fraction: number;
  strategy: string;
  iterations: number;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMSequencingEngine {
  /**
   * Order the supplied cuts for minimum non-cutting travel. Strategy
   * defaults to nn_2opt; naive preserves input order and is used as the
   * reference for improvement_fraction.
   */
  sequence(input: WEDMSequencingInput): WEDMSequencingResult {
    this.validate(input);
    const origin = input.origin ?? { x: 0, y: 0 };
    const strategy = input.strategy ?? "nn_2opt";
    const maxIters = input.max_2opt_iters ?? 100;

    const naiveOrder = input.cuts.map((c) => c.id);
    const naiveTravel = this.totalTravel(naiveOrder, input.cuts, origin);

    let order: string[];
    let iterations = 0;
    if (strategy === "naive") {
      order = naiveOrder;
    } else if (strategy === "nearest_neighbor") {
      order = this.nearestNeighbor(input.cuts, origin);
    } else {
      const nn = this.nearestNeighbor(input.cuts, origin);
      const { order: opt, iterations: iter } = this.twoOpt(
        nn,
        input.cuts,
        origin,
        maxIters,
      );
      order = opt;
      iterations = iter;
    }

    const travel = this.totalTravel(order, input.cuts, origin);
    const improvement =
      naiveTravel > 0 ? (naiveTravel - travel) / naiveTravel : 0;

    return {
      order,
      total_travel_mm: round3(travel),
      naive_travel_mm: round3(naiveTravel),
      improvement_fraction: round3(improvement),
      strategy,
      iterations,
    };
  }

  // ─── heuristics ────────────────────────────────────────────

  private nearestNeighbor(
    cuts: WEDMCutOperation[],
    origin: Point2D,
  ): string[] {
    const remaining = new Map(cuts.map((c) => [c.id, c]));
    const order: string[] = [];
    let pos = origin;
    while (remaining.size > 0) {
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const [id, c] of remaining) {
        const d = dist(pos, c.start);
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      }
      if (!bestId) break;
      const chosen = remaining.get(bestId)!;
      order.push(bestId);
      pos = chosen.end ?? chosen.start;
      remaining.delete(bestId);
    }
    return order;
  }

  private twoOpt(
    initialOrder: string[],
    cuts: WEDMCutOperation[],
    origin: Point2D,
    maxIters: number,
  ): { order: string[]; iterations: number } {
    const n = initialOrder.length;
    if (n < 4) return { order: initialOrder, iterations: 0 };

    let order = initialOrder.slice();
    let best = this.totalTravel(order, cuts, origin);
    let iterations = 0;
    let improved = true;
    while (improved && iterations < maxIters) {
      improved = false;
      iterations += 1;
      for (let i = 0; i < n - 1; i++) {
        for (let k = i + 1; k < n; k++) {
          const candidate = this.twoOptSwap(order, i, k);
          const t = this.totalTravel(candidate, cuts, origin);
          if (t + 1e-9 < best) {
            best = t;
            order = candidate;
            improved = true;
          }
        }
      }
    }
    return { order, iterations };
  }

  private twoOptSwap(order: string[], i: number, k: number): string[] {
    const before = order.slice(0, i);
    const middle = order.slice(i, k + 1).reverse();
    const after = order.slice(k + 1);
    return before.concat(middle, after);
  }

  // ─── internals ────────────────────────────────────────────

  private totalTravel(
    order: string[],
    cuts: WEDMCutOperation[],
    origin: Point2D,
  ): number {
    const byId = new Map(cuts.map((c) => [c.id, c]));
    let total = 0;
    let pos = origin;
    for (const id of order) {
      const c = byId.get(id);
      if (!c) continue;
      total += dist(pos, c.start);
      pos = c.end ?? c.start;
    }
    return total;
  }

  private validate(input: WEDMSequencingInput): void {
    if (!Array.isArray(input.cuts)) throw new Error("cuts required");
    if (input.cuts.length === 0) throw new Error("at least one cut required");
    const ids = new Set<string>();
    for (const c of input.cuts) {
      if (!c.id) throw new Error("cut requires id");
      if (ids.has(c.id)) throw new Error(`duplicate cut id: ${c.id}`);
      ids.add(c.id);
      if (
        !Number.isFinite(c.start?.x) ||
        !Number.isFinite(c.start?.y)
      ) {
        throw new Error(`cut ${c.id} start is not a finite 2D point`);
      }
      if (
        c.end &&
        (!Number.isFinite(c.end.x) || !Number.isFinite(c.end.y))
      ) {
        throw new Error(`cut ${c.id} end is not a finite 2D point`);
      }
    }
  }
}

function dist(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const wedmSequencingEngine = new WEDMSequencingEngine();
