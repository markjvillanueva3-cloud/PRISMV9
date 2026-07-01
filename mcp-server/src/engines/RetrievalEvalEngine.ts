/**
 * RetrievalEvalEngine — RAG-UPGRADE-MS0 / U-RAG-5 (2026-05-22, slot golf).
 *
 * Retrieval-quality eval harness for PRISM's RAG surfaces. Computes
 * precision@k, recall@k, MRR and mAP over a fixed `{query, relevantIds}`
 * set against ANY retrieval surface — the retrieve function is injected,
 * so the same harness scores `memory_search`, the tribal-embed index, or
 * any of the UserPromptSubmit inject hooks.
 *
 * Baseline-first: per the 2026 RAG research, "retrieval design beats
 * fine-tuning" and you cannot improve what you do not measure. This engine
 * is the measuring stick — it lets U-RAG-1 (coverage), U-RAG-2 (rerank)
 * and U-RAG-3 (contextual retrieval) be proven with numbers, not vibes.
 *
 * All metric methods are pure and order-sensitive. Retrieved id lists are
 * de-duplicated (first-seen order kept) so a surface that returns the same
 * id twice cannot inflate precision.
 */

export interface EvalQuery {
  /** The query string fed to the retrieval surface. */
  query: string;
  /** Ground-truth relevant document ids for this query. */
  relevantIds: string[];
}

export interface QueryScore {
  query: string;
  retrievedCount: number;
  relevantCount: number;
  /** precision@k keyed by k. */
  precisionAtK: Record<number, number>;
  /** recall@k keyed by k. */
  recallAtK: Record<number, number>;
  /** 1 / rank of the first relevant hit (0 if none). */
  reciprocalRank: number;
  /** Average Precision — the per-query term of mAP. */
  averagePrecision: number;
}

export interface EvalReport {
  queryCount: number;
  ks: number[];
  meanPrecisionAtK: Record<number, number>;
  meanRecallAtK: Record<number, number>;
  /** Mean Reciprocal Rank across the query set. */
  mrr: number;
  /** Mean Average Precision across the query set. */
  map: number;
  perQuery: QueryScore[];
  generatedAt: string;
}

/** A retrieval surface: query string → ranked list of document ids. */
export type RetrieveFn = (query: string) => string[] | Promise<string[]>;

export const DEFAULT_KS: readonly number[] = [1, 3, 5, 10];

