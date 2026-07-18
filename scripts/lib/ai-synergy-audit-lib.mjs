/**
 * ai-synergy-audit-lib.mjs -- pure, side-effect-free scorer for PRISM's
 * per-galaxy AI-synergy posture (AI-SYNERGY-AUDIT-MS0/U-AISYN-CORE, slot:charlie).
 *
 * Goal context (operator /goal 2026-06-10): the fleet has rich AI infrastructure
 * (NN/GNN tier-5, LoRA adapters, RAG/CAG, octopus consensus, 768d embeddings) but
 * recon proved it is an ISLAND -- concentrated in india/ai-training and NOT
 * discoverable from or wired into the OTHER 33 galaxies' knowledge + synergy
 * surfaces. There is no fleet-wide instrument that MEASURES, per galaxy, whether
 * its AI capability is synergized with the Obsidian vault, Hermes/octopus, the PSN
 * legs, the system-viz graph, and the galaxy's own CLAUDE.md / MEMORY.md / awareness.
 *
 * This module is that instrument's verifiable core: a deterministic pure function
 * `scoreGalaxyAiSynergy(descriptor)` that takes a fully-gathered descriptor (the
 * I/O of gathering lives in the generator `scripts/audit-ai-synergy.mjs`) and
 * returns a 0-1 synergy score across 5 ORTHOGONAL dimensions, each mapped to a
 * substrate the operator named:
 *
 *   1. discoverability   (0.25) -- AI capability mentioned in the galaxy's own
 *                                  CLAUDE.md + MEMORY.md (claude.md/memories of each galaxy)
 *   2. ownsOrWiresAi     (0.25) -- galaxy owns AI/ML engines and/or reasoning/neural
 *                                  bridges that connect it to NN/GNN leg #10
 *   3. vaultSynergy      (0.20) -- galaxy has an Obsidian synthesis brain + is fed
 *                                  into the LoRA training dataset
 *   4. crossSubstrate    (0.20) -- galaxy node carries typed cross-substrate edges
 *                                  (owned-by-slot / documented-by / consensus-of / embeds)
 *   5. awarenessSurface  (0.10) -- galaxy has a dedicated auto-injected awareness surface
 *
 * Weights sum to 1.0 (asserted at load + in tests). The function is PURE: no fs, no
 * clock, no randomness -- same descriptor in => byte-identical result out, so it is
 * fully unit-testable against real reference values (R9).
 */

export const SCHEMA_VERSION = "1.0.0";

// Discoverability saturates once a surface names this many DISTINCT AI terms.
// Exported so the discoverability injector (inject-galaxy-ai-capabilities.mjs) gates on
// the SAME threshold rather than re-inlining it (anti-drift, reviewer-B P2).
export const DISCOVERABILITY_TERMS_FOR_FULL = 3;
// ownsOrWiresAi asset credit saturates at this many in-dir AI engines.
const AI_ENGINES_FOR_FULL_ASSET = 2;
// Default count of worst galaxies surfaced by the fleet rollup.
const DEFAULT_WORST_N = 8;

/**
 * Distinct AI-capability terms. Word-boundary / pattern matched, case-insensitive.
 * "ai" and "ml" ALONE are deliberately excluded (too noisy -- they match "domain",
 * "email", "html", etc.). Each entry is a RegExp; `distinctAiTerms` counts how many
 * DISTINCT terms a surface mentions (breadth signal, not raw frequency).
 */
export const AI_TERMS = [
  /\bgnn\b/i,
  /graph\s*sage/i,
  /\bgraph neural\b/i,
  /\blora\b/i,
  /low[- ]rank adapt/i,
  /\brag\b/i,
  /retrieval[- ]augmented/i,
  /\bcag\b/i,
  /cache[- ]augmented/i,
  /\bneural\b/i,
  /deep[- ]reasoning/i,
  /deep[- ]learning/i,
  /\bembedding/i,
  /nn[-/]graph/i,
  /nn\/gnn/i,
  /reasoning bridge/i,
  // NB: "tier-5" was intentionally dropped -- PRISM overloads it for hook tiers (T0-T3+),
  // the wiring-inference cascade, and escalation tiers, so it is an AI false-positive
  // vector. The NN-GRAPH tier-5 concept is already covered by gnn / nn-graph / graphsage.
];

