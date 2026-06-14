/**
 * PSNSynergyInspectorEngine — PSN-SYNERGY-INSPECT-MS0
 *
 * Read-only meta-engine that scores cross-leg coverage across the 11 PSN
 * (PRISM Synergy Network) legs and surfaces under-wired pairs that would
 * yield the highest ROI when bridged.
 *
 * The 11 PSN legs (per [[feedback_psn_definition]]):
 *
 *   1. obsidian_brain     — knowledge/memories/ (cross-session brain)
 *   2. prism_os           — prism_operating_system dispatcher
 *   3. wiki               — knowledge/wiki/ (Karpathy LLM-wiki)
 *   4. memories           — feedback/reference standing doctrine
 *   5. tribal             — tribal-embed-index (per-domain)
 *   6. system_viz         — state/shared/system-viz/system-graph.json
 *   7. engines            — mcp-server/src/engines/
 *   8. algorithms         — mcp-server/src/algorithms/
 *   9. formulas           — knowledge/wiki/architecture/formulas/
 *  10. nn_gnn             — *NeuralLearningEngine, GraphSAGE tier
 *  11. prism_ai           — aiSystemRouterEngine + prism_ai dispatcher
 *
 * Output: ranked list of (legA × legB) pairs with bridge-suggestion strings.
 * Pure function — no I/O at engine level; tests inject sample inventories.
 *
 * @milestone PSN-SYNERGY-INSPECT-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

export const PSNLegSchema = z.enum([
  "obsidian_brain",
  "prism_os",
  "wiki",
  "memories",
  "tribal",
  "system_viz",
  "engines",
  "algorithms",
  "formulas",
  "nn_gnn",
  "prism_ai",
]);
export type PSNLeg = z.infer<typeof PSNLegSchema>;

export const PSN_LEGS: readonly PSNLeg[] = [
  "obsidian_brain", "prism_os", "wiki", "memories",
  "tribal", "system_viz", "engines", "algorithms",
  "formulas", "nn_gnn", "prism_ai",
] as const;

/**
 * Per-leg inventory counts the inspector consumes. Caller-supplied so the
 * engine stays pure (production callers read from disk; tests inject fixtures).
 *
 *   - `node_count` — total countable items in the leg (memories, wiki files,
 *     engines, algorithm modules, dispatcher actions, etc.).
 *   - `cross_refs` — outgoing references per target leg. Sparse map; missing
 *     pair is interpreted as zero refs.
 */
export const PSNLegInventorySchema = z.object({
  leg: PSNLegSchema,
  node_count: z.number().int().min(0),
  // Partial map — caller only supplies entries for peer legs that have refs.
  // z.record with the enum key requires ALL keys present in Zod 4; we want
  // sparse, so type the key as string and validate the value shape only.
  cross_refs: z.record(z.string(), z.number().int().min(0)),
});
export type PSNLegInventory = z.infer<typeof PSNLegInventorySchema>;

export const SynergyPairSchema = z.object({
  leg_a: PSNLegSchema,
  leg_b: PSNLegSchema,
  refs_a_to_b: z.number().int().min(0),
  refs_b_to_a: z.number().int().min(0),
  total_refs: z.number().int().min(0),
  /** Per-node-pair density (refs / (count_a × count_b)). Higher = better. */
  density: z.number().min(0),
  /** Under-wiring score 0–1. 1 = no refs at all between two non-empty legs (the only P0
   *  band). Connected pairs are scored by density quantile (scale-invariant): the least-
   *  dense connected pair scores highest (≤0.84), the densest scores ~0. */
  under_wired_score: z.number().min(0).max(1),
  /** Suggested bridge artifact (memo/wiki/engine/dispatcher action). */
  suggestion: z.string(),
  /** ROI band — quantile of under_wired_score among pairs with both legs non-empty. */
  roi_band: z.enum(["P0_critical", "P1_high", "P2_medium", "P3_low"]),
});
export type SynergyPair = z.infer<typeof SynergyPairSchema>;

