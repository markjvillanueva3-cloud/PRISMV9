/**
 * QuotingSimilarJobRetrieverEngine -- QUOTING-SYNERGY / U-QP-SIMILAR-JOB-RETRIEVE (slot:india)
 *
 * k-NN similar-job retrieval over a corpus of PRECOMPUTED feature vectors -- the
 * cold-start-prior retrieval primitive the QUOTING-DEEP-WIRE algo spec
 * (`state/shared/specs/QUOTING-DEEP-WIRE-AND-ALGO-2026-05-26.md`, commit 5d3b507833)
 * calls for: "find similar past jobs to prior a new estimate" (counters the
 * measured under-quote bias). India owns the RAG/retrieval ML layer.
 *
 * SCOPE (R8/R12 -- deliberately bounded):
 *   - This engine is PURE (engines.md: no I/O). The corpus of historical jobs and
 *     the query are passed in as ALREADY-ENCODED feature vectors. Loading the JM-Die
 *     quote history + ENCODING quote-jobs into vectors is a separate data-infra
 *     pre-req (the spec itself discloses "algorithm units need data-infrastructure
 *     pre-reqs") owned by charlie/juliett -- NOT this unit. The scout's "47,905-record
 *     corpus" is UNVERIFIED and contradicts the cited spec (~2K JM-Die quotes); this
 *     engine is corpus-agnostic, so the real corpus size does not matter here.
 *   - The metric + top-k selection is delegated to the canonical `KNearestNeighbors`
 *     algorithm (NOT reinvented). This engine is the domain wrapper that maps corpus
 *     RECORDS to/from vectors and turns distances into similarity-ranked job neighbors.
 *
 * @engine QuotingSimilarJobRetrieverEngine
 * @scope QUOTING-SYNERGY
 * @classification standard (advisory retrieval -- not a safety surface)
 */

import { KNearestNeighbors, type KNNMetric } from "../algorithms/KNearestNeighbors.js";

/** One historical job in the retrieval corpus, with its precomputed feature vector. */
export interface SimilarJobCandidate {
  /** Stable id of the historical job/quote (echoed back on a hit). */
  jobId: string;
  /** Precomputed feature vector (same dimensionality as the query). */
  vector: number[];
  /** Opaque historical-job record, echoed back to the caller unchanged (optional). */
  record?: unknown;
}

/** A retrieved neighbor, nearest-first. */
export interface SimilarJobNeighbor {
  jobId: string;
  /** 1-based rank, nearest-first. */
  rank: number;
  /** Metric distance to the query (ascending; 0 = identical). */
  distance: number;
  /** Similarity in (-1..1] for cosine (= 1 - distance), or (0..1] monotone proxy otherwise. */
  similarity: number;
  /** The candidate's opaque record, if it carried one. */
  record?: unknown;
}

export interface RetrieveSimilarJobsInput {
  /** Query feature vector (length d). */
  query: number[];
  /** Historical-job corpus with precomputed d-dim vectors. */
  corpus: SimilarJobCandidate[];
  /** Neighbors to return (default 5, clamped to [1, MAX_K] then to corpus size). */
  k?: number;
  /** Distance metric (default "cosine" -- the RAG default). */
  metric?: KNNMetric;
}

export interface RetrieveSimilarJobsResult {
  neighbors: SimilarJobNeighbor[];
  metric: KNNMetric;
  /** Effective k actually used (after clamping to corpus size). */
  k: number;
  corpusSize: number;
  /** Feature dimensionality. */
  dim: number;
  warnings: string[];
}

const DEFAULT_K = 5;
const MAX_K = 100;
/** Full-scan k-NN is in-memory; guard against a pathological corpus. */
const MAX_CORPUS = 200_000;

/**
 * Map a metric distance to a similarity score. Cosine distance is `1 - cos`, so the
 * cosine similarity is `1 - distance` (identical -> 1). For euclidean/manhattan there is
 * no bounded similarity, so use the standard monotone proxy `1/(1+distance)` in (0,1].
 */
