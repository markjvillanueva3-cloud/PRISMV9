// course-data-router-lib.mjs
// Pure routing engine: course-content-candidate.candidateAssets[] → routing decisions.
//
// Decides per-asset PRISM landing site (knowledge tip / algorithm / formula /
// engine / skill / pipeline-hint) by dedup-checking against an injected
// PRISM-asset inventory. Outputs advisory routing decisions that downstream
// /forge-queue + physics-reviewer can consume — NEVER auto-emits assets.
//
// Composition contract (Karpathy R8 — read before write):
//   - INPUT: course candidate (shape: state/shared/tribal-graph/course-content-candidates.jsonl)
//   - INVENTORY: injected readers (existingAlgorithmNames, existingEngineNames)
//                — keeps the lib hermetic for tests + dependency-free
//   - OUTPUT: array of RoutingDecision (one per candidateAssets[] entry)
//
// Doctrine pins (CLAUDE.md):
//   - `formula` kind: NEVER auto-emits — always FORGE-QUEUE pending
//     physics-reviewer (canonical constants live in src/physics/constants.ts).
//   - `engine` kind: higher threshold (0.6) than `algorithm` (0.5) because
//     engines need full /forge-triple, not just an algorithm file.
//   - `technique` kind: TRIBAL-SHIPPED — Phase 1 U-KC-B1 shipped course →
//     tribal-tip emit; this lib does NOT re-emit.
//
// All functions pure — no fs/network/Date.now() side effects.

export const SCHEMA_VERSION = "1.0.0";

// Decision enum (string union enforced by validateDecision)
export const DECISIONS = Object.freeze([
  "TRIBAL-SHIPPED", // technique → Phase 1 already emits this
  "DUPLICATE",      // matched in existing PRISM inventory
  "FORGE-QUEUE",    // candidate for /forge (human-gated, never auto-built)
  "PORT-CANDIDATE", // direct file→file port available (rare for course data)
  "DISCARD",        // below mfg-relevance floor
]);

// Lane enum per KNOWLEDGE-CONVERSION-MS0 plan doc
export const LANES = Object.freeze({
  A: "A", // direct-wire autonomous-safe (tribal-tips)
  B: "B", // port — engineering, semi-autonomous
  C: "C", // /forge-gated — human-in-the-loop
});

// Node-type taxonomy — the surfaces course data can populate
export const NODE_TYPES = Object.freeze([
  "knowledge",  // TribalKnowledgeEngine tips
  "algorithm",  // mcp-server/src/algorithms/*.ts
  "formula",    // src/physics/constants.ts + prism_calc actions
  "engine",     // mcp-server/src/engines/*.ts
  "skill",      // .claude/commands/*.md slash-command runbook
  "pipeline",   // multi-step orchestration (composed skill / dispatcher chain)
]);

// Thresholds (named — adaptive-thresholds may tune later per RGS6 pattern)
export const THRESHOLDS = Object.freeze({
  ALGORITHM_FORGE_MIN_RELEVANCE: 0.5,
  ENGINE_FORGE_MIN_RELEVANCE: 0.6, // higher — engines need more justification
  FORMULA_DISCARD_FLOOR: 0.3,      // formulas always forge-queue if above this
  DEDUP_MATCH_SCORE: 0.6,          // token-overlap min to call DUPLICATE
});

/** Normalize a name to comparable tokens.
 *  Strips common suffixes (Engine/Model/Algorithm/Method), separators, casing.
 *  CamelCase-aware: "OperatorSplittingMethod" → ["operator","splitting"]. */
export function normalizeNameTokens(name) {
  if (typeof name !== "string" || name.length === 0) return [];
  const stripped = name
    // Split CamelCase BEFORE lowercasing — otherwise interior boundaries
    // collapse into a single token (dedup signal lost). "OperatorSplitting"
    // → "Operator Splitting" → lowercase → tokenize.
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/(engine|model|algorithm|method|controller|system|module)$/i, "")
    .replace(/[-_./\s]+/g, " ")
    .trim();
  return stripped.split(/\s+/).filter((t) => t.length >= 2);
}