export const SynergyReportSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  generated_at: z.string(),
  total_legs: z.number().int().min(1),
  total_pairs: z.number().int().min(0),
  pairs: z.array(SynergyPairSchema),
  /** Top-K most under-wired pairs (population sorted by under_wired_score desc). */
  top_under_wired: z.array(SynergyPairSchema),
  /** Per-leg summary: total in/out refs across all peers (sparse — only present legs are keyed). */
  leg_totals: z.record(z.string(), z.object({
    node_count: z.number().int().min(0),
    refs_out: z.number().int().min(0),
    refs_in: z.number().int().min(0),
    coverage_pct: z.number().min(0).max(100).describe("share of peer legs this leg references at all"),
  })),
});
export type SynergyReport = z.infer<typeof SynergyReportSchema>;

export interface InspectOpts {
  /** Top-K limit for `top_under_wired` list (default 10). */
  topK?: number;
  /** @deprecated Retained for API back-compat; no longer affects banding. Under-wiring is
   *  now scale-invariant (density-quantile ranking), not an absolute floor. */
  densityFloor?: number;
}

// ============================================================================
// SUGGESTION CATALOG
// ============================================================================

/**
 * Bridge-suggestion templates per directed leg pair. Lookup is order-aware so
 * "engines → wiki" gets a different suggestion than "wiki → engines".
 * Missing pair falls back to a generic template.
 */
const SUGGESTIONS: Record<string, string> = {
  // Knowledge ↔ code
  "engines:wiki":       "Add wiki entries documenting each unwired engine + cross-link via [[engine-name]]",
  "wiki:engines":       "Wire wiki entries to their engine sources by adding code-path lines to each wiki page",
  "engines:memories":   "Capture engine learnings as reference_* memories with [[engine-name]] backlinks",
  "memories:engines":   "Promote standing-doctrine memories to engine docstrings / @see comments",
  "algorithms:wiki":    "Document algorithm provenance in wiki/architecture/formulas/ pages",
  "wiki:algorithms":    "Add algorithm code-path lines to existing wiki formula entries",
  "formulas:engines":   "Wire formula registry entries to the engines that consume them via @see citation",
  "engines:formulas":   "Add formula citations to physics engines (per project canonical-constants rule)",
  // AI/NN ↔ knowledge
  "nn_gnn:tribal":      "Train GNN tier-5 on tribal-knowledge embeddings to bridge into wiring-inference cascade",
  "tribal:nn_gnn":      "Feed tribal corpus into GraphSAGE training set as labeled positive pairs",
  "prism_ai:wiki":      "Surface PRISM AI features in wiki/architecture/ai-routing/ index",
  "wiki:prism_ai":      "Add aiSystemRouterEngine call-site examples in wiki PRISM-AI section",
  "nn_gnn:engines":     "Promote NN outputs into engine confidence scores via shared AtomicValue.confidence field",
  "engines:nn_gnn":     "Emit training events from engines to nn_gnn outcome ledger for online retraining",
  // OS ↔ everything
  "prism_os:engines":   "Expose engine actions through prism_operating_system dispatcher for shell-style invocation",
  "engines:prism_os":   "Register engines as PRISM OS services so role-aware workspace can call them",
  // System Viz ↔ everything
  "system_viz:engines": "Materialize unwired engines as L7 ghost nodes in system-graph.json",
  "engines:system_viz": "Add system-viz graph-emit hooks to every new engine's lifecycle",
  "system_viz:wiki":    "Link L8 wiki ghost nodes to their underlying wiki/ files via attribute",
  "wiki:system_viz":    "Add wiki entries for every L8/built system-viz ghost node",
  // Obsidian brain ↔ everything
  "obsidian_brain:wiki":   "Promote standing-doctrine memories to wiki/ entries with [[name]] backlink to memory",
  "wiki:obsidian_brain":   "Re-anchor wiki entries to their originating memory via [[memory-name]] tag",
  "obsidian_brain:engines": "Auto-feed engine outputs into Obsidian memory via stop-obsidian-memory-feed hook",
  // Memories ↔ tribal
  "memories:tribal":    "Promote tribal-knowledge tips with strong cross-refs to feedback_* / reference_* memories",
  "tribal:memories":    "Mine memories for tribal-embed-index seed terms (machinist-spoken phrases in references)",
};

