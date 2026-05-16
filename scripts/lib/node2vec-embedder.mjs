#!/usr/bin/env node
/**
 * node2vec-embedder.mjs — skip-gram with negative sampling (SGNS) over the
 * biased random-walk corpus produced by graph-random-walk.mjs. This is the
 * second half of node2vec (Grover & Leskovec, KDD 2016): the walks are the
 * "sentences", SGNS learns a dense topology embedding per node id.
 *
 * Algorithm — faithful to the word2vec reference C implementation:
 *   - Two weight matrices: W_in (center/input) init uniform[-0.5/d, 0.5/d],
 *     W_out (context/output) init zeros.
 *   - For each center node, a (seeded) reduced window draws nearby context
 *     nodes; for every (center, context) pair: one positive sample (label 1)
 *     + `negativeSamples` negatives (label 0) drawn from the unigram^0.75
 *     noise distribution. Gradient accumulates into W_in once per pair.
 *   - Sigmoid argument clamped to ±sigmoidClamp (no exp overflow).
 *   - Learning rate decays linearly learningRate → minLearningRate.
 *
 * Pure + seeded-deterministic (one mulberry32 stream reused from U3a) so the
 * test suite asserts real invariants — node2vec's defining property is that
 * nodes in the same community land closer in cosine space than nodes across
 * communities. No stubs.
 *
 * Corpus shape — `trainEmbeddings` accepts EITHER:
 *   - an Array of walks (each walk a string[]), e.g. collectWalks(graph,…); or
 *   - a factory function `() => iterable-of-walks`, re-invoked once per epoch.
 * A raw one-shot generator is rejected loudly: it cannot be re-iterated for
 * multi-epoch training. For the ~377k-node live graph, materialize once with
 * collectWalks() (bounded) or pass `() => generateWalks(graph, opts)`.
 *
 * Cost note: full-graph training is O(epochs · walks · walkLen · window ·
 * (1+neg) · dim). Tune epochs / walksPerNode / dimensions down for the live
 * graph; the defaults here target small-to-mid graphs and the test suite.
 *
 * Consistent with the U1/U2/U3a scripts/lib/*.mjs + node:test convention.
 */

import { mulberry32 } from "./graph-random-walk.mjs";

export const EMBED_DEFAULTS = Object.freeze({
  dimensions: 128,
  window: 5,
  epochs: 5,
  negativeSamples: 5,
  learningRate: 0.025,
  minLearningRate: 0.0001,
  unigramPower: 0.75,   // noise-distribution exponent (word2vec uses 0.75)
  sigmoidClamp: 6,      // |dot| clamp — sigmoid is flat past ±6 anyway
  reducedWindow: true,  // word2vec-style seeded window shrink (closer ctx weighted more)
  seed: 1,
  maxNegTableSize: 1_000_000, // unigram table cap (4 MB Int32) — full table is huge
});

// Negative-sampling table sizing — internal heuristics, not user-facing knobs.
const NEG_TABLE_MIN_SIZE = 1000; // floor: tiny vocabularies still need a smooth sampler
const NEG_TABLE_PER_NODE = 100;  // entries per vocab node (word2vec-idiomatic density)

function validateEmbedParams(opt) {
  for (const [name, v] of [
    ["dimensions", opt.dimensions],
    ["window", opt.window],
    ["epochs", opt.epochs],
    ["negativeSamples", opt.negativeSamples],
  ]) {
    const min = name === "negativeSamples" ? 0 : 1; // 0 negatives = degenerate but legal
    if (!Number.isInteger(v) || v < min) {
      throw new RangeError(`node2vec-embedder: ${name} must be an integer >= ${min} (got ${v})`);
    }
  }
  if (typeof opt.learningRate !== "number" || !Number.isFinite(opt.learningRate) || opt.learningRate <= 0) {
    throw new RangeError(`node2vec-embedder: learningRate must be a finite number > 0 (got ${opt.learningRate})`);
  }
  if (typeof opt.minLearningRate !== "number" || !Number.isFinite(opt.minLearningRate) ||
      opt.minLearningRate < 0 || opt.minLearningRate > opt.learningRate) {
    throw new RangeError(
      `node2vec-embedder: minLearningRate must be in [0, learningRate] (got ${opt.minLearningRate})`);
  }
  if (typeof opt.unigramPower !== "number" || !Number.isFinite(opt.unigramPower) || opt.unigramPower <= 0) {
    throw new RangeError(`node2vec-embedder: unigramPower must be a finite number > 0 (got ${opt.unigramPower})`);
  }
  if (typeof opt.sigmoidClamp !== "number" || !Number.isFinite(opt.sigmoidClamp) || opt.sigmoidClamp <= 0) {
    throw new RangeError(`node2vec-embedder: sigmoidClamp must be a finite number > 0 (got ${opt.sigmoidClamp})`);
  }
}