/** Token-overlap score in [0,1] — Jaccard-like but biased to candidate coverage. */
export function tokenMatchScore(candidateTokens, prismTokens) {
  if (candidateTokens.length === 0 || prismTokens.length === 0) return 0;
  const pSet = new Set(prismTokens);
  let hit = 0;
  for (const t of candidateTokens) if (pSet.has(t)) hit++;
  // Coverage-of-candidate: "operator-splitting" (2 tokens) matching
  // "OperatorSplittingMethod" (2 useful tokens after strip) → 2/2 = 1.0.
  return hit / candidateTokens.length;
}

/** Find best PRISM-inventory match for a candidate name.
 *  prismNames is an array of normalized lowercase names (no .ts/.mjs ext).
 *  Returns { name, score } | null. */
export function findBestMatch(candidateName, prismNames) {
  const candTokens = normalizeNameTokens(candidateName);
  if (candTokens.length === 0 || !Array.isArray(prismNames)) return null;
  let best = null;
  for (const pn of prismNames) {
    const pTokens = normalizeNameTokens(pn);
    const score = tokenMatchScore(candTokens, pTokens);
    if (score >= THRESHOLDS.DEDUP_MATCH_SCORE && (!best || score > best.score)) {
      best = { name: pn, score };
    }
  }
  return best;
}

/** Route a single candidateAsset.
 *  @param {object} asset — { kind, name, rationale }
 *  @param {object} context — { mfgRelevance, prismDomains, courseId, courseTitle }
 *  @param {object} inventory — { algorithms: string[], engines: string[] }
 *  @returns {object} RoutingDecision
 */