function suggestionFor(a: PSNLeg, b: PSNLeg, refsAtoB: number, refsBtoA: number): string {
  const directKey = `${a}:${b}`;
  if (SUGGESTIONS[directKey]) return SUGGESTIONS[directKey];
  // Fallback: generic bridge-the-gap template.
  const direction = refsAtoB === 0 && refsBtoA === 0
    ? `bidirectional (zero references in either direction)`
    : refsAtoB === 0
      ? `${a} → ${b} is empty (${refsBtoA} refs in reverse direction only)`
      : `${b} → ${a} is empty (${refsAtoB} refs in reverse direction only)`;
  return `Surface ${a} ↔ ${b} synergy — ${direction}. Add cross-refs from both sides.`;
}

// ============================================================================
// CORE
// ============================================================================

function inspect(inventories: PSNLegInventory[], opts: InspectOpts = {}): SynergyReport {
  if (!Array.isArray(inventories) || inventories.length === 0) {
    throw new Error("PSNSynergyInspector: inventories[] must be non-empty");
  }
  const topK = opts.topK ?? 10;
  // opts.densityFloor is retained on InspectOpts for API back-compat but is no longer used:
  // under-wiring is now scale-invariant (density-quantile ranking), not an absolute floor.
  const CONNECTED_MAX_SCORE = 0.84; // keep connected pairs strictly below the P0 (0.85) floor

  // Index by leg for fast lookup.
  const byLeg = new Map<PSNLeg, PSNLegInventory>();
  for (const inv of inventories) {
    PSNLegInventorySchema.parse(inv); // R12: fail-loud on bad inventory
    byLeg.set(inv.leg, inv);
  }

  const pairs: SynergyPair[] = [];
  const legs = inventories.map(i => i.leg);
  const bothNonEmptyFlags: boolean[] = [];

  // Pass 1 — walk every unordered pair (legA, legB); defer under-wiring scoring to pass 2
  // (the score is population-relative, so all densities must be known first).
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const a = legs[i];
      const b = legs[j];
      const invA = byLeg.get(a)!;
      const invB = byLeg.get(b)!;
      const refsAB = invA.cross_refs[b] ?? 0;
      const refsBA = invB.cross_refs[a] ?? 0;
      const total = refsAB + refsBA;
      const product = invA.node_count * invB.node_count;
      const density = product === 0 ? 0 : total / product;
      bothNonEmptyFlags.push(invA.node_count > 0 && invB.node_count > 0);
      pairs.push({
        leg_a: a,
        leg_b: b,
        refs_a_to_b: refsAB,
        refs_b_to_a: refsBA,
        total_refs: total,
        density,
        under_wired_score: 0,   // assigned in pass 2
        suggestion: suggestionFor(a, b, refsAB, refsBA),
        roi_band: "P3_low",     // assigned in pass 2
      });
    }
  }

  // Pass 2 — SCALE-INVARIANT under-wiring (density-floor recalibration).
  // The original absolute densityFloor (0.001) was meaningless at production scale: with
  // legs of thousands of nodes, density = refs/(count_a*count_b) is ALWAYS << 0.001, so
  // every non-empty pair scored ~1 → P0, and adding real edges never reduced the P0 count
  // (observed empirically). Instead, rank both-non-empty CONNECTED pairs by density and
  // score by quantile (exactly what the SynergyReport schema documents for roi_band):
  //   - zero-ref both-non-empty pairs → 1.0 (genuinely unwired; the ONLY P0 band)
  //   - connected pairs → quantile deficit scaled into [0, 0.84] (strictly below the 0.85
  //     P0 floor), so the least-dense connected pair is P1, the densest is P3
  //   - empty-leg pairs → 0 (no signal)
  // This makes bands scale-invariant AND monotonic: wiring an unwired pair drops it out of
  // P0, and the best-connected pair is never P0 regardless of absolute density magnitude.
  const connectedIdx: number[] = [];
  for (let k = 0; k < pairs.length; k++) {
    if (bothNonEmptyFlags[k] && pairs[k].total_refs > 0) connectedIdx.push(k);
  }
  connectedIdx.sort((x, y) => pairs[x].density - pairs[y].density); // ascending density
  const nConnected = connectedIdx.length;
  for (let r = 0; r < nConnected; r++) {
    // r=0 = least-dense (most under-wired) connected pair.
    const quantileDeficit = nConnected <= 1 ? 0 : (nConnected - 1 - r) / (nConnected - 1);
    pairs[connectedIdx[r]].under_wired_score = quantileDeficit * CONNECTED_MAX_SCORE;
  }
  for (let k = 0; k < pairs.length; k++) {
    if (bothNonEmptyFlags[k] && pairs[k].total_refs === 0) {
      pairs[k].under_wired_score = 1; // genuinely unwired between two populated legs
    }
    pairs[k].roi_band = bandForScore(pairs[k].under_wired_score);
  }

  // Per-leg totals.
  const legTotals: Record<string, { node_count: number; refs_out: number; refs_in: number; coverage_pct: number }> = {};
  for (const inv of inventories) {
    const refsOut = Object.values(inv.cross_refs).reduce((s, v) => s + v, 0);
    let refsIn = 0;
    let peersWithRefs = 0;
    let peerCount = 0;
    for (const peer of legs) {
      if (peer === inv.leg) continue;
      peerCount++;
      const peerInv = byLeg.get(peer);
      const fromPeer = peerInv?.cross_refs[inv.leg] ?? 0;
      refsIn += fromPeer;
      const outToPeer = inv.cross_refs[peer] ?? 0;
      if (fromPeer > 0 || outToPeer > 0) peersWithRefs++;
    }
    legTotals[inv.leg] = {
      node_count: inv.node_count,
      refs_out: refsOut,
      refs_in: refsIn,
      coverage_pct: peerCount === 0 ? 0 : (peersWithRefs / peerCount) * 100,
    };
  }

  // Top-K under-wired (descending score).
  const topUnderWired = [...pairs]
    .filter(p => p.under_wired_score > 0)
    .sort((a, b) => b.under_wired_score - a.under_wired_score)
    .slice(0, topK);

  return {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    total_legs: inventories.length,
    total_pairs: pairs.length,
    pairs,
    top_under_wired: topUnderWired,
    leg_totals: legTotals as SynergyReport["leg_totals"],
  };
}

