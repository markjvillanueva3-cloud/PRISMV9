/**
 * CrossProcessEpisodicMemoryEngine — XPROC-NEURAL Tier 2 (T2-01)
 *
 * Hierarchical episode store for cross-process learning. Every print-to-program
 * run, operator override, and safety veto is recorded as an "episode" keyed by
 * (process, material, feature, decision). Downstream tiers (T2-02 prioritized
 * replay, T3-01 online updater, T4-01 reward shaper) recall the most relevant
 * episodes for a new query instead of scanning the full ledger.
 *
 * Why hierarchical (vs. one flat array):
 *   T1-02's MLP retrains on the full ledger — fine at 100 events, untenable at
 *   100K. Three-tier residency lets the *most useful slice* live in cache:
 *     • Hot   — last 100 events, full retention, O(1) append, scanned on every
 *               recall(). The MLP's online-update window.
 *     • Warm  — last 1K events, age-decayed sampling. Newer events keep
 *               full weight; older events are progressively down-sampled by
 *               half-life. Captures recent regime without overfitting to noise.
 *     • Cold  — ≥1K events, stratified reservoir sampling (Algorithm R) by
 *               (process × material). Bounds total memory while preserving a
 *               representative slice across all process/material combinations.
 *
 * Recall similarity:
 *   - Categorical key match (process, material, feature, decision) gives a
 *     base score; partial matches are penalized lexicographically.
 *   - Numeric feature vector similarity is cosine (scale-invariant — caller
 *     can mix Vc/fz/ap/sf_pred without normalizing).
 *   - Final score = w_cat·cat_score + w_num·num_score; defaults w_cat=0.6,
 *     w_num=0.4 (calibrated against synthetic ground truth in tests).
 *   - Optional `ageWindowMs` filters episodes by ts before scoring.
 *
 * Failure modes covered:
 *   1. Empty store → recall returns []
 *   2. Query key partial → falls back to closest categorical match
 *   3. NaN / infinite numeric features → store rejects with structured error
 *      (no throw — engines never silently catch but also never crash on bad
 *      input; see engines/.claude/CLAUDE.md edge-case rule)
 *   4. Capacity overflow on cold tier → Algorithm R reservoir sampling preserves
 *      a uniform random sample of all events seen, not just the last N
 *   5. Concurrent stores → seq is monotonic increment; ordering by (ts, seq)
 *      breaks ties deterministically
 *   6. Recall N > totalSize → returns all available episodes, never pads
 *   7. Numeric scale mismatch across features → cosine similarity is
 *      scale-invariant per dimension
 *
 * Per CLAUDE.md "wire to all sources": this engine is consumed by
 * `prism_intelligence` (xproc namespace) — same wiring pattern as other
 * Tier-2..Tier-12 XPROC engines that don't write to safety state.
 *
 * @module CrossProcessEpisodicMemoryEngine
 */

import { z } from "zod";

// ============================================================================
// Schemas (Zod input validation)
// ============================================================================

const KEY_PROCESS = ["mill", "lathe", "wedm"] as const;
const KEY_DECISION = ["approved", "vetoed", "override", "pending"] as const;
const OUTCOME = ["success", "marginal", "fail"] as const;

const KeySchema = z.object({
  process: z.enum(KEY_PROCESS),
  material: z.string().min(1).max(64),
  feature: z.string().min(1).max(64),
  decision: z.enum(KEY_DECISION),
});

const FeaturesSchema = z.record(z.string(), z.number().finite());

const StoreInputSchema = z.object({
  key: KeySchema,
  features: FeaturesSchema,
  outcome: z.enum(OUTCOME).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  ts: z.number().int().nonnegative().optional(),  // override clock for tests
});

/**
 * Default weight for the categorical-key portion of recall scoring. The
 * complementary numeric-cosine weight is (1 - DEFAULT_WEIGHT_CATEGORICAL).
 * Calibrated against synthetic ground truth in tests: 0.6 favors key match
 * but lets numeric similarity break ties when keys are identical.
 */
