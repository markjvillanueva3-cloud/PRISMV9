/**
 * QdrantFederatedRetrieverEngine -- CROSS-DOMAIN-RAG-FEDERATION-MS0 (U-RAGFED-RETRIEVER)
 *
 * Federated RAG retrieval: fans a single query embedding to N Qdrant
 * collections in PARALLEL, then fuses the per-collection ranked lists into one
 * cross-domain ranking via Reciprocal Rank Fusion (RRF). This is the substrate
 * that lets a query like "how do tribal chatter rules apply to lathe?" surface
 * the best hits across prism_<domain>-knowledge collections at once, instead of
 * the single-collection-at-a-time recall the existing QdrantMemoryEngine offers.
 *
 * Distinct from QdrantMemoryEngine (single kind->collection recall): this engine
 * is collection-set agnostic and MERGES across collections.
 *
 * Algorithms:
 *   - Reciprocal Rank Fusion (Cormack, Clarke & Buettcher, SIGIR 2009,
 *     "Reciprocal Rank Fusion outperforms Condorcet and individual rank
 *     learning methods"):
 *        RRFscore(d) = SUM over lists L containing d of  w_L / (k + rank_L(d))
 *     rank is 1-based; k (default 60) damps the contribution of low ranks and
 *     is the constant validated in the original paper. Rank-based fusion is
 *     robust to incompatible per-collection score scales (cosine vs dot vs
 *     different embedding spaces) -- exactly the cross-collection case here.
 *   - Domain-affinity weighting: when the query implies a domain (lathe, mill,
 *     wedm, ...), collections matching that domain get a weight boost so their
 *     ranks contribute more to the fused score.
 *
 * Doc-id space: RRF merges hits by id, so it assumes a shared id space across
 * the fused collections. PRISM domain-knowledge collections key on globally
 * unique node ids, so a doc that genuinely appears in two collections is
 * (correctly) corroborated, while disjoint-namespace collections simply union.
 *
 * Design rules (mirrors QdrantMemoryEngine):
 *   1. Never silently succeed -- typed Result error on misconfig / no embedder /
 *      not connected / embed failure (R12).
 *   2. Graceful degrade -- if SOME collections error, fuse the survivors and
 *      report the failures; only ALL-failed returns an error.
 *   3. Embedding + store are injectable so the fusion core is unit-testable
 *      without a live Qdrant or Ollama.
 *
 * @module engines/QdrantFederatedRetrieverEngine
 * @milestone CROSS-DOMAIN-RAG-FEDERATION-MS0/U-RAGFED-RETRIEVER
 */

import {
  QdrantVectorStoreEngine,
  type SearchHit,
} from "./QdrantVectorStoreEngine.js";
import type { Embedder } from "./QdrantMemoryEngine.js";

/** Cormack et al. 2009 -- the validated RRF damping constant. */
export const DEFAULT_RRF_K = 60;
export const DEFAULT_LIMIT = 10;
/** +50% weight for collections matching the query's inferred domain. */
export const DEFAULT_DOMAIN_BOOST = 0.5;
const DEFAULT_QDRANT_URL = "http://localhost:6333";

/**
 * Domain -> token set used by BOTH query-domain inference and collection
 * matching. Tokens are lowercase substrings; chosen specific enough to avoid
 * cross-matching across domains.
 */
export const DOMAIN_TOKENS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    lathe: ["lathe", "turning", "turn", "chuck", "tailstock", "css"],
    mill: ["mill", "milling", "vmc", "endmill", "facemill"],
    wedm: ["wedm", "wire edm", "wire-edm", "edm", "wire"],
    cad: ["cad", "drawing", "step file", "feature recognition", "blueprint"],
    cam: ["cam", "toolpath", "mastercam", "hypermill", "fusion"],
    quoting: ["quote", "quoting", "estimate", "pricing"],
    business: ["erp", "invoice", "accounting", "purchase order"],
    grinding: ["grind", "grinding", "wheel"],
  });

