/**
 * WikiRAGFeatureEngine.ts
 * U-NN-FEAT04 — Wiki tribal-tip RAG features for the cross-process neural learner.
 *
 * Reviewer 1 finding (5-way assessment): zero CrossProcess*Engine.ts references
 * searchTribalKnowledge. PRISM holds 3,700+ tribal tips and 296 playbook rules
 * accumulated from real shop-floor experience, but the neural network has no
 * access to them. This engine bridges the wiki to the NN by converting tip
 * relevance + category coverage into 8 numeric features per OutcomeRecord.
 *
 * Why a separate engine (not a method on PRISMSelfAwarenessEngine):
 *   - PRISMSelfAwarenessEngine.searchTribalKnowledge is ASYNC (does fs.readFileSync
 *     on each call). featurize() is synchronous and called per-sample inside
 *     train()'s tight loop — async there would force the entire pipeline async.
 *   - This engine eagerly loads tips ONCE into memory on first call, then
 *     serves synchronous queries with an LRU cache keyed on (material, operation).
 *   - Per-record query time: O(1) on cache hit, O(N) on miss where N ≈ 3,700.
 *     With cache, 99%+ hit rate during training (same material/op repeats).
 *
 * The 8 features (ordered):
 *   0. tip_count          — number of matching tips, clipped to TIP_COUNT_CLIP
 *   1. top_confidence     — max confidence in top-K matches (0..1)
 *   2. avg_confidence     — mean confidence in top-K matches (0..1)
 *   3-7. category_match[5] — binary indicator that at least one tip fell in
 *                            each of {force, surface, chatter, thermal, tool_life}
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { OutcomeRecord } from "./CrossProcessOutcomeStore.js";

export const RAG_FEATURE_DIM = 8;

export const RAG_FEATURE_INDEX = {
  TIP_COUNT: 0,
  TOP_CONFIDENCE: 1,
  AVG_CONFIDENCE: 2,
  CATEGORY_FORCE: 3,
  CATEGORY_SURFACE: 4,
  CATEGORY_CHATTER: 5,
  CATEGORY_THERMAL: 6,
  CATEGORY_TOOL_LIFE: 7,
} as const;

const TOP_K_TIPS = 5;
const TIP_COUNT_CLIP = 50; // Above this, the count signal saturates anyway.
const LRU_MAX_ENTRIES = 1000;

// Category keyword groups — each tip is checked for any of these substrings
// in its lowercased text/category to set the corresponding indicator slot.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  force: ["force", "load", "kienzle", "thrust", "torque"],
  surface: ["surface", "ra ", "roughness", "finish", "scallop"],
  chatter: ["chatter", "vibration", "stability", "lobe", "regenerative"],
  thermal: ["thermal", "heat", "temperature", "burn", "coolant"],
  tool_life: ["tool life", "wear", "taylor", "breakage", "flank"],
};

interface RawTip {
  text: string;       // lowercased, normalized for searching
  category: string;   // lowercased
  confidence: number; // 0..1
}

interface CachedFeatures {
  features: Float64Array;
}

/**
 * Tiny LRU cache. Map preserves insertion order in JS, so we delete-then-set
 * on access to bump the entry to the most-recent end. When size exceeds
 * `maxEntries`, we drop the first (oldest) entry.
 */
class LRUCache<K, V> {
  private readonly map = new Map<K, V>();
  constructor(private readonly maxEntries: number) {}

  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      const firstKey = this.map.keys().next().value as K;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}

/**
 * Resolve the tribal-knowledge JSON path. Mirrors PRISMSelfAwarenessEngine's
 * TRIBAL_KNOWLEDGE_PATH heuristic but is duplicated here intentionally —
 * RAG feature extraction must NOT pull in the full self-awareness engine
 * (which has many transitive imports that slow startup).
 */
function resolveTribalPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "data/state/tribal-knowledge.json"),
    path.resolve(process.cwd(), "mcp-server/data/state/tribal-knowledge.json"),
    "H:/prism/mcp-server/data/state/tribal-knowledge.json",
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* swallow — disk errors fall through to next candidate */
    }
  }
  return null;
}

export class WikiRAGFeatureEngine {
  private static _tips: RawTip[] | null = null;
  private static readonly _cache = new LRUCache<string, CachedFeatures>(
    LRU_MAX_ENTRIES,
  );

  /**
   * Load tips from disk on first call. Subsequent calls are no-ops. Failed
   * loads (missing file, malformed JSON) leave _tips = [] so the engine
   * gracefully returns all-zero features without throwing.
   */
  private static loadTips(): RawTip[] {
    if (this._tips !== null) return this._tips;
    const tribalPath = resolveTribalPath();
    if (!tribalPath) {
      this._tips = [];
      return this._tips;
    }
    try {
      const raw = fs.readFileSync(tribalPath, "utf8");
      const parsed = JSON.parse(raw) as {
        tips?: Array<{ tip?: string; content?: string; category?: string; confidence?: number }>;
        entries?: Array<{ tip?: string; content?: string; category?: string; confidence?: number }>;
      };
      const list = parsed.tips ?? parsed.entries ?? [];
      this._tips = list
        .map((t) => {
          const text = (t.tip ?? t.content ?? "").toString().toLowerCase();
          const category = (t.category ?? "general").toString().toLowerCase();
          const confidence =
            typeof t.confidence === "number" && Number.isFinite(t.confidence)
              ? Math.max(0, Math.min(1, t.confidence))
              : 0.7;
          return { text, category, confidence };
        })
        .filter((t) => t.text.length > 0);
    } catch {
      this._tips = [];
    }
    return this._tips;
  }

