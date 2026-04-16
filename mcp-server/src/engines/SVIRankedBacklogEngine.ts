/**
 * SVIRankedBacklogEngine — Rank backlog units by Ψ-delta per hour
 *
 * Phase 0.14 U-SVI6 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a set of
 * backlog units (roadmap milestones, open tasks), rank them by projected Ψ
 * delta divided by estimated effort. Exposed to the `/smart` router so that
 * "what should I do next?" always returns the highest-leverage work.
 *
 * No I/O. Callers are responsible for loading the backlog (from roadmap-index
 * or task list) and supplying a projection for each unit. This keeps the
 * engine testable and lets multiple callers (skills, dispatchers, CI tools)
 * share the ranking logic.
 *
 * @module engines/SVIRankedBacklogEngine
 * @milestone PP-0.14-U-SVI6
 */

import type { ProjectionResult } from "./SVIImpactProjectorEngine.js";

export interface BacklogUnit {
  id: string;
  title: string;
  estimatedHours: number;
  projection: ProjectionResult;
  status?: "pending" | "in_progress" | "blocked" | "completed";
  dependencies?: string[];
  tags?: string[];
}

export interface RankedUnit extends BacklogUnit {
  score: number; // psiDelta / estimatedHours
  blockedByUnresolved: boolean;
  rank: number;
}

export interface RankOptions {
  /**
   * If true, units whose dependencies include any non-completed unit in the
   * same backlog are flagged as blockedByUnresolved and pushed to the bottom.
   */
  respectDependencies?: boolean;
  /** Exclude completed units from output. */
  excludeCompleted?: boolean;
  /** Only include units with these tags (if provided). */
  includeTags?: string[];
  /** Limit the returned list. */
  limit?: number;
}

export class SVIRankedBacklogEngine {
  rank(units: readonly BacklogUnit[], opts: RankOptions = {}): RankedUnit[] {
    const respect = opts.respectDependencies ?? true;
    const excludeCompleted = opts.excludeCompleted ?? true;
    const includeTags = opts.includeTags;
    const limit = opts.limit;

    this.assertUnique(units);

    const completed = new Set(units.filter((u) => u.status === "completed").map((u) => u.id));

    const filtered = units.filter((u) => {
      if (excludeCompleted && u.status === "completed") return false;
      if (includeTags && includeTags.length > 0) {
        const tags = u.tags ?? [];
        if (!includeTags.some((t) => tags.includes(t))) return false;
      }
      return true;
    });

    const scored: RankedUnit[] = filtered.map((u) => {
      const score = this.scoreOne(u);
      const blockedByUnresolved =
        respect && Array.isArray(u.dependencies) && u.dependencies.some((d) => !completed.has(d));
      return { ...u, score, blockedByUnresolved, rank: 0 };
    });

    scored.sort((a, b) => {
      if (a.blockedByUnresolved !== b.blockedByUnresolved) {
        return a.blockedByUnresolved ? 1 : -1;
      }
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });

    for (let i = 0; i < scored.length; i += 1) scored[i].rank = i + 1;
    return typeof limit === "number" ? scored.slice(0, Math.max(0, limit)) : scored;
  }

  /** Exposed so callers can recompute for a single unit without re-sorting. */
  scoreOne(unit: BacklogUnit): number {
    if (!(unit.estimatedHours > 0)) {
      throw new Error(`estimatedHours must be > 0 (id=${unit.id})`);
    }
    return Math.round((unit.projection.psiDelta / unit.estimatedHours) * 10000) / 10000;
  }

  summary(ranked: readonly RankedUnit[]): {
    total: number;
    blocked: number;
    totalPsiPotential: number;
    top: RankedUnit | null;
  } {
    const blocked = ranked.filter((r) => r.blockedByUnresolved).length;
    const totalPsiPotential =
      Math.round(ranked.reduce((a, r) => a + r.projection.psiDelta, 0) * 100) / 100;
    return {
      total: ranked.length,
      blocked,
      totalPsiPotential,
      top: ranked[0] ?? null,
    };
  }

  private assertUnique(units: readonly BacklogUnit[]): void {
    const seen = new Set<string>();
    for (const u of units) {
      if (seen.has(u.id)) throw new Error(`Duplicate backlog id: ${u.id}`);
      seen.add(u.id);
    }
  }
}

export const sviRankedBacklogEngine = new SVIRankedBacklogEngine();