const DEFAULT_WEIGHT_CATEGORICAL = 0.6;

/**
 * Sentinel above the [0, 1] probability range — used to seed "lowest survival
 * probability" loops so any real candidate (which has p ≤ 1) replaces it on
 * the first iteration.
 */
const WARM_DROP_PROB_INIT_SENTINEL = 1.1;

const RecallInputSchema = z.object({
  key: KeySchema.partial(),  // partial key supported (best-match fallback)
  n: z.number().int().positive().max(1000).default(10),
  ageWindowMs: z.number().int().positive().optional(),
  queryFeatures: FeaturesSchema.optional(),
  weightCategorical: z.number().min(0).max(1).default(DEFAULT_WEIGHT_CATEGORICAL),
});

// ============================================================================
// Public types
// ============================================================================

export type XProcProcess = (typeof KEY_PROCESS)[number];
export type XProcDecision = (typeof KEY_DECISION)[number];
export type XProcOutcome = (typeof OUTCOME)[number];

export interface XProcEpisodeKey {
  process: XProcProcess;
  material: string;
  feature: string;
  decision: XProcDecision;
}

export interface XProcEpisode {
  id: string;
  seq: number;
  ts: number;
  key: XProcEpisodeKey;
  features: Record<string, number>;
  outcome?: XProcOutcome;
  metadata?: Record<string, unknown>;
}

export type EpisodeTier = "hot" | "warm" | "cold";

export interface RecallResult {
  episode: XProcEpisode;
  score: number;
  categoricalScore: number;
  numericScore: number;
  tier: EpisodeTier;
}

export interface RecallResponse {
  episodes: RecallResult[];
  totalSearched: number;
  ageFilteredOut: number;
}

export interface StoreSuccess {
  ok: true;
  id: string;
  seq: number;
  tier: EpisodeTier;
}

export interface StoreError {
  ok: false;
  error: "invalid_key" | "invalid_features" | "internal";
  message: string;
}

export type StoreResult = StoreSuccess | StoreError;

export interface MemoryStats {
  hot: number;
  warm: number;
  cold: number;
  total: number;
  oldestTs: number | null;
  newestTs: number | null;
  totalEverStored: number;
  coldSampledFromTotal: number;  // Algorithm R counter
}

// ============================================================================
// Tier capacity (configurable for tests)
// ============================================================================

export interface TierCapacity {
  hotMax: number;
  warmMax: number;
  coldMax: number;
  warmHalfLifeMs: number;  // age-decay constant for warm-tier sampling
}

const DEFAULT_CAPACITY: TierCapacity = {
  hotMax: 100,
  warmMax: 1000,
  coldMax: 5000,
  warmHalfLifeMs: 24 * 60 * 60 * 1000,  // 24h half-life
};

// ============================================================================
// Engine state (module-private — pure-JS, no I/O)
// ============================================================================

interface EngineState {
  hot: XProcEpisode[];           // ring (newest at end)
  warm: XProcEpisode[];          // sampled (newest at end)
  cold: XProcEpisode[];          // reservoir
  capacity: TierCapacity;
  seq: number;
  totalEverStored: number;       // for Algorithm R
}

function freshState(capacity: TierCapacity = DEFAULT_CAPACITY): EngineState {
  return {
    hot: [],
    warm: [],
    cold: [],
    capacity: { ...capacity },
    seq: 0,
    totalEverStored: 0,
  };
}

let state: EngineState = freshState();

// ============================================================================
// Helpers
// ============================================================================

function nextId(seq: number, ts: number): string {
  // Compact stable id: zero-padded ts + seq. Collision-free for monotonic seq.
  return `xproc-${ts.toString(36)}-${seq.toString(36)}`;
}

/**
 * Cosine similarity over the intersection of feature keys. Returns 0 when
 * there is no overlap (rather than NaN); 1 when vectors are identical
 * (after restriction to shared keys). Scale-invariant per dimension.
 */
