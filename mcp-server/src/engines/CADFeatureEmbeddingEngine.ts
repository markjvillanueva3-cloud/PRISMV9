/**
 * CADFeatureEmbeddingEngine — CADCAM-DAGI-MS0/U-DAGI05
 *
 * Dense feature representation for CAD token sequences. Extracts embeddings
 * from trained CAD language models and provides FAISS-style similarity search.
 *
 * Architecture — pure controller, injectable EmbeddingBackend:
 *   The engine owns no neural weights. An `EmbeddingBackend` plug-in extracts
 *   embeddings from token sequences. Tests supply a deterministic mock (hash-based);
 *   production wires HuggingFace sentence-transformers / Ollama / etc.
 *
 * Key methods:
 *   embed(tokens, backend)           — extract embedding vector for a sequence
 *   embedBatch(corpus, backend)      — batch extraction with caching
 *   buildIndex(embeddings)           — construct similarity index (VP-tree or flat)
 *   search(query, index, k, metric)  — find k nearest neighbors
 *   clearCache()                     — invalidate embedding cache
 *
 * Index structures:
 *   - FlatIndex: brute-force cosine/euclidean (small corpora, < 10k)
 *   - VPTreeIndex: vantage-point tree for sublinear search (large corpora)
 *
 * Metrics:
 *   - cosine: 1 - (a·b / ||a|| ||b||)
 *   - euclidean: ||a - b||₂
 *   - dotProduct: -a·b (higher dot = smaller distance)
 *
 * Complexity:
 *   embed          O(seqLen * backend.cost)
 *   embedBatch     O(N * seqLen * backend.cost) — parallelizable
 *   buildIndex     O(N log N) for VP-tree, O(N) for flat
 *   search flat    O(N * dim)
 *   search VP-tree O(log N) average, O(N) worst-case
 *
 * References:
 *   - VP-trees: Yianilos 1993, "Data Structures and Algorithms for Nearest Neighbor Search"
 *   - Cosine similarity for embeddings: Mikolov et al. 2013
 *   - FAISS: Johnson et al. 2019, "Billion-scale similarity search with GPUs"
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** Token sequence from U-DAGI01. */
export type TokenSeq = number[];

/** Dense embedding vector. */
export type Embedding = Float32Array;

/** Similarity metric for search. */
export type SimilarityMetric = "cosine" | "euclidean" | "dotProduct";

/** Backend plug-in. Tests inject a deterministic hash-based implementation. */
export interface EmbeddingBackend {
  /** Embedding dimension this backend produces. */
  readonly dim: number;
  /** Extract embedding from token sequence. */
  embed(tokens: TokenSeq): Embedding;
  /** Optional batch embed for backends that support it natively. */
  embedBatch?(corpus: TokenSeq[]): Embedding[];
}

/** Search result entry. */
export interface SearchResult {
  index: number;
  distance: number;
  id?: string;
}

/** Embedding with optional metadata. */
export interface IndexedEmbedding {
  embedding: Embedding;
  id: string;
  metadata?: Record<string, unknown>;
}

/** Similarity index (flat or VP-tree). */
export interface SimilarityIndex {
  readonly type: "flat" | "vptree";
  readonly count: number;
  readonly dim: number;
  /** Internal storage — not for direct access. */
  readonly _data: IndexedEmbedding[];
}

/** Configuration for embedding extraction. */
export interface EmbedConfig {
  /** Normalize embeddings to unit length (L2 norm). Default true for cosine. */
  normalize?: boolean;
  /** Cache embeddings by sequence hash. Default true. */
  useCache?: boolean;
}

// ── Cache ────────────────────────────────────────────────────────────────────

/** FNV-1a 64-bit hash for cache keys (portable, no BigInt). */
function fnv1a64(tokens: TokenSeq): string {
  // Same implementation as CADCorpusIngesterEngine for consistency
  let lo = 0x84222325 >>> 0;
  let hi = 0xcbf29ce4 >>> 0;
  for (const t of tokens) {
    // XOR low byte
    lo ^= t & 0xff;
    // Multiply by FNV prime 0x00000100_000001b3
    const tmpLo = lo;
    const tmpHi = hi;
    // low * 0x1b3
    const p1 = Math.imul(tmpLo, 0x1b3);
    // high * 0x1b3
    const p2 = Math.imul(tmpHi, 0x1b3);
    // low * 0x100 (shift left 8 into high)
    const carry = (tmpLo >>> 24) & 0xff;
    const lShift = (tmpLo << 8) >>> 0;
    lo = (p1 & 0xffffffff) >>> 0;
    const lh = ((p1 / 0x100000000) >>> 0) & 0xffffffff;
    const hl = (Math.imul(tmpLo >>> 16, 0x1b3) >>> 16) & 0xffff;
    hi = (p2 + lh + hl + carry) >>> 0;
  }
  const hiHex = hi.toString(16).padStart(8, "0");
  const loHex = lo.toString(16).padStart(8, "0");
  return hiHex + loHex;
}

