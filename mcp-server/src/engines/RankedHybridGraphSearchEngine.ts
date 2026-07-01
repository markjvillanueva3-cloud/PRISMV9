/**
 * RankedHybridGraphSearchEngine — N1 orchestration (slot:sierra, system-viz, 2026-05-29).
 *
 * Composes two already-built engines into one capability the opportunity map
 * (SIERRA-HIGH-LEVERAGE-OPPORTUNITIES-2026-05-29 §N1) called the highest-leverage
 * orchestration sierra is positioned to make:
 *
 *   MasterIndexEngine.query()  → hits carrying BOTH `confidence` (lexical relevance)
 *                                AND `utilization` (log-normalized in-degree = a
 *                                structural-importance proxy)
 *   HybridIndexEngine.fuse()   → Reciprocal-Rank-Fusion of two ranked lists
 *
 * We RRF-fuse the confidence ranking against the utilization ranking, so a node that
 * is structurally important (high in-degree / hub) surfaces above a lexically-strong
 * but isolated match. This re-ranks master-index results by relevance × importance.
 *
 * OOM-SAFE BY CONSTRUCTION: it reuses MasterIndexEngine's CACHED graph index (which
 * computes utilization without ever JSON.parse-ing the 548MB merged graph). The
 * "true" upgrade is GraphImportanceEngine personalized PageRank, but that needs the
 * full GraphInput (nodes+edges) in-process — which OOMs (exit 134) on this host's
 * graph. `utilization` is PageRank's precomputed proxy; this is stated honestly so a
 * future host with headroom can swap in `GraphImportanceEngine.rankByTask` for list B.
 *
 * Pure-core + injected deps: pass `deps.query` in tests to drive fusion deterministically
 * without touching the live index. No file IO, no Date.now in the core path (injectable).
 *
 * @module engines/RankedHybridGraphSearchEngine
 */

import { masterIndexEngine, type MasterIndexHit, type MasterIndexQueryOptions } from "./MasterIndexEngine.js";
import { HybridIndexEngine, type RankedHit, type FusionResult } from "./HybridIndexEngine.js";

/** Max entry_id length HybridIndexEngine.RankedHitSchema accepts (zod .max(120)). */
const MAX_ENTRY_ID_LEN = 120;

/** A master-index hit re-ranked by the relevance×importance RRF fusion. */
export interface RankedHybridHit extends MasterIndexHit {
  /** RRF score (Σ 1/(k+rank) across the confidence + utilization lists). */
  rrf_score: number;
  /** Rank in the confidence-only ordering (1 = most relevant). */
  confidence_rank: number;
  /** Rank in the utilization-only ordering (1 = most structurally important). */
  utilization_rank: number;
  /** Final fused rank (1 = best blend). */
  hybrid_rank: number;
}

export interface RankedHybridResult {
  query: string;
  totalHits: number;
  hits: RankedHybridHit[];
  /** RRF k used (Cormack default 60). */
  rrfK: number;
  generatedAt: string;
  warnings: string[];
}

export interface RankedHybridOptions extends MasterIndexQueryOptions {
  /** RRF k (default 60). Must be a positive finite number. */
  rrfK?: number;
  /** Cap fused results. */
  topK?: number;
}

interface RankedHybridDeps {
  /** Source of master-index hits — injectable for tests. */
  query?: (q: string, opts?: MasterIndexQueryOptions) => Promise<{ hits?: MasterIndexHit[]; warnings?: string[] }>;
  /** Clock — injectable for deterministic tests. */
  now?: () => string;
}

/**
 * Coerce to a finite number, mapping NaN/Infinity/undefined → 0 so the sort comparators
 * stay total. NOT a [0,1] clamp — confidence/utilization are already [0,1] from the
 * master index, and RRF uses ranks (not raw magnitudes) so out-of-range values are harmless.
 */
