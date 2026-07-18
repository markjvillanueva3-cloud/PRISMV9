// scripts/lib/cag-router.mjs
//
// CAG-Router — Classify a query as COLD (cache-augmented), HOT (retrieval-augmented),
// or HYBRID (both layers). Implements the Cache-Augmented Generation pattern
// (akshay_pachaar X tweet 2056714042455343160, 2026-05-19; foundational paper
// Chan et al. 2024 "Don't Do RAG: When Cache-Augmented Generation is All You Need").
//
// PURPOSE
// PRISM today re-pays the prompt cost for static doctrine on every UserPromptSubmit
// (CLAUDE.md ~67KB + MEMORY.md ~25KB + ENGINE_DIGEST.md + DISPATCHER_DIGEST.md are
// auto-injected even when the query is about live state that the doctrine doesn't
// answer). RAG also fires per-query against Qdrant for state that hasn't changed.
// CAG fixes this by classifying the query up-front:
//   - COLD  : answer from KV-cached static doctrine (no Qdrant hit, no peer scan)
//   - HOT   : skip doctrine, hit live state surfaces (chat-slots, BUILD_STATE, RAG)
//   - HYBRID: prepend the relevant cold-tier slice, then hit hot surfaces
//
// This router is PURE — no I/O, no fetch — so it composes into any hook chain
// (UserPromptSubmit, SubagentStart) with sub-millisecond overhead.
//
// COMPOSES WITH
//   - master-index-search-lib.mjs : same BM25-lite key-set; the hot-tier path
//     forwards to master-index when needed
//   - scripts/lib/token-savings-router-table.mjs : both use the same intent shape
//   - prompt-cache.mjs (referenced in CLAUDE.md prompt-engineering-rails) : the
//     cold-tier source list is the canonical seed for cache_control:ephemeral
//
// DOCTRINE
//   - akshay_pachaar's caveat (in his thread): "only cache static, high-value
//     knowledge that rarely changes. If you cache everything, you'll hit context
//     limits." The COLD_SOURCES registry below is the curated cold-tier — every
//     entry has a `coldRationale` field explaining why it's stable.
//   - Separating cold (cacheable) and hot (retrievable) data keeps the system
//     reliable when prompts grow large.

// ---------------------------------------------------------------------------
// COLD-TIER REGISTRY — static doctrine that's load-bearing across sessions.
// Every entry here must rarely change (≤ 1 modification / month) AND be
// high-leverage (referenced by ≥ 3 surfaces). Adding an entry costs context
// budget on every cold-hit query; choose deliberately.
// ---------------------------------------------------------------------------

// resolveObsidianMemDir() is PURE (os.homedir()+path.join, no I/O) so cag-router
// stays pure/composable. Single-sources the memory dir with the rest of the recall
// pipeline (was a hardcoded C:/Users/wompu/... literal — non-portable + a re-split-
// brain risk if PRISM_MEMORY_DIR is set). OBSIDIAN-VAULT-SYNERGY/U-OBS-MEMDIR-PORTABILITY.
import path from "node:path";
import { resolveObsidianMemDir } from "./obsidian-mem-dir.mjs";
// SIX-DOMAIN-KNOWLEDGE-AUTOPULL (2026-06-28): per-domain galaxy-brain cold anchors
// (cad/post-processor/mill/wedm/lathe/cam MEMORY.md) so a domain query auto-recalls its own
// doctrine from the sub-ms cold tier. Spread below; disable via PRISM_CAG_DOMAIN_COLD_DISABLE=1.
import { domainColdSources } from "./cag-cold-sources-domains.mjs";

