---
title: Discovery Galaxy Applied Practice — IR / Dedup Practitioner Gotchas and Tuning Traps
galaxy: discovery
owner_slot: tango
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Each gotcha below is grounded in a free-textbook / official-docs / reputable-reference source confirmed by live WebFetch on 2026-06-10. This entry is the PRACTITIONER layer (failure modes, tuning traps, technique decisions) and deliberately does NOT restate the theory in discovery-foundations.md. No claim appears here that was not returned by an actual WebFetch call; un-fetchable claims and all benchmark-specific numbers are left in the Owner-gate."
tags: [discovery, information-retrieval, deduplication, applied-practice, tribal-knowledge, gotchas, lsh-tuning, minhash, bm25-tuning, tokenization, stemming, stop-words, stale-index, failure-modes]
---

# Discovery Galaxy Applied Practice

This is the **practitioner-knowledge** ("tribal knowledge") layer for the **discovery** galaxy (owner:
tango) — the hard-won IR / near-duplicate-detection gotchas, failure modes, and technique decisions
that the theory does not teach. It is the companion to `discovery-foundations.md` (theory: inverted
index, tf-idf/BM25 definitions, BSBI, shingling/Jaccard, MinHash/LSH amplification, SimHash,
MAP/precision-recall). **Read foundations first** — this entry does not re-derive any of it; it is
"what goes wrong in practice and how an expert avoids it."

The discovery galaxy is PRISM's anti-duplication + search-first substrate: the
`DuplicationGuardEngine` (THROWS on duplicate asset creation), the master-index search surface, the
coverage/orphan audits, and the cross-session asset registry. Every gotcha below is a way one of those
mechanisms silently degrades — returning ghosts, missing a real duplicate, or flagging a false one.

Status is **VERIFIED-PARTIAL**: each gotcha is WebFetch-confirmed against a free legal source, but the
PRISM-specific mappings (which engine implements which technique, with what parameters) are owner-gated
to tango.

---

## 1. Text normalization gotchas (the matches you silently lose)

### 1.1 Dropping stop words breaks phrase and named-entity matches
**Gotcha + WHY:** Stop words are *"extremely common words which would appear to be of little value in
helping select documents matching a user need"* and the classic move is to exclude them *"from the
vocabulary entirely."* The trap: *"this is not true for phrase searches."* The Stanford IR book's own
examples — *"The phrase query 'flights to London' is likely to lose meaning if the word to is stopped
out,"* and *"Some song titles and well known pieces of verse consist entirely of words that are
commonly on stop lists"* — show that an over-eager stop list deletes exactly the connective tokens a
phrase depends on. (Source: Stanford IR book, "Dropping common terms: stop words.")

**Expert avoidance:** the field already converged here — *"The general trend in IR systems over time
has been from standard use of quite large stop lists (200-300 terms) to very small stop lists (7-12
terms) to no stop list whatsoever."* Modern systems keep common words and let *"term weighting"* (idf
crushes their ranking impact) plus *"good compression techniques"* absorb the cost, instead of
destroying recall up front. Default to **no / tiny stop list** and let weighting do the work.

**Discovery galaxy hit:** an asset named "EventBus" vs "Event Bus Engine" or a keyword set like
`["of","the","cutting","force"]` — if the guard strips connectives before shingling, two assets that
differ only by a stop word collapse together (false duplicate) or a phrase-y description loses its
distinctive run. Keep the tokens; rank by idf.