export function routeAsset(asset, context, inventory) {
  validateAsset(asset);
  const ctx = context || {};
  const inv = inventory || { algorithms: [], engines: [] };
  const mfgRelevance = typeof ctx.mfgRelevance === "number" ? ctx.mfgRelevance : 0;
  const base = {
    kind: asset.kind,
    name: asset.name,
    rationale: asset.rationale || "",
    courseId: ctx.courseId || null,
    domains: Array.isArray(ctx.prismDomains) ? [...ctx.prismDomains] : [],
    mfgRelevance,
  };

  switch (asset.kind) {
    case "technique":
      return {
        ...base,
        targetNodeType: "knowledge",
        targetSurface: "cad-engine/knowledge_store/mit-ocw-course-tips.json",
        prismMatch: null,
        decision: "TRIBAL-SHIPPED",
        lane: LANES.A,
        recommendedAction:
          "verify TribalKnowledgeEngine tip exists (Phase 1 U-KC-B1 shipped); " +
          "if absent, re-run scripts/course-to-tribal-tips.mjs",
        rationale: "Technique → knowledge-tip emit was Lane A direct-wire (already shipped).",
      };

    case "algorithm": {
      const match = findBestMatch(asset.name, inv.algorithms);
      if (match) {
        return {
          ...base,
          targetNodeType: "algorithm",
          targetSurface: `mcp-server/src/algorithms/${match.name}.ts`,
          prismMatch: { file: match.name, score: match.score, source: "algorithms-dir" },
          decision: "DUPLICATE",
          lane: LANES.B,
          recommendedAction:
            "human-verify formulas match canonical impl; if course version " +
            "adds a variant, propose extension via /forge — never duplicate",
          rationale: `Token-match score ${match.score.toFixed(2)} → likely already implemented.`,
        };
      }
      if (mfgRelevance >= THRESHOLDS.ALGORITHM_FORGE_MIN_RELEVANCE) {
        return {
          ...base,
          targetNodeType: "algorithm",
          targetSurface: "mcp-server/src/algorithms/<NewAlgorithm>.ts",
          prismMatch: null,
          decision: "FORGE-QUEUE",
          lane: LANES.C,
          recommendedAction: `/forge-triple algorithm:${asset.name}`,
          rationale:
            `No PRISM-algorithm dedup hit; mfgRelevance ${mfgRelevance.toFixed(2)} ≥ ` +
            `${THRESHOLDS.ALGORITHM_FORGE_MIN_RELEVANCE}. Course-derived → Lane C human-gated /forge.`,
        };
      }
      return {
        ...base,
        targetNodeType: "algorithm",
        targetSurface: null,
        prismMatch: null,
        decision: "DISCARD",
        lane: null,
        recommendedAction: "drop from queue — below manufacturing-relevance floor",
        rationale: `mfgRelevance ${mfgRelevance.toFixed(2)} < ${THRESHOLDS.ALGORITHM_FORGE_MIN_RELEVANCE}.`,
      };
    }

    case "formula": {
      if (mfgRelevance < THRESHOLDS.FORMULA_DISCARD_FLOOR) {
        return {
          ...base,
          targetNodeType: "formula",
          targetSurface: null,
          prismMatch: null,
          decision: "DISCARD",
          lane: null,
          recommendedAction: "drop — below formula relevance floor",
          rationale: `mfgRelevance ${mfgRelevance.toFixed(2)} < ${THRESHOLDS.FORMULA_DISCARD_FLOOR}.`,
        };
      }
      // Doctrine: NEVER inline physics constants. Formulas ALWAYS go to forge
      // queue for physics-reviewer agent verification (CLAUDE.md §SAFETY).
      return {
        ...base,
        targetNodeType: "formula",
        targetSurface: "src/physics/constants.ts + prism_calc:<action>",
        prismMatch: null,
        decision: "FORGE-QUEUE",
        lane: LANES.C,
        recommendedAction:
          "physics-reviewer agent verify equation + dimensional consistency, " +
          "then port constants to src/physics/constants.ts (NEVER inline) and " +
          "wire to prism_calc/<action> via /forge-triple formula:" + asset.name,
        rationale:
          "Doctrine: canonical physics constants live in src/physics/constants.ts; " +
          "course-derived formulas require physics-reviewer agent gate before port.",
      };
    }

    case "engine": {
      const match = findBestMatch(asset.name, inv.engines);
      if (match) {
        return {
          ...base,
          targetNodeType: "engine",
          targetSurface: `mcp-server/src/engines/${match.name}.ts`,
          prismMatch: { file: match.name, score: match.score, source: "engines-dir" },
          decision: "DUPLICATE",
          lane: LANES.B,
          recommendedAction:
            "verify existing engine covers course-derived scope; if course " +
            "introduces new method, propose extension PR not new engine",
          rationale: `Token-match score ${match.score.toFixed(2)} → likely already implemented.`,
        };
      }
      if (mfgRelevance >= THRESHOLDS.ENGINE_FORGE_MIN_RELEVANCE) {
        return {
          ...base,
          targetNodeType: "engine",
          targetSurface: "mcp-server/src/engines/<NewEngine>.ts",
          prismMatch: null,
          decision: "FORGE-QUEUE",
          lane: LANES.C,
          recommendedAction: `/forge-triple engine:${asset.name}`,
          rationale:
            `No engine dedup hit; mfgRelevance ${mfgRelevance.toFixed(2)} ≥ ` +
            `${THRESHOLDS.ENGINE_FORGE_MIN_RELEVANCE} (engine threshold).`,
        };
      }
      return {
        ...base,
        targetNodeType: "engine",
        targetSurface: null,
        prismMatch: null,
        decision: "DISCARD",
        lane: null,
        recommendedAction: "drop — engine threshold not met",
        rationale: `mfgRelevance ${mfgRelevance.toFixed(2)} < ${THRESHOLDS.ENGINE_FORGE_MIN_RELEVANCE}.`,
      };
    }

    default:
      // Unknown kind — never crash; emit DISCARD with audit trail (R12 fail loud).
      return {
        ...base,
        targetNodeType: null,
        targetSurface: null,
        prismMatch: null,
        decision: "DISCARD",
        lane: null,
        recommendedAction: `unknown asset kind "${asset.kind}" — schema drift or new kind, add routing rule`,
        rationale: "Unknown asset.kind — no routing rule. Audit and extend NODE_TYPES if legitimate.",
      };
  }
}

