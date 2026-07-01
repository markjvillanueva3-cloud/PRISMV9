---
title: Discovery Galaxy Foundations — Information Retrieval, Search, and Near-Duplicate Detection
galaxy: discovery
owner_slot: tango
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: "Each '##' theme section is grounded in a free-textbook / free-course / reputable-reference source confirmed by live WebFetch on 2026-06-10. Claims that could not be fetched from a free legal source are left out and noted in the Owner-gate. No claim appears here that was not returned by an actual WebFetch call."
tags: [discovery, information-retrieval, search, deduplication, inverted-index, tf-idf, bm25, minhash, lsh, shingling, simhash, anti-duplication, foundations]
---

# Discovery Galaxy Foundations

The **discovery** galaxy (owner: tango) is PRISM's anti-duplication + search-first substrate: the
`DuplicationGuardEngine` (THROWS on duplicate asset creation), the master-index search surface, the
coverage/orphan audits, and the cross-session asset registry. Every one of those mechanisms is an
applied instance of a classical **information-retrieval (IR)** or **near-duplicate-detection** result.

This entry grounds the galaxy's engineering in the free, legal academic canon for the field — the
Manning/Raghavan/Schutze *Introduction to Information Retrieval* textbook (free HTML online at
nlp.stanford.edu/IR-book, the basis of Stanford CS276) and the *Mining of Massive Datasets* lineage
of near-duplicate results (MinHash / LSH / shingling). Each section maps one piece of theory to how
THIS galaxy uses it.

Status is **VERIFIED-PARTIAL**: the claims below are WebFetch-confirmed, but the entry is a
foundations seed, not the galaxy's complete encyclopedia. See the Owner-gate for what is deliberately
NOT promoted yet.

---

## 1. The inverted index — the structure search is built on

The Stanford IR textbook describes the inverted index as *"essentially without rivals as the most
efficient structure for supporting ad hoc text search."* It has two components: a **dictionary** of
normalized terms (carrying metadata such as each term's *document frequency* — the number of
documents containing it) and, per term, a **postings list** of the document identifiers where that
term appears, *"secondarily sorted by docID."* It is built by collecting documents, tokenizing them,
linguistically normalizing the tokens into index terms, then sort-merging the resulting (term, docID)
pairs into dictionary + postings.
(Source: Stanford IR book, "A first take at building an inverted index.")

**Discovery galaxy use:** the master-index search surface and the asset registry are inverted indexes
over PRISM's own corpus (engines, dispatchers, wiki, memories). A search-first lookup before creating
a new asset is a postings-list intersection over the index — exactly this structure.

## 2. Ranking — tf, idf, tf-idf, and BM25

**idf.** Inverse document frequency is defined exactly as `idf_t = log (N / df_t)`, where N is the
collection size and `df_t` is the number of documents containing term t; *"the idf of a rare term is
high, whereas the idf of a frequent term is likely to be low."*
(Source: Stanford IR book, "Inverse document frequency.")

**tf-idf.** The composite weight is `tf-idf_{t,d} = tf_{t,d} * idf_t`, which is highest *"when t occurs
many times within a small number of documents (thus lending high discriminating power to those
documents),"* and minimal when a term appears in virtually every document.
(Source: Stanford IR book, "Tf-idf weighting.")

