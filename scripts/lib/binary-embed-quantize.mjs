#!/usr/bin/env node
/**
 * binary-embed-quantize.mjs -- binary + int8 embedding quantization for PRISM's vector stores
 * (U-EMBED-BINARY-QUANTIZE, slot:india 2026-06-18). Ports the two-stage binary-retrieval pattern
 * from CyrilXBT's "How to Make RAG 32x More Memory Efficient" (x.com article 2066965039718834176)
 * from Python/FAISS to pure Node -- no native deps.
 *
 * WHY: PRISM stores 768-d float32 embeddings as raw JSON (node-embeddings-768d.jsonl ~114MB; the
 * tribal-embed-index crossed V8's 512MiB string cap 2026-06-08 -> silent fleet-wide death + a
 * 33K-entry clobber, then sharded as a workaround). Binary quantization is 32x (a 768-d float32
 * vector = 3072 bytes -> 96 bytes packed bits); int8 is 4x. The two-stage retrieve (fast Hamming
 * prefilter -> float32 rescore of the candidates) recovers most of the binary quality loss.
 *
 * THE METHOD (sign-bit binary): for an L2-normalized embedding, the SIGN of each dimension carries
 * most of the retrieval signal (whether a value is +/- matters more than its magnitude for cosine
 * order). So binarize(v) = (v >= 0) per dim, packed 8-per-byte; similarity = -Hamming (fewer
 * differing sign-bits = more similar). Stage 2 rescores the top-N Hamming candidates with the real
 * float32 cosine to restore the exact top-k order. ALL pure -> hermetically testable.
 *
 * Quality is NOT assumed: callers that gate on metrics (e.g. the GNN deploy gate, AUROC>=0.78) MUST
 * MEASURE binary-vs-float recall before trusting it (india refuses softened metrics). Recall-tolerant
 * stores (tribal-index injection) can adopt binary directly.
 *
 * MEASURED (2026-06-18, U-EMBED-BINARY-QUANTIZE, via scripts/bench-embed-quantize-recall.mjs, k=5
 * cand=100): two-stage binary recall@5 = 99.8% on the GNN ghost deploy set (ghost-node-embeddings,
 * 355 vec) and 95.5% on the 60K node-embeddings-768d store (2000-vec sample), both at 32x footprint
 * (768-d float32 3072B -> 96B packed). VERDICT: binary two-stage is safe (>=95%) for these stores.
 * Highest-value incorporation target = the tribal-embed-index (537MB, crossed V8's 512MiB string cap
 * 2026-06-08 -> sharded workaround); 32x binary would drop it to ~17MB. That store is golf/sierra-owned
 * + fleet-critical (PSN leg #5 rerank, prior clobber incidents) -- adopt there via its owners, not here.
 */

// 256-entry popcount LUT (bits set per byte value) -- the Hamming hot path.
const POPCOUNT = new Uint8Array(256);
for (let i = 0; i < 256; i++) POPCOUNT[i] = (i & 1) + POPCOUNT[i >> 1];

/**
 * Binarize an L2-normalized float embedding to packed sign-bits. Dim d -> bit (v[d] >= 0 ? 1 : 0),
 * MSB-first within each byte (bit 7 = dim 0). Returns a Uint8Array of ceil(dim/8) bytes (32x smaller
 * than the float32 source). A length that is not a multiple of 8 zero-pads the final byte.
 * @param {ArrayLike<number>} vec
 * @returns {Uint8Array}
 */
export function binarize(vec) {
  if (!vec || typeof vec.length !== "number") throw new TypeError("binarize: vec must be array-like");
  const n = vec.length;
  const out = new Uint8Array((n + 7) >> 3);
  for (let i = 0; i < n; i++) {
    if (vec[i] >= 0) out[i >> 3] |= 0x80 >> (i & 7);
  }
  return out;
}

/**
 * Hamming distance between two equal-length packed bit arrays = popcount(a XOR b). Lower = more
 * similar. THROWS on a length mismatch (a silent truncation would corrupt the ranking).
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {number}
 */
export function hammingDistance(a, b) {
  if (a.length !== b.length) throw new RangeError(`hammingDistance: length mismatch ${a.length} vs ${b.length}`);
  let d = 0;
  for (let i = 0; i < a.length; i++) d += POPCOUNT[a[i] ^ b[i]];
  return d;
}

/**
 * Stage-1 binary search: the k smallest-Hamming corpus rows for a packed query. Ties break by lower
 * index (deterministic). Returns [{ index, distance }] ascending by distance. O(N) scan + a bounded
 * insertion -- fine for the prefilter (k is small, the rescore set).
 * @param {Uint8Array} queryPacked
 * @param {Uint8Array[]} corpusPacked
 * @param {number} k
 * @returns {Array<{index:number, distance:number}>}
 */
