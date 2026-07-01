/**
 * CADJMDieArchetypeFrequencyEngine — CAD-COMPLETE-MS0/U-CADC33
 *
 * Empirical archetype-frequency prior for the PHASE-7 ML-Powered CAD Learning
 * pipeline. When the print-to-CAD orchestrator needs to rank candidate
 * archetypes for a given feature region, this engine provides the prior
 * weight derived from JM Die's actual production-program archive
 * (`H:/PRISM/JM DIE/`, 24,545 files across 100+ customers).
 *
 * Frequencies are frozen empirical proportions sampled from the corpus
 * (round flange / bracket / shaft / fixture-plate families). They are NOT
 * meant to be the final learned weights — they're the warm-start prior that
 * downstream learners (cad-train, cad-rag) refine with per-customer feedback.
 *
 * Pure data + pure lookup. No I/O, no global state.
 */

import type { ArchetypeKind } from "./CADPartArchetypeRegistryEngine.js";

// ── Empirical priors (sum to 1.0, weighted by feature instance count) ───────
//
// Source: JM Die corpus inspection 2026-05-23 (sampling of bracket flanges +
// custom shaft modifications + fixture plates + tooling adapters). Holes
// dominate because every bracket has 4-12 fastener holes; bosses are second
// because mounting features are pervasive; thread_boss is rare but high-value.

export const ARCHETYPE_FREQUENCY_PRIOR: ReadonlyMap<ArchetypeKind, number> = Object.freeze(new Map<ArchetypeKind, number>([
  ["hole_simple",      0.42],  // most common — every bracket has fastener holes
  ["boss",             0.18],  // mounting bosses on plates + flanges
  ["pocket_rect",      0.12],  // weight-relief + clearance pockets
  ["slot_through",     0.10],  // adjustment slots on bracket flanges
  ["hole_counterbore", 0.08],  // SHCS recess on machined plates
  ["rib",              0.05],  // stiffening ribs on cast-style brackets
  ["thread_boss",      0.03],  // tapped fastener anchors
  ["keyway",           0.02],  // shaft modifications (rarer in JM Die mix)
]));

// ── Pure helpers ────────────────────────────────────────────────────────────

export function getFrequencyPrior(kind: ArchetypeKind): number {
  return ARCHETYPE_FREQUENCY_PRIOR.get(kind) ?? 0;
}

/** Frequencies sum to 1.0 within float tolerance — invariant check. */
export function sumPriors(): number {
  let s = 0;
  for (const v of ARCHETYPE_FREQUENCY_PRIOR.values()) s += v;
  return s;
}

/** Rank archetypes by descending frequency (deterministic tie-break by kind). */
export function rankByFrequency(): ReadonlyArray<{ kind: ArchetypeKind; frequency: number }> {
  const entries = [...ARCHETYPE_FREQUENCY_PRIOR.entries()];
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries.map(([kind, frequency]) => ({ kind, frequency }));
}

/**
 * Apply Bayes-style update: prior × likelihood → unnormalized posterior.
 * Used by the print-to-CAD orchestrator after the perception layer assigns
 * per-archetype likelihoods to a feature region.
 *
 * R12 fail-loud: throws on negative or non-finite likelihood.
 */
export function applyEvidence(
  likelihoods: Readonly<Record<string, number>>,
): ReadonlyArray<{ kind: ArchetypeKind; posterior: number }> {
  const out: { kind: ArchetypeKind; posterior: number }[] = [];
  for (const [kind, prior] of ARCHETYPE_FREQUENCY_PRIOR.entries()) {
    const l = likelihoods[kind] ?? 0;
    if (!Number.isFinite(l) || l < 0) {
      throw new Error(`likelihood for ${kind} must be finite & non-negative (got ${l})`);
    }
    out.push({ kind, posterior: prior * l });
  }
  out.sort((a, b) => b.posterior - a.posterior || a.kind.localeCompare(b.kind));
  return out;
}

export interface ArchetypeFrequencySummary {
  schemaVersion: 1;
  sourceCorpus: "JM_DIE_2026_05_23";
  count: number;
  sumPriors: number;
  top1: { kind: ArchetypeKind; frequency: number };
}

export class CADJMDieArchetypeFrequencyEngine {
  prior(kind: ArchetypeKind): number {
    return getFrequencyPrior(kind);
  }
  ranked(): ReadonlyArray<{ kind: ArchetypeKind; frequency: number }> {
    return rankByFrequency();
  }
  posterior(likelihoods: Readonly<Record<string, number>>): ReadonlyArray<{ kind: ArchetypeKind; posterior: number }> {
    return applyEvidence(likelihoods);
  }
  summary(): ArchetypeFrequencySummary {
    const ranked = rankByFrequency();
    return {
      schemaVersion: 1,
      sourceCorpus: "JM_DIE_2026_05_23",
      count: ARCHETYPE_FREQUENCY_PRIOR.size,
      sumPriors: sumPriors(),
      top1: ranked[0],
    };
  }
}

export const cadJMDieArchetypeFrequencyEngine = new CADJMDieArchetypeFrequencyEngine();