/**
 * Build the vocabulary from a single pass over an iterable of walks.
 * Node ids are indexed in first-seen order (deterministic). Returns
 * { index: Map<id,int>, ids: string[], counts: number[] }.
 */
export function buildVocab(walks) {
  const index = new Map();
  const ids = [];
  const counts = [];
  if (!walks) return { index, ids, counts };
  for (const walk of walks) {
    if (!Array.isArray(walk)) continue;
    for (const raw of walk) {
      if (raw == null) continue;
      const id = String(raw);
      let idx = index.get(id);
      if (idx === undefined) {
        idx = ids.length;
        index.set(id, idx);
        ids.push(id);
        counts.push(0);
      }
      counts[idx]++;
    }
  }
  return { index, ids, counts };
}

/**
 * Build the negative-sampling table: an Int32Array where each node index
 * appears with frequency proportional to count^unigramPower. A uniform draw
 * from the table is then an O(1) sample from the smoothed noise distribution.
 */
export function buildNegativeSamplingTable(counts, options = {}) {
  const power = typeof options.unigramPower === "number" ? options.unigramPower : EMBED_DEFAULTS.unigramPower;
  const maxTableSize = Number.isInteger(options.maxNegTableSize) && options.maxNegTableSize > 0
    ? options.maxNegTableSize
    : EMBED_DEFAULTS.maxNegTableSize;
  const V = Array.isArray(counts) ? counts.length : 0;
  if (V === 0) return new Int32Array(0);

  const tableSize = Math.min(maxTableSize, Math.max(NEG_TABLE_MIN_SIZE, V * NEG_TABLE_PER_NODE));
  const table = new Int32Array(tableSize);

  let total = 0;
  for (let i = 0; i < V; i++) total += Math.pow(Math.max(0, counts[i]), power);
  if (total <= 0) {
    // Degenerate (all-zero counts) — fall back to a uniform table so a caller
    // invoking this directly still gets a usable sampler instead of NaN.
    for (let a = 0; a < tableSize; a++) table[a] = a % V;
    return table;
  }

  let i = 0;
  let cum = Math.pow(Math.max(0, counts[0]), power) / total;
  for (let a = 0; a < tableSize; a++) {
    table[a] = i;
    if (a / tableSize > cum && i < V - 1) {
      i++;
      cum += Math.pow(Math.max(0, counts[i]), power) / total;
    }
  }
  return table;
}

/**
 * Normalize the corpus argument to a re-callable `() => iterable` factory.
 * The factory is invoked once for the vocab pass plus once per epoch, so it
 * MUST be pure — every call must yield an equivalent corpus. A factory whose
 * output drifts between calls desyncs the seeded rng stream (a vocab-miss
 * `continue` skips the per-center window draw) and silently breaks
 * determinism. `() => generateWalks(graph, opts)` is pure — U3a walks are
 * seed-deterministic; a closure over mutable state is not.
 */
function resolveCorpus(corpus) {
  if (typeof corpus === "function") return corpus;
  if (Array.isArray(corpus)) return () => corpus;
  throw new TypeError(
    "node2vec-embedder: corpus must be an Array of walks OR a factory function " +
    "() => iterable-of-walks. A one-shot generator cannot be re-iterated across " +
    "epochs — wrap it: trainEmbeddings(() => generateWalks(graph, opts), { ... })."
  );
}

/**
 * Train SGNS topology embeddings over the walk corpus.
 * Returns { embeddings: Map<id, Float32Array>, vocab, dimensions, epochs,
 *           pairsTrained, corpusEmpty }.
 * An empty corpus is legitimate (an edgeless graph) — returns an empty map
 * with corpusEmpty:true rather than throwing; pass opt.onEmpty to observe it.
 */