export function similarityFromDistance(distance: number, metric: KNNMetric): number {
  if (metric === "cosine") return 1 - distance;
  return 1 / (1 + distance);
}

export class QuotingSimilarJobRetrieverEngine {
  public readonly schemaVersion = "1.0.0" as const;

  /**
   * Retrieve the k historical jobs whose feature vectors are nearest the query.
   *
   * Pure: no I/O, no state. Delegates metric + top-k to `KNearestNeighbors` (cosine,
   * task="search"). An empty corpus returns `{neighbors: []}` (graceful, with a warning),
   * never throws -- a cold-start caller with no history is a normal state, not an error.
   *
   * @throws on a malformed query (non-array / empty), a non-array corpus, an oversize
   *   corpus, a candidate missing a string `jobId`, a per-candidate dim mismatch, or a
   *   non-finite vector value (the last is enforced by KNearestNeighbors.validate).
   */
  retrieveSimilarJobs(input: RetrieveSimilarJobsInput): RetrieveSimilarJobsResult {
    if (!input || typeof input !== "object") {
      throw new Error("retrieveSimilarJobs: input must be an object");
    }
    const { query, corpus } = input;
    if (!Array.isArray(query) || query.length === 0) {
      throw new Error("retrieveSimilarJobs: query must be a non-empty number[] feature vector");
    }
    if (!Array.isArray(corpus)) {
      throw new Error("retrieveSimilarJobs: corpus must be an array of {jobId, vector}");
    }
    const metric: KNNMetric = input.metric ?? "cosine";

    if (corpus.length === 0) {
      return { neighbors: [], metric, k: 0, corpusSize: 0, dim: query.length, warnings: ["empty corpus -- no neighbors (cold start)"] };
    }
    if (corpus.length > MAX_CORPUS) {
      throw new Error(`retrieveSimilarJobs: corpus size ${corpus.length} exceeds MAX_CORPUS ${MAX_CORPUS}`);
    }

    // Requested k -> clamp to [1, MAX_K]; KNearestNeighbors further clamps to corpus size.
    const rawK = Number.isInteger(input.k) ? (input.k as number) : DEFAULT_K;
    const k = Math.max(1, Math.min(MAX_K, rawK));

    // Validate per-candidate shape + project to the vector matrix KNN consumes. We check
    // jobId + dimensionality here (clearer errors than KNN's generic matrix message);
    // finite-ness is left to KNearestNeighbors.validate (single source of that rule).
    const vectors: number[][] = new Array(corpus.length);
    for (let i = 0; i < corpus.length; i++) {
      const c = corpus[i];
      if (!c || typeof c.jobId !== "string" || c.jobId.length === 0) {
        throw new Error(`retrieveSimilarJobs: corpus[${i}] must carry a non-empty string jobId`);
      }
      if (!Array.isArray(c.vector) || c.vector.length !== query.length) {
        throw new Error(
          `retrieveSimilarJobs: corpus[${i}] vector dim ${Array.isArray(c.vector) ? c.vector.length : "n/a"} != query dim ${query.length}`,
        );
      }
      vectors[i] = c.vector;
    }

    const out = KNearestNeighbors.calculate({ queries: [query], corpus: vectors, k, metric, task: "search" });
    const r0 = out.results[0];

    const neighbors: SimilarJobNeighbor[] = r0.indices.map((idx, rank) => {
      const c = corpus[idx];
      const neighbor: SimilarJobNeighbor = {
        jobId: c.jobId,
        rank: rank + 1,
        distance: r0.distances[rank],
        similarity: similarityFromDistance(r0.distances[rank], metric),
      };
      if (c.record !== undefined) neighbor.record = c.record;
      return neighbor;
    });

    return { neighbors, metric: out.metric, k: out.k, corpusSize: out.nCorpus, dim: out.dim, warnings: out.warnings };
  }
}

export const quotingSimilarJobRetrieverEngine = new QuotingSimilarJobRetrieverEngine();
