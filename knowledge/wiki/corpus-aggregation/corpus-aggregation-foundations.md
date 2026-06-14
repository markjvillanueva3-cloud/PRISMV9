---
title: Corpus-Aggregation Galaxy Foundations — Document Processing, Corpus Construction, and ETL Pipelines
galaxy: corpus-aggregation
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: "Each '##' theme section is grounded in a free-textbook / free-course / reputable-reference source confirmed by live WebFetch on 2026-06-10. The shared IR / near-duplicate-detection theory (inverted index, tf-idf/BM25, MinHash, LSH, shingling, SimHash, evaluation) is NOT re-derived here — it is POINTED to knowledge/wiki/discovery/discovery-foundations.md, which was read and confirmed to exist this session. THIS entry stays on the corpus-construction / ETL pipeline dimension that is distinct to corpus-aggregation. Claims that could not be fetched from a free legal source are left out and noted in the Owner-gate. No claim appears here that was not returned by an actual WebFetch call."
tags: [corpus-aggregation, document-processing, etl, tokenization, normalization, unicode-normalization, stop-words, deduplication, record-linkage, sharding, partitioning, heaps-law, zipfs-law, corpus-statistics, foundations]
---

# Corpus-Aggregation Galaxy Foundations

The **corpus-aggregation** galaxy (owner: golf) is PRISM's document-ingestion + corpus-construction
substrate: it pulls raw material (pypdf page-by-page PDF corpus, MIT-OCW courseware, tribal tips,
galaxy MEMORY files, transcript mines) and turns it into clean, deduplicated, shard-able corpora that
feed the academy galaxy and the NN/GNN training pipeline. Every one of those steps is an applied
instance of a classical **document-processing**, **ETL**, or **corpus-statistics** result.

> **Overlap note — read this first.** corpus-aggregation overlaps the **discovery** galaxy. The shared
> information-retrieval and near-duplicate-detection theory — the inverted index, tf-idf / BM25
> ranking, k-shingles + Jaccard, MinHash, Locality-Sensitive Hashing (LSH) banding, SimHash, and
> retrieval evaluation (MAP / precision-recall) — is grounded once, in
> [`knowledge/wiki/discovery/discovery-foundations.md`](../discovery/discovery-foundations.md)
> (confirmed to exist 2026-06-10). **This entry does NOT re-derive it.** When a corpus-construction
> step needs "are these two documents the same?" or "rank candidate matches," it inherits the theory
> from the discovery entry. THIS entry covers what is *distinct to building the corpus itself*: the
> ingestion / normalization / dedup-at-corpus-scale / sharding / corpus-statistics ETL pipeline.

Status is **VERIFIED-PARTIAL**: the claims below are WebFetch-confirmed, but the entry is a
foundations seed, not the galaxy's complete encyclopedia. See the Owner-gate for what is deliberately
NOT promoted yet.

---

## 1. The document-processing pipeline — raw documents to index terms

Before any corpus can be deduplicated, sharded, or searched, raw documents must be turned into a
normalized stream of terms. The Stanford IR textbook (free online edition of Manning/Raghavan/Schutze
*Introduction to Information Retrieval*, the basis of Stanford CS276) gives the canonical four-stage
pipeline: *"Collect the documents to be indexed."* -> *"Tokenize the text."* -> *"Do linguistic
preprocessing of tokens."* -> *"Index the documents that each term occurs in."* The crucial vocabulary
distinction: **a token** is *"an instance of a sequence of characters in some particular document that
are grouped together as a useful semantic unit for processing"*; **a type** is *"the class of all
tokens containing the same character sequence"*; and **a term** is *"a (perhaps normalized) type that
is included in the IR system's dictionary."* For "to sleep perchance to dream" there are
*"5 tokens, but only 4 types (since there are 2 instances of to),"* dropping to *"3 terms"* if "to" is
a stop word. Tokenization itself is *"the task of chopping it up into pieces, called tokens, perhaps
at the same time throwing away certain characters, such as punctuation."*
(Sources: Stanford IR book, "The term vocabulary and postings lists"; "Tokenization.")

