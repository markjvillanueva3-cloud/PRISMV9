---
title: Discovery Galaxy Open Source Atlas — Where to Keep Learning IR + Near-Dedup
galaxy: discovery
owner_slot: tango
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every source listed below was opened by a live WebFetch on 2026-06-10 and confirmed to be (a) real, (b) free/legal, and (c) reachable. Candidate links that failed to fetch (TLS-altname errors on mmds.org, ECONNREFUSED on the infolab MMDS PDF, a 404 on a guessed YouTube channel and a Coursera deep-link) were retried once then DROPPED rather than guessed -- per R12, a short verified list beats a long fabricated one. This is the LIVING-SOURCE directory: it deliberately does NOT restate the theory (see discovery-foundations.md) or the practitioner gotchas (see discovery-applied-practice.md)."
tags: [discovery, information-retrieval, near-duplicate-detection, source-atlas, keep-learning, free-courses, free-textbooks, lecture-videos, official-docs, standards, lucene, bm25, minhash, lsh, trec, cs276, cs246, mmds]
---

# Discovery Galaxy Open Source Atlas

This is the **keep-learning directory** for the **discovery** galaxy (owner: tango) -- a curated,
kept-fresh list of WHERE to keep learning the galaxy's domain (Information Retrieval + near-duplicate
detection) from reputable FREE/LEGAL sources, so the knowledge never goes stagnant.

It is distinct from its two sibling entries and does not repeat them:
- `discovery-foundations.md` -- the synthesized THEORY (inverted index, tf-idf/BM25, BSBI, shingling/
  Jaccard, MinHash/LSH amplification, SimHash, MAP/precision-recall).
- `discovery-applied-practice.md` -- the practitioner GOTCHAS (tokenization/stemming/stop-word traps,
  MinHash/LSH dial traps, BM25 tuning, stale-index ghosts, skip-pointer density).

This atlas is the third layer: the directory of living sources to return to when you need to go deeper
than the seeds, or when the field moves and the seeds need refreshing. Each entry is name + verified
URL + one line on what it teaches + which part of THIS galaxy it feeds.

The discovery galaxy is PRISM's anti-duplication + search-first substrate: `DuplicationGuardEngine`
(THROWS on duplicate asset creation), the master-index search surface, the coverage/orphan audits, and
the cross-session asset registry. Every source below feeds one of those mechanisms.

Status is **VERIFIED-PARTIAL**: every URL is WebFetch-confirmed live on 2026-06-10, but this is a
curated directory, not an exhaustive bibliography of the field.

---

## 1. Free college courses (full curricula, slides, assignments)

- **Stanford CS276 / LING286 -- Information Retrieval and Web Search**
  https://web.stanford.edu/class/cs276/
  The canonical IR course: efficient text indexing, Boolean + vector-space retrieval, evaluation, web
  IR (crawling, link analysis), clustering/classification, and ML-based ranking. The page hosts free
  lecture slides (PPT/PDF), video lectures, and problem sets, and uses the free Manning IR textbook.
  *Feeds:* the master-index search surface end-to-end -- the indexing, ranking, and evaluation theory
  the guard's search-first lookup is built on.