/** The 5 scoring dimensions and their weights. MUST sum to 1.0. */
export const DIMENSIONS = Object.freeze([
  { key: "discoverability", weight: 0.25, label: "AI mentioned in CLAUDE.md + MEMORY.md" },
  { key: "ownsOrWiresAi", weight: 0.25, label: "owns AI engines / reasoning bridges (PSN leg #10)" },
  { key: "vaultSynergy", weight: 0.20, label: "Obsidian synthesis brain + LoRA dataset feed" },
  { key: "crossSubstrate", weight: 0.20, label: "typed cross-substrate edges (system-viz <-> vault/hermes)" },
  { key: "awarenessSurface", weight: 0.10, label: "dedicated auto-injected awareness surface" },
]);

// Fail loud at load if the weights ever drift off 1.0 (a silent re-weight would
// make every historical score incomparable -- R12).
const WEIGHT_SUM = DIMENSIONS.reduce((a, d) => a + d.weight, 0);
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`ai-synergy-audit-lib: DIMENSIONS weights must sum to 1.0, got ${WEIGHT_SUM}`);
}

/** Band thresholds on the total score. */
export const BANDS = Object.freeze({ strong: 0.75, partial: 0.45 });

/** Per-dimension "passing" floor -- below this a dimension is reported as a gap. */
export const GAP_FLOOR = 0.5;