function bandForScore(score: number): SynergyPair["roi_band"] {
  if (score >= 0.85) return "P0_critical";
  if (score >= 0.6)  return "P1_high";
  if (score >= 0.3)  return "P2_medium";
  return "P3_low";
}

/**
 * Operator-friendly summary of a SynergyReport.
 */
function summarize(report: SynergyReport): {
  legs: number;
  pairs: number;
  p0_critical: number;
  p1_high: number;
  p2_medium: number;
  most_isolated_leg: PSNLeg | null;
} {
  let p0 = 0, p1 = 0, p2 = 0;
  for (const p of report.pairs) {
    if (p.roi_band === "P0_critical") p0++;
    else if (p.roi_band === "P1_high") p1++;
    else if (p.roi_band === "P2_medium") p2++;
  }
  let mostIsolated: PSNLeg | null = null;
  let lowestCoverage = Infinity;
  for (const [leg, totals] of Object.entries(report.leg_totals)) {
    if (totals.node_count === 0) continue;
    if (totals.coverage_pct < lowestCoverage) {
      lowestCoverage = totals.coverage_pct;
      mostIsolated = leg as PSNLeg;
    }
  }
  return {
    legs: report.total_legs,
    pairs: report.total_pairs,
    p0_critical: p0,
    p1_high: p1,
    p2_medium: p2,
    most_isolated_leg: mostIsolated,
  };
}

/**
 * Canonical PSN leg list — exposed for callers building inventories.
 */
function getPSNLegs(): readonly PSNLeg[] {
  return PSN_LEGS;
}

// Static-method class per project rule.
class PSNSynergyInspectorEngine {
  static inspect = inspect;
  static summarize = summarize;
  static getPSNLegs = getPSNLegs;
  static suggestionFor = suggestionFor;
  static bandForScore = bandForScore;
}

export const psnSynergyInspectorEngine = PSNSynergyInspectorEngine;