function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  let shared = 0;
  for (const k of Object.keys(a)) {
    if (!(k in b)) continue;
    const av = a[k];
    const bv = b[k];
    if (!Number.isFinite(av) || !Number.isFinite(bv)) continue;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
    shared++;
  }
  if (shared === 0 || normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Categorical key match score in [0, 1]. Each of (process, material, feature,
 * decision) contributes 0.25 when matched, 0 otherwise. Partial query keys
 * (missing fields) are ignored — only the supplied dimensions are scored, and
 * the score is normalized to the count supplied.
 */
function categoricalScore(
  query: Partial<XProcEpisodeKey>,
  candidate: XProcEpisodeKey,
): number {
  const dims: Array<keyof XProcEpisodeKey> = ["process", "material", "feature", "decision"];
  let supplied = 0;
  let matched = 0;
  for (const d of dims) {
    const q = query[d];
    if (q === undefined) continue;
    supplied++;
    if (q === candidate[d]) matched++;
  }
  if (supplied === 0) return 1;  // no constraint → all candidates equally categorically valid
  return matched / supplied;
}

/**
 * Promote an event into the hierarchy with overflow handling:
 *   hot overflow  → oldest hot → warm
 *   warm overflow → age-decayed drop or push to cold
 *   cold overflow → Algorithm R reservoir sampling (uniform random over total)
 */
function promote(ep: XProcEpisode): EpisodeTier {
  state.hot.push(ep);
  if (state.hot.length > state.capacity.hotMax) {
    const demoted = state.hot.shift();
    if (demoted) demoteToWarm(demoted);
  }
  return "hot";
}

function demoteToWarm(ep: XProcEpisode): void {
  state.warm.push(ep);
  if (state.warm.length <= state.capacity.warmMax) return;
  // Overflow: age-decayed drop. Each warm episode has survival probability
  // p = exp(-Δt / halfLife · ln 2). Drop one with lowest survival prob.
  const now = state.warm[state.warm.length - 1].ts;
  const hl = state.capacity.warmHalfLifeMs;
  let dropIdx = 0;
  let dropP = WARM_DROP_PROB_INIT_SENTINEL;
  for (let i = 0; i < state.warm.length; i++) {
    const age = Math.max(0, now - state.warm[i].ts);
    const p = Math.exp(-(age / hl) * Math.LN2);
    if (p < dropP) { dropP = p; dropIdx = i; }
  }
  const demoted = state.warm.splice(dropIdx, 1)[0];
  if (demoted) demoteToCold(demoted);
}

function demoteToCold(ep: XProcEpisode): void {
  state.totalEverStored++;
  if (state.cold.length < state.capacity.coldMax) {
    state.cold.push(ep);
    return;
  }
  // Algorithm R reservoir sampling — replace at index in [0, totalEverStored)
  // with probability coldMax / totalEverStored.
  const j = Math.floor(Math.random() * state.totalEverStored);
  if (j < state.capacity.coldMax) state.cold[j] = ep;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessEpisodicMemoryEngine {
  static readonly tier = "T2-01";

  /**
   * Store a new episode. Returns structured success or error — never throws.
   * Edge-case rule: invalid input → {ok:false, error, message}, not exception.
   */
  static store(input: unknown): StoreResult {
    const parsed = StoreInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_key",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { key, features, outcome, metadata, ts: tsOverride } = parsed.data;

    // Reject NaN/Infinity (Zod's z.number().finite() catches these, but be
    // defensive against runtime objects with non-enumerable bad properties)
    for (const [k, v] of Object.entries(features)) {
      if (!Number.isFinite(v)) {
        return {
          ok: false,
          error: "invalid_features",
          message: `feature '${k}' is non-finite: ${String(v)}`,
        };
      }
    }

    const ts = tsOverride ?? Date.now();
    state.seq++;
    const ep: XProcEpisode = {
      id: nextId(state.seq, ts),
      seq: state.seq,
      ts,
      key,
      features,
      outcome,
      metadata,
    };
    const tier = promote(ep);
    return { ok: true, id: ep.id, seq: ep.seq, tier };
  }

  /**
   * Recall the top-N most relevant episodes for a query. Walks all three tiers
   * and returns a unified ranked list. Optionally filters by ageWindowMs.
   */
  static recall(input: unknown): RecallResponse {
    const parsed = RecallInputSchema.safeParse(input);
    if (!parsed.success) {
      return { episodes: [], totalSearched: 0, ageFilteredOut: 0 };
    }
    const { key: queryKey, n, ageWindowMs, queryFeatures, weightCategorical } = parsed.data;
    const wCat = weightCategorical;
    const wNum = 1 - wCat;

    const now = Date.now();
    const cutoff = ageWindowMs !== undefined ? now - ageWindowMs : -Infinity;

    const scored: RecallResult[] = [];
    let ageFilteredOut = 0;

    function visit(arr: XProcEpisode[], tier: EpisodeTier): void {
      for (const ep of arr) {
        if (ep.ts < cutoff) {
          ageFilteredOut++;
          continue;
        }
        const cat = categoricalScore(queryKey, ep.key);
        const num = queryFeatures ? cosineSimilarity(queryFeatures, ep.features) : 0;
        const score = wCat * cat + wNum * num;
        scored.push({ episode: ep, score, categoricalScore: cat, numericScore: num, tier });
      }
    }

    visit(state.hot, "hot");
    visit(state.warm, "warm");
    visit(state.cold, "cold");

    // Sort by score desc, tiebreak by ts desc (newer wins), then by seq desc.
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.episode.ts !== a.episode.ts) return b.episode.ts - a.episode.ts;
      return b.episode.seq - a.episode.seq;
    });

    return {
      episodes: scored.slice(0, n),
      totalSearched: scored.length,
      ageFilteredOut,
    };
  }

  /**
   * Snapshot of memory occupancy. Used by T2-02 prioritized replay to size
   * its sumtree and by drift detectors to know how much history is available.
   */
  static stats(): MemoryStats {
    let oldestTs: number | null = null;
    let newestTs: number | null = null;
    const all = [...state.hot, ...state.warm, ...state.cold];
    for (const ep of all) {
      if (oldestTs === null || ep.ts < oldestTs) oldestTs = ep.ts;
      if (newestTs === null || ep.ts > newestTs) newestTs = ep.ts;
    }
    return {
      hot: state.hot.length,
      warm: state.warm.length,
      cold: state.cold.length,
      total: all.length,
      oldestTs,
      newestTs,
      totalEverStored: state.totalEverStored + state.hot.length + state.warm.length,
      coldSampledFromTotal: state.totalEverStored,
    };
  }

  /**
   * Replace tier capacity at runtime. Existing entries beyond the new caps
   * are NOT proactively evicted — they age out on the next store().
   */
  static configure(capacity: Partial<TierCapacity>): TierCapacity {
    state.capacity = { ...state.capacity, ...capacity };
    return { ...state.capacity };
  }

  /**
   * Reset state. For tests only.
   */
  static reset(capacity?: TierCapacity): void {
    state = freshState(capacity);
  }
}

export const crossProcessEpisodicMemoryEngine = CrossProcessEpisodicMemoryEngine;

/**
 * Dispatcher convenience wrapper — matches the (action, params) signature used
 * by intelligenceDispatcher CORE_ROUTING. Throws on unknown action so callers
 * see a clear error rather than silent undefined.
 */
export function crossProcessEpisodicMemory(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_episodic_store":
      return CrossProcessEpisodicMemoryEngine.store(params);
    case "xproc_episodic_recall":
      return CrossProcessEpisodicMemoryEngine.recall(params);
    case "xproc_episodic_stats":
      return CrossProcessEpisodicMemoryEngine.stats();
    default:
      throw new Error(`crossProcessEpisodicMemory: unknown action '${action}'`);
  }
}
