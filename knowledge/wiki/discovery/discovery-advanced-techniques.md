---
title: Discovery Galaxy Advanced Techniques — State-of-the-Art IR / Ranking / Fusion Strategy
galaxy: discovery
owner_slot: tango
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Each advanced technique below is grounded in a free-textbook / official-docs / reputable-reference source confirmed by live WebFetch on 2026-06-10. This is the WORLD-LEADER-DEPTH strategy layer; it deliberately does NOT restate the intro theory in discovery-foundations.md or the practitioner gotchas in discovery-applied-practice.md. No technique appears here that was not returned by an actual WebFetch call; un-fetchable claims and every corpus-specific number are left in the Owner-gate."
tags: [discovery, information-retrieval, learning-to-rank, query-expansion, relevance-feedback, pseudo-relevance-feedback, bm25f, field-weighting, reciprocal-rank-fusion, hybrid-retrieval, dense-sparse-fusion, lsh-banding, positional-index, tiered-index, champion-lists, advanced-techniques]
---

# Discovery Galaxy Advanced Techniques

This is the **advanced-strategy** layer for the **discovery** galaxy (owner: tango) — the
state-of-the-art IR / ranking / near-duplicate methods an expert reaches for once the basics are in
place. It is distinct from the other two layers and assumes you have read them:

- `discovery-foundations.md` — intro theory: inverted index, tf-idf/BM25 definitions, BSBI, shingling
  + Jaccard, MinHash/LSH amplification, SimHash, MAP/precision-recall.
- `discovery-applied-practice.md` — common practitioner gotchas: normalization traps, MinHash/LSH
  dials as failure modes, BM25 `k1`/`b` sensitivity, stale-index ghosts, skip-pointer performance.

This entry is **"the advanced strategy that makes the difference at the top of the field"** — how a
leading search/dedup system goes beyond a single hand-tuned BM25 scorer: learning the ranking from
data, expanding and reformulating the query, weighting structured fields, fusing heterogeneous
retrievers, and pruning the candidate set so top-K is fast at scale.

The discovery galaxy is PRISM's anti-duplication + search-first substrate (`DuplicationGuardEngine`
THROWS on duplicate asset creation, the master-index search surface, coverage/orphan audits, the
cross-session asset registry). Each technique below is mapped to how THIS galaxy would apply it.

Status is **VERIFIED-PARTIAL**: every technique is WebFetch-confirmed against a free legal source, but
the PRISM-specific choices (which method runs, with what parameters, on what training data) are
owner-gated to tango. Per R12-SAFETY, only the qualitative STRATEGY and the trade-off DIRECTION are
promoted; no tuned constant, weight, or threshold is stated.

---

## 1. Learn the ranking instead of hand-tuning it

### 1.1 Learning to rank (LTR) — supervised ranking over query-document feature vectors
**Technique.** Learning to rank (LTR) / machine-learned ranking is *"the application of machine
learning, often supervised, semi-supervised or reinforcement learning, in the construction of ranking
models for information retrieval."* Each query-document pair is turned into a **feature vector** whose
components ("features," "factors," or "ranking signals") split into *query-independent features*
(document properties like length or PageRank, precomputed offline), *query-dependent features*
(relationships between document and query, e.g. TF-IDF scores), and *query-level features* (e.g. query
word count). The model is trained on lists with specified orderings — *"numerical scores, ordinal
judgments, or binary relevance labels."*
(Source: Wikipedia, "Learning to rank.")

**When an expert reaches for it.** Once you have *many* ranking signals (BM25 score, recency,
field-match, popularity, embedding similarity) and relevance labels or click logs, hand-balancing the
weights stops scaling — LTR *"enable[s] systematic optimization against explicit metrics at scale."*

**Trade-off DIRECTION.** LTR optimizes the metric you train on, so a wrong/biased label source skews
it — clickthrough logs *"may introduce selection bias since users preferentially click top-ranked
results,"* and a hand-built model *"may perform better on indirect signals ... when those signals
diverge from ranking quality metrics." More signals + labels = more accuracy, at the cost of needing a
trustworthy labeled/feedback set and a retraining pipeline.