export function hammingSearch(queryPacked, corpusPacked, k) {
  const top = [];
  for (let i = 0; i < corpusPacked.length; i++) {
    const distance = hammingDistance(queryPacked, corpusPacked[i]);
    if (top.length < k) {
      top.push({ index: i, distance });
      top.sort((x, y) => x.distance - y.distance || x.index - y.index);
    } else if (distance < top[top.length - 1].distance) {
      top[top.length - 1] = { index: i, distance };
      top.sort((x, y) => x.distance - y.distance || x.index - y.index);
    }
  }
  return top;
}

/** Cosine similarity of two equal-length float vectors (for stage-2 rescore). THROWS on mismatch. */
export function cosineSim(a, b) {
  if (a.length !== b.length) throw new RangeError(`cosineSim: length mismatch ${a.length} vs ${b.length}`);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Two-stage retrieval: binary Hamming prefilter -> float32 cosine rescore -> exact top-k.
 * Stage 1 cheaply narrows to `rescoreCandidates` rows on the 32x-smaller packed corpus; stage 2
 * rescores ONLY those with the real float vectors. Recovers most binary quality loss at binary
 * memory cost. Returns [{ index, score }] descending by cosine.
 * @param {ArrayLike<number>} queryFloat            the full-precision query embedding
 * @param {{packed: Uint8Array[], floats: ArrayLike<number>[]}} corpus  packed bits + float rows (parallel)
 * @param {{k?: number, rescoreCandidates?: number}} [opts]
 * @returns {Array<{index:number, score:number}>}
 */
export function twoStageSearch(queryFloat, corpus, opts = {}) {
  const { packed, floats } = corpus || {};
  if (!Array.isArray(packed) || !Array.isArray(floats)) throw new TypeError("twoStageSearch: corpus needs {packed, floats} arrays");
  if (packed.length !== floats.length) throw new RangeError(`twoStageSearch: packed/floats length mismatch ${packed.length} vs ${floats.length}`);
  const k = Math.max(1, opts.k ?? 5);
  const rescoreCandidates = Math.max(k, opts.rescoreCandidates ?? 100);
  const qPacked = binarize(queryFloat);
  const candidates = hammingSearch(qPacked, packed, Math.min(rescoreCandidates, packed.length));
  const rescored = candidates.map((c) => ({ index: c.index, score: cosineSim(queryFloat, floats[c.index]) }));
  rescored.sort((x, y) => y.score - x.score || x.index - y.index);
  return rescored.slice(0, k);
}

/**
 * Calibrate int8 quantization params from a sample (min/max -> [-128,127], R12: a blank sample is an
 * error, not silently scale 0). Returns { scale, zeroPoint }. Mirrors the article's calibrate step.
 * @param {ArrayLike<number>} sample  a flat slice of representative embedding values
 */
export function calibrateInt8(sample) {
  if (!sample || sample.length === 0) throw new RangeError("calibrateInt8: empty sample");
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < sample.length; i++) { const v = sample[i]; if (v < min) min = v; if (v > max) max = v; }
  const qmin = -128, qmax = 127;
  const scale = max === min ? 1 : (max - min) / (qmax - qmin); // degenerate range -> scale 1 (no div0)
  let zeroPoint = Math.round(qmin - min / scale);
  zeroPoint = Math.min(qmax, Math.max(qmin, zeroPoint));
  return { scale, zeroPoint };
}

/** Quantize a float vector to Int8Array using calibrated {scale, zeroPoint} (clamped to [-128,127]). */
export function quantizeInt8(vec, { scale, zeroPoint }) {
  const out = new Int8Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    const q = Math.round(vec[i] / scale + zeroPoint);
    out[i] = q < -128 ? -128 : q > 127 ? 127 : q;
  }
  return out;
}

/** Dequantize an Int8Array back to a Float64Array for distance computation. Inverse of quantizeInt8. */
export function dequantizeInt8(q, { scale, zeroPoint }) {
  const out = new Float64Array(q.length);
  for (let i = 0; i < q.length; i++) out[i] = (q[i] - zeroPoint) * scale;
  return out;
}

/** Memory-footprint helper: bytes for N vectors of `dim` dims at a given mode (parity with the article). */
export function footprintBytes(n, dim, mode) {
  switch (mode) {
    case "float32": return n * dim * 4;
    case "int8": return n * dim;
    case "binary": return n * ((dim + 7) >> 3);
    default: throw new RangeError(`footprintBytes: unknown mode ${mode}`);
  }
}
