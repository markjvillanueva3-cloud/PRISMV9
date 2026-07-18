---
name: reference_discovery_phase4_deep_2026_06_13
description: "Discovery (tango) Phase-4 deep anchor — Hermes-planned, R12-tempered. The 4 deeper sub-domains: (1) data-dependent ANN theory beyond HNSW (Andoni et al. STOC 2017 tight bounds), (2) learned index structures replacing static hash tables (Kraska et al. SIGMOD 2018 RMI + differentiable product quantization), (3) probabilistic data structures beyond MinHash (b-Bit MinHash Li-Konig KDD 2011, HyperLogLog++ Heule et al. 2013, tensor sketching Pham-Pagh 2013), (4) streaming/incremental dedup with sliding-window guarantees (Mitzenmacher-Upfal probabilistic foundations + Flajolet-Martin distinct-count). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.553Z
aliases: reference_discovery_phase4_deep_2026_06_13
---


**Context:** Phase-4 anchor for the discovery galaxy (tango). Deepens
[[reference_discovery_phase3_unified_hybrid_index_2026_06_13]] (Phase-3: unified hybrid+dedup index, semantic
DuplicationGuard, adaptive LSH banding) and [[reference_discovery_retrieval_dedup_2026_06_13]] (Phase-2: BM25,
CodeBERT, MinHash/LSH basics, KG entity resolution, program slicing). Planned by Hermes (xAI Grok, :8645),
tempered per R12 — all performance numbers below are hypotheses, not measured results.

## The deeper increments

### 1. Data-dependent ANN theory: tight bounds beyond HNSW

**What Phase-3 left out:** HNSW (Malkov-Yashunin) is a *practical* graph-based ANN index with empirically good
performance. Phase-4 adds the *theoretical* understanding: when is a query provably hard for any ANN algorithm,
and how do data-dependent methods approach the optimal?

**Key equation (Andoni et al. STOC 2017):** For Euclidean ANN with approximation ratio c ≥ 1, the optimal
time-space exponent ρ = 1/c² is achieved by data-dependent spherical-cap hashing — tighter than the ρ = 1/c
bound of classic random LSH. The data-dependent construction partitions the unit sphere into caps whose size is
tuned to the data distribution, not fixed.

**Locality-Sensitive Filtering (LSF):** Becker, Ducas, Gama, Laarhoven (SODA 2016) reframe LSH as a filter:
instead of hashing points to buckets, use filters that *accept* close pairs and *reject* far pairs with controlled
error probability. The analysis via covering numbers gives tighter theoretical guarantees than bucket-collision
counting.

**ANN lower bounds via communication complexity:** Razenshteyn (PhD thesis, MIT 2017) proves that for c-ANN, any
data structure using S bits of space requires Ω(n^(1/c² - ε)) query time — establishing that data-dependent
methods are near-optimal.

**PRISM relevance:** PRISM's HNSW (384-d nomic-embed-text, ONNX) is a practical ANN layer. The data-dependent
theory tells us *when to trust* approximate recalls from it and *when to fall back* to exact search — actionable
for the master-index recall guarantee. HYPOTHESIS (unverified): data-dependent tuning of HNSW ef_construction
by embedding cluster density could improve recall on dense CAM/mill clusters vs default parameters.

**Real benchmarks (verifiable, not claims):** ANN-Benchmarks (Aumuller et al. 2020, ann-benchmarks.com);
BigANN (Simhadri et al. NeurIPS 2021) — both are public evaluation harnesses, not internal systems.

### 2. Learned index structures: replacing static BM25 postings and hash tables

**What Phase-3 left out:** BM25 postings lists + HNSW are *static* indexes rebuilt in batch. Learned indexes
replace the index data structure itself with a learned model that predicts position or distance, enabling far
smaller memory footprints and adaptive behavior.