/** Route an entire candidate: all candidateAssets → array of decisions. */
export function routeCandidate(candidate, inventory) {
  validateCandidate(candidate);
  const context = {
    mfgRelevance: candidate.mfgRelevance,
    prismDomains: candidate.prismDomains,
    courseId: candidate.courseId,
    courseTitle: candidate.courseTitle,
    rank: candidate.rank,
  };
  const decisions = [];
  for (const asset of candidate.candidateAssets || []) {
    decisions.push(routeAsset(asset, context, inventory));
  }
  return {
    candidateId: candidate.nodeId || candidate.courseId,
    courseId: candidate.courseId,
    courseTitle: candidate.courseTitle,
    mfgRelevance: candidate.mfgRelevance,
    rank: candidate.rank,
    decisionCount: decisions.length,
    decisions,
  };
}

/** Build aggregate ledger from all candidates. */
export function buildLedger(candidates, inventory, opts = {}) {
  const generatedAt = opts.frozenTime || new Date().toISOString();
  const items = candidates.map((c) => routeCandidate(c, inventory));
  // Summary roll-ups
  const summary = {
    candidateCount: items.length,
    assetCount: 0,
    byDecision: Object.fromEntries(DECISIONS.map((d) => [d, 0])),
    byNodeType: Object.fromEntries(NODE_TYPES.map((n) => [n, 0])),
    byLane: { A: 0, B: 0, C: 0, none: 0 },
    forgeQueueCount: 0,
    duplicateCount: 0,
    tribalShippedCount: 0,
    discardCount: 0,
  };
  for (const item of items) {
    for (const d of item.decisions) {
      summary.assetCount++;
      summary.byDecision[d.decision] = (summary.byDecision[d.decision] || 0) + 1;
      if (d.targetNodeType) summary.byNodeType[d.targetNodeType] = (summary.byNodeType[d.targetNodeType] || 0) + 1;
      if (d.lane) summary.byLane[d.lane]++;
      else summary.byLane.none++;
      if (d.decision === "FORGE-QUEUE") summary.forgeQueueCount++;
      if (d.decision === "DUPLICATE") summary.duplicateCount++;
      if (d.decision === "TRIBAL-SHIPPED") summary.tribalShippedCount++;
      if (d.decision === "DISCARD") summary.discardCount++;
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: "course-data-routing-ledger",
    advisoryOnly: true,
    mustHumanVerify: true,
    generatedAt,
    generator: "scripts/course-data-router.mjs",
    caveat:
      "Routing decisions are ADVISORY. FORGE-QUEUE items require human /forge " +
      "gate. Formulas require physics-reviewer agent before any port. " +
      "DUPLICATE decisions are based on name-token overlap and may have false " +
      "positives — human verify before discarding course intent.",
    thresholds: THRESHOLDS,
    inventory: {
      algorithmCount: (inventory && inventory.algorithms ? inventory.algorithms.length : 0),
      engineCount: (inventory && inventory.engines ? inventory.engines.length : 0),
    },
    summary,
    items,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Validators (R12 fail loud — invalid input throws, never silent-DISCARDs)
// ──────────────────────────────────────────────────────────────────────────

export function validateAsset(asset) {
  if (!asset || typeof asset !== "object") throw new TypeError("asset must be object");
  if (typeof asset.kind !== "string") throw new TypeError("asset.kind must be string");
  if (typeof asset.name !== "string" || asset.name.length === 0)
    throw new TypeError("asset.name must be non-empty string");
}

export function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") throw new TypeError("candidate must be object");
  if (!Array.isArray(candidate.candidateAssets))
    throw new TypeError("candidate.candidateAssets must be array");
}

export function validateDecision(d) {
  return typeof d === "string" && DECISIONS.includes(d);
}