**Discovery galaxy use.** The "is THIS the existing asset?" decision is exactly a ranking problem with
many signals (name overlap, keyword Jaccard, description shingles, embedding cosine, same-dispatcher).
LTR is the principled way to combine them once tango has labeled examples of true-duplicate vs
distinct-asset pairs — instead of a fixed hand-weighted score.

### 1.2 Pointwise vs pairwise vs listwise — pick the LTR formulation by what you can supervise
**Technique.** LTR has three families. **Pointwise** treats ranking as regression — predict each
document's score independently. **Pairwise** trains a binary classifier on *which of two documents
ranks higher* (RankNet computes *"the estimated probability of the document having higher quality than
another"*), with loss reflecting inversions. **Listwise** *"directly optimizes evaluation metrics
(NDCG, MAP, etc.) across entire ranked lists,"* which *"proves computationally challenging since most
metrics lack continuity, requiring approximations or bounds."*
(Source: Wikipedia, "Learning to rank.")

**When an expert reaches for it.** Choose by your supervision: pointwise if you have absolute relevance
grades, pairwise if you only have "A beats B" preferences (often from clicks), listwise if you can
afford to optimize the end metric directly — *"in practice, listwise approaches often outperform
pairwise approaches and pointwise approaches."*

**Trade-off DIRECTION.** Listwise gives the best end-metric alignment but is the most expensive and
hardest to optimize; pointwise is cheapest and simplest but optimizes a proxy (per-document score) that
can diverge from list quality. Accuracy-toward-the-real-metric trades against training cost/complexity.

**Discovery galaxy use.** For the duplication guard, the available signal is naturally *pairwise*
("this candidate is more likely the same asset than that one"), so a pairwise formulation is the
natural fit; reserve listwise for the master-index *search ranking* where the end metric (MAP /
top-K quality, per foundations §7) is what tango actually wants to maximize.

---

## 2. Improve the query, not just the scorer

### 2.1 Query expansion — add related terms to beat the synonymy gap
**Technique.** Query expansion adds *"additional query terms,"* most commonly via thesaurus-based
global analysis that *"automatically expand[s] with synonyms and related words"* for each query term.
Thesauri can be controlled vocabularies, manual thesauri, *"automatically derived thesauruses"* from
*"word co-occurrence statistics over a collection of documents,"* or query-log mining that *"exploit[s]
the manual query reformulations of other users."* It directly attacks the **synonymy problem** — a
relevant document that uses different words than the query.
(Source: Stanford IR book, "Query expansion.")

**When an expert reaches for it.** When recall is the bottleneck — the right documents exist but use
different vocabulary (e.g. "dedup" vs "near-duplicate" vs "deduplication"). It is *"widely used in
many science and engineering fields."*

**Trade-off DIRECTION.** Expansion *"generally increases recall"* — but adding loosely related terms
can pull in off-topic matches, so the direction is **recall up, precision at risk**. Expand
conservatively (high-confidence synonyms) when precision matters.

**Discovery galaxy use.** A co-occurrence thesaurus built over PRISM's *own* corpus (engines that
appear together, keyword sets that co-occur) would expand a search-first query so a new "EventBus"
asset surfaces the existing "Event Bus Engine" / "message-dispatch" assets it duplicates, even when the
literal terms differ — closing the synonymy gap the literal-match guard misses.