  /**
   * Build the cache key from material + operation. Empty fields are
   * normalized to "*" so a record with no material still groups
   * deterministically.
   */
  private static cacheKey(record: OutcomeRecord): string {
    const m = (record.request_summary.material ?? "*").toString().toLowerCase();
    const o = (record.request_summary.operation ?? "*").toString().toLowerCase();
    return `${m}|${o}`;
  }

  /**
   * Extract 8 RAG features from a record. Pure (modulo the static cache —
   * idempotent: same record → same features).
   *
   * @param record OutcomeRecord — material + operation drive the wiki query.
   * @returns Float64Array(RAG_FEATURE_DIM) — counts and category indicators.
   */
  static extractRAGFeatures(record: OutcomeRecord): Float64Array {
    const key = this.cacheKey(record);
    const hit = this._cache.get(key);
    if (hit) return hit.features;

    const out = new Float64Array(RAG_FEATURE_DIM);
    const tips = this.loadTips();
    if (tips.length === 0) {
      // No corpus → all zeros. Cache to avoid re-loading on subsequent calls.
      this._cache.set(key, { features: out });
      return out;
    }

    const material = (record.request_summary.material ?? "")
      .toString()
      .toLowerCase();
    const operation = (record.request_summary.operation ?? "")
      .toString()
      .toLowerCase();

    // Score each tip by substring match against material + operation.
    const matches: { tip: RawTip; score: number }[] = [];
    for (const tip of tips) {
      let score = 0;
      if (material && (tip.text.includes(material) || tip.category.includes(material))) {
        score += 1;
      }
      if (operation && (tip.text.includes(operation) || tip.category.includes(operation))) {
        score += 1;
      }
      if (score > 0) matches.push({ tip, score });
    }

    // Slot 0: total tip count, clipped.
    out[RAG_FEATURE_INDEX.TIP_COUNT] = Math.min(matches.length, TIP_COUNT_CLIP);

    // Sort by (score desc, confidence desc) and take top-K.
    matches.sort((a, b) => b.score - a.score || b.tip.confidence - a.tip.confidence);
    const topK = matches.slice(0, TOP_K_TIPS);

    if (topK.length > 0) {
      let topConf = 0;
      let sumConf = 0;
      for (const m of topK) {
        if (m.tip.confidence > topConf) topConf = m.tip.confidence;
        sumConf += m.tip.confidence;
      }
      out[RAG_FEATURE_INDEX.TOP_CONFIDENCE] = topConf;
      out[RAG_FEATURE_INDEX.AVG_CONFIDENCE] = sumConf / topK.length;
    }

    // Category indicators: scan ALL matches (not just top-K) so a
    // category that only fires once still gets credit.
    const categoryHit = {
      force: false,
      surface: false,
      chatter: false,
      thermal: false,
      tool_life: false,
    };
    for (const m of matches) {
      for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
        if (categoryHit[cat as keyof typeof categoryHit]) continue;
        for (const kw of kws) {
          if (m.tip.text.includes(kw) || m.tip.category.includes(kw)) {
            categoryHit[cat as keyof typeof categoryHit] = true;
            break;
          }
        }
      }
    }
    out[RAG_FEATURE_INDEX.CATEGORY_FORCE] = categoryHit.force ? 1 : 0;
    out[RAG_FEATURE_INDEX.CATEGORY_SURFACE] = categoryHit.surface ? 1 : 0;
    out[RAG_FEATURE_INDEX.CATEGORY_CHATTER] = categoryHit.chatter ? 1 : 0;
    out[RAG_FEATURE_INDEX.CATEGORY_THERMAL] = categoryHit.thermal ? 1 : 0;
    out[RAG_FEATURE_INDEX.CATEGORY_TOOL_LIFE] = categoryHit.tool_life ? 1 : 0;

    this._cache.set(key, { features: out });
    return out;
  }

  /** Clear the LRU cache. Useful for tests and after a wiki reload. */
  static clearCache(): void {
    this._cache.clear();
  }

  /** Force a tips-corpus reload (for tests). */
  static reloadTips(): void {
    this._tips = null;
  }

  /** Number of cached entries (test introspection). */
  static cacheSize(): number {
    return this._cache.size();
  }

  /** Total tips loaded (test introspection). */
  static tipsLoaded(): number {
    return this.loadTips().length;
  }
}

export const wikiRAGFeatureEngine = new WikiRAGFeatureEngine();