// ── Math utilities ───────────────────────────────────────────────────────────

function dotProduct(a: Embedding, b: Embedding): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function l2Norm(v: Embedding): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

function normalize(v: Embedding): Embedding {
  const norm = l2Norm(v);
  if (norm < 1e-10) return v; // avoid div-by-zero
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

function euclideanDistance(a: Embedding, b: Embedding): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function cosineDistance(a: Embedding, b: Embedding): number {
  const dot = dotProduct(a, b);
  const normA = l2Norm(a);
  const normB = l2Norm(b);
  if (normA < 1e-10 || normB < 1e-10) return 1; // max distance if zero vector
  return 1 - dot / (normA * normB);
}

function computeDistance(a: Embedding, b: Embedding, metric: SimilarityMetric): number {
  switch (metric) {
    case "cosine": return cosineDistance(a, b);
    case "euclidean": return euclideanDistance(a, b);
    case "dotProduct": return -dotProduct(a, b); // negative so smaller = more similar
  }
}

// ── VP-Tree ──────────────────────────────────────────────────────────────────

interface VPNode {
  idx: number;
  mu: number; // median distance to vantage point
  left?: VPNode;
  right?: VPNode;
}

function buildVPTree(
  indices: number[],
  embeddings: Embedding[],
  metric: SimilarityMetric,
): VPNode | undefined {
  if (indices.length === 0) return undefined;
  if (indices.length === 1) return { idx: indices[0], mu: 0 };

  // Pick vantage point (first element — could randomize for balance)
  const vpIdx = indices[0];
  const vp = embeddings[vpIdx];
  const rest = indices.slice(1);

  // Compute distances to vantage point
  const dists = rest.map((i) => ({ i, d: computeDistance(vp, embeddings[i], metric) }));
  dists.sort((a, b) => a.d - b.d);

  const median = dists[Math.floor(dists.length / 2)]?.d ?? 0;
  const left = dists.filter((x) => x.d < median).map((x) => x.i);
  const right = dists.filter((x) => x.d >= median).map((x) => x.i);

  return {
    idx: vpIdx,
    mu: median,
    left: buildVPTree(left, embeddings, metric),
    right: buildVPTree(right, embeddings, metric),
  };
}

function searchVPTree(
  node: VPNode | undefined,
  query: Embedding,
  embeddings: Embedding[],
  metric: SimilarityMetric,
  k: number,
  heap: SearchResult[],
): void {
  if (!node) return;

  const dist = computeDistance(query, embeddings[node.idx], metric);

  // Maintain max-heap of k nearest (sorted by distance descending)
  if (heap.length < k) {
    heap.push({ index: node.idx, distance: dist });
    heap.sort((a, b) => b.distance - a.distance);
  } else if (dist < heap[0].distance) {
    heap[0] = { index: node.idx, distance: dist };
    heap.sort((a, b) => b.distance - a.distance);
  }

  const tau = heap.length < k ? Infinity : heap[0].distance;

  // Prune branches
  if (dist < node.mu) {
    // Search left first (closer)
    if (dist - tau < node.mu) searchVPTree(node.left, query, embeddings, metric, k, heap);
    if (dist + tau >= node.mu) searchVPTree(node.right, query, embeddings, metric, k, heap);
  } else {
    // Search right first
    if (dist + tau >= node.mu) searchVPTree(node.right, query, embeddings, metric, k, heap);
    if (dist - tau < node.mu) searchVPTree(node.left, query, embeddings, metric, k, heap);
  }
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * CADFeatureEmbeddingEngine — extracts dense embeddings from CAD token sequences
 * and provides FAISS-style similarity search with VP-tree acceleration.
 */
export class CADFeatureEmbeddingEngine extends BaseEngine {
  private readonly cache = new Map<string, Embedding>();
  private vpRoot?: VPNode;
  private vpMetric: SimilarityMetric = "cosine";

  constructor() {
    const info: EngineInfo = {
      name: "CADFeatureEmbeddingEngine",
      version: "1.0.0",
      domain: "cad_neural",
      description:
        "Dense feature representation for CAD sequences. Extracts embeddings " +
        "via injectable backend and provides VP-tree accelerated similarity search.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "embed", description: "Extract embedding for a token sequence", actions: ["embed"] },
      { name: "embed_batch", description: "Batch extraction with caching", actions: ["embed_batch"] },
      { name: "build_index", description: "Build similarity index", actions: ["build_index"] },
      { name: "search", description: "Find k nearest neighbors", actions: ["search_similar"] },
      { name: "cache_clear", description: "Clear embedding cache", actions: ["cache_clear"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const obj = input as Record<string, unknown>;
    if ("query" in obj && "index" in obj) {
      // Search operation
      const backend = obj.backend as EmbeddingBackend;
      const queryTokens = obj.query as TokenSeq;
      const index = obj.index as SimilarityIndex;
      const k = (obj.k as number) ?? 5;
      const metric = (obj.metric as SimilarityMetric) ?? "cosine";
      const queryEmbed = this.embed(queryTokens, backend);
      return this.search(queryEmbed, index, k, metric);
    }
    throw new Error("CADFeatureEmbeddingEngine: unrecognized input shape");
  }

  // ── Embedding extraction ─────────────────────────────────────────────────

  /**
   * Extract embedding for a single token sequence.
   * Uses cache if enabled and sequence was previously embedded.
   */
  embed(tokens: TokenSeq, backend: EmbeddingBackend, config: EmbedConfig = {}): Embedding {
    const useCache = config.useCache !== false;
    const shouldNormalize = config.normalize !== false;

    if (useCache) {
      const key = fnv1a64(tokens);
      const cached = this.cache.get(key);
      if (cached) return cached;

      let emb = backend.embed(tokens);
      if (shouldNormalize) emb = normalize(emb);
      this.cache.set(key, emb);
      return emb;
    }

    let emb = backend.embed(tokens);
    if (shouldNormalize) emb = normalize(emb);
    return emb;
  }

  /**
   * Batch extract embeddings for a corpus.
   * Returns embeddings in same order as input.
   */
  embedBatch(
    corpus: TokenSeq[],
    backend: EmbeddingBackend,
    config: EmbedConfig = {},
  ): Embedding[] {
    // If backend supports native batch, use it
    if (backend.embedBatch && config.useCache === false) {
      const embs = backend.embedBatch(corpus);
      if (config.normalize !== false) {
        return embs.map(normalize);
      }
      return embs;
    }
    // Fall back to sequential with caching
    return corpus.map((tokens) => this.embed(tokens, backend, config));
  }

  /**
   * Clear the embedding cache.
   */
  clearCache(): { cleared: number } {
    const count = this.cache.size;
    this.cache.clear();
    this.vpRoot = undefined;
    return { cleared: count };
  }

  /**
   * Get cache statistics.
   */
  cacheStats(): { size: number; memoryBytes: number } {
    let bytes = 0;
    for (const emb of this.cache.values()) {
      bytes += emb.byteLength;
    }
    return { size: this.cache.size, memoryBytes: bytes };
  }

  // ── Index building ───────────────────────────────────────────────────────

  /**
   * Build a similarity index from indexed embeddings.
   * @param embeddings Array of {embedding, id, metadata} objects
   * @param type "flat" for brute-force, "vptree" for VP-tree acceleration
   * @param metric Similarity metric (used for VP-tree construction)
   */
  buildIndex(
    embeddings: IndexedEmbedding[],
    type: "flat" | "vptree" = "flat",
    metric: SimilarityMetric = "cosine",
  ): SimilarityIndex {
    if (embeddings.length === 0) {
      return { type, count: 0, dim: 0, _data: [] };
    }
    const dim = embeddings[0].embedding.length;

    if (type === "vptree") {
      const indices = embeddings.map((_, i) => i);
      const embs = embeddings.map((e) => e.embedding);
      this.vpRoot = buildVPTree(indices, embs, metric);
      this.vpMetric = metric;
    }

    return {
      type,
      count: embeddings.length,
      dim,
      _data: embeddings,
    };
  }

  // ── Search ───────────────────────────────────────────────────────────────

  /**
   * Search for k nearest neighbors to a query embedding.
   */
  search(
    query: Embedding,
    index: SimilarityIndex,
    k: number = 5,
    metric: SimilarityMetric = "cosine",
  ): SearchResult[] {
    if (index.count === 0) return [];
    const actualK = Math.min(k, index.count);

    if (index.type === "vptree" && this.vpRoot && metric === this.vpMetric) {
      // VP-tree search
      const heap: SearchResult[] = [];
      const embs = index._data.map((e) => e.embedding);
      searchVPTree(this.vpRoot, query, embs, metric, actualK, heap);
      // Return sorted by distance ascending
      return heap
        .sort((a, b) => a.distance - b.distance)
        .map((r) => ({ ...r, id: index._data[r.index].id }));
    }

    // Flat brute-force search
    const results: SearchResult[] = [];
    for (let i = 0; i < index._data.length; i++) {
      const dist = computeDistance(query, index._data[i].embedding, metric);
      results.push({ index: i, distance: dist, id: index._data[i].id });
    }
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, actualK);
  }

  /**
   * Search by token sequence (embeds query first).
   */
  searchByTokens(
    tokens: TokenSeq,
    index: SimilarityIndex,
    backend: EmbeddingBackend,
    k: number = 5,
    metric: SimilarityMetric = "cosine",
  ): SearchResult[] {
    const queryEmbed = this.embed(tokens, backend, { normalize: true });
    return this.search(queryEmbed, index, k, metric);
  }
}

export const cadFeatureEmbeddingEngine = new CADFeatureEmbeddingEngine();