function finiteOrZero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export class RankedHybridGraphSearchEngine {
  constructor(private readonly deps: RankedHybridDeps = {}) {}

  /**
   * Ranked-hybrid graph search: query the master index, then RRF-fuse the
   * confidence ranking against the utilization ranking.
   */
  async search(query: string, opts: RankedHybridOptions = {}): Promise<RankedHybridResult> {
    const now = this.deps.now ?? (() => new Date().toISOString());
    const rrfK = Number.isFinite(opts.rrfK) && (opts.rrfK as number) > 0 ? (opts.rrfK as number) : 60;
    const q = String(query ?? "").trim();
    if (!q) {
      return { query: "", totalHits: 0, hits: [], rrfK, generatedAt: now(), warnings: ["empty query"] };
    }

    const queryFn = this.deps.query ?? ((qq: string, oo?: MasterIndexQueryOptions) => masterIndexEngine.query(qq, oo));
    const res = await queryFn(q, opts);
    const hitsMaybe = res?.hits;
    const rawHits: MasterIndexHit[] = Array.isArray(hitsMaybe) ? hitsMaybe : [];
    const warnMaybe = res?.warnings;
    const warnings: string[] = Array.isArray(warnMaybe) ? [...warnMaybe] : [];

    // Dedupe by id (master-index can surface the same id from >1 source); keep the
    // strongest-confidence copy. Drop ids the fusion schema would reject (>120 chars),
    // surfacing the count rather than throwing (R12).
    const byId = new Map<string, MasterIndexHit>();
    let droppedLongId = 0;
    for (const h of rawHits) {
      if (!h || typeof h.id !== "string" || !h.id) continue;
      if (h.id.length > MAX_ENTRY_ID_LEN) { droppedLongId++; continue; }
      const prev = byId.get(h.id);
      if (!prev || finiteOrZero(h.confidence) > finiteOrZero(prev.confidence)) byId.set(h.id, h);
    }
    if (droppedLongId > 0) warnings.push(`${droppedLongId} hit(s) dropped: id exceeded ${MAX_ENTRY_ID_LEN} chars (fusion id cap)`);

    const uniq = [...byId.values()];
    if (uniq.length === 0) {
      return { query: q, totalHits: 0, hits: [], rrfK, generatedAt: now(), warnings };
    }

    // Two ranked lists over the SAME candidate set.
    // Secondary key (id asc) makes tied scores rank deterministically across V8 versions.
    const confList: RankedHit[] = [...uniq]
      .sort((a, b) => finiteOrZero(b.confidence) - finiteOrZero(a.confidence) || a.id.localeCompare(b.id))
      .map((h, i) => ({ entry_id: h.id, rank: i + 1, score: finiteOrZero(h.confidence) }));
    const utilList: RankedHit[] = [...uniq]
      .sort((a, b) => finiteOrZero(b.utilization) - finiteOrZero(a.utilization) || a.id.localeCompare(b.id))
      .map((h, i) => ({ entry_id: h.id, rank: i + 1, score: finiteOrZero(h.utilization) }));

    const fused: FusionResult[] = HybridIndexEngine.fuse(confList, utilList, { k: rrfK, topK: opts.topK });

    const confRankById = new Map(confList.map((r) => [r.entry_id, r.rank] as const));
    const utilRankById = new Map(utilList.map((r) => [r.entry_id, r.rank] as const));

    const hits: RankedHybridHit[] = fused.map((f) => ({
      ...(byId.get(f.entry_id) as MasterIndexHit),
      rrf_score: f.rrf_score,
      confidence_rank: confRankById.get(f.entry_id) ?? 0,
      utilization_rank: utilRankById.get(f.entry_id) ?? 0,
      hybrid_rank: f.final_rank,
    }));

    return { query: q, totalHits: hits.length, hits, rrfK, generatedAt: now(), warnings };
  }

  /** Operator-audit render of a ranked-hybrid result. */
  static render(result: RankedHybridResult): string {
    if (!result || result.hits.length === 0) return "[RANKED-HYBRID] (no hits)";
    return [
      `[RANKED-HYBRID] "${result.query}" — ${result.totalHits} hit(s), RRF k=${result.rrfK}`,
      ...result.hits.map(
        (h) =>
          `  #${h.hybrid_rank}  ${h.id}  rrf=${h.rrf_score.toFixed(6)}  conf#${h.confidence_rank}  util#${h.utilization_rank}  [${h.buildClass}]`,
      ),
      ...(result.warnings.length ? [`  ⚠ ${result.warnings.join("; ")}`] : []),
    ].join("\n");
  }
}

export const rankedHybridGraphSearchEngine = new RankedHybridGraphSearchEngine();
export default rankedHybridGraphSearchEngine;