const BASE_COLD_SOURCES = Object.freeze([
  {
    id: "claude-md",
    path: "H:/prism/CLAUDE.md",
    keywords: [
      "doctrine", "claude.md", "claude md", "scrutiny gate", "scrutiny 3-of-3",
      "scrutiny three-of-three", "per-file scrutiny", "handoff naming",
      "fleet-reaper", "golf slot", "slot worktree", "slot binding",
      "psn", "session continuity", "checkin loop", "checkin-loop", "fullstack contract",
      "karpathy", "r1 r2 r3 r4", "r5 r6 r7 r8", "r9 r10 r11 r12",
      "fail loud", "fail-loud",
    ],
    coldRationale: "Doctrine evolves by append-only Recent regressions log; core sections rarely mutate.",
    sizeBytes: 67000, // approximate, see CLAUDE.md compress entry 2026-05-20
  },
  {
    id: "memory-md",
    // Forward-slash to match the COLD_SOURCES convention (every other entry uses
    // `H:/...`); resolveObsidianMemDir() returns OS-native (backslash on Windows).
    path: path.join(resolveObsidianMemDir(), "MEMORY.md").replace(/\\/g, "/"),
    keywords: [
      "memory", "memory.md", "memories", "feedback memory", "reference memory",
      "obsidian", "obsidian brain", "auto memory", "feedback_", "reference_",
    ],
    coldRationale: "Index file pointing at memory leaves; new entries appended, old entries archived not deleted.",
    sizeBytes: 25000,
  },
  {
    id: "engine-digest",
    path: "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md",
    keywords: [
      "engine digest", "engine_digest", "which engine", "what engine",
      "list engines", "existing engine", "duplication guard", "check before creating",
    ],
    coldRationale: "Engine inventory updated on commit, not query-time. Stable within a session.",
    sizeBytes: 380000,
  },
  {
    id: "dispatcher-digest",
    path: "H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md",
    keywords: [
      "dispatcher", "dispatcher_digest", "dispatcher digest", "which dispatcher",
      "what dispatcher", "list dispatchers", "mcp action", "prism_*", "prism_calc",
      "prism_cam", "prism_ai", "prism_safety", "prism_session",
    ],
    coldRationale: "Dispatcher inventory + action enums; updated only when MCP rebuilds.",
    sizeBytes: 220000,
  },
  {
    id: "physics-constants",
    path: "H:/prism/mcp-server/src/physics/constants.ts",
    keywords: [
      "physics constant", "kc1.1", "kienzle constant", "taylor constant",
      "material constant", "iso group p", "iso group m", "iso group k",
      "iso group n", "iso group s", "iso group h", "kc 1800", "kc 2100",
      "kc 1100", "kc 700", "kc 2800", "kc 3200",
    ],
    coldRationale: "Physics constants are the load-bearing single source; almost never mutated.",
    sizeBytes: 25000,
  },
  {
    id: "wiki-index",
    path: "H:/prism/knowledge/wiki/index.md",
    keywords: [
      "wiki index", "wiki/index", "wiki entry", "wiki page", "wiki precheck",
    ],
    coldRationale: "Wiki index is append-mostly; entries get added but the bulk stays.",
    sizeBytes: 200000,
  },
  {
    id: "tribal-tips",
    path: "H:/prism/knowledge/wiki/code-tribal/",
    keywords: [
      "tribal", "tribal tip", "tribal knowledge", "operator wisdom",
      "shop floor wisdom", "playbook rule", "tribal_capture",
    ],
    coldRationale: "Tribal corpus is large + slow-moving; per-domain queries hit a small slice.",
    sizeBytes: 1500000,
  },
  {
    // GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CAG-CARDS: the consolidated per-galaxy context-card bundle.
    // ONE cold entry (~34 KB) anchored once/session is far cheaper than re-reading 34 multi-KB galaxy
    // brains on cross-galaxy lookups. Regenerated only by `galaxy-context-card build` → stable within a
    // session (same basis as engine-digest). Generator: scripts/lib/galaxy-context-card.mjs.
    id: "galaxy-cards",
    path: "H:/prism/state/shared/galaxy-cards/ALL-CARDS.md",
    keywords: [
      "galaxy card", "galaxy cards", "context card", "context-card", "galaxy context",
      "galaxy brain", "which galaxy", "cross-galaxy", "cross galaxy", "galaxy federation",
      "galaxy memory", "per-galaxy", "what does galaxy", "another galaxy",
    ],
    coldRationale: "Per-galaxy context-cards (regenerated only by `galaxy-context-card build`). Intra-session stable like engine-digest — NOT literally ≤1 mod/month; rides the same 'stable within a session' basis (the prompt-cache busts on file change anyway).",
    sizeBytes: 35000,
  },
  {
    // U-GCF-SAVINGS-TELEMETRY realization: the salience-ranked fleet roll-up (galaxy-rollup) — ONE compact
    // (~7 KB) ranked overview vs the 35 KB per-galaxy ALL-CARDS bundle. Anchoring it lets a fleet-OVERVIEW /
    // ranking query ("which galaxy is most active", "fleet digest") hit the cache at ~0 marginal cost instead
    // of re-reading 34 brains — REALIZES the federation's digest-vs-all-brains per-inject potential. Keywords
    // are fleet-RANKING-specific + multi-word (no bare 'galaxy'/'fleet') so they don't over-match the
    // galaxy-cards entry above (which serves per-galaxy / cross-galaxy detail, a different intent).
    id: "galaxy-digest",
    path: "H:/prism/state/shared/galaxy-cards/MASTER-DIGEST.md",
    keywords: [
      "master digest", "fleet digest", "fleet overview", "fleet context digest", "galaxy ranking",
      "rank galaxies", "ranked galaxies", "most active galaxy", "galaxy salience", "galaxy roll-up",
      "galaxy rollup", "all galaxies overview", "which galaxies are active",
    ],
    coldRationale: "Master fleet-context digest (regenerated only by `galaxy-rollup build` after `galaxy-context-card build`). Intra-session stable like the galaxy-cards bundle; same 'stable within a session' basis. Compact (~7 KB) ranked alternative to re-reading all 34 brains.",
    sizeBytes: 7400,
  },
]);