export class RetrievalEvalEngine {
  /**
   * De-duplicate retrieved ids, preserving first-seen order and dropping
   * empty / non-string entries. A retrieval surface that returns the same
   * id twice must not double-count toward precision/recall.
   */
  private dedupe(ids: readonly string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
      if (typeof id === "string" && id.length > 0 && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  private toRelSet(relevant: Iterable<string>): Set<string> {
    const s = relevant instanceof Set ? relevant : new Set(relevant);
    // Drop empty / non-string ground-truth ids so they cannot mis-score.
    const clean = new Set<string>();
    for (const r of s) if (typeof r === "string" && r.length > 0) clean.add(r);
    return clean;
  }

  /**
   * Fraction of the top-k retrieved that are relevant. `k` is floored and
   * clamped to `[0, retrieved.length]`; k≤0 or empty retrieved → 0.
   */
  precisionAtK(retrieved: readonly string[], relevant: Iterable<string>, k: number): number {
    const rel = this.toRelSet(relevant);
    const ids = this.dedupe(retrieved);
    const kk = Math.min(Math.max(0, Math.floor(Number(k) || 0)), ids.length);
    if (kk === 0) return 0;
    let hits = 0;
    for (let i = 0; i < kk; i++) if (rel.has(ids[i])) hits++;
    return hits / kk;
  }

  /**
   * Fraction of all relevant items found within the top-k retrieved. An
   * empty relevant set → 0 (no signal — deliberately not 1).
   */
  recallAtK(retrieved: readonly string[], relevant: Iterable<string>, k: number): number {
    const rel = this.toRelSet(relevant);
    if (rel.size === 0) return 0;
    const ids = this.dedupe(retrieved);
    const kk = Math.min(Math.max(0, Math.floor(Number(k) || 0)), ids.length);
    let hits = 0;
    for (let i = 0; i < kk; i++) if (rel.has(ids[i])) hits++;
    return hits / rel.size;
  }

  /** 1 / (rank of the first relevant hit). 0 if no relevant id is retrieved. */
  reciprocalRank(retrieved: readonly string[], relevant: Iterable<string>): number {
    const rel = this.toRelSet(relevant);
    const ids = this.dedupe(retrieved);
    for (let i = 0; i < ids.length; i++) if (rel.has(ids[i])) return 1 / (i + 1);
    return 0;
  }

  /**
   * Average Precision — the textbook sum of precision-at-each-relevant-hit
   * divided by the total relevant count. Missing relevant docs correctly
   * pull AP below 1. Empty relevant set → 0.
   */
  averagePrecision(retrieved: readonly string[], relevant: Iterable<string>): number {
    const rel = this.toRelSet(relevant);
    if (rel.size === 0) return 0;
    const ids = this.dedupe(retrieved);
    let hits = 0;
    let sum = 0;
    for (let i = 0; i < ids.length; i++) {
      if (rel.has(ids[i])) {
        hits++;
        sum += hits / (i + 1);
      }
    }
    return hits === 0 ? 0 : sum / rel.size;
  }

  /** Score a single query's retrieved list against its ground truth. */
  evaluateQuery(
    query: string,
    retrieved: readonly string[],
    relevant: readonly string[],
    ks: readonly number[] = DEFAULT_KS,
  ): QueryScore {
    const rel = this.toRelSet(relevant);
    const ids = this.dedupe(retrieved);
    const pAtK: Record<number, number> = {};
    const rAtK: Record<number, number> = {};
    for (const k of ks) {
      pAtK[k] = this.precisionAtK(ids, rel, k);
      rAtK[k] = this.recallAtK(ids, rel, k);
    }
    return {
      query,
      retrievedCount: ids.length,
      relevantCount: rel.size,
      precisionAtK: pAtK,
      recallAtK: rAtK,
      reciprocalRank: this.reciprocalRank(ids, rel),
      averagePrecision: this.averagePrecision(ids, rel),
    };
  }

  /**
   * Run a full query set through an injected retrieval surface and produce
   * an aggregate report. A retrieval surface that throws or returns a
   * non-array scores 0 for that query rather than aborting the whole run
   * (R12 — a baseline must still be emitted). Malformed query entries are
   * skipped.
   */
  async evaluateQuerySet(
    queries: readonly EvalQuery[],
    retrieveFn: RetrieveFn,
    ks: readonly number[] = DEFAULT_KS,
  ): Promise<EvalReport> {
    if (!Array.isArray(queries)) throw new TypeError("queries must be an array");
    if (typeof retrieveFn !== "function") throw new TypeError("retrieveFn must be a function");

    const perQuery: QueryScore[] = [];
    // Sequential by design: retrieval surfaces hit Ollama / a single-GPU host —
    // a parallel burst would hammer it. An eval query set is small and run rarely.
    for (const q of queries) {
      if (!q || typeof q.query !== "string") continue;
      let retrieved: string[];
      try {
        const r = await retrieveFn(q.query);
        retrieved = Array.isArray(r) ? r : [];
      } catch {
        retrieved = [];
      }
      perQuery.push(this.evaluateQuery(q.query, retrieved, q.relevantIds || [], ks));
    }

    const n = perQuery.length;
    const meanP: Record<number, number> = {};
    const meanR: Record<number, number> = {};
    for (const k of ks) {
      meanP[k] = n ? perQuery.reduce((s, q) => s + (q.precisionAtK[k] || 0), 0) / n : 0;
      meanR[k] = n ? perQuery.reduce((s, q) => s + (q.recallAtK[k] || 0), 0) / n : 0;
    }

    return {
      queryCount: n,
      ks: [...ks],
      meanPrecisionAtK: meanP,
      meanRecallAtK: meanR,
      mrr: n ? perQuery.reduce((s, q) => s + q.reciprocalRank, 0) / n : 0,
      map: n ? perQuery.reduce((s, q) => s + q.averagePrecision, 0) / n : 0,
      perQuery,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const retrievalEvalEngine = new RetrievalEvalEngine();