function clamp01(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * Return the Set of DISTINCT AI terms (their source pattern strings) mentioned in
 * a text surface. Empty/non-string => empty set. Distinct, not frequency: a doc
 * that says "neural" 50 times contributes one term -- we measure BREADTH of AI
 * vocabulary, which is the discoverability signal.
 */
export function distinctAiTerms(text) {
  const found = new Set();
  if (typeof text !== "string" || !text) return found;
  for (const re of AI_TERMS) {
    if (re.test(text)) found.add(re.source);
  }
  return found;
}

/**
 * Split a camelCase / PascalCase engine name into space-separated lowercase tokens
 * so that short ambiguous terms ("rag", "lora") match on WORD BOUNDARIES instead of
 * mid-token. Without this, `ExplorationEngine` false-matches /lora/ (exp-LORA-tion)
 * and `IdeaBlockRagEngine` MISSES rag (no boundary in "blockrag"). PURE.
 */
export function normalizeEngineName(name) {
  return String(name)
    .replace(/\.(ts|js|mjs)$/i, "")
    // Canonicalize the mixed-case "LoRA" acronym (Lo+RA) so the camelCase splitter
    // below keeps it as ONE token; otherwise it shatters to "lo ra" and /\blora\b/ misses it.
    .replace(/LoRA/g, "Lora")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .trim();
}

/**
 * Classify an engine filename (basename, with or without .ts) into an AI engine
 * type, or null if it is not an AI/ML/reasoning engine. Used by the generator to
 * partition a galaxy's in-dir engines. Matches on camelCase-split word boundaries.
 */
export function classifyAiEngine(name) {
  if (typeof name !== "string" || !name) return null;
  const n = normalizeEngineName(name);
  if (/\bgnn\b/.test(n) || /\bgraph\s*sage\b/.test(n) || /\bgraph neural\b/.test(n)) return "gnn";
  if (/\blora\b/.test(n)) return "lora";
  if (/\brag\b/.test(n) || /\bretrieval\b/.test(n)) return "rag";
  if (/\bcag\b/.test(n) || /cache\s*augment/.test(n)) return "cag";
  if (/\bembed/.test(n)) return "embedding";
  // A *Bridge* that links the domain to AI/reasoning/neural is the key PSN leg-10 wire.
  if (/\bbridge\b/.test(n) && /(deep\s*reason|reasoning|neural|deep\s*learn|\blora\b|\brag\b|\bai\b|\bgnn\b)/.test(n)) return "bridge";
  if (/deep\s*reason|reasoning/.test(n)) return "reasoning";
  if (/neural|deep\s*learn/.test(n)) return "neural";
  return null;
}

/**
 * Score one galaxy's AI-synergy posture. PURE.
 *
 * @param {object} d descriptor -- all fields optional except `galaxy`:
 *   galaxy            {string}   REQUIRED galaxy name
 *   claudeMd          {string?}  content of the galaxy's CLAUDE.md (null if absent)
 *   memoryMd          {string?}  content of the galaxy's MEMORY.md (null if absent)
 *   aiEngineCount     {number?}  # of AI/ML engines classified in the galaxy dir
 *   bridgeCount       {number?}  # of reasoning/neural *Bridge* engines in the galaxy dir
 *   hasSynthesis      {boolean?} a knowledge/memories/patterns/<galaxy>_synthesis.md exists
 *   inLoraDataset     {boolean?} galaxy appears in the vault->LoRA synthesis dataset
 *   edges             {object?}  { ownedBySlot?, documentedBy?, consensusOf?, embeds? }
 *   hasAwarenessGen   {boolean?} a scripts/generate-<galaxy>-awareness.mjs exists
 * @returns {object} { galaxy, score, band, subScores, gaps, recommendations, signals }
 */
export function scoreGalaxyAiSynergy(d) {
  if (!d || typeof d.galaxy !== "string" || !d.galaxy.trim()) {
    throw new Error("scoreGalaxyAiSynergy: descriptor.galaxy (non-empty string) required");
  }
  const galaxy = d.galaxy.trim();
  const claudeTerms = distinctAiTerms(d.claudeMd || "");
  const memoryTerms = distinctAiTerms(d.memoryMd || "");
  const aiEngineCount = Math.max(0, Number(d.aiEngineCount) || 0);
  const bridgeCount = Math.max(0, Number(d.bridgeCount) || 0);
  const edges = d.edges || {};

  // Dimension 1: discoverability (CLAUDE.md weighted over MEMORY.md).
  const claudeScore = clamp01(claudeTerms.size / DISCOVERABILITY_TERMS_FOR_FULL);
  const memoryScore = clamp01(memoryTerms.size / DISCOVERABILITY_TERMS_FOR_FULL);
  const discoverability = clamp01(0.6 * claudeScore + 0.4 * memoryScore);

  // Dimension 2: ownsOrWiresAi. "owns" = name-attributed AI engines; "wires" = a
  // reasoning bridge OR a per-galaxy AI dispatcher action (mill_agi_reason,
  // wedm_deep_neural, ...). A galaxy reachable from prism_ai/prism_edm/etc via a
  // domain AI action IS wired to leg #10 even without a name-prefixed engine, so
  // crediting it corrects an under-measurement (was a false 0). aiDispatcherActions
  // is the count of such actions attributed to this galaxy.
  const assetScore = clamp01(aiEngineCount / AI_ENGINES_FOR_FULL_ASSET);
  const bridgeScore = bridgeCount > 0 ? 1 : 0;
  const dispatcherScore = (Math.max(0, Number(d.aiDispatcherActions) || 0)) > 0 ? 1 : 0;
  // servedByReasoningBridge: this galaxy has a LIVE-VALIDATED generic reasoning bridge
  // (scripts/lib/galaxy-reasoning-bridge.mjs) -- it can reason over its own context via
  // the local Ollama stack. Only set true for galaxies in the validated registry, so
  // this credits a REAL capability we shipped, not a hypothetical (R12).
  const genericBridgeScore = d.servedByReasoningBridge ? 1 : 0;
  const wiresScore = Math.max(bridgeScore, dispatcherScore, genericBridgeScore); // any path = wired to leg #10
  // SYNERGY = "owns OR wires" (the dimension's literal name). A galaxy fully WIRED to
  // AI reasoning (validated bridge / dispatcher action / dedicated engine) is fully
  // AI-synergized; owning dedicated engines is a stronger FORM, not a synergy
  // prerequisite. MAX so a fully-wired galaxy scores full synergy. This measures
  // synergy PRESENCE, not ownership maturity (the audit's `method` discloses it). R12.
  const ownsOrWiresAi = clamp01(Math.max(assetScore, wiresScore));

  // Dimension 3: vaultSynergy (synthesis brain + LoRA feed).
  const vaultSynergy = clamp01(0.6 * (d.hasSynthesis ? 1 : 0) + 0.4 * (d.inLoraDataset ? 1 : 0));

  // Dimension 4: crossSubstrate (typed edges into system-viz / vault / hermes).
  // owned-by-slot + documented-by are the ACHIEVABLE galaxy-grain edges (every galaxy
  // can earn them via generate-cross-substrate-edges.mjs). consensus-of / embeds are
  // rare FLEET-grain edges -- today only hermes-zulu earns consensus-of, and embeds
  // target ghost embedding pools, not galaxy nodes -- so they are weighted as a small
  // BONUS, never a structural penalty that makes a well-connected galaxy look broken (R12).
  // At GALAXY grain the two edges that actually attach to a galaxy node are
  // owned-by-slot + documented-by; consensus-of / embeds are RARE FLEET-grain edges
  // (only hermes-zulu earns consensus; embeds target ghost pools) -- documented as a
  // BONUS, not a per-galaxy gap. So both galaxy-grain edges present = full synergy;
  // consensus/embeds add above-cap bonus only. R12: presence, not redundancy.
  const crossSubstrate = clamp01(
    0.5 * (edges.ownedBySlot ? 1 : 0) +
      0.5 * (edges.documentedBy ? 1 : 0) +
      0.1 * (edges.consensusOf ? 1 : 0) +
      0.1 * (edges.embeds ? 1 : 0)
  );

  // Dimension 5: awarenessSurface. A 'dedicated-gen' (always-on generator) earns full
  // credit; a 'fleet-hook' (the generic AI-synergy injector that only fires when the
  // galaxy's slot is LIVE) earns PARTIAL credit -- it is a real surface but not always
  // present, so scoring it identical to a dedicated generator would over-claim (R12).
  // awarenessKind is the explicit signal; hasAwarenessGen is the back-compat fallback.
  const awarenessKind = d.awarenessKind || (d.hasAwarenessGen ? "dedicated-gen" : null);
  const kindScore = awarenessKind === "dedicated-gen" ? 1 : awarenessKind === "fleet-hook" ? 0.7 : 0;
  // A per-galaxy SOUL.md carries the galaxy's identity + live AI posture and is
  // auto-loaded (Bibryam context cascade) when a chat works in the galaxy dir -- a
  // real, ALWAYS-PRESENT awareness surface, the one that covers slotless galaxies
  // with no fleet hook. Take the MAX over all surfaces (R12: only what actually exists).
  const soulScore = d.hasSoul ? 0.6 : 0;
  const synthScore = d.hasSynthesis ? 0.3 : 0;
  const awarenessSurface = Math.max(kindScore, soulScore, synthScore);

  const subScores = {
    discoverability: round3(discoverability),
    ownsOrWiresAi: round3(ownsOrWiresAi),
    vaultSynergy: round3(vaultSynergy),
    crossSubstrate: round3(crossSubstrate),
    awarenessSurface: round3(awarenessSurface),
  };

  let total = 0;
  for (const dim of DIMENSIONS) total += dim.weight * subScores[dim.key];
  total = round3(clamp01(total));

  const band = total >= BANDS.strong ? "strong" : total >= BANDS.partial ? "partial" : "weak";

  const gaps = [];
  const recommendations = [];
  for (const dim of DIMENSIONS) {
    const s = subScores[dim.key];
    if (s < GAP_FLOOR) {
      gaps.push({ dimension: dim.key, score: s, label: dim.label });
      recommendations.push(recommendFor(dim.key, galaxy, { aiEngineCount, bridgeCount, edges, d }));
    }
  }

  return {
    galaxy,
    score: total,
    band,
    subScores,
    gaps,
    recommendations,
    signals: {
      claudeTerms: [...claudeTerms],
      memoryTerms: [...memoryTerms],
      aiEngineCount,
      bridgeCount,
      aiDispatcherActions: Math.max(0, Number(d.aiDispatcherActions) || 0),
      servedByReasoningBridge: !!d.servedByReasoningBridge,
      hasSoul: !!d.hasSoul,
      hasSynthesis: !!d.hasSynthesis,
      inLoraDataset: !!d.inLoraDataset,
      hasAwarenessGen: !!d.hasAwarenessGen,
      edges: {
        ownedBySlot: !!edges.ownedBySlot,
        documentedBy: !!edges.documentedBy,
        consensusOf: !!edges.consensusOf,
        embeds: !!edges.embeds,
      },
    },
  };
}

/** Concrete, actionable remediation string for a failing dimension. */
function recommendFor(key, galaxy, ctx) {
  switch (key) {
    case "discoverability":
      return `Add an "## AI capabilities" section to ${galaxy}/CLAUDE.md + MEMORY.md naming its NN/GNN/LoRA/RAG/CAG assets (or its fleet-served AI route).`;
    case "ownsOrWiresAi":
      return ctx.bridgeCount === 0
        ? `Wire a reasoning/neural bridge engine for ${galaxy} into NN/GNN leg #10 (clone the QuotingDeepReasoningBridge pattern).`
        : `Surface ${galaxy}'s ${ctx.aiEngineCount} AI engine(s) so they are discoverable + dispatcher-reachable.`;
    case "vaultSynergy":
      return ctx.d && ctx.d.hasSynthesis
        ? `Feed ${galaxy}_synthesis.md into the vault->LoRA dataset (vault-to-lora-dataset.mjs).`
        : `Generate ${galaxy}_synthesis.md (galaxy-synthesis-refresh.mjs --galaxy ${galaxy}) so the Obsidian brain + LoRA feed cover this galaxy.`;
    case "crossSubstrate": {
      // Only recommend the ACHIEVABLE galaxy-grain edges. consensus-of/embeds are
      // fleet-grain bonus edges, not a per-galaxy gap, so we never tell a galaxy to
      // "materialize embeds" (impossible at galaxy granularity -- R12 honesty).
      const missing = [];
      if (!ctx.edges.ownedBySlot) missing.push("owned-by-slot");
      if (!ctx.edges.documentedBy) missing.push("documented-by");
      return missing.length
        ? `Materialize galaxy-grain cross-substrate edge(s) [${missing.join(", ")}] for ${galaxy} via generate-cross-substrate-edges.mjs.`
        : `Run ${galaxy}'s domain through the octopus consensus loop to earn the consensus-of cross-substrate bonus.`;
    }
    case "awarenessSurface":
      return `Clone generate-quoting-awareness.mjs -> generate-${galaxy}-awareness.mjs (or add ${galaxy} to a shared fleet awareness generator) so its AI posture auto-injects.`;
    default:
      return `Improve ${key} for ${galaxy}.`;
  }
}

/**
 * Roll up per-galaxy results into a fleet summary. PURE.
 * @param {object[]} results array of scoreGalaxyAiSynergy() outputs
 * @param {number} worstN how many lowest-scoring galaxies to surface
 * @returns {object} fleet rollup with mean/median, per-dimension coverage, bands, worst-N
 */
export function rollupFleet(results, worstN = DEFAULT_WORST_N) {
  const arr = Array.isArray(results) ? results.filter(Boolean) : [];
  const n = arr.length;
  if (n === 0) {
    return {
      galaxies: 0,
      meanScore: 0,
      medianScore: 0,
      bands: { strong: 0, partial: 0, weak: 0 },
      dimensionCoverage: {},
      worst: [],
    };
  }
  const scores = arr.map((r) => r.score).sort((a, b) => a - b);
  const mean = round3(scores.reduce((a, b) => a + b, 0) / n);
  const mid = Math.floor(n / 2);
  const median = round3(n % 2 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2);

  const bands = { strong: 0, partial: 0, weak: 0 };
  for (const r of arr) bands[r.band] = (bands[r.band] || 0) + 1;

  // Per-dimension coverage: how many galaxies score >= GAP_FLOOR on each dimension.
  const dimensionCoverage = {};
  for (const dim of DIMENSIONS) {
    const passing = arr.filter((r) => (r.subScores[dim.key] || 0) >= GAP_FLOOR).length;
    dimensionCoverage[dim.key] = {
      passing,
      total: n,
      pct: round3(passing / n),
      meanSub: round3(arr.reduce((a, r) => a + (r.subScores[dim.key] || 0), 0) / n),
    };
  }

  const worst = [...arr]
    .sort((a, b) => a.score - b.score || a.galaxy.localeCompare(b.galaxy))
    .slice(0, worstN)
    .map((r) => ({ galaxy: r.galaxy, score: r.score, band: r.band, gaps: r.gaps.map((g) => g.dimension) }));

  return { galaxies: n, meanScore: mean, medianScore: median, bands, dimensionCoverage, worst };
}
