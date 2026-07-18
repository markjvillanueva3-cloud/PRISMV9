---
title: Discovery Galaxy Resource Atlas — Where to REACH (canonical repos, papers, standards + local trove)
galaxy: discovery
owner_slot: tango
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "LOCAL pointers are verified PRISM filesystem paths (engine dir + DuplicationGuardEngine.ts + find-cache.json confirmed present on disk 2026-06-10). ONLINE entries were each opened by a live WebFetch on 2026-06-10 and listed ONLY when the fetch confirmed the page (a) loads (not 404/403), (b) matches the described resource, and (c) is free + legal. Candidates that failed were DROPPED, not guessed: the ACM DOI landing page (403 Forbidden) and the ACM open-access PDF (403) were unreachable from this environment; the seeded `plg.uwaterloo.ca/~gvcormack/...` path 404'd (typo of the author handle); apache/datasketches-java loaded but its MinHash/Jaccard capability was NOT confirmed in the fetched excerpt so it is not asserted. The RRF seminal paper was reached at the author's current Waterloo host after following two redirects (verified live PDF, 64.6KB). Per R12 a short verified list beats a long fabricated one."
tags: [discovery, information-retrieval, search, rrf, reciprocal-rank-fusion, rank-fusion, anti-duplication, deduplication, lucene, bm25, trec, cs276, resource-atlas, where-to-reach, canonical-repos, canonical-papers, standards]
---

# Discovery Galaxy Resource Atlas

This is the **where-to-REACH index** for the **discovery** galaxy (owner: tango) — PRISM's information-
retrieval / search / **RRF rank-fusion** + anti-duplication substrate. It is a single hub that puts the
galaxy's OWN local code/stores next to the canonical FREE/LEGAL upstream sources (the official tool repo,
the seminal paper, the production reference, the standards body), so a chat working in this galaxy jumps
STRAIGHT to the authoritative source instead of re-deriving or re-searching.

It is **distinct from `discovery-source-atlas.md`**: the source-atlas is the *where-to-LEARN* curriculum
(courses + textbooks + lecture videos — the reading list). This resource-atlas is the *where-to-REACH*
index — the canonical repo/paper/standard you cite or clone, paired with the local code you edit. Some
high-value anchors (CS276, the Manning IR book, TREC) legitimately appear in both, because for those the
"course" and the "canonical reference you reach for" are the same artifact; the framing differs (learn vs.
reach) and this file carries the one-line *reach* purpose, not a syllabus.

Status is **VERIFIED-PARTIAL**: every URL below was WebFetch-confirmed live on 2026-06-10, and every local
path was confirmed present on disk — but this is a curated hub, not an exhaustive catalogue.

---

## 1. Local code + stores (the galaxy's own trove — verified PRISM paths)

These are the discovery galaxy's own engine home and the real on-disk stores its search/dedup mechanisms
read and write. Reach these FIRST — the upstream sources below explain the *theory*, but the running
substrate lives here.

- **`mcp-server/src/engines/discovery/`** — the discovery galaxy's engine directory (galaxy home).
  Carries the galaxy's `CLAUDE.md` (galactic-center sentinel), `MEMORY.md`, `PATHS.md`, and `TOOLBELT.md`.
  This is the per-domain brain + path index for everything in this galaxy.