### 1.2 Stemming raises recall but quietly destroys precision on collocations
**Gotcha + WHY:** A stemmer conflates inflectional forms — the Porter stemmer reduces
*"operate operating operates operation operative operatives operational"* all to *"oper"*. That looks
helpful until a precise multi-word query: *"a sentence with the words operate and system is not a good
match for the query operating and system,"* yet after stemming they match. The blunt summary:
*"Stemming increases recall while harming precision,"* and *"either form of normalization tends not to
improve English information retrieval performance in aggregate - at least not by very much"* — it
*"equally hurts performance a lot for others."* (Source: Stanford IR book, "Stemming and
lemmatization.")

**Expert avoidance:** stemming is **language-dependent** — *"quite large gains"* for morphologically
rich languages (Spanish, German, Finnish), near-zero net gain for English. Do not stem reflexively;
for an English technical corpus, prefer no stemming (or lemmatization only) and accept that distinct
collocations stay distinct.

**Discovery galaxy hit:** PRISM identifiers are collocation-heavy (`MillingForceEngine` vs
`MillingForceCalibrationEngine`, `cam_strategy_recommend` vs `cam_strategy_select`). Aggressive
stemming would make these look like the same asset, so the guard mis-fires "duplicate" on a genuinely
new capability — exactly the precision loss the textbook warns about.

### 1.3 Index-time and query-time tokenization MUST be identical
**Gotcha + WHY:** *"you always want to do the exact same tokenization of document and query words,
generally by processing queries with the same tokenizer."* If the two paths diverge, terms that were
indexed one way are looked up another way and never intersect — a silent zero-recall failure with no
error. The hard cases are everywhere: *"splitting on white space can also split what should be regarded
as a single token. This occurs most commonly with names (San Francisco, Los Angeles)"*; *"programming
languages C++ and C#, aircraft names like B-52"*; and *"the various uses of the apostrophe for
possession and contractions."* And *"These issues of tokenization are language-specific."*
(Source: Stanford IR book, "Tokenization.")

**Expert avoidance:** share one tokenizer between indexing and querying — never hand-roll a second
split path for queries. Decide `C++`, `B-52`, hyphenation, and apostrophes once, in that shared code.

**Discovery galaxy hit:** if `DuplicationGuardEngine` shingles an asset description with one splitter
at registration and the search-first lookup splits the query differently (e.g. one keeps `prism_cam`
whole, the other splits on `_`), a real existing asset is never surfaced and a duplicate gets created.
The tokenizer is a single shared dependency, not two.

---

## 2. Near-duplicate parameter traps (MinHash + LSH dials)

### 2.1 MinHash accuracy costs hashes quadratically in the error you want
**Gotcha + WHY:** A MinHash sketch's Jaccard estimate has *"expected error is O(1/sqrt(k))"* in the
number of hash functions k. Inverting that: *"for any constant epsilon > 0 there is a constant
k = O(1/epsilon^2) such that the expected error of the estimate is at most epsilon."* Concretely,
*"400 hashes would be required to estimate J(A,B) with an expected error less than or equal to .05."*
Halving your target error roughly **quadruples** the sketch size. (Source: Wikipedia, "MinHash.")

**Expert avoidance:** pick k from the error you can tolerate, not by gut — too few permutations and the
similarity estimate is noisy enough to flip a near-duplicate decision; too many wastes memory/CPU per
asset. And *"it may be computationally expensive to compute multiple hash functions, but a related
version of MinHash scheme avoids this penalty by using only a single hash function"* (single-permutation
/ bottom-k variants) — reach for that before paying O(nk) per document.

**Discovery galaxy hit:** the foundations entry already cites the 200-permutation web-scale sketch.
For PRISM's far smaller asset corpus, sizing k to a *known* error budget (and reporting it) keeps the
"is this a duplicate?" estimate trustworthy instead of silently noisy.

### 2.2 LSH banding is a false-positive vs false-negative dial — you cannot win both
**Gotcha + WHY:** LSH amplification trades the two error types against each other and the trade is
sharp. An **AND-construction** of k functions takes collision probabilities to *"p1^k and p2^k"* —
both shrink, so it is *"reducing false positives while increasing false negatives."* An
**OR-construction** takes them to *"1-(1-p1)^k and 1-(1-p2)^k"* — both grow, *"increasing true
positives while also increasing false positives, thereby reducing false negatives."* The article's own
summary: *"AND-construction improves precision (fewer false positives) at the cost of recall (more
false negatives), while OR-construction improves recall at the cost of precision. The parameter k
directly controls this trade-off intensity."* (Source: Wikipedia, "Locality-sensitive hashing.")

**Expert avoidance:** choose bands/rows from your *required similarity threshold and acceptable
error direction*, not by default. A missed duplicate (false negative) and a false-flag (false positive)
have different costs — tune AND/OR (rows-per-band / number-of-bands) toward whichever you can least
afford, and validate on a labeled set rather than eyeballing the S-curve.

**Discovery galaxy hit:** the guard's whole job is the FP/FN balance — a false negative lets a
duplicate engine get created (the failure the THROW exists to prevent); a false positive blocks a
genuinely new asset. The banding parameters ARE that policy; they must be picked deliberately and
measured (precision/recall, per foundations §7), not left at a library default.

---

## 3. Ranking parameter sensitivity (BM25 dials)