**Corpus-aggregation use:** the pypdf page-by-page extractor and the transcript miners produce raw
character streams; this pipeline is the contract for converting those streams into the
token/type/term representation that the academy + NN corpora consume. Counting *tokens* vs *types* is
also how the galaxy reports honest corpus size (raw volume vs distinct vocabulary).

## 2. Text normalization — equivalence classing, case-folding, and Unicode

Two documents that "mean the same" can differ byte-for-byte; **token normalization** is *"the process
of canonicalizing tokens so that matches occur despite superficial differences in the character
sequences of the tokens,"* producing **equivalence classes** — e.g. mapping both `anti-discriminatory`
and `antidiscriminatory` onto a single term `antidiscriminatory` so a search for one retrieves either,
and collapsing `U.S.A.` / `USA`.
(Source: Stanford IR book, "Normalization (equivalence classing of terms).")

Below the token level lives a correctness trap that bites every multilingual corpus: **Unicode
equivalence**. *"Code point sequences that are defined as canonically equivalent are assumed to have
the same appearance and meaning,"* whereas *"sequences that are defined as compatible are assumed to
have possibly distinct appearances but the same meaning in some contexts."* Unicode defines four
normalization forms — **NFD** (*"Characters are decomposed by canonical equivalence"*), **NFC**
(*"decomposed and then recomposed by canonical equivalence"*), **NFKD** (*"decomposed by
compatibility"*), and **NFKC** (*"decomposed by compatibility, then recomposed by canonical
equivalence"*). Without it, *"users searching for a particular code point sequence would be unable to
find other visually indistinguishable glyphs that have a different but canonically equivalent code
point representation."*
(Source: Wikipedia, "Unicode equivalence.")

**Corpus-aggregation use:** PRISM's source corpus is genuinely multilingual — JM Die shop-floor docs
are Polish/Spanish-primary, not English — so accented terms arrive in mixed pre-composed/decomposed
forms. Normalizing the corpus to a single Unicode form (NFC is the usual storage choice) at ingest is
what prevents the same word indexing as two different terms and silently splitting the dedup buckets.

## 3. Vocabulary pruning — stop words and the no-stop-list trend

Not every term carries discriminating value. **Stop words** are *"extremely common words which would
appear to be of little value in helping select documents matching a user need"* and are *"excluded
from the vocabulary entirely."* A stop list is built by sorting *"terms by collection frequency (the
total number of times each term appears in the document collection), and then to take the most
frequent terms,"* hand-filtered for domain semantics. Crucially, the field has moved away from this:
*"The general trend in IR systems over time has been from standard use of quite large stop lists
(200-300 terms) to very small stop lists (7-12 terms) to no stop list whatsoever,"* because
compression *"greatly reduce[s] the cost of storing the postings for common words"* and good weighting
schemes already give common words *"little impact on document rankings."*
(Source: Stanford IR book, "Dropping common terms: stop words.")

**Corpus-aggregation use:** a training corpus that strips stop words too aggressively destroys signal
the downstream LoRA/GNN models may need (negation, function words that change meaning). The galaxy
should follow the no-/tiny-stop-list trend — keep the corpus complete, let weighting and compression
handle frequency — rather than baking a 200-term stop list into ingest where it cannot be undone.

## 4. ETL — the extract / transform / load contract for corpus assembly

Pulling many heterogeneous sources into one corpus is an **ETL** problem: *"Extract, transform, load
(ETL) is a three-phase computing process where data is extracted from an input source, transformed
(including cleaning), and loaded into an output data container."* **Extract** *"represents the most
important aspect of ETL, since extracting data correctly sets the stage for the success of subsequent
processes."* In **transform**, *"a series of rules or functions are applied to the extracted data in
order to prepare it for loading"* — and *"an important function of transformation is data cleansing,
which aims to pass only 'proper' data to the target,"* which also covers joining multiple sources,
**deduplicating**, validation, and aggregation. **Load** writes *"into the end target, which can be
any data store including a simple delimited flat file or a data warehouse."* The **ELT** variant loads
first then transforms, with *"the ability to more easily handle both unstructured and structured
data."*
(Source: Wikipedia, "Extract, transform, load.")

**Corpus-aggregation use:** this is the galaxy's literal job description. Extract = pypdf / miners /
MEMORY readers; Transform = the §2 normalization + §3 pruning + §5 dedup + corpus statistics;
Load = the gitignored JSONL / sidecar corpora the academy + NN pipelines read. The ETL doctrine of
"extract correctly first, transform = cleansing, load is the cheap part" maps onto why the galaxy's
known failure modes (e.g. page-0-only OCR, non-resumable corpus burn) are *extract*-stage defects —
the most important and most error-prone stage, exactly as ETL theory predicts.

## 5. Corpus-scale deduplication — record linkage and the Fellegi-Sunter model

Within-corpus dedup is **record linkage** turned on a single dataset: record linkage is *"the task of
finding records in a data set that refer to the same entity across different data sources,"* and
**deduplication** is named as the within-one-dataset case. The two regimes: **deterministic /
rules-based** linkage *"generates links based on the number of individual identifiers that match,"*
while **probabilistic** linkage *"takes into account a wider range of potential identifiers, computing
weights for each identifier based on its estimated ability to correctly identify a match or a
non-match."* The theoretical anchor is the **Fellegi-Sunter** model — Ivan Fellegi and Alan Sunter
*"proved that the probabilistic decision rule they described was optimal when the comparison
attributes were conditionally independent."*
(Source: Wikipedia, "Record linkage.")

**Corpus-aggregation use:** the same transcript or tribal tip can arrive through several feeders;
exact-hash dedup (deterministic) catches byte-identical copies, but near-duplicates (re-OCR'd page,
slightly edited memory) need the probabilistic / similarity regime. For the *similarity* machinery
itself — shingling, Jaccard, MinHash, LSH banding — the galaxy reuses
[discovery-foundations §4-6](../discovery/discovery-foundations.md); record linkage is the *decision
framework* (deterministic vs probabilistic, conditional-independence assumption) that sits on top of
those similarity scores to decide "merge or keep both."

## 6. Sharding and corpus statistics — sizing and partitioning the result

A corpus large enough to matter must be **partitioned**. A **shard** is *"a horizontal partition of
data within a database"*; **horizontal partitioning** holds *"rows of a database table ... separately,
rather than being split into columns"* (vertical partitioning splits columns). Sharding *"enables the
distribution of a database across a large number of machines,"* and because each shard's row count
falls it *"reduces index size, which generally improves search performance."* Distribution across
shards uses a shard key — *"consistent hashing is a technique used in sharding to distribute large
loads."*
(Source: Wikipedia, "Shard (database architecture).")

How large will the corpus get, and how fast does its vocabulary grow? Two empirical laws answer this.
**Heaps' law** — *"M = k T^b"* — relates distinct-term count M to token count T, with typical
*"30 <= k <= 100"* and *"b ~ 0.5"*, implying *"the dictionary size continues to increase with more
documents in the collection, rather than a maximum vocabulary size being reached."* **Zipf's law**
governs the *shape* of term frequencies: *"the collection frequency cf_i of the i-th most common term
is proportional to 1/i"* (i.e. `cf_i = c * i^k` with `k = -1`), so *"frequency decreases very rapidly
with rank"* — a handful of dominating terms over a long tail of rare ones.
(Sources: Stanford IR book, "Heaps' law"; "Zipf's law.")

**Corpus-aggregation use:** Heaps' law is the honest answer to "the vocabulary keeps growing" — never
assume a fixed dictionary, plan storage that grows sub-linearly (`T^0.5`) with corpus size. Zipf's law
justifies why §3's stop-word / compression choices matter (a few terms dominate the postings) and why
dedup buckets are skewed. Sharding (horizontal, by a hashed key) is how the galaxy keeps the resulting
corpus — already past V8's 512MiB single-string cap on the tribal index — read-able without loading it
whole, mirroring the seek-by-offset / streaming readers the fleet already uses.

---

## Owner-gate (NOT promoted)

The following are deliberately left for golf (galaxy owner) to verify against PRISM's own code and
live corpus before promotion — they are NOT asserted as PRISM facts here:

- **MMDS shingling rule-of-thumb (k choice, shingle hashing).** The *Mining of Massive Datasets* free
  book (mmds.org / infolab.stanford.edu/~ullman/mmds) gives the practical corpus-construction guidance
  for near-duplicate detection — the rule of thumb for choosing the shingle size k (small k for short
  documents like emails, larger k ~9 for large documents) and hashing shingles into shorter bucket
  values. The MMDS PDF was **NOT fetchable** from this environment on 2026-06-10 (HTTP auto-upgraded to
  HTTPS -> `ERR_TLS_CERT_ALTNAME_INVALID`; the infolab HTTP mirror -> `ECONNREFUSED`) — the same
  limitation already recorded in discovery-foundations. The general shingling + Jaccard + LSH theory IS
  grounded (in discovery-foundations via the Stanford IR book + Wikipedia); only the MMDS-specific
  k-selection heuristics are left ungated until fetched from a live free MMDS copy.
- **Stanford CS276 / MMDS (CS246) lecture-slide specifics** (the slide decks, not the textbook
  chapters) — promote from the free textbook HTML pages, which were reachable, not from slide URLs
  (the analogous CS276 handout URLs 404'd in the discovery pass).
- **Which exact PRISM engines/scripts implement which stage** (the pypdf extractor, the registry-driven
  galaxy transcript miner, the tribal-index sharder, the corpus-statistics reporter) — must be read
  from the corpus-aggregation engine code, not assumed from this theory entry.
- **The actual normalization form PRISM stores corpora in** (NFC vs NFD vs none) and **the actual dedup
  regime in production** (exact-hash only? MinHash+LSH? record-linkage weights?) — must be confirmed
  against the ingest code before claiming it here.
- **Safety thresholds:** N/A for this galaxy — corpus-aggregation is a document-processing / ETL
  substrate with no physics or machine-safety constants. No safety thresholds were inlined; none were
  gated.

---

## Sources

All URLs below were fetched live and confirmed on 2026-06-10. The Stanford IR book
(nlp.stanford.edu/IR-book) is the free online edition of Manning/Raghavan/Schutze *Introduction to
Information Retrieval* (Cambridge University Press), the basis of Stanford CS276 — a free-textbook /
free-course source. The shared IR / near-duplicate theory is grounded in the sibling entry
[`knowledge/wiki/discovery/discovery-foundations.md`](../discovery/discovery-foundations.md) and is not
re-listed here.

- Stanford IR book — The term vocabulary and postings lists (document-processing pipeline): https://nlp.stanford.edu/IR-book/html/htmledition/the-term-vocabulary-and-postings-lists-1.html  (free textbook)
- Stanford IR book — Tokenization (token / type / term): https://nlp.stanford.edu/IR-book/html/htmledition/tokenization-1.html  (free textbook)
- Stanford IR book — Normalization (equivalence classing of terms): https://nlp.stanford.edu/IR-book/html/htmledition/normalization-equivalence-classing-of-terms-1.html  (free textbook)
- Stanford IR book — Dropping common terms: stop words: https://nlp.stanford.edu/IR-book/html/htmledition/dropping-common-terms-stop-words-1.html  (free textbook)
- Stanford IR book — Heaps' law (estimating the number of terms): https://nlp.stanford.edu/IR-book/html/htmledition/heaps-law-estimating-the-number-of-terms-1.html  (free textbook)
- Stanford IR book — Zipf's law (modeling the distribution of terms): https://nlp.stanford.edu/IR-book/html/htmledition/zipfs-law-modeling-the-distribution-of-terms-1.html  (free textbook)
- Wikipedia — Extract, transform, load: https://en.wikipedia.org/wiki/Extract,_transform,_load  (reputable free reference)
- Wikipedia — Record linkage: https://en.wikipedia.org/wiki/Record_linkage  (reputable free reference)
- Wikipedia — Shard (database architecture): https://en.wikipedia.org/wiki/Shard_(database_architecture)  (reputable free reference)
- Wikipedia — Unicode equivalence: https://en.wikipedia.org/wiki/Unicode_equivalence  (reputable free reference)