// Canonical cold tier = base global doctrine + per-domain galaxy-brain anchors. The domain
// entries ride the same SessionStart cag-cold-cache-anchor that anchors the base entries.
export const COLD_SOURCES = Object.freeze([...BASE_COLD_SOURCES, ...domainColdSources()]);

// ---------------------------------------------------------------------------
// HOT-TIER PATTERNS — query shapes that demand live state. These BEAT cold
// hits even when doctrine keywords are also present (because the question is
// about "what's the latest X" not "what is X").
// ---------------------------------------------------------------------------

const HOT_TEMPORAL_MARKERS = [
  "latest", "current", "live", "now", "today", "yesterday", "this morning",
  "right now", "active", "in flight", "in-flight", "just shipped", "just landed",
  "just committed", "what changed", "what's new", "whats new", "recent",
  "last commit", "last commits", "head", "tip of branch", "pending",
  "since yesterday", "since this morning", "since last", "since the",
];

const HOT_LIVE_SURFACES = [
  "build_state", "build-state", "milestone_progress", "milestone-progress",
  "chat-slots", "chat slots", "slot-task-claim", "slot task claim",
  "chat-bus", "chat bus", "fleet-status", "fleet status", "slot status",
  "agent_workboard", "agent workboard", "agent_chat", "agent chat",
  "claim", "heartbeat", "claim register", "claim file", "claimed",
  "who owns", "who has", "who is working", "who is claiming",
  "current sierra", "current alpha", "current bravo", "current charlie",
  "current delta", "current echo", "current foxtrot", "current golf",
  "current hotel", "current india", "current juliett", "current kilo",
  "current lima", "current mike", "current november", "current oscar",
];

const HOT_RAG_TRIGGERS = [
  "similar to", "find similar", "find related", "what's like this",
  "anything like", "semantic search", "vector search", "rag",
  "retrieval", "qdrant", "embedding search", "embeddings",
];

// ---------------------------------------------------------------------------
// COMPOSITE (HYBRID) PATTERNS — phrases that pull both layers. These are
// strictly additive over the cold + hot signals; presence of any forces
// HYBRID even if one tier dominates the keyword count.
// ---------------------------------------------------------------------------

const HYBRID_MARKERS = [
  "applied to", "as applied", "given the doctrine", "per the doctrine",
  "according to", "as the wiki says", "wiki says", "claude.md says",
  "per claude.md", "what does the spec say about", "spec for",
  "regression of", "audit of", "review against", "compare against doctrine",
];

// ---------------------------------------------------------------------------
// SCORING
// ---------------------------------------------------------------------------

/**
 * Score a query against a single keyword list.
 * Word-boundary-aware so "ragout" doesn't match "rag".
 *
 * @param {string} normalizedQuery - already lowercased + collapsed whitespace
 * @param {string[]} keywords
 * @returns {{ score: number, matched: string[] }}
 */