export function trainEmbeddings(corpus, options = {}) {
  const opt = { ...EMBED_DEFAULTS, ...options };
  validateEmbedParams(opt);
  const factory = resolveCorpus(corpus);
  const dim = opt.dimensions;

  // Pass 0 — vocabulary.
  const vocab = buildVocab(factory());
  const V = vocab.ids.length;
  if (V === 0) {
    if (typeof opt.onEmpty === "function") opt.onEmpty();
    return { embeddings: new Map(), vocab, dimensions: dim, epochs: 0, pairsTrained: 0, corpusEmpty: true };
  }

  const rng = mulberry32(opt.seed);
  // W_in ~ uniform[-0.5/d, 0.5/d]; W_out = 0 (word2vec reference init).
  const Win = new Float32Array(V * dim);
  for (let i = 0; i < Win.length; i++) Win[i] = (rng() - 0.5) / dim;
  const Wout = new Float32Array(V * dim);

  const negTable = buildNegativeSamplingTable(vocab.counts, opt);
  const negLen = negTable.length;
  const clamp = opt.sigmoidClamp;
  const neu1e = new Float64Array(dim); // input-vector gradient accumulator

  let pairsTrained = 0;
  for (let epoch = 0; epoch < opt.epochs; epoch++) {
    const frac = opt.epochs > 1 ? epoch / opt.epochs : 0;
    const lr = Math.max(opt.minLearningRate, opt.learningRate * (1 - frac));
    let epochPairs = 0;

    for (const walk of factory()) {
      if (!Array.isArray(walk)) continue;
      const L = walk.length;
      for (let i = 0; i < L; i++) {
        const centerIdx = vocab.index.get(String(walk[i]));
        if (centerIdx === undefined) continue;
        const l1 = centerIdx * dim;

        // Reduced window: seeded shrink in [1, window] (word2vec weights
        // closer context more by sampling it more often). Fixed when disabled.
        const winSize = opt.reducedWindow
          ? opt.window - Math.floor(rng() * opt.window)
          : opt.window;
        const start = Math.max(0, i - winSize);
        const end = Math.min(L, i + winSize + 1);

        for (let j = start; j < end; j++) {
          if (j === i) continue;
          const contextIdx = vocab.index.get(String(walk[j]));
          if (contextIdx === undefined) continue;

          neu1e.fill(0);
          // n === 0 is the positive sample; n >= 1 are the negatives.
          for (let n = 0; n <= opt.negativeSamples; n++) {
            let target, label;
            if (n === 0) {
              target = contextIdx;
              label = 1;
            } else {
              target = negTable[Math.floor(rng() * negLen)];
              if (target === contextIdx) continue; // skip neg == positive (word2vec)
              label = 0;
            }
            const l2 = target * dim;
            let dot = 0;
            for (let d = 0; d < dim; d++) dot += Win[l1 + d] * Wout[l2 + d];
            if (dot > clamp) dot = clamp;
            else if (dot < -clamp) dot = -clamp;
            const g = (label - 1 / (1 + Math.exp(-dot))) * lr;
            for (let d = 0; d < dim; d++) neu1e[d] += g * Wout[l2 + d];
            for (let d = 0; d < dim; d++) Wout[l2 + d] += g * Win[l1 + d];
          }
          for (let d = 0; d < dim; d++) Win[l1 + d] += neu1e[d];
          epochPairs++;
        }
      }
    }
    pairsTrained += epochPairs;
    if (typeof opt.onEpoch === "function") {
      opt.onEpoch({ epoch, learningRate: lr, pairsTrained: epochPairs });
    }
  }

  const embeddings = new Map();
  for (let v = 0; v < V; v++) {
    embeddings.set(vocab.ids[v], Win.slice(v * dim, v * dim + dim));
  }
  return { embeddings, vocab, dimensions: dim, epochs: opt.epochs, pairsTrained, corpusEmpty: false };
}

/** Cosine similarity of two equal-length numeric vectors; 0 for degenerate input. */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length == null || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Top-k most cosine-similar nodes to `id`. O(V·d) — fine for evaluation /
 * tests; a downstream caller embedding the full graph should use an ANN index.
 * Ties broken by id (ascending) so the result is deterministic.
 */
export function mostSimilar(embeddings, id, k = 10) {
  if (!(embeddings instanceof Map)) return [];
  const target = embeddings.get(id);
  if (!target) return [];
  const out = [];
  for (const [other, vec] of embeddings) {
    if (other === id) continue;
    out.push({ id: other, score: cosineSimilarity(target, vec) });
  }
  out.sort((x, y) => (y.score - x.score) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  return out.slice(0, Math.max(0, k | 0));
}

export { EMBED_DEFAULTS as DEFAULTS };
