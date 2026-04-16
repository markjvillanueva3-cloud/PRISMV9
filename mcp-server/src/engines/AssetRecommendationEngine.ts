/**
 * AssetRecommendationEngine — Rank assets by relevance to a task
 *
 * Phase 0.24 U-WIRE6 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a task
 * descriptor (keywords + optional asset-kind preference + recency weight),
 * rank registered assets by a composite score:
 *
 *   keyword-overlap × importance × recency-boost
 *
 * This is the query side of the asset-wiring story. Upstream collectors fill
 * in the asset set (from indexes, registries, dependency graphs); this
 * engine answers "for *this* prompt, which top-N assets are most relevant?"
 *
 * @module engines/AssetRecommendationEngine
 * @milestone PP-0.24-U-WIRE6
 */

export type AssetKind =
  | "engine"
  | "dispatcher"
  | "action"
  | "skill"
  | "hook"
  | "formula"
  | "algorithm"
  | "registry"
  | "script";

export interface RecommendableAsset {
  id: string;
  kind: AssetKind;
  keywords: string[];
  importance?: number; // 0..1
  lastUsedAt?: string; // ISO
  description?: string;
}

export interface RecommendationQuery {
  keywords: string[];
  preferKinds?: AssetKind[];
  recencyBoostDays?: number; // 0 disables; default 30
  minScore?: number;
  limit?: number;
}

export interface AssetRecommendation {
  asset: RecommendableAsset;
  score: number;
  overlap: string[];
  rationale: string;
}

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? []).filter((t) => t.length > 1);
}

export class AssetRecommendationEngine {
  private readonly assets = new Map<string, RecommendableAsset>();

  register(asset: RecommendableAsset): RecommendableAsset {
    this.validate(asset);
    const canon: RecommendableAsset = {
      ...asset,
      keywords: [...new Set(asset.keywords.map((k) => k.trim().toLowerCase()))],
    };
    this.assets.set(canon.id, canon);
    return canon;
  }

  registerAll(assets: readonly RecommendableAsset[]): void {
    for (const a of assets) this.register(a);
  }

  recommend(query: RecommendationQuery): AssetRecommendation[] {
    this.validateQuery(query);
    const qTokens = new Set(query.keywords.flatMap((k) => tokenize(k)));
    if (qTokens.size === 0) return [];

    const preferKinds = query.preferKinds ? new Set(query.preferKinds) : null;
    const recencyDays = query.recencyBoostDays ?? 30;
    const minScore = query.minScore ?? 0;
    const nowMs = Date.now();

    const results: AssetRecommendation[] = [];
    for (const asset of this.assets.values()) {
      const overlap = asset.keywords.filter((k) => qTokens.has(k));
      if (overlap.length === 0) continue;

      const coverage = overlap.length / Math.max(1, asset.keywords.length);
      const importance = asset.importance ?? 0.5;
      const recencyBoost = this.recencyBoost(asset.lastUsedAt, recencyDays, nowMs);
      const kindBoost = preferKinds && preferKinds.has(asset.kind) ? 1.15 : 1;

      const score = round4(coverage * importance * recencyBoost * kindBoost);
      if (score < minScore) continue;

      results.push({
        asset,
        score,
        overlap,
        rationale: `${asset.kind}: ${overlap.length}/${asset.keywords.length} keyword overlap, importance=${importance.toFixed(2)}`,
      });
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.asset.id.localeCompare(b.asset.id);
    });

    return query.limit && query.limit > 0 ? results.slice(0, query.limit) : results;
  }

  get(id: string): RecommendableAsset | null {
    return this.assets.get(id) ?? null;
  }

  size(): number {
    return this.assets.size;
  }

  clear(): void {
    this.assets.clear();
  }

  // --- internals ---------------------------------------------------------

  private recencyBoost(lastUsedAt: string | undefined, halfLifeDays: number, nowMs: number): number {
    if (!lastUsedAt || halfLifeDays <= 0) return 1;
    const ts = Date.parse(lastUsedAt);
    if (Number.isNaN(ts)) return 1;
    const ageDays = Math.max(0, (nowMs - ts) / (24 * 60 * 60 * 1000));
    return 1 + Math.exp(-ageDays / halfLifeDays) * 0.5;
  }

  private validate(asset: RecommendableAsset): void {
    if (!asset.id || asset.id.trim() === "") throw new Error("id required");
    if (!asset.kind) throw new Error("kind required");
    if (!Array.isArray(asset.keywords) || asset.keywords.length === 0) {
      throw new Error("keywords required");
    }
    if (asset.importance !== undefined && !(asset.importance >= 0 && asset.importance <= 1)) {
      throw new Error("importance must be in [0, 1]");
    }
  }

  private validateQuery(q: RecommendationQuery): void {
    if (!Array.isArray(q.keywords)) throw new Error("keywords must be array");
    if (q.minScore !== undefined && !(q.minScore >= 0 && q.minScore <= 1)) {
      throw new Error("minScore must be in [0, 1]");
    }
    if (q.recencyBoostDays !== undefined && q.recencyBoostDays < 0) {
      throw new Error("recencyBoostDays must be ≥ 0");
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const assetRecommendationEngine = new AssetRecommendationEngine();