export interface FederatedRetrieveInput {
  /** Natural-language query; embedded ONCE and fanned to every collection. */
  query: string;
  /** Collection names to query in parallel. Must be non-empty. */
  collections: string[];
  /** Final fused result count (default 10). */
  limit?: number;
  /** Candidates pulled per collection before fusion (default = max(limit*2, 20)). */
  perCollectionLimit?: number;
  /** RRF damping constant (default 60). */
  rrfK?: number;
  /** Enable domain-affinity weighting (default true). */
  domainAffinity?: boolean;
  /** Weight boost for domain-matched collections (default 0.5). */
  domainBoost?: number;
  /** Optional payload filter forwarded to every collection search. */
  filter?: Record<string, unknown>;
}

export interface FederatedPerCollection {
  collection: string;
  /** 1-based rank within that collection. */
  rank: number;
  /** Raw similarity score from that collection. */
  score: number;
}

export interface FederatedHit {
  id: string | number;
  /** Fused RRF score (sum of weighted reciprocal ranks across collections). */
  score: number;
  text: string;
  /** Collections that surfaced this doc. */
  collections: string[];
  /** Best (lowest) rank this doc achieved in any single collection. */
  bestRank: number;
  payload: Record<string, unknown>;
  perCollection: FederatedPerCollection[];
}

export interface FederatedRetrieveResult {
  hits: FederatedHit[];
  collectionsQueried: number;
  collectionsSucceeded: number;
  collectionsFailed: string[];
  /** Per-collection failure reasons (lets a caller distinguish a dim/config
   * error from a transient network failure). Parallel to collectionsFailed. */
  failures: Array<{ collection: string; error: string }>;
  /** True when at least one collection errored but survivors were fused. */
  degraded: boolean;
  rrfK: number;
  domainAffinityApplied: boolean;
  /** Domains inferred from the query (empty when none / affinity off). */
  inferredDomains: string[];
}

export type FederatedResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; cause?: unknown };

export interface QdrantFederatedRetrieverDeps {
  store?: QdrantVectorStoreEngine;
  embedder?: Embedder;
}

/**
 * One per-collection ranked list fed into RRF. Exposed so callers that already
 * hold ranked hits can fuse directly without a Qdrant round-trip.
 */
export interface RankedList {
  collection: string;
  weight: number;
  hits: SearchHit[];
}

// Wired to sessionDispatcher action `federated_rag_query`
// (CROSS-DOMAIN-RAG-FEDERATION-MS0/U-RAGFED-RETRIEVER).
export class QdrantFederatedRetrieverEngine {
  private store: QdrantVectorStoreEngine;
  private embedder: Embedder | null;
  /** True only when the store was default-constructed (production path); an
   * injected store keeps full control of its own connection state. */
  private readonly autoConnect: boolean;

  constructor(deps: QdrantFederatedRetrieverDeps = {}) {
    this.store = deps.store ?? new QdrantVectorStoreEngine();
    this.autoConnect = deps.store === undefined;
    this.embedder = deps.embedder ?? null;
  }

  setEmbedder(fn: Embedder | null): void {
    this.embedder = fn;
  }

  /** Infer domains implied by a query (word-boundary match on DOMAIN_TOKENS). */
  inferDomains(query: string): string[] {
    const q = (query ?? "").toLowerCase();
    const out: string[] = [];
    for (const [domain, tokens] of Object.entries(DOMAIN_TOKENS)) {
      if (tokens.some((t) => this.tokenInQuery(q, t))) out.push(domain);
    }
    return out;
  }