function scoreKeywordList(normalizedQuery, keywords) {
  let score = 0;
  const matched = [];
  for (const kw of keywords) {
    if (!kw) continue;
    // For multi-word phrases, substring match (with leading/trailing word boundary
    // enforced via padding). For single tokens, word-boundary regex.
    if (kw.includes(" ")) {
      const pad = ` ${normalizedQuery} `;
      if (pad.includes(` ${kw} `) || pad.includes(`${kw} `) || pad.includes(` ${kw}`)) {
        score += 2; // phrase matches weigh more
        matched.push(kw);
      }
    } else {
      // Escape regex metachars before constructing the word-boundary pattern.
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(normalizedQuery)) {
        score += 1;
        matched.push(kw);
      }
    }
  }
  return { score, matched };
}

// Hard cap on query size to bound classifyQuery's worst-case latency to
// well under the UserPromptSubmit hook budget (~100ms). Empirically a 10MB
// query traverses the ~280 keyword scans in ~2.8s; truncating at 64KB keeps
// the upper bound near 20ms. Any caller paste-bombing classifyQuery with
// >64KB of input gets a deterministic truncation + an evidence note.
const MAX_QUERY_BYTES = 64 * 1024;

/**
 * Normalize query string for keyword matching.
 * Caps oversize input at MAX_QUERY_BYTES to bound latency.
 * @param {string} query
 * @returns {{ normalized: string, truncated: boolean }}
 */
function normalize(query) {
  if (typeof query !== "string") return { normalized: "", truncated: false };
  let truncated = false;
  let src = query;
  if (src.length > MAX_QUERY_BYTES) {
    src = src.slice(0, MAX_QUERY_BYTES);
    truncated = true;
  }
  return {
    normalized: src.toLowerCase().replace(/\s+/g, " ").trim(),
    truncated,
  };
}

/**
 * Classify a query as COLD / HOT / HYBRID and return the source sets that
 * would answer it.
 *
 * @param {string} query - the user prompt or sub-prompt to classify
 * @param {object} [options]
 * @param {boolean} [options.preferColdOnTie=true] - tie-break direction;
 *   prefer cold because cold answers don't burn live state budget.
 * @param {number} [options.confidenceFloor=0.15] - below this, return
 *   tier='HYBRID' with a low-confidence flag so the caller knows to back
 *   off to safe defaults (don't over-trust the classification).
 * @returns {{
 *   tier: 'COLD' | 'HOT' | 'HYBRID',
 *   confidence: number,
 *   evidence: string[],
 *   coldSources: string[],
 *   hotSources: string[],
 *   normalizedQuery: string,
 *   scores: { cold: number, hot: number, hybrid: number },
 * }}
 */