### 3.1 BM25 k1 and b are not constants — they are collection-specific free parameters
**Gotcha + WHY:** BM25's headline numbers are *defaults, not laws*: *"k1 and b are free parameters,
usually chosen, in absence of an advanced optimization, as k1 in [1.2, 2.0] and b = 0.75."* The phrase
*"in absence of an advanced optimization"* is the tell — these are tuning candidates whenever you have
relevance data. `k1` governs term-frequency saturation (how fast repeated terms stop adding score) and
`b` governs length normalization: *"b = 1"* is BM11 (full length normalization), *"b = 0"* is BM15 (no
length normalization). (Source: Wikipedia, "Okapi BM25.")

**Expert avoidance:** start at k1≈1.2-2.0, b=0.75, but recognize they encode assumptions about *your*
documents. A corpus of wildly uneven document lengths may want different `b`; a corpus where repetition
is meaningful may want different `k1`. Treat them as tunables with a held-out relevance set, not
magic constants copied from a blog.

**Discovery galaxy hit:** PRISM "documents" (engine files, dispatcher specs, wiki pages, memories) vary
from a 16-line stub to a 2000-line engine. With **b** mis-set, raw length dominates and a long file
out-ranks a short precise match purely on size — the exact distortion the search-first guard must avoid
when deciding which existing asset a new one duplicates.

---

## 4. Stale-index / ghost-result failure modes (the index drifts from reality)

### 4.1 An inverted index over a live corpus is "two competing tasks" colliding
**Gotcha + WHY:** Maintaining an index over content that changes is structurally hard: *"A new document
is added to the corpus and the index must be updated, but the index simultaneously needs to continue
responding to search queries. This is a collision between two competing tasks."* The index is filled
*"via a merge or rebuild. A rebuild is similar to a merge but first deletes the contents of the
inverted index ... where a merge identifies the document or documents to be added or updated,"* and the
cost is explicit: *"the considerable increase in the time required for an update to take place"* is the
price of fast retrieval. (Source: Wikipedia, "Search engine indexing.")

**Expert avoidance:** decide your refresh policy on purpose. Full **rebuild** gives a clean, ghost-free
index but is expensive and blocks; incremental **merge** is cheap but accumulates drift. Know which one
runs, how often, and what a query sees in between.

**Discovery galaxy hit:** PRISM's master-index / asset-registry indexes the fleet's own assets while
26 slots are concurrently adding and renaming engines. If the index refresh lags the git reality, a
search-first lookup answers from a stale snapshot — the literal "collision between two competing tasks."

### 4.2 Buffered deletes mean a stale index returns GHOSTS until commit and merge
**Gotcha + WHY:** In a production inverted index (Lucene), a delete is *not* an immediate removal.
Changes are *"buffered in memory and periodically flushed"*; crucially *"flushing just moves the
internal buffered state in IndexWriter into the index, but these changes are not visible to IndexReader
until either commit() or close() is called."* An update is *"first deleting the document(s) ... and then
adding the new document"*; and deleted documents are only **physically removed during a merge**, not at
delete time. So between delete and (commit + merge) a reader can still match a document that is logically
gone — a ghost. (Source: Apache Lucene `IndexWriter` documentation, 9.x.)

**Expert avoidance:** never assume "I deleted/renamed it, so search won't find it." A result must be
re-validated against the source of truth before you act on it, because the index may be pre-commit or
pre-merge. Commit/refresh to make changes visible; force/await a merge if you need ghosts physically
gone.

**Discovery galaxy hit:** this is the named "stale index returning ghosts" failure for the guard. If an
engine was renamed/removed but the registry index hasn't committed+merged, search-first either surfaces
a node that no longer exists (false duplicate -> blocks a legitimate build) or, after a half-applied
update, misses the renamed asset (false negative -> lets a real duplicate through). Re-verify a hit
against the live file/graph before THROWing or clearing.

---

## 5. Postings-intersection performance trap (the search-first hot path)

### 5.1 Skip-pointer density is a real trade-off, and skips only help AND
**Gotcha + WHY:** Skip pointers are *"shortcuts that allow us to avoid processing parts of the postings
list that will not figure in the search results,"* but their density is a genuine trade-off:
*"More skips means shorter skip spans, and that we are more likely to skip. But it also means lots of
comparisons to skip pointers, and lots of space storing skip pointers. Fewer skips means few pointer
comparisons, but then long skip spans which means that there will be fewer opportunities to skip."* The
standard heuristic: *"for a postings list of length P, use sqrt(P) evenly-spaced skip pointers"* — and
the sharp limitation, *"the presence of skip pointers only helps for AND queries, not for OR queries."*
(Source: Stanford IR book, "Faster postings list intersection via skip pointers.")