- **master-index + `DuplicationGuardEngine`** — the search-first + anti-duplication core. The engine is at
  `mcp-server/src/engines/DuplicationGuardEngine.ts` (`checkBeforeCreating` / `mustCheckBeforeCreating`
  / `mustNotReExtract` — the last two THROW on a duplicate, so creation can't bypass the guard). The
  master-index is the unified search surface queried before any Grep/Glob/Agent
  (`prism_session:master_index_query` and the search-first injectors).
- **`find-cache.json`** — `state/shared/system-viz/find-cache.json` — the compact node-search sidecar
  (~55 MB) that backs the cheap `find <query>` lookup over the system graph WITHOUT loading the 644 MB
  `system-graph.json`. The pair-with-`node-card` retrieval path (`find <query>` → ids → `node-card <id>`)
  reads from here. This is the galaxy's IR substrate made concrete: an index you query instead of a
  corpus you re-scan.

> See the galaxy's own `PATHS.md` / `TOOLBELT.md` (in the engine dir above) for the exhaustive path list;
> this atlas names only the three anchors the operator directive pinned.

## 2. Canonical repos + papers + standards (verified free + legal)

Each entry is the authoritative upstream you REACH for — the source to clone, cite, or read the contract
from. All confirmed live on 2026-06-10.

- **Reciprocal Rank Fusion — the seminal paper (author-hosted, free)**
  https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf
  Cormack, Clarke & Buettcher, *"Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning
  Methods"* (SIGIR 2009). The origin of RRF: combine the rankings of multiple independent retrievers by
  summing reciprocal ranks — needs no per-system tuning and the signals don't have to be related. This is
  THE canonical source for the galaxy's named focus (rank fusion). Hosted on the first author's own
  University of Waterloo page (the official Elasticsearch RRF docs cite this exact path); the ACM
  Digital-Library copy is paywalled/403 from here, so this author-hosted PDF is the free legal reach.
  *Feeds:* the rank-fusion method itself — how to merge heterogeneous retrieval signals (e.g. BM25-style
  lexical + embedding/semantic) into one ranked discovery result.

- **Reciprocal Rank Fusion — IR Anthology citation anchor (Webis)**
  https://ir.webis.de/anthology/2009.sigirconf_conference-2009.146/
  The IR Anthology bibliographic record for the same RRF paper — confirmed title, authors, and SIGIR 2009
  venue, with links out to scholarly databases. It does NOT itself host a free PDF (it's a citation page,
  not a download), so use it as the stable *citation anchor* and reach the free full text via the
  author-hosted PDF above.
  *Feeds:* a durable, reputable handle for citing RRF in commits/wiki without depending on a paywalled DOI.

- **Apache Lucene — official source repository (GitHub)**
  https://github.com/apache/lucene
  The reference implementation of a production inverted-index full-text search library (Java; latest
  release 10.4.0, Feb 2026). The ground truth for how a real search index buffers writes, commits, and
  merges segments — i.e. how the master-index *would* be built at scale, and the source of the
  "stale index returns ghosts" failure mode the guard must defend against.
  *Feeds:* the master-index / asset-registry implementation reality; clone/read here when the question is
  "how does a production inverted index actually do this?"

- **Elasticsearch — Reciprocal Rank Fusion reference (official docs)**
  https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion
  The production-grade RRF contract: how to merge multiple retriever result sets into one ranked output,
  the `rank_constant` / `rank_window_size` knobs, supported/unsupported features, and a worked
  BM25-plus-kNN fusion example. Explicitly credits the Cormack et al. paper. The "here's how a shipping
  search engine exposes RRF" reference next to the seminal "why it works" paper.
  *Feeds:* the applied shape of rank fusion in discovery — the dials and the BM25-plus-semantic hybrid
  pattern, framed as configurable knobs (not constants — numbers stay owner-gated, see Owner-gate).

- **Stanford CS276 — Information Retrieval and Web Search (course page)**
  https://web.stanford.edu/class/cs276/
  The canonical free IR course page: efficient text indexing, Boolean + vector-space retrieval, evaluation,
  web IR, clustering/classification, learning-to-rank. Hosts free slides (PPT/PDF) and uses the free
  Manning IR book. Reach here for the authoritative framing of any IR primitive the galaxy implements.
  *Feeds:* the indexing + ranking + evaluation theory the search-first lookup is built on.

- **Introduction to Information Retrieval — free online edition (Manning, Raghavan, Schütze)**
  https://nlp.stanford.edu/IR-book/information-retrieval-book.html
  The full Cambridge University Press textbook, free as HTML and per-chapter PDF. The authoritative
  definitions for inverted index, idf/tf-idf, BM25, index construction/compression, evaluation (MAP /
  precision-recall), and the shingling/near-duplicate lineage.
  *Feeds:* the foundations layer — the definitive reference behind every IR + dedup mechanism in the galaxy.

- **NIST TREC — Text REtrieval Conference (standards body)**
  https://trec.nist.gov/
  The 30+ year IR-evaluation standards body: free open test collections + community-standard effectiveness
  measures (data is free, participation open). The discipline to reach for when proving the master-index
  search or the coverage/orphan audits actually improved, rather than asserting it.
  *Feeds:* the measurement methodology for the coverage/orphan audits — honest precision/recall/MAP
  evaluation against a community standard instead of ad-hoc numbers.

## 3. Curated video

No video source met the bar for this resource-atlas: the directive scopes this file to canonical
repos/papers/standards, and the one verified IR lecture-video set (Stanford CS246 LSH lectures) already
lives in `discovery-source-atlas.md` §3 as part of the *learning* curriculum — it is not duplicated here.
Add a video entry only if a future WebFetch confirms a free, on-topic lecture not already in the
source-atlas.

## 4. Cross-links (sibling wiki layers)

- [[discovery-foundations]] — the synthesized THEORY (inverted index, tf-idf/BM25, shingling/Jaccard,
  MinHash/LSH, SimHash, MAP). Read this for WHAT the sources above teach.
- [[discovery-source-atlas]] — the where-to-LEARN directory (free courses + textbooks + lecture videos).
  Read that for the curriculum; read THIS file for the canonical reach + the local code.
- [[discovery-applied-practice]] — the practitioner GOTCHAS (tokenization/stemming traps, MinHash/LSH dial
  traps, BM25 tuning, stale-index ghosts).
- [[discovery-advanced-techniques]] — the deeper/advanced methods layer for the galaxy.
- [[prism-methodology-foundations]] — the cross-galaxy methodology spine these domain layers hang from.

## 5. Keep-fresh cadence

This atlas is a living hub; it rots if left alone. Refresh discipline for tango:

- **Per quarter (or when an entry is edited):** re-WebFetch every URL in `## Sources`. Any that 404 / 403
  / change host gets retried once, then fixed or dropped — never left dead, never guessed.
- **Watch the redirect-y / paywall-adjacent links:** the RRF paper resolves only after following the
  Waterloo host redirect to `cormack.uwaterloo.ca/cormacksigir09-rrf.pdf` (the older `plg.uwaterloo.ca`
  path now redirects/404s); if the author moves hosts again, re-trace from the Elasticsearch RRF docs,
  which cite the current author path. The ACM DOI copy was 403 from this environment — do not list it as
  free unless a future fetch confirms open access actually downloads.
- **Watch version-pinned upstreams:** Lucene was at 10.4.0 at verification; the `github.com/apache/lucene`
  landing page always tracks the current release, so re-verify from the repo root, not a pinned tag.
- **Keep LOCAL pointers honest:** if the engine dir moves, `DuplicationGuardEngine.ts` is renamed, or
  `find-cache.json` relocates, update §1 in the same edit — a stale local path is the same R12 failure as
  a dead URL.
- **New entries: WebFetch-confirmed, free, and legal only** (no paywalled, no LibGen/SciHub). Each must
  carry its verified URL + one-line *reach* purpose + which galaxy mechanism it feeds, exactly like the
  rows above.
- **Promotion direction:** theory learned from these sources flows into `discovery-foundations.md`; gotchas
  into `discovery-applied-practice.md`. This file stays the pointer to WHERE-to-reach, not WHAT.

---

## Owner-gate (NOT promoted)

Per R12, this atlas links methods + sources only — it promotes NO numeric threshold or constant. The
following stay owner-gated to tango and to `mcp-server/src/physics/constants.ts` / the galaxy's own code,
and are deliberately NOT stated here:

- The RRF `rank_constant` (k) and `rank_window_size` values — the Elasticsearch docs and the Cormack paper
  give the *method* and the *meaning* of the dials; PRISM's chosen values are owner-gated, not copied here.
- BM25 `k1` / `b` defaults and any idf variant — link the Lucene/Elasticsearch reference for the contract;
  the production numbers PRISM scores with stay in code, never inlined into the wiki.
- Any MinHash band/row counts, LSH similarity thresholds, or shingle sizes used by the dedup guard — the
  theory is in `discovery-foundations.md`; the tuned constants are owner-gated.
- Any precision/recall/MAP targets for the coverage/orphan audits — TREC supplies the *methodology*; the
  pass/fail bars are owner-gated.

A future promotion of any of these requires tango sign-off and a code/`constants.ts` source of truth, not
a wiki edit.

## Sources

All URLs below were fetched live and confirmed reachable, free, and legal on 2026-06-10. The RRF paper is
the author-hosted free PDF on the University of Waterloo host (the ACM DOI copy was 403 and is intentionally
NOT listed as free); the IR Anthology page is a free bibliographic citation anchor (not a PDF host); the
Apache Lucene repo and the Elasticsearch RRF docs are official free references; the Stanford CS276 page and
the Introduction to IR book are free academic sources; NIST TREC is a public standards body with free data.
LOCAL pointers are verified PRISM filesystem paths confirmed present on disk on 2026-06-10.

- Local: `mcp-server/src/engines/discovery/` — discovery galaxy engine home (CLAUDE.md/MEMORY.md/PATHS.md/TOOLBELT.md)  (verified on-disk)
- Local: `mcp-server/src/engines/DuplicationGuardEngine.ts` — anti-duplication guard (THROWS on dup) + master-index search surface  (verified on-disk)
- Local: `state/shared/system-viz/find-cache.json` — compact node-search sidecar backing cheap `find`  (verified on-disk)
- Reciprocal Rank Fusion — seminal paper (Cormack/Clarke/Buettcher, SIGIR 2009), author-hosted free PDF: https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf  (free paper)
- Reciprocal Rank Fusion — IR Anthology citation anchor (Webis): https://ir.webis.de/anthology/2009.sigirconf_conference-2009.146/  (free bibliographic record, not a PDF host)
- Apache Lucene — official source repository: https://github.com/apache/lucene  (official repo)
- Elasticsearch — Reciprocal Rank Fusion reference: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion  (official documentation)
- Stanford CS276 — Information Retrieval and Web Search: https://web.stanford.edu/class/cs276/  (free college course)
- Introduction to Information Retrieval — free online edition: https://nlp.stanford.edu/IR-book/information-retrieval-book.html  (free textbook)
- NIST TREC — Text REtrieval Conference: https://trec.nist.gov/  (standards body / free evaluation data)