export function classifyQuery(query, options = {}) {
  const { confidenceFloor = 0.15 } = options;
  const { normalized, truncated } = normalize(query);

  if (!normalized) {
    return {
      tier: "HYBRID",
      confidence: 0,
      evidence: ["empty query — defaulting HYBRID to engage both layers safely"],
      coldSources: [],
      hotSources: [],
      normalizedQuery: "",
      scores: { cold: 0, hot: 0, hybrid: 0 },
      truncated: false,
    };
  }

  // Score cold sources
  let coldScore = 0;
  const coldHits = [];
  const evidence = [];
  for (const src of COLD_SOURCES) {
    const r = scoreKeywordList(normalized, src.keywords);
    if (r.score > 0) {
      coldScore += r.score;
      coldHits.push({ id: src.id, path: src.path, score: r.score, matched: r.matched });
      evidence.push(`COLD:${src.id} matched [${r.matched.slice(0, 3).join(", ")}]`);
    }
  }

  // Score hot tiers
  const hotTemporal = scoreKeywordList(normalized, HOT_TEMPORAL_MARKERS);
  const hotSurfaces = scoreKeywordList(normalized, HOT_LIVE_SURFACES);
  const hotRag = scoreKeywordList(normalized, HOT_RAG_TRIGGERS);
  const hotScore = hotTemporal.score * 1.5 + hotSurfaces.score * 2 + hotRag.score * 1.5;

  if (hotTemporal.matched.length) evidence.push(`HOT:temporal [${hotTemporal.matched.slice(0, 3).join(", ")}]`);
  if (hotSurfaces.matched.length) evidence.push(`HOT:surface [${hotSurfaces.matched.slice(0, 3).join(", ")}]`);
  if (hotRag.matched.length) evidence.push(`HOT:rag-trigger [${hotRag.matched.slice(0, 3).join(", ")}]`);

  // Hybrid markers
  const hybridR = scoreKeywordList(normalized, HYBRID_MARKERS);
  const hybridForced = hybridR.score > 0;
  if (hybridR.matched.length) evidence.push(`HYBRID-FORCE: [${hybridR.matched.slice(0, 3).join(", ")}]`);

  // Tier resolution
  // 1. If hybrid markers present, force HYBRID
  // 2. If both cold and hot non-trivial, HYBRID
  // 3. Otherwise winner-take-all
  // (No tie branch — coldScore === hotScore with both > 0 is caught by step 2,
  //  and === 0 is caught by the unknown branch. The previous explicit
  //  preferColdOnTie tie-break was unreachable in production; reviewer P2 fix.)
  let tier;
  if (hybridForced) {
    tier = "HYBRID";
  } else if (coldScore > 0 && hotScore > 0) {
    tier = "HYBRID";
  } else if (coldScore === 0 && hotScore === 0) {
    // Unknown — return HYBRID with low confidence so caller falls back to
    // existing PRISM behavior (full doctrine inject + RAG).
    tier = "HYBRID";
  } else if (coldScore > hotScore) {
    tier = "COLD";
  } else {
    tier = "HOT";
  }

  // Confidence: dominant-tier score / (sum + 1). Bounded [0, 1).
  // The "+1" prevents 100% confidence on a single weak match.
  const total = coldScore + hotScore + (hybridForced ? hybridR.score * 2 : 0);
  let confidence;
  if (tier === "COLD") confidence = coldScore / (total + 1);
  else if (tier === "HOT") confidence = hotScore / (total + 1);
  else confidence = Math.min(0.95, total / (total + 2)); // hybrid uses both

  if (confidence < confidenceFloor && total === 0) {
    evidence.push("LOW-CONFIDENCE: no keywords matched — defaulting HYBRID");
  }
  if (truncated) {
    evidence.push(`TRUNCATED: query exceeded ${MAX_QUERY_BYTES} bytes — classification used the head only`);
  }

  // Sort cold hits by score descending; expose top sources as strings
  coldHits.sort((a, b) => b.score - a.score);

  // Hot sources: name the surfaces by intent
  const hotSources = [];
  // Slot-intent detection: any whole-word mention of "slot" in the query plus
  // a NATO slot name OR a who-owns / who-is question form. PRISM's "slot"
  // vocabulary is unambiguous within this codebase, so any "slot"-word query
  // routes to chat-slots regardless of which surface keyword fired first.
  const NATO_SLOTS = "alpha|bravo|charlie|delta|echo|foxtrot|golf|hotel|india|juliett|kilo|lima|mike|november|oscar|papa|quebec|romeo|sierra|tango|uniform|victor|whiskey|xray|yankee|zulu";
  const slotIntent =
    /\bslot\b/i.test(normalized) ||
    new RegExp(`\\b(${NATO_SLOTS})\\b`, "i").test(normalized) ||
    hotSurfaces.matched.some((m) => m.includes("slot") || m.includes("claim") || m.includes("heartbeat") || m.startsWith("who "));
  if (slotIntent) {
    hotSources.push("state/shared/chat-slots.json");
    hotSources.push("state/shared/slot-task-claims.json");
  }
  if (hotSurfaces.matched.length) {
    if (hotSurfaces.matched.some((m) => m.includes("build") || m.includes("milestone"))) {
      hotSources.push("state/shared/BUILD_STATE.json");
      hotSources.push("state/shared/MILESTONE_PROGRESS.json");
    }
    if (hotSurfaces.matched.some((m) => m.includes("chat-bus") || m.includes("chat bus") || m.includes("agent_chat") || m.includes("agent chat"))) {
      hotSources.push("state/shared/AGENT_CHAT.jsonl");
    }
    if (hotSurfaces.matched.some((m) => m.includes("workboard"))) {
      hotSources.push("state/shared/AGENT_WORKBOARD.md");
    }
  }
  if (hotRag.matched.length) {
    // Name the qdrant collections that ACTUALLY exist + are populated
    // (prism_engines ~3.8K pts / prism_skills / prism_formulas). The old label
    // "qdrant://prism-memory" pointed at a collection that does not exist —
    // memory recall is on the AgentDB/file-vault backend, NOT qdrant (R12 honesty).
    hotSources.push("qdrant://prism_engines+skills+formulas (semantic vector search)");
  }
  if (hotTemporal.matched.length && hotSources.length === 0) {
    // Pure-temporal query with no surface — default to git log + master-index
    hotSources.push("git log (recent commits)");
    hotSources.push("state/shared/system-viz/system-graph.json (master-index)");
  }

  return {
    tier,
    confidence: Number(confidence.toFixed(3)),
    evidence,
    coldSources: coldHits.slice(0, 5).map((h) => h.path),
    hotSources: Array.from(new Set(hotSources)),
    normalizedQuery: normalized,
    scores: {
      cold: coldScore,
      hot: Number(hotScore.toFixed(2)),
      hybrid: hybridR.score,
    },
    truncated,
  };
}