**Expert avoidance:** use the √P density as the starting point, but know it *"ignores any details of
the distribution of query terms"* — and don't expect skip pointers to speed up disjunctive (OR)
lookups at all. For a search-first guard that is fundamentally a conjunctive "match ALL these
keywords" intersection, this is the right optimization; for "match ANY," it buys nothing.

**Discovery galaxy hit:** search-first before asset creation is a postings-list intersection (find
assets sharing this asset's distinctive terms) — exactly the AND-query case skip pointers accelerate.
As the corpus grows past 300K node cards, √P skip density on the registry's postings keeps the
pre-create check from going linear over the whole index.

---

## Owner-gate (NOT promoted)

The following are deliberately left for tango (galaxy owner) to verify against PRISM's own code and
live corpus before promotion — they are NOT asserted as PRISM facts here:

- **PRISM's actual chosen parameters.** The real `k` (MinHash permutations), the LSH bands/rows, and
  the BM25 `k1`/`b` used by `DuplicationGuardEngine` and the master-index search — if any — must be read
  from the engine source. This entry confirms only the *general* trade-offs from free sources; every
  concrete PRISM number is benchmark-specific and owner-gated.
- **Which technique PRISM actually runs.** Whether the guard uses exact-name match only, shingling +
  Jaccard, MinHash+LSH, SimHash, or embedding cosine today must be confirmed against
  `DuplicationGuardEngine.ts` + the asset-registry code, not inferred from these gotchas.
- **PRISM's index refresh / commit / merge policy.** Whether the master-index and asset registry
  rebuild or incrementally merge, how often, and what the ghost-window looks like in practice — must be
  measured against the live regen pipeline (the §4.2 ghost failure mode is generic; PRISM's actual
  window is owner-gated). Tie-in to the documented 2026-06-08 tribal-index clobber / stale-read
  incidents is a candidate cross-reference but must be re-validated, not assumed.
- **Exact-vs-fuzzy dedup threshold value.** The Jaccard / Hamming / score cutoff at which PRISM
  declares "same asset" is a tuned, corpus-specific number — owner-gated. Foundations cites the textbook
  example threshold (0.9 Jaccard) only as an illustration.
- **Empirical FP/FN rates of the guard.** Any precision/recall numbers for the live duplication guard
  are benchmark-specific and must be produced by tango against a labeled set (per foundations §7),
  not stated here.
- **Safety thresholds:** N/A for this galaxy — discovery is an IR/dedup substrate with no physics or
  machine-safety constants. None were inlined; none gated.

---

## Sources

All URLs below were fetched live and confirmed on 2026-06-10. The Stanford IR book
(nlp.stanford.edu/IR-book) is the free online edition of Manning/Raghavan/Schutze *Introduction to
Information Retrieval* (Cambridge University Press), the basis of Stanford CS276 — a free-textbook /
free-course source. Wikipedia and the Apache Lucene Javadoc are reputable free references / official
docs.

- Stanford IR book — Dropping common terms: stop words: https://nlp.stanford.edu/IR-book/html/htmledition/dropping-common-terms-stop-words-1.html  (free textbook)
- Stanford IR book — Stemming and lemmatization: https://nlp.stanford.edu/IR-book/html/htmledition/stemming-and-lemmatization-1.html  (free textbook)
- Stanford IR book — Tokenization: https://nlp.stanford.edu/IR-book/html/htmledition/tokenization-1.html  (free textbook)
- Stanford IR book — Faster postings list intersection via skip pointers: https://nlp.stanford.edu/IR-book/html/htmledition/faster-postings-list-intersection-via-skip-pointers-1.html  (free textbook)
- Wikipedia — MinHash: https://en.wikipedia.org/wiki/MinHash  (reputable free reference)
- Wikipedia — Locality-sensitive hashing: https://en.wikipedia.org/wiki/Locality-sensitive_hashing  (reputable free reference)
- Wikipedia — Okapi BM25: https://en.wikipedia.org/wiki/Okapi_BM25  (reputable free reference)
- Wikipedia — Search engine indexing: https://en.wikipedia.org/wiki/Search_engine_indexing  (reputable free reference)
- Apache Lucene — IndexWriter (9.x Javadoc): https://lucene.apache.org/core/9_10_0/core/org/apache/lucene/index/IndexWriter.html  (official documentation)
