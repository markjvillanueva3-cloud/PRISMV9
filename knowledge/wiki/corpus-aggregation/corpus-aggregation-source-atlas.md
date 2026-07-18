---
title: Corpus-Aggregation Galaxy Open-Source Atlas — Where to Keep Learning Data Engineering, ETL/Aggregation, and Data Quality
galaxy: corpus-aggregation
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every source listed below was fetched live with WebFetch on 2026-06-10 and confirmed (a) real, (b) free / legally accessible, and (c) reachable from this environment. Candidate links that failed to confirm free public access were DROPPED, not guessed: O'Reilly 'Fundamentals of Data Engineering' (full text paywalled behind O'Reilly membership) and the CMU Database Group YouTube channel page (rendered only YouTube's JS footer, channel content not confirmable via fetch). The CMU 15-445 course site IS reachable and its syllabus confirmed, but it labels lecture videos 'CMU Students Only' on that page — listed with that caveat stated honestly. No URL appears here that was not returned by an actual WebFetch call. This is the LIVING-SOURCE keep-learning directory; it is DISTINCT from corpus-aggregation-foundations.md (synthesized theory) which is not repeated here."
tags: [corpus-aggregation, source-atlas, living-source, keep-learning, data-engineering, etl, elt, data-pipeline, data-quality, batch-processing, stream-processing, airflow, dbt, apache-spark, free-course, free-textbook, official-docs]
---

# Corpus-Aggregation Galaxy — Open-Source Atlas

This is the **keep-learning directory** for the **corpus-aggregation** galaxy (owner: golf) — a curated,
kept-fresh list of WHERE to go to keep learning this galaxy's domain from reputable FREE and LEGAL
sources, so the knowledge never goes stagnant.

**Galaxy scope.** corpus-aggregation is PRISM's document-ingestion + ETL/aggregation layer: it pulls raw
material (the pypdf page-by-page PDF corpus, MIT-OCW courseware, tribal tips, galaxy MEMORY files,
transcript mines), then **extracts / transforms / cleanses / deduplicates / shards** it into corpora the
**academy** galaxy and the **NN/GNN** training pipeline consume. It is the sibling of the **discovery**
galaxy but focused on the *ETL / aggregation* layer rather than the search/retrieval layer. So this atlas
points at **data-engineering + ETL/ELT curriculum, pipeline orchestration, and data-quality** sources.

**How this differs from the sibling entries.** This is NOT the theory entry. The synthesized
document-processing / corpus-statistics theory (tokenization, Unicode normalization, stop words, ETL
contract, record-linkage dedup, sharding, Heaps' / Zipf's law) is already grounded in
[`corpus-aggregation-foundations.md`](corpus-aggregation-foundations.md), and the shared IR /
near-duplicate theory is in [`../discovery/discovery-foundations.md`](../discovery/discovery-foundations.md).
This atlas does NOT re-derive any of it — it tells you where to go to *keep learning and stay current*.

Status is **VERIFIED-PARTIAL**: every source below is WebFetch-confirmed live + free, but this is a
curated seed directory, not an exhaustive catalog. Dead/paywalled candidates were dropped (see frontmatter).

---

## 1. Free college courses & curricula

- **DataExpert-io — Data Engineer Handbook** — https://github.com/DataExpert-io/data-engineer-handbook
  A free, open-source (GitHub, 41k+ stars) data-engineering curriculum: a 4-week free beginner boot camp
  and a 6-week free intermediate boot camp, plus a curated roadmap covering ETL, data modeling, pipelines,
  batch processing, and streaming, with design patterns like Cumulative Table Design and Microbatch
  Deduplication. **Feeds:** the galaxy's whole ETL pipeline (extract -> transform/cleanse -> load); the
  "Microbatch Deduplication" pattern maps directly onto corpus-scale dedup of re-fed transcript/tribal items.

- **MIT OpenCourseWare — 6.830 Database Systems (Fall 2010)** —
  https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/
  Free, Creative-Commons-licensed MIT course with lecture notes, exam solutions, and programming
  assignments. Covers query processing, query optimization, transactions/locking, buffer-pool and memory
  management, indexing/access methods, and parallel/distributed databases. **Feeds:** the LOAD + storage
  side of the galaxy — how the assembled corpus is stored, indexed, and partitioned across machines; the
  parallel/distributed-DB material backs the sharding strategy for the >512MiB tribal index.

- **CMU 15-445/645 — Intro to Database Systems** — https://15445.courses.cs.cmu.edu/
  Publicly reachable course site (CMU). Syllabus covers storage models, log-structured + heap storage
  architectures, tree/hash/vector indexes + filters, ACID transaction processing and concurrency control,
  recovery (logging/checkpoints), and query processing (joins, sorting, aggregation, optimization).
  **Caveat (honest):** the course page labels the lecture *videos* "CMU Students Only" — use the public
  schedule/reading list from this site; do not assume the video links are open. **Feeds:** storage,
  indexing, and aggregation internals underneath the corpus LOAD stage.

## 2. Official docs & standards (the canonical references)

- **Apache Airflow — official documentation** — https://airflow.apache.org/docs/
  The Apache Software Foundation's free official docs for the dominant open-source **pipeline orchestrator**:
  DAGs, the Task SDK (python-native DAG definitions, isolated subprocess execution), the scheduler, 100+
  provider integrations, and Docker/Helm deployment. **Feeds:** the orchestration of the galaxy's
  extract/transform/load steps — DAG-shaped, retry-able, resumable ingest (the antidote to the galaxy's
  "non-resumable corpus burn" failure mode).

- **dbt — official documentation** — https://docs.getdbt.com/docs/introduction
  Free official docs for the standard **ELT transformation** tool. Teaches modeling raw warehouse data into
  trusted products with SQL select statements, modular/reusable models, state-aware orchestration (rebuild
  only changed models), and built-in **data-quality tests** + lineage/contracts. **Feeds:** the TRANSFORM
  stage — the ELT discipline (load-then-transform) and incremental "only rebuild what changed" maps onto
  resumable, cleanse-in-place corpus assembly.

- **Apache Spark — official documentation** — https://spark.apache.org/docs/latest/
  Free official docs for the unified large-scale processing engine. Covers **batch** (RDD Programming Guide;
  Spark SQL / DataFrames / Datasets) AND **Structured Streaming** in one engine. **Feeds:** the
  batch-vs-stream choice for transforming the corpus at volume; the DataFrame API is the practical tool when
  the corpus outgrows single-process JSONL readers.

- **Great Expectations (GX Core) — official documentation** —
  https://docs.greatexpectations.io/docs/core/introduction/
  Free official docs for an open-source **data-quality / validation** framework: build data-validation
  workflows, declare Expectations (validation rules) on data, and run them as pipeline gates. **Feeds:** the
  cleanse/validate substep of TRANSFORM — encode "is this corpus row well-formed / not a re-OCR'd dup?" as
  enforceable Expectations rather than ad-hoc checks.

## 3. Lecture / practitioner reference sites (kept current by communities)

- **The Data Engineering Wiki** — https://dataengineering.wiki/
  A free, open-source "living document" maintained by the data-engineering community: Concepts, Guides,
  Tools, and Learning Resources sections. **Feeds:** broad orientation for the galaxy's ETL/aggregation
  surface; a living source that itself stays fresh, so it is a good periodic re-read target.

- **Start Data Engineering** — https://www.startdataengineering.com/
  Free article archive (no paywall) with deep practitioner pieces: "ETL vs ELT", "Data Pipeline Design
  Patterns", "types of data quality checks", "implement data quality checks in Python without third-party
  tools", and a Data Engineering Best Practices series (metadata, logging, data flow, code organization).
  **Feeds:** the pragmatic TRANSFORM + data-quality patterns the galaxy needs without adopting heavyweight
  tooling — directly relevant to PRISM's hand-rolled JSONL/sidecar corpora.

- **The Data Engineering Cookbook (andkret/Cookbook)** — https://github.com/andkret/Cookbook
  Free, Apache-2.0, open-source (GitHub, 15k+ stars) cookbook: fundamentals (Git/Linux/Docker/cloud), full
  pipeline architecture (REST/NiFi/Logstash ingest; Kafka/Redis/Kinesis/PubSub buffering; batch + streaming
  processing; warehouse/lake/NoSQL storage), MapReduce/Spark/Flink, and streaming delivery semantics
  ("at least once" / "at most once" / "exactly once"). **Feeds:** end-to-end pipeline mental model + the
  delivery-semantics vocabulary that matters when a feeder can re-deliver the same document (drives the
  dedup design).

## 4. Free reference articles — batch vs stream foundations

- **Wikipedia — Stream processing** (CC BY-SA 4.0) — https://en.wikipedia.org/wiki/Stream_processing
  Free reference. Stream processing applies operations to data continuously as it arrives, treating
  sequences of events in time as the unit. **Feeds:** the continuous-ingest model for live transcript/MEMORY
  mining where the corpus updates incrementally rather than in a single batch.

- **Wikipedia — Batch processing** (CC BY-SA 4.0) — https://en.wikipedia.org/wiki/Batch_processing
  Free reference. Batch processing = automated execution of jobs without user interaction, scheduled or run
  when resources are available. **Feeds:** the scheduled, full-corpus rebuild path (the pypdf / OCR corpus
  pass) — the counterpart to the streaming path above; the batch-vs-stream choice is a core galaxy decision.

---

## Keep-fresh cadence

This atlas is a LIVING document — re-validate it so the curriculum never goes stagnant:

- **Quarterly (every ~90 days):** re-fetch each URL in `## Sources`. Drop any that 404 / paywall / move;
  replace with a re-confirmed live equivalent. Never leave a dead link in place.
- **On version bumps:** the official-docs sources (Airflow, dbt, Spark, Great Expectations) are versioned —
  confirm the linked page still points at `latest` / the current docs root after a major release.
- **On galaxy work:** when corpus-aggregation engine code is read or changed, fold any new
  reputable-free-source actually used into the matching section here (and record it in the galaxy MEMORY).
- **Honesty gate (R12):** add a source ONLY after a live WebFetch confirms it is real, free/legal, and
  reachable. A short verified list beats a long fabricated one. Paywalled or login-gated material
  (e.g. O'Reilly full texts) does NOT belong here.

---

## Sources

All URLs fetched live and confirmed real + free/legal + reachable on 2026-06-10:

- DataExpert-io — Data Engineer Handbook (free GitHub curriculum / boot camps): https://github.com/DataExpert-io/data-engineer-handbook
- MIT OpenCourseWare — 6.830 Database Systems, Fall 2010 (free, CC-licensed): https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/
- CMU 15-445/645 — Intro to Database Systems (public course site; videos student-gated): https://15445.courses.cs.cmu.edu/
- Apache Airflow — official documentation (free, ASF): https://airflow.apache.org/docs/
- dbt — official documentation (free official docs): https://docs.getdbt.com/docs/introduction
- Apache Spark — official documentation (free, ASF; batch + Structured Streaming): https://spark.apache.org/docs/latest/
- Great Expectations (GX Core) — official documentation (free official docs, data quality): https://docs.greatexpectations.io/docs/core/introduction/
- The Data Engineering Wiki (free open-source community wiki): https://dataengineering.wiki/
- Start Data Engineering (free article archive): https://www.startdataengineering.com/
- The Data Engineering Cookbook (andkret/Cookbook, free Apache-2.0 GitHub): https://github.com/andkret/Cookbook
- Wikipedia — Stream processing (CC BY-SA 4.0): https://en.wikipedia.org/wiki/Stream_processing
- Wikipedia — Batch processing (CC BY-SA 4.0): https://en.wikipedia.org/wiki/Batch_processing