  /**
   * Word-boundary token match against an already-lowercased query. Prevents
   * short tokens from cross-matching INSIDE larger words ("turn" must not match
   * "returning", "cam" must not match "camera", "mill" must not match
   * "milligram"). Multi-word/hyphenated tokens ("wire edm") match as a bounded
   * phrase. Boundary = start/end or any non-alphanumeric char.
   */
  private tokenInQuery(lowerQuery: string, token: string): boolean {
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${esc}(?:[^a-z0-9]|$)`).test(lowerQuery);
  }

  /**
   * Per-collection weight map. Collections whose name matches an inferred
   * domain get (1 + boost); all others get 1.0. Pure + deterministic.
   *
   * @param query The user query (domains inferred from it).
   * @param collections Collection names to weight.
   * @param boost Additive boost for domain-matched collections (default 0.5).
   * @returns Map of collection name -> weight.
   */
  domainWeights(
    query: string,
    collections: string[],
    boost = DEFAULT_DOMAIN_BOOST,
    precomputedDomains?: string[],
  ): Map<string, number> {
    const domains = precomputedDomains ?? this.inferDomains(query);
    const weights = new Map<string, number>();
    for (const c of collections) {
      const cl = c.toLowerCase();
      const matched = domains.some(
        (d) =>
          cl.includes(d) ||
          DOMAIN_TOKENS[d].some((t) => cl.includes(t.replace(/[\s-]/g, ""))),
      );
      weights.set(c, matched ? 1 + boost : 1);
    }
    return weights;
  }

  /**
   * Reciprocal Rank Fusion across per-collection ranked lists. Pure -- no I/O.
   * Returns hits sorted by descending fused score (ties broken by best rank).
   *
   * RRFscore(d) = SUM over lists of  w_L / (k + rank_L(d))   (Cormack et al. 2009)
   *
   * @param lists Per-collection ranked hit lists with fusion weights.
   * @param k RRF damping constant (default 60).
   * @returns Fused, sorted FederatedHit list.
   */
  reciprocalRankFusion(lists: RankedList[], k = DEFAULT_RRF_K): FederatedHit[] {
    const acc = new Map<string, FederatedHit>();
    for (const { collection, weight, hits } of lists) {
      hits.forEach((hit, idx) => {
        const rank = idx + 1; // 1-based
        const contribution = weight / (k + rank);
        // Type-tagged key so a numeric id and the string of the same digits
        // (different docs across disjoint-namespace collections) never collide.
        const key = `${typeof hit.id}:${String(hit.id)}`;
        let entry = acc.get(key);
        if (!entry) {
          entry = {
            id: hit.id,
            score: 0,
            text: this.textOf(hit),
            collections: [],
            bestRank: rank,
            payload: hit.payload ?? {},
            perCollection: [],
          };
          acc.set(key, entry);
        }
        entry.score += contribution;
        if (!entry.collections.includes(collection)) {
          entry.collections.push(collection);
        }
        entry.perCollection.push({ collection, rank, score: hit.score });
        // Keep text/payload from the best (lowest-rank) occurrence so the
        // surfaced snippet is the doc's strongest single-collection hit.
        if (rank < entry.bestRank) {
          entry.bestRank = rank;
          entry.text = this.textOf(hit);
          entry.payload = hit.payload ?? entry.payload;
        }
      });
    }
    const out = [...acc.values()];
    out.sort((a, b) => b.score - a.score || a.bestRank - b.bestRank);
    return out;
  }

  /**
   * Federated retrieve: embed the query once, fan out to every collection in
   * parallel, fuse via RRF (+ optional domain affinity). Graceful-degrades
   * around per-collection failures; only an all-collections failure errors.
   *
   * @param input Query, target collections, and fusion options.
   * @returns Typed Result with fused hits + per-collection success/failure.
   */
  async federatedRetrieve(
    input: FederatedRetrieveInput,
  ): Promise<FederatedResult<FederatedRetrieveResult>> {
    const guard = this.validate(input);
    if (guard) return { ok: false, error: guard };
    if (!this.embedder) return { ok: false, error: "embedder not configured" };

    await this.ensureConnected();
    if (!this.store.isConnected()) {
      return { ok: false, error: "qdrant not connected" };
    }

    const limit = input.limit ?? DEFAULT_LIMIT;
    const perColl = input.perCollectionLimit ?? Math.max(limit * 2, 20);
    const k = input.rrfK ?? DEFAULT_RRF_K;
    const affinity = input.domainAffinity ?? true;
    const boost = input.domainBoost ?? DEFAULT_DOMAIN_BOOST;

    let vector: number[];
    try {
      vector = await this.embedder(input.query);
    } catch (e) {
      return { ok: false, error: "embed failed", cause: e };
    }
    if (!Array.isArray(vector) || vector.length === 0) {
      return {
        ok: false,
        error: `embedder returned ${vector?.length ?? 0}-d vector`,
      };
    }

    // Dedup collection names so a repeated collection cannot double-count its
    // reciprocal-rank contribution (RRF would otherwise inflate every score).
    const cols = [...new Set(input.collections)];
    // Infer domains once and reuse for both weighting and the report field.
    const inferredDomains = affinity ? this.inferDomains(input.query) : [];

    const weights = affinity
      ? this.domainWeights(input.query, cols, boost, inferredDomains)
      : new Map(cols.map((c) => [c, 1]));

    // Per-collection search wrapped in try/catch: the real QdrantVectorStoreEngine
    // can THROW (its validateSearchOptions runs before its own try block), and a
    // bare Promise.all would then reject and defeat graceful-degrade. Any throw is
    // funneled into a typed {ok:false} so a single bad collection never sinks the
    // whole fan-out (R12 + design-rule #2).
    const settled = await Promise.all(
      cols.map(async (collection) => {
        const weight = weights.get(collection) ?? 1;
        try {
          const result = await this.store.search({
            collection,
            vector,
            limit: perColl,
            filter: input.filter,
            withPayload: true,
          });
          return { collection, weight, result };
        } catch (e) {
          const error = (e as Error)?.message ?? String(e);
          return { collection, weight, result: { ok: false as const, error } };
        }
      }),
    );

    const lists: RankedList[] = [];
    const failures: Array<{ collection: string; error: string }> = [];
    for (const s of settled) {
      if (s.result.ok) {
        lists.push({ collection: s.collection, weight: s.weight, hits: s.result.value });
      } else {
        failures.push({ collection: s.collection, error: s.result.error });
      }
    }
    const failed = failures.map((f) => f.collection);

    if (lists.length === 0) {
      return {
        ok: false,
        error: `all ${cols.length} collection(s) failed: ${failed.join(", ")}`,
      };
    }

    const fused = this.reciprocalRankFusion(lists, k).slice(0, limit);
    return {
      ok: true,
      value: {
        hits: fused,
        collectionsQueried: cols.length,
        collectionsSucceeded: lists.length,
        collectionsFailed: failed,
        failures,
        degraded: failed.length > 0,
        rrfK: k,
        domainAffinityApplied: affinity,
        inferredDomains,
      },
    };
  }

  // -- internals --------------------------------------------------------------

  private async ensureConnected(): Promise<void> {
    if (!this.autoConnect || this.store.isConnected()) return;
    const url = process.env.QDRANT_URL || DEFAULT_QDRANT_URL;
    try {
      await this.store.connect({ url });
    } catch {
      /* leave disconnected -- guarded by isConnected() check (R12) */
    }
  }

  /** Payload-schema-tolerant text rendering (mirrors QdrantMemoryEngine.hitToItem). */
  private textOf(hit: SearchHit): string {
    const p = hit.payload ?? {};
    const str = (v: unknown): string => (typeof v === "string" ? v : "");
    let text = str(p.text);
    if (!text) {
      const joined = [str(p.name), str(p.description)].filter(Boolean).join(" - ");
      text = joined || str(p.node_id);
    }
    return text;
  }

  private validate(input: FederatedRetrieveInput): string | null {
    if (!input || typeof input !== "object") return "input required";
    if (typeof input.query !== "string" || input.query.trim() === "") {
      return "query required";
    }
    if (!Array.isArray(input.collections) || input.collections.length === 0) {
      return "collections required (non-empty array)";
    }
    if (input.collections.some((c) => typeof c !== "string" || c.trim() === "")) {
      return "collection names must be non-empty strings";
    }
    if (
      input.limit !== undefined &&
      (!Number.isInteger(input.limit) || input.limit <= 0)
    ) {
      return "limit must be positive integer";
    }
    if (
      input.perCollectionLimit !== undefined &&
      (!Number.isInteger(input.perCollectionLimit) || input.perCollectionLimit <= 0)
    ) {
      return "perCollectionLimit must be positive integer";
    }
    if (input.rrfK !== undefined && (!Number.isFinite(input.rrfK) || input.rrfK <= 0)) {
      return "rrfK must be positive";
    }
    return null;
  }
}

export const qdrantFederatedRetrieverEngine = new QdrantFederatedRetrieverEngine();