### 2.2 Rocchio relevance feedback — move the query toward what's relevant, away from what isn't
**Technique.** Rocchio is *"the classic algorithm for implementing relevance feedback"* in the vector
space model. Its objective is to *"find a query vector that maximizes similarity with relevant
documents while minimizing similarity with nonrelevant documents"* — formally `argmax [sim(q, C_r) -
sim(q, C_nr)]`. The optimal query is *"the vector difference between the centroids of the relevant and
nonrelevant documents."* In practice three weights balance the *original query* (anchors to user
intent), the *relevant centroid* (pulls toward known-good docs), and the *non-relevant centroid*
(pushes away from known-bad docs).
(Source: Stanford IR book, "The Rocchio algorithm for relevance feedback" / "The underlying theory.")

**When an expert reaches for it.** When a human (or a proxy) can mark a few results relevant/irrelevant
and you want the *next* round of retrieval to be sharper without the user re-typing the query.

**Trade-off DIRECTION.** The optimal-query result is itself a caution: *"this observation is not
terribly useful, precisely because the full set of relevant documents is not known."* So you trust a
*sample* of judgments — over-weighting the relevant centroid pulls hard toward a few examples (recall
of that cluster up, breadth down); over-weighting the non-relevant term can over-prune.

**Discovery galaxy use.** When tango triages guard results ("yes this is the duplicate / no these are
distinct"), Rocchio is the mechanism to fold that judgment back into the asset-search vector so the
next pre-create check is better targeted — feedback-driven refinement of the duplication query.

### 2.3 Pseudo-relevance feedback — automate the feedback, watch for query drift
**Technique.** Pseudo- (blind) relevance feedback removes the human from the loop: do the initial
retrieval, *"assume that the top k ranked documents are relevant,"* then apply standard relevance
feedback (e.g. Rocchio term addition) on that assumption — giving *"improved retrieval performance
without an extended interaction."* It *"mostly works"* and *"has been found to improve performance in
the TREC ad hoc task."*
(Source: Stanford IR book, "Pseudo-relevance feedback.")

**When an expert reaches for it.** When you want feedback-quality results but have no relevance
judgments and the *initial* ranking is usually good enough that its top-k are mostly relevant.

**Trade-off DIRECTION.** The named failure is **query drift** — *"if the query is about copper mines
and the top several documents are all about mines in Chile, then there may be query drift in the
direction of documents on Chile."* If the seed top-k are off, blind feedback *amplifies the error*. So
the direction is: more automatic recall when the first pass is good, drift risk when it isn't — gate
it on a confident first-pass ranking.

**Discovery galaxy use.** For an unattended search-first check, pseudo-relevance feedback could
auto-broaden the asset query from its own top hits — but only safely when the first-pass match is
already strong; over a fleet that constantly renames assets, an off-target first pass would drift the
duplicate search toward the wrong cluster, so this is the one to gate behind a confidence floor.

---

## 3. Exploit document structure and combine retrievers

### 3.1 BM25F — weight fields by signal strength instead of treating the document as flat text
**Technique.** BM25F generalizes BM25 to *structured* documents: it *"defines each type of field as a
stream, applying a per-stream weighting to scale each stream against the calculated score."* Instead of
one flat term-frequency over the whole document, it isolates each field (title, body, anchor text) as
a stream, applies a per-field weight, **normalizes length separately per field**, and combines the
weighted contributions — so *"terms in titles signal stronger relevance"* than the same term buried in
the body.
(Source: Wikipedia, "Okapi BM25" — BM25F section.)

**When an expert reaches for it.** Whenever documents have fields of unequal importance and a flat
scorer would let a body-text mention out-rank a title mention.

**Trade-off DIRECTION.** Higher weight on high-signal fields (title/name) raises precision for
on-target matches but, pushed too far, makes the scorer brittle to field-population quality; per-field
length normalization fixes the "short fields unfairly penalized" distortion of flat BM25. The dial
direction: weight the field that *discriminates*, normalize per field so a sparse field isn't punished.

**Discovery galaxy use.** A PRISM asset is intrinsically structured — engine **name**, **keywords**,
**description**, **dispatcher**, file body. A name/keyword match should dominate a body-text
coincidence when judging duplication. BM25F is the right model for the guard's scorer: treat name +
keywords as high-weight streams, the file body as a low-weight stream, each length-normalized on its
own — rather than shingling everything as one flat blob.

### 3.2 Reciprocal Rank Fusion (RRF) — fuse dense + sparse retrievers without tuning weights
**Technique.** RRF combines several ranked result lists by summing rank-based contributions:
`score = SUM 1/(k + rank(document))` over each result set, *"where k is the rank_constant and rank
begins at 1 within each retriever's results."* The constant controls lower-rank influence (*"a higher
value indicates that lower ranked documents have more influence"*). Crucially it operates on **rank
position, not raw score**, so *"RRF requires no tuning, and the different relevance indicators do not
have to be related to each other,"* which *"remove[s] the need to figure out what the appropriate
weighting is using linear combination."*
(Source: Elasticsearch official docs, "Reciprocal rank fusion.")

**When an expert reaches for it.** The canonical modern hybrid: fuse a **sparse/lexical** retriever
(BM25) with a **dense/vector** (kNN embedding) retriever. Their score scales are incompatible, so
normalizing-and-adding is fragile; RRF sidesteps that entirely — and *"is also shown to give improved
relevance over either query individually."*

**Trade-off DIRECTION.** RRF trades a little fine-grained score information (it discards magnitudes,
keeping only order) for robustness — no normalization, no per-retriever weight tuning, immune to one
ranker's score blowing up. A larger `k` flattens the contribution curve (lower ranks matter more);
smaller `k` sharply favors each list's top. Robustness up, score-fidelity down.

**Discovery galaxy use.** PRISM already has both retrieval modes — lexical master-index search (BM25-
style over the inverted index) and dense embedding search (ONNX 384-d + HNSW per the platform
inventory). RRF is the build-once way to fuse them for search-first: a candidate that ranks well by
*either* lexical name-overlap *or* semantic embedding similarity bubbles up, with no cross-scale
weight to hand-tune — directly raising the guard's recall of "same capability, different name"
duplicates.

---

## 4. Make top-K fast at scale — prune the candidate set

### 4.1 Champion lists — score only each term's strongest documents
**Technique.** Champion lists (a.k.a. *"fancy lists"* or *"top docs"*) precompute, per term, the `r`
documents with the highest weight for that term; at query time you *"restrict cosine computation to
only the documents in"* the union of the query terms' champion lists. Scoring the most promising
candidates instead of the full postings *"dramatically reduc[es] computational overhead."*
(Source: Stanford IR book, "Champion lists.")

**When an expert reaches for it.** When postings are long and you want top-K without scoring every
document that contains a term.

**Trade-off DIRECTION.** `r` too small and the union can hold *"fewer than K documents"* (you miss good
docs); `r` larger is safer but costlier. A strong refinement: *"there is no reason to have the same
value of r for all terms ... it could for instance be set to be higher for rarer terms"* — spend the
list budget where it discriminates. Recall vs cost, tunable per term.

**Discovery galaxy use.** For the asset registry, a champion list per keyword (the assets where that
keyword is most distinctive) lets the search-first check score only the strongest candidates for a new
asset's keywords — and per the rare-term refinement, give distinctive identifiers longer champion lists
than generic words like "engine."

### 4.2 Tiered indexes — search the high-quality tier first, fall back only if needed
**Technique.** A tiered index splits postings into tiers of decreasing importance (the textbook example:
tier 1 = postings with high term frequency, tier 2 = lower), *"ordered by document ID"* within a tier.
Retrieval is hierarchical: *"if we fail to get K results from tier 1, query processing 'falls back' to
tier 2, and so on,"* so the engine *"can terminate early at higher tiers."*
(Source: Stanford IR book, "Tiered indexes.")

**When an expert reaches for it.** When most queries are satisfied by the best documents and you want to
avoid scanning the full postings — early termination at tier 1 for the common case.

**Trade-off DIRECTION.** Tiering trades a small amount of completeness/exactness (a great match
demoted just under the tier boundary is reached only on fallback) for large speed gains on the common
case. The tier thresholds are the dial: aggressive tier 1 = faster but more fallbacks; generous tier 1
= fewer misses but more work up front.

**Discovery galaxy use.** As the corpus passes 300K node cards, a tiered registry (tier 1 = the most
salient/recently-built assets per keyword) lets the search-first check answer the common "obvious
duplicate" case from tier 1 alone, only paying for a deep scan when tier 1 yields too few candidates —
keeping the pre-create gate cheap at fleet scale.

### 4.3 Positional indexes — earn phrase/proximity precision at the cost of index size
**Technique.** A positional index stores term *positions* in each posting (`docID: <pos1, pos2, ...>`),
so a phrase query is answered by intersecting postings and *"check[ing] that their positions of
appearance in the document are compatible with the phrase query"* (each next term one position after
the last), and proximity queries like *"employment /3 place"* (within 3 words) become possible because
*"positional data enables measuring word distances"* — something *"biword indexes cannot"* do.
(Source: Stanford IR book, "Positional indexes.")

**When an expert reaches for it.** When word *adjacency/order* is load-bearing — distinguishing a real
phrase match from a bag-of-words coincidence.

**Trade-off DIRECTION.** The benefit is precision on phrase/proximity; the cost is index size — storing
many positions per term makes a positional index *"substantially larger."* Precision up, storage and
build cost up.

**Discovery galaxy use.** PRISM identifiers are order-sensitive collocations
(`cam_strategy_recommend` vs `cam_strategy_select`; `MillingForceEngine` vs
`MillingForceCalibrationEngine`). A positional/proximity check over tokenized names lets the guard
require the *phrase* to line up before declaring a duplicate — precision the bag-of-keywords scorer
can't supply — accepting the larger positional index as the price for not mis-flagging adjacent-but-
distinct assets.

---

## 5. Tune the near-duplicate filter as a STRATEGY (LSH band/row geometry)

### 5.1 Choose LSH bands and rows from the recall/precision direction you need
**Technique (strategy, not a constant).** Foundations already proves the LSH amplification result; the
*advanced strategy* is using it deliberately to place the candidate threshold. Stacking an
**AND-construction** of `k` MinHash rows drives collision probabilities to `p1^k, p2^k` — *"reducing
false positives while increasing false negatives"* — and an **OR-construction** across bands drives
them to `1-(1-p1)^k, 1-(1-p2)^k` — *"increasing true positives while also increasing false positives,
thereby reducing false negatives."* Composed as *rows-per-band* (AND) then *number-of-bands* (OR), this
is the banding geometry whose S-curve separates "candidate" from "ignore," and *"the parameter k
directly controls this trade-off intensity."*
(Source: Wikipedia, "Locality-sensitive hashing.")

**When an expert reaches for it.** Whenever you run MinHash+LSH at scale and the *default* band/row
split is just somebody's blog number — the geometry IS the precision/recall policy and should be set
from your tolerated error, not inherited.

**Trade-off DIRECTION.** More rows per band (stronger AND) sharpens precision and pushes the threshold
**up** (fewer false candidates, more missed near-duplicates); more bands (stronger OR) raises recall
and pushes the threshold **down** (catches more, at more false candidates). Pick the direction by which
error you can least afford and validate on a labeled set.

**Discovery galaxy use.** A *missed* duplicate (false negative) lets a redundant engine get created —
the exact failure the guard's THROW exists to prevent; a *false flag* (false positive) blocks a
genuinely new asset. So tango should bias the band/row geometry toward **recall** (don't miss a real
duplicate) and resolve the resulting false candidates with a cheap exact re-check — never leave the
banding at a library default.

---

## Owner-gate (NOT promoted)

The following are deliberately left for tango (galaxy owner) to verify against PRISM's own code and
live corpus before promotion — they are NOT asserted as PRISM facts here, and per R12-SAFETY no numeric
cutoff/weight/parameter is stated above:

- **The MMDS closed-form S-curve threshold `(1/b)^(1/r)` and the candidate-pair probability
  `1 - (1 - s^r)^b`.** These are the precise band/row tuning formulas, but the free *Mining of Massive
  Datasets* chapter-3 PDF was **NOT fetchable** from this environment on 2026-06-10 (ECONNREFUSED on
  infolab.stanford.edu mirror, TLS-altname error on mmds.org mirror) — the same un-fetchable source
  foundations already gated. The general AND/OR amplification direction IS confirmed above via the
  Wikipedia LSH article; the exact closed forms stay gated until fetched from a live free MMDS copy.
- **PRISM's chosen LTR formulation + features + label source.** Whether the duplication guard / master-
  index uses pointwise/pairwise/listwise LTR (if any), which features feed it, and whether labels come
  from operator triage or click-equivalents — must be read from the engine source + any training
  pipeline, not assumed.
- **PRISM's BM25F field weights** (name vs keywords vs description vs body) and per-field length-norm
  settings — every concrete weight is corpus-specific and owner-gated.
- **PRISM's RRF `k` (rank_constant)** and exactly which retrievers it fuses (lexical master-index +
  dense ONNX/HNSW is the natural pair, but the live wiring must be confirmed against the search code).
- **Champion-list `r` per term, tier thresholds, and positional-index decision** — whether the registry
  actually uses champion lists / tiered / positional indexing, and at what cutoffs, is owner-gated;
  this entry promotes only the strategy + trade-off direction.
- **Query-expansion thesaurus + relevance-feedback weights.** Whether PRISM builds a co-occurrence
  thesaurus over its own corpus, and the Rocchio alpha/beta/gamma balance / pseudo-relevance-feedback
  top-k and confidence floor — all corpus-tuned, owner-gated.
- **Safety thresholds:** N/A for this galaxy — discovery is an IR/dedup substrate with no physics or
  machine-safety constants. No cutting constant, SFM/RPM/IPR/feed/depth/coolant value, or any physics
  number appears here; none was inlined, none gated (none exists for this domain). The owner-gated items
  above are IR tuning parameters, not safety constants.

---

## Sources

All URLs below were fetched live and confirmed on 2026-06-10. The Stanford IR book
(nlp.stanford.edu/IR-book) is the free online edition of Manning/Raghavan/Schutze *Introduction to
Information Retrieval* (Cambridge University Press), the basis of Stanford CS276 — a free-textbook /
free-course source. Wikipedia is a reputable free reference; the Elasticsearch documentation is
official vendor documentation.

- Wikipedia — Learning to rank: https://en.wikipedia.org/wiki/Learning_to_rank  (reputable free reference)
- Stanford IR book — Query expansion: https://nlp.stanford.edu/IR-book/html/htmledition/query-expansion-1.html  (free textbook)
- Stanford IR book — The Rocchio algorithm for relevance feedback (+ The underlying theory): https://nlp.stanford.edu/IR-book/html/htmledition/the-underlying-theory-1.html  (free textbook)
- Stanford IR book — Pseudo-relevance feedback: https://nlp.stanford.edu/IR-book/html/htmledition/pseudo-relevance-feedback-1.html  (free textbook)
- Wikipedia — Okapi BM25 (BM25F field-weighting section): https://en.wikipedia.org/wiki/Okapi_BM25  (reputable free reference)
- Elasticsearch official docs — Reciprocal rank fusion: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion  (official documentation)
- Stanford IR book — Champion lists: https://nlp.stanford.edu/IR-book/html/htmledition/champion-lists-1.html  (free textbook)
- Stanford IR book — Tiered indexes: https://nlp.stanford.edu/IR-book/html/htmledition/tiered-indexes-1.html  (free textbook)
- Stanford IR book — Positional indexes: https://nlp.stanford.edu/IR-book/html/htmledition/positional-indexes-1.html  (free textbook)
- Wikipedia — Locality-sensitive hashing (AND/OR amplification for band/row tuning): https://en.wikipedia.org/wiki/Locality-sensitive_hashing  (reputable free reference)