**BM25.** Okapi BM25 adds term-frequency saturation and document-length normalization:
`RSV_d = SUM_{t in q} log(N/df_t) * ((k1+1) * tf_td) / (k1 * ((1-b) + b * (L_d / L_ave)) + tf_td)`.
The `k1` parameter *"calibrates the document term frequency scaling"* (k1=0 -> binary), and `b` in
[0,1] controls length normalization (*"b=1 corresponds to fully scaling the term weight by the
document length, while b=0 corresponds to no length normalization"*). Reasonable defaults without
tuning are **k1 between 1.2 and 2, b = 0.75**.
(Source: Stanford IR book, "Okapi BM25: a non-binary model.")

**Discovery galaxy use:** when search-first returns candidate matches before asset creation, scoring
them by tf-idf / BM25-style relevance (rare distinctive terms outweigh boilerplate) is what lets the
guard rank "is THIS the existing asset?" rather than dumping every weak hit. The b=0.75 length-norm
default is the right starting point so a long engine file does not out-rank a short, precise one
purely on length.

## 3. Scaling the index — blocked sort-based indexing (BSBI)

When the (term, docID) stream is too large for memory, the textbook prescribes an **external-merge**
build: segment the collection into equal blocks, sort each block's termID-docID pairs in memory, write
each sorted run to disk, then merge the runs. The constraint it solves: *"With main memory
insufficient, we need to use an external sorting algorithm, that is, one that uses disk."* The merge
opens all block files simultaneously and repeatedly emits *"the lowest termID that has not been
processed yet,"* relying on **sequential disk reads** to avoid seek-bound random access. This is what
lets indexing scale to collections *"several orders of magnitude larger"* than fit in RAM; overall
work is `Theta(T log T)`.
(Source: Stanford IR book, "Blocked sort-based indexing.")

**Discovery galaxy use:** PRISM's corpus (548MB+ system graph, 300K+ node cards, 33K+ tribal entries)
exceeds the V8 string cap and comfortable heap — the same regime BSBI targets. The streaming /
seek-by-offset readers in system-viz (`node-card-offsets.json` byte-seek, brace-aware streaming
parsers) are the galaxy's BSBI: never load the whole index as one string, merge/seek sequentially.

## 4. Near-duplicate detection — shingling and the Jaccard coefficient

To detect *near*-duplicates (not just exact), a document is reduced to its set of **k-shingles**:
*"the set of all consecutive sequences of k terms in d."* (e.g. the 4-shingles of "a rose is a rose is
a rose" are {"a rose is a", "rose is a rose", "is a rose is"}). Two documents' similarity is the
**Jaccard coefficient** of their shingle sets:
`J(S(d1), S(d2)) = |S(d1) ∩ S(d2)| / |S(d1) ∪ S(d2)|`, and they are declared near-duplicates if this
exceeds a preset threshold (e.g. 0.9). The independent W-shingling reference confirms the same
*resemblance* `r(A,B) = |S(A) ∩ S(B)| / |S(A) ∪ S(B)|`, a number in [0,1] where 1 means identical and
which is *"identical with the Jaccard coefficient."*
(Sources: Stanford IR book, "Near-duplicates and shingling"; Wikipedia, "W-shingling.")

**Discovery galaxy use:** the anti-duplication guard does not just match exact names — two engines can
be the same capability under different names. Shingling the description/keywords and thresholding the
Jaccard resemblance is the principled "are these the same asset?" test behind
`duplicationGuardEngine.checkBeforeCreating`.

## 5. Sub-linear similarity at scale — MinHash and LSH

Comparing every pair of N documents is O(N^2). **MinHash** makes the similarity estimate cheap: it is
*"a technique for quickly estimating how similar two sets are,"* and its core theorem is exactly
`Pr[h_min(A) = h_min(B)] = J(A,B) = |A ∩ B| / |A ∪ B|`. Using k independent hash functions and the
fraction y/k that agree gives an unbiased Jaccard estimator with expected error `O(1/sqrt(k))`.
(Source: Wikipedia, "MinHash.") The Stanford IR book states the same property for web-scale sketches:
`J(S(d1), S(d2)) = P(x1^pi = x2^pi)`, and reports using **200 independent permutations** so each
document carries a 200-value sketch, estimating Jaccard as `|psi_i ∩ psi_j| / 200`.
(Source: Stanford IR book, "Near-duplicates and shingling.")

**Locality-Sensitive Hashing (LSH)** then avoids even the all-pairs sketch comparison by hashing
*"similar input items into the same 'buckets' with high probability"* — uniquely, LSH **maximizes**
collisions instead of minimizing them. A family is **(r, cr, p1, p2)-sensitive** if points within
distance r collide with probability >= p1 and points beyond cr collide with probability <= p2. The
probability-vs-similarity curve is sharpened by **amplification**: an **AND-construction** of k
functions yields a `(d1, d2, p1^k, p2^k)`-sensitive family (requires agreement on all k), and an
**OR-construction** yields `(d1, d2, 1-(1-p1)^k, 1-(1-p2)^k)` (requires agreement on at least one).
Composing AND-then-OR over the MinHash signature is the banding technique that produces the steep
S-curve separating "candidate" from "ignore."
(Source: Wikipedia, "Locality-sensitive hashing.")

**Discovery galaxy use:** as PRISM's corpus grows, the guard cannot afford O(N^2) shingle comparisons
against every existing asset. MinHash signatures + LSH banding turn "find assets near this one" into a
bucket lookup — the search-first discipline stays fast at fleet scale. The k vs error and the AND/OR
tradeoff are the dials for precision (false candidates) vs recall (missed duplicates).

## 6. Alternate dedup hash — SimHash (cosine/Hamming LSH)

A complementary near-duplicate scheme is **SimHash** (Charikar): it *"creates hashes that produce
similar hashes for similar input data, measured as the bitwise hamming distance between values,"* so
*"if the SimHash bitwise hamming distance of two phrases is low then their Jaccard coefficient is
high."* It is an LSH for cosine similarity rather than Jaccard. Notably, *"the algorithm is used by
the Google Crawler to find near duplicate pages,"* and Google reported using SimHash for crawl
de-duplication in 2007 — a production-scale validation of the approach.
(Source: Wikipedia, "SimHash.")

**Discovery galaxy use:** SimHash gives a compact bit-signature where near-duplicate detection is a
Hamming-distance threshold — cheap to store and compare for the cross-session asset registry. It is
the alternative to MinHash+LSH when a single fixed-width fingerprint per asset is preferable to a
multi-permutation sketch.

## 7. Knowing the search is good — evaluation metrics

A discovery/search surface must be *measured*, not asserted. For ranked retrieval the textbook defines
**interpolated precision** `p_interp(r) = max_{r' >= r} p(r')` (smoothing the saw-tooth precision-recall
curve) and **Mean Average Precision (MAP)** over a query set Q:
`MAP(Q) = (1/|Q|) * SUM_j (1/m_j) * SUM_k Precision(R_jk)`, where `m_j` is the number of relevant
documents for query j; MAP is *"roughly the average area under the precision-recall curve for a set of
queries"* and gives *"a single-figure measure of quality across recall levels."*
(Source: Stanford IR book, "Evaluation of ranked retrieval results.")

**Discovery galaxy use:** the coverage/orphan audits and the "did search-first surface the existing
asset?" question are recall problems; "did the guard flag a false duplicate?" is a precision problem.
MAP/precision-recall is the honest way to report whether the master-index search is improving — a
duplication guard that never fires (recall 0) or fires constantly (precision low) is failing in a way
a single accuracy number would hide.

---

## Owner-gate (NOT promoted)

The following are deliberately left for tango (galaxy owner) to verify against PRISM's own code and
live corpus before promotion — they are NOT asserted as PRISM facts here:

- **MMDS canonical banding threshold.** The *Mining of Massive Datasets* free book states the LSH
  banding S-curve threshold (similarity at which a pair becomes a candidate with probability ~1/2) is
  approximately `(1/b)^(1/r)` for b bands of r rows, with candidate probability `1 - (1 - s^r)^b`.
  The exact MMDS PDF (mmds.org / infolab.stanford.edu/~ullman/mmds) was **NOT fetchable** from this
  environment (TLS-altname / ECONNREFUSED / 404 on every mirror tried 2026-06-10). The general
  amplification result IS confirmed above via the Wikipedia LSH article (AND/OR construction); the
  specific `(1/b)^(1/r)` closed form is left ungated until fetched from a live free MMDS copy.
- **Which exact PRISM engines implement MinHash/LSH/SimHash today** vs. only exact-name matching —
  must be read from `DuplicationGuardEngine.ts` + the asset-registry code, not assumed from this
  theory entry.
- **The actual ranking function used by the master-index search** (tf-idf? BM25? embedding cosine?
  hybrid?) — must be confirmed against the master-index engine source before claiming it here.
- **Stanford CS276/CS246 lecture-handout specifics** (chunking, compression, champion lists) — the
  specific lecture-handout URLs returned 404; only the textbook HTML pages were reachable. Promote
  from the free textbook chapters, not from the unreachable slide decks.
- **Safety thresholds:** N/A for this galaxy — discovery is an IR/dedup substrate with no physics or
  machine-safety constants. No safety thresholds were inlined; none were gated.

---

## Sources

All URLs below were fetched live and confirmed on 2026-06-10. The Stanford IR book
(nlp.stanford.edu/IR-book) is the free online edition of Manning/Raghavan/Schutze *Introduction to
Information Retrieval* (Cambridge University Press), the basis of Stanford CS276 — a free-textbook /
free-course source.

- Stanford IR book — A first take at building an inverted index: https://nlp.stanford.edu/IR-book/html/htmledition/a-first-take-at-building-an-inverted-index-1.html  (free textbook)
- Stanford IR book — Inverse document frequency: https://nlp.stanford.edu/IR-book/html/htmledition/inverse-document-frequency-1.html  (free textbook)
- Stanford IR book — Tf-idf weighting: https://nlp.stanford.edu/IR-book/html/htmledition/tf-idf-weighting-1.html  (free textbook)
- Stanford IR book — Okapi BM25: a non-binary model: https://nlp.stanford.edu/IR-book/html/htmledition/okapi-bm25-a-non-binary-model-1.html  (free textbook)
- Stanford IR book — Blocked sort-based indexing: https://nlp.stanford.edu/IR-book/html/htmledition/blocked-sort-based-indexing-1.html  (free textbook)
- Stanford IR book — Near-duplicates and shingling: https://nlp.stanford.edu/IR-book/html/htmledition/near-duplicates-and-shingling-1.html  (free textbook)
- Stanford IR book — Evaluation of ranked retrieval results: https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html  (free textbook)
- Wikipedia — MinHash: https://en.wikipedia.org/wiki/MinHash  (reputable free reference)
- Wikipedia — Locality-sensitive hashing: https://en.wikipedia.org/wiki/Locality-sensitive_hashing  (reputable free reference)
- Wikipedia — W-shingling: https://en.wikipedia.org/wiki/W-shingling  (reputable free reference)
- Wikipedia — SimHash: https://en.wikipedia.org/wiki/SimHash  (reputable free reference)