**Recursive Model Index (RMI), Kraska et al. SIGMOD 2018:** replace a B-tree or sorted array with a cascade
of models: `p = M_k(M_{k-1}(... M_1(key)))` where each M_i predicts the position in the next level's lookup
table. The model fits the cumulative distribution function of the key space. Real measured result from the paper:
1.5–3× smaller than B-tree for sorted integer keys on 200M records (THEIR setup; not generalizable without
re-measurement on PRISM's asset corpus).

**Differentiable Product Quantization (DPQ):** Chen, Wang & Wang ("Differentiable Product Quantization for
End-to-End Embedding Compression," ICML 2020) and the related End-to-End Supervised PQ (Klein & Wolf, CVPR 2019)
make the codebook assignment differentiable via a soft-max relaxation, enabling end-to-end gradient training of
encoder + quantizer. Key equation: `q(x) = softmax(d(x, c_k)/τ) · c_k` (soft assignment with temperature τ).
This is the upgrade from standard PQ (Jégou et al. TPAMI 2011) where codebooks are trained separately. (NOTE: the
exact author/venue for "DPQ" in the literature is somewhat fragmented across these works — verify the specific
citation before quoting it in a paper; the soft-assignment relaxation itself is the load-bearing technique here.)

**Spreading Vectors for Similarity Search, Sablayrolles et al. ICLR 2019:** learn embedding space geometry to
maximize the uniformity of hash-code distributions — equivalently, minimize code collisions for non-neighbors while
preserving neighbor recall. Loss: `L = λ_uniform · Σ_collisions - λ_recall · Σ_true_neighbors_recalled`.

**PRISM relevance:** PRISM's 384-d ONNX embeddings are fixed; a learned quantizer (DPQ) could compress the
tribal-embed-index (currently ~537 MB JSONL, V8-cap problem) to a compact code matrix with no V8-string-cap
exposure. HYPOTHESIS (unverified): DPQ at 8-bit codes on 33K tribal entries could reduce index from ~537 MB to
~16 MB while maintaining recall above 0.90 on the rerank top-20 surface (needs measurement).

### 3. Probabilistic data structures beyond MinHash: tighter bounds, streaming variants

**What Phase-3 left out:** MinHash (Broder 1997) and SimHash (Charikar 2002) estimate Jaccard and cosine
similarity respectively. Phase-4 covers the *next generation* with tighter variance, streaming adaptability,
and multi-set generalizations.

**b-Bit MinHash, Li & Konig (KDD 2011):** instead of storing the full integer minimum hash, store only the
lowest b bits. Storage drops b/64× vs standard MinHash for the same number of hash functions. The unbiased
Jaccard estimator is `Ĵ = (a_1 - a_2 * C_1 * C_2) / (1 - C_1 * C_2 * a_2)` where a_1, C_1, C_2 are
correction factors depending on b and estimated Jaccard. At b=1, storage is 64× smaller than full MinHash with
bounded variance increase (the 64×-at-b=1 storage ratio and the unbiased-estimator form are results FROM the
paper, not measured on PRISM — the applicability to PRISM's shingled engine-name+description corpus is a
hypothesis to validate, not a measured fact).

**HyperLogLog++ (Heule, Nunkesser, Hall, Google 2013):** estimates set cardinality (|S|) with ε relative error
using O(log log n) bits per element. The estimator: `n̂ = α_m * m² * (Σ_{i=1}^{m} 2^{-M_i})^{-1}` where m is
the number of registers and M_i is the max leading-zero count per bucket. The "++" variant adds bias correction
for small and large cardinalities. Directly applicable to estimating distinct engine-capability signatures across
the 110K-node master graph without full enumeration.

**Tensor Sketching for polynomial kernels, Pham & Pagh (NIPS 2013):** generalizes random projections to
polynomial kernels `K(x,y) = (x^T y + c)^d` via a sketch `φ: R^n → R^s` such that `E[φ(x)^T φ(y)] = K(x,y)`.
Enables approximate kernel evaluation in O(d * s * log s) via FFT instead of O(n^d). Relevant for code-clone
detection where polynomial kernels over AST n-gram feature vectors are more expressive than dot-product
embeddings alone.

**OddSketch (Mitzenmacher et al.):** estimates *symmetric set difference* |A △ B| (not just Jaccard) in O(1)
space per element using a single parity bit per bucket. Complement to MinHash which estimates |A ∩ B| / |A ∪ B|.
For PRISM dedup: MinHash answers "are these engines similar?" while OddSketch answers "how many features differ?"
— the latter is better for partial-overlap detection (engine A is a strict subset of engine B's capability).

### 4. Streaming/incremental deduplication with sliding-window guarantees

**What Phase-3 left out:** Phase-3's unified index is batch-built. PRISM's asset corpus grows incrementally
(new engines/hooks/wiki entries on every commit). Streaming dedup handles the case where the full corpus does
not fit in memory and must be processed in one pass.

**Flajolet-Martin distinct counting (1985):** the original streaming cardinality estimator using the position of
the trailing 1 in a hash value. Expected value of `max(trailing_zeros(h(x)))` ≈ log₂(n). Not used directly
today (HyperLogLog is strictly better) but foundational for understanding streaming probabilistic structures.
Understanding it makes HyperLogLog's improvement legible.

**Mitzenmacher & Upfal "Probability and Computing" (Cambridge, 2005 / 2nd ed. 2017):** the canonical textbook
for probabilistic data structures — balls-into-bins, Chernoff bounds, universal hashing, Bloom filters, streaming.
Every streaming dedup bound in the literature ultimately traces back to one of the Chernoff/Markov/tail-bound
forms in this text. Equation: Chernoff upper tail `P[X > (1+δ)μ] ≤ exp(-μδ²/3)` for δ ≤ 1 where X = sum of
independent 0/1 variables.

**Sliding-window MinHash (Shrivastava 2016, "Simple and Efficient Weighted Minwise Hashing"):** extends MinHash
to streams with a sliding time window — only elements within the last W insertions count toward the signature.
Maintains a priority queue of (hash_value, timestamp) pairs; evict entries older than W. Direct application:
PRISM's incremental asset corpus where only the *recent* commits should dominate dedup sensitivity (old engine
versions should not block new names).

**Adversarial robustness:** Mitzenmacher & Vadhan (SODA 2008) show that a streaming sketch using a *public*
hash family can be attacked by an adversary who knows the hash — they force collisions and inflate false-positive
dedup. Defense: keyed hashing (HMAC-SHA256 or SipHash-1-3) where the key is session-private. For PRISM:
DuplicationGuard's hash functions should be keyed to prevent prompt-injection attacks from forcing artificial
"already exists" blocks.

## Wiring / consumers (R15)

**GALAXY:** `mcp-server/src/engines/discovery/` (tango). This anchor informs:
- **DuplicationGuardEngine** (`src/engines/DuplicationGuardEngine.ts`): upgrade path — add b-Bit MinHash for
  storage-efficient semantic-dup; add OddSketch for partial-overlap detection; key hash functions (SipHash).
- **master-index search** (`scripts/system-viz-query.mjs`, `node-card-offset-lib.mjs`): learned index theory
  informs when to trust HNSW approximate recall vs fall back to exact — set ef_search by cluster density.
- **tribal-embed-index** (`scripts/tribal-embed-index.mjs`): DPQ compression candidate for the V8-cap problem
  (537 MB → compact code matrix). HYPOTHESIS only — measure first.
- **HyperLogLog++ for inventory counts** (`PRISM-INVENTORY-LATEST.md` generation): instead of full enumeration,
  streaming cardinality for large sets (110K+ nodes) with ε=1% error.
- **romeo galaxy** (wiring): uses the discovery output to find orphan engines; sliding-window MinHash would
  keep the dedup signature fresh on the incrementally-growing asset corpus.
- **victor galaxy** (dormant-data): streaming dedup identifies which dormant assets are semantically identical
  to active ones (the OddSketch partial-overlap angle is new here).
- **india galaxy** (ai-training): DPQ and spreading vectors are directly applicable to the 768-d node-embedding
  compression pipeline (NN-GRAPH MS2, current tribal-embed-index V8-cap risk).

Do NOT inline physics constants — import from `src/physics/constants.ts` for any cutting-physics values (not
applicable to this pure CS/IS domain, but flagged per R15 wiring rule).

## Next (Phase-5, honestly scoped)

1. **Build and measure:** implement b-Bit MinHash (b=1 or b=2) as DuplicationGuard's semantic-dup layer on the
   shingled name+desc corpus; measure dup-recall vs exact-name baseline on a held-out synthetic dup set.
2. **V8-cap fix via DPQ:** prototype DPQ compression of the tribal-embed-index; measure recall@20 vs full JSONL
   on the existing tribal-rerank test suite before committing.
3. **HyperLogLog++ cardinality:** wire into `scripts/build-state-snapshot.mjs` for large-set counts as a
   cross-check on the Glob-based enumeration (not a replacement — a validation).
4. **Keyed hashing in DuplicationGuard:** audit current hash family; add SipHash-1-3 with a session-private key
   to harden against adversarial false-block injection.

All four are measurable, bounded, and do not require external data or GPU training.

## Sources

- Andoni, Laarhoven, Razenshteyn, Waingarten — "Optimal Hashing-based Time-Space Tradeoffs for Approximate Near
  Neighbors" (STOC 2017; extended SIAM J. Comput. 2019)
- Becker, Ducas, Gama, Laarhoven — "New Directions in Nearest Neighbor Searching with Applications to Lattice
  Sieving" (SODA 2016)
- Razenshteyn — PhD thesis "Beyond Locality-Sensitive Hashing" (MIT 2017)
- Kraska, Beutel, Chi, Dean, Polyzotis — "The Case for Learned Index Structures" (SIGMOD 2018)
- Martinez, Zhu, Koniusz, Salzmann — "Differentiable Quantization" lineage (TPAMI 2018 + NeurIPS 2021)
- Sablayrolles, Douze, Schmid, Jégou — "Spreading Vectors for Similarity Search" (ICLR 2019)
- Jégou, Douze, Schmid — "Product Quantization for Nearest Neighbor Search" (TPAMI 2011)
- Li, König — "b-Bit Minwise Hashing" (KDD 2011)
- Heule, Nunkesser, Hall — "HyperLogLog in Practice" (EDBT 2013)
- Pham, Pagh — "Fast and Scalable Polynomial Kernels via Explicit Feature Maps" (NIPS 2013)
- Mitzenmacher & Upfal — "Probability and Computing" (Cambridge UP, 2005 / 2nd ed. 2017)
- Flajolet, Martin — "Probabilistic Counting Algorithms for Database Applications" (JCSS 1985)
- Mitzenmacher, Vadhan — "Why Simple Hash Functions Work: Exploiting the Entropy in a Data Stream" (SODA 2008)
- Shrivastava — "Simple and Efficient Weighted Minwise Hashing" (NIPS 2016)
- Aumuller, Bernhardsson, Faithfull — "ANN-Benchmarks: A Benchmarking Tool for Approximate Nearest Neighbor
  Algorithms" (Information Systems 2020; ann-benchmarks.com)
- Simhadri et al. — "Results of the NeurIPS'21 Challenge on Billion-Scale ANN Search" (NeurIPS 2021)
- Planner: Hermes (xAI Grok, :8645), tempered per R12. Performance numbers labeled HYPOTHESIS throughout.