// Re-export for tests to introspect the cap.
export { MAX_QUERY_BYTES };

/**
 * Build a compact 1-line summary of a classification for hook injection.
 * @param {ReturnType<typeof classifyQuery>} result
 * @returns {string}
 */
export function summarize(result) {
  if (!result) return "(no classification)";
  const conf = `${(result.confidence * 100).toFixed(0)}%`;
  // HYBRID renders "cold + hot", but only interpolates the " + " separator when
  // a side is actually present. An empty cold AND empty hot must collapse to ""
  // so the `|| "(no sources)"` fallback fires — the low-confidence default route
  // (no keyword match → HYBRID, conf 0, no sources) is the MOST COMMON
  // classification fleet-wide, and the old `${cold} + ${hot}` always produced a
  // truthy " + " that silently defeated the fallback, rendering a misleading
  // `→ +` instead of an honest `→ (no sources)`.
  const cold1 = result.coldSources.slice(0, 1).join("");
  const hot1 = result.hotSources.slice(0, 1).join("");
  const sources =
    result.tier === "COLD"
      ? result.coldSources.slice(0, 2).join(", ")
      : result.tier === "HOT"
      ? result.hotSources.slice(0, 2).join(", ")
      : cold1 && hot1
      ? `${cold1} + ${hot1}`
      : cold1 || hot1; // one side present, or "" → triggers the (no sources) fallback
  return `CAG-route: ${result.tier} (conf ${conf}) → ${sources || "(no sources)"}`;
}

/**
 * Return the list of cold-tier sources that would be cache-augmented for this query.
 * Convenience accessor for hooks that only need the file paths.
 * @param {string} query
 * @returns {string[]}
 */
export function coldSourcesFor(query) {
  return classifyQuery(query).coldSources;
}

/**
 * Estimate token savings from a successful COLD hit.
 * Cold hits skip the full master-index + RAG + tribal-by-domain inject chain
 * (~12k tokens of context across the auto-injects). They also avoid the Qdrant
 * round-trip latency. This is an estimate, not a measurement — actual savings
 * come from prompt-cache hit-rate on the Anthropic API.
 *
 * @param {ReturnType<typeof classifyQuery>} result
 * @returns {{ estimatedTokensSaved: number, estimatedLatencyMsSaved: number, rationale: string }}
 */
export function estimateSavings(result) {
  if (!result) return { estimatedTokensSaved: 0, estimatedLatencyMsSaved: 0, rationale: "no result" };
  if (result.tier === "COLD" && result.confidence >= 0.4) {
    return {
      estimatedTokensSaved: 12000, // matches PSN-savings dashboard avg per cold hit
      estimatedLatencyMsSaved: 400,
      rationale: "Cold hit skips master-index + RAG + tribal-by-domain inject (12k tokens).",
    };
  }
  if (result.tier === "HYBRID" && result.confidence >= 0.5) {
    return {
      estimatedTokensSaved: 4000,
      estimatedLatencyMsSaved: 150,
      rationale: "Hybrid hit reuses cold layer via prompt-cache; RAG hit narrowed.",
    };
  }
  return { estimatedTokensSaved: 0, estimatedLatencyMsSaved: 0, rationale: "HOT or low-confidence — no savings claimed." };
}