- **Stanford CS246 -- Mining Massive Data Sets**
  https://web.stanford.edu/class/cs246/
  The large-scale data-mining course; its syllabus explicitly covers Locality-Sensitive Hashing (LSH)
  and Near-Neighbor Search in high dimensions (the MinHash / finding-similar-items lineage). Lecture
  slides, assignments, and Colab notebooks are posted free ("we are happy for anyone to use these
  resources"); it links the free MMDS book download and a past Coursera MOOC on YouTube.
  *Feeds:* the near-duplicate-detection core of `DuplicationGuardEngine` -- MinHash signatures + LSH
  banding for sub-linear "find assets near this one" at fleet scale.

## 2. Free textbooks

- **Introduction to Information Retrieval (Manning, Raghavan, Schutze) -- free online edition**
  https://nlp.stanford.edu/IR-book/information-retrieval-book.html
  The full Cambridge University Press textbook, free as HTML and as a PDF (online-viewing + printing).
  21 chapters: Boolean retrieval, dictionaries + index construction/compression, vector-space scoring,
  probabilistic + language models, evaluation, text classification/clustering, web search + link
  analysis. This is the basis of CS276 and the source the two sibling seeds quote.
  *Feeds:* the entire foundations layer -- the authoritative definitions of inverted index, idf,
  tf-idf, BM25, BSBI, shingling, MinHash sketches, and MAP that ground the search/dedup substrate.

> Note on Mining of Massive Datasets (the canonical free book for MinHash/LSH): its mmds.org home and
> the infolab.stanford.edu MMDS PDF were NOT reachable from this environment on 2026-06-10 (TLS cert
> altname error / connection refused), so no direct book URL is asserted here. Reach the same material
> through the CS246 course page above (Section 1), which links the free download from a live page.

## 3. Lecture-video sources

- **Stanford CS246 lecture videos (2019)**
  https://snap.stanford.edu/class/cs246-videos-2019/
  Full video set for Mining Massive Data Sets, including two dedicated lectures -- "Locality-Sensitive
  Hashing" and "Theory of Locality-Sensitive Hashing" -- plus MapReduce/Spark, frequent itemsets,
  clustering, PageRank, and mining data streams.
  *Feeds:* a watch-don't-just-read path into the LSH/MinHash machinery behind the anti-duplication
  guard; the LSH-theory lecture is the video companion to foundations section 5.

## 4. Official docs & standards (the production-grade reference)

- **Apache Lucene -- Core documentation**
  https://lucene.apache.org/core/
  The reference implementation of a production inverted-index search library: scalable incremental
  indexing, ranked/phrase/wildcard search, faceting. Links current-version Javadocs (10.4.0 at time of
  verification).
  *Feeds:* the master-index / asset-registry implementation reality -- how a real inverted index buffers
  writes, commits, and merges (the source of the "stale index returns ghosts" failure mode the guard
  must guard against).

- **Apache Lucene -- BM25Similarity Javadoc (10.4.0)**
  https://lucene.apache.org/core/10_4_0/core/org/apache/lucene/search/similarities/BM25Similarity.html
  The exact production BM25 contract: default k1 = 1.2 and b = 0.75, the saturation/length-normalization
  parameters, and Lucene's idf variant log(1 + (docCount - docFreq + 0.5)/(docFreq + 0.5)).
  *Feeds:* candidate-ranking inside search-first -- the concrete defaults to start from when scoring
  "is THIS the existing asset?" before tuning on a labeled set.

- **Elasticsearch -- Similarity module (official reference)**
  https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-similarity.html
  Confirms BM25 as the default scoring with the same k1 = 1.2 / b = 0.75 defaults, documented as
  user-tunable per field -- a second independent official statement of the production defaults.
  *Feeds:* the same ranking dials, with the framing that k1/b are configurable knobs, not constants
  (the BM25 tuning trap in applied-practice section 3).

- **NIST TREC -- Text REtrieval Conference**
  https://trec.nist.gov/
  The 30+ year standards body for measuring search effectiveness: free, open test collections,
  evaluation measures, and proceedings (data is free, participation is open; TREC Data Browser linked).
  *Feeds:* the measurement discipline for the coverage/orphan audits -- how to honestly evaluate whether
  the master-index search is improving (precision/recall/MAP) instead of asserting it, using a
  community-standard methodology rather than ad-hoc numbers.

## 5. Keep-fresh cadence

This atlas is a living directory; it rots if left alone. Suggested refresh discipline for tango:

- **Per quarter (or when a seed is edited):** re-WebFetch every URL in `## Sources`. Any that 404 or
  change host gets retried once, then fixed or dropped -- never left as a dead link, never guessed.
- **Watch the version-pinned links:** the Lucene BM25Similarity Javadoc is pinned to 10.4.0. When
  Lucene ships a new major, re-verify the path and bump the version (the core landing page at
  lucene.apache.org/core/ always points at the current release docs -- use it to find the new number).
- **MMDS book recovery:** mmds.org / infolab were down on 2026-06-10. Re-attempt the direct book PDF
  periodically; if it comes back live, add it under Section 2 as a first-class free-textbook source.
  Until then the CS246 course page is the reachable path to the same material.
- **New living sources are welcome, but only WebFetch-confirmed, free, and legal** (no paywalled, no
  LibGen/SciHub). A new entry must carry its verified URL + one-line teach + which galaxy mechanism it
  feeds, exactly like the rows above.
- **Promotion direction:** material learned from these sources flows the other way too -- new theory
  -> `discovery-foundations.md`, new gotchas -> `discovery-applied-practice.md`. This file stays the
  pointer to WHERE, not WHAT.

---

## Sources

All URLs below were fetched live and confirmed reachable, free, and legal on 2026-06-10. The Stanford
courses (CS276, CS246) host free slides/videos/assignments; the Introduction to IR book is the free
online Cambridge edition; the Apache Lucene and Elasticsearch pages are official free documentation;
NIST TREC is a public standards body with free data.

- Stanford CS276 -- Information Retrieval and Web Search: https://web.stanford.edu/class/cs276/  (free college course)
- Stanford CS246 -- Mining Massive Data Sets: https://web.stanford.edu/class/cs246/  (free college course)
- Introduction to Information Retrieval -- free online edition: https://nlp.stanford.edu/IR-book/information-retrieval-book.html  (free textbook)
- Stanford CS246 lecture videos (2019): https://snap.stanford.edu/class/cs246-videos-2019/  (free lecture videos)
- Apache Lucene -- Core documentation: https://lucene.apache.org/core/  (official documentation)
- Apache Lucene -- BM25Similarity Javadoc (10.4.0): https://lucene.apache.org/core/10_4_0/core/org/apache/lucene/search/similarities/BM25Similarity.html  (official documentation)
- Elasticsearch -- Similarity module reference: https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-similarity.html  (official documentation)
- NIST TREC -- Text REtrieval Conference: https://trec.nist.gov/  (standards body / free evaluation data)
