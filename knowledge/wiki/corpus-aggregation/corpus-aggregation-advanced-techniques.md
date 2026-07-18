---
title: Corpus-Aggregation Advanced Techniques — Exactly-Once Streaming, CDC, Schema Evolution, Watermarking, and Probabilistic Dedup at Scale
galaxy: corpus-aggregation
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Every advanced technique below was confirmed by a live WebFetch on 2026-06-10 against a free/legal primary or reputable-reference source (official Apache Flink docs, Confluent/Kafka official docs, official Apache Airflow docs, official dbt docs, Wikipedia for CDC/Bloom/HyperLogLog/SCD). Each technique cites its source inline. This entry is DISTINCT from corpus-aggregation-foundations.md (intro IR/ETL theory) and corpus-aggregation-applied-practice.md (common practitioner gotchas) — both were read first this session and are NOT repeated. PRISM-mapping lines are galaxy context, not external claims. No numeric cutting/physics constant or production threshold is asserted — see Owner-gate."
tags: [corpus-aggregation, advanced-techniques, exactly-once, change-data-capture, cdc, schema-evolution, schema-registry, watermarking, event-time, late-data, incremental-dedup, bloom-filter, hyperloglog, slowly-changing-dimension, log-compaction, data-aware-scheduling, golf]
---

# Corpus-Aggregation Advanced Techniques

> **The world-leader-depth layer** for the corpus-aggregation galaxy (owner: golf): the state-of-the-art
> streaming/ETL STRATEGIES a data-engineering expert reaches for once the intro theory and the common
> gotchas are already handled. Read first, do NOT repeat:
> - [`corpus-aggregation-foundations.md`](corpus-aggregation-foundations.md) — doc-processing pipeline,
>   Unicode normalization forms, stop-words, the ETL definition, record-linkage / Fellegi-Sunter,
>   sharding / Heaps' / Zipf's laws.
> - [`corpus-aggregation-applied-practice.md`](corpus-aggregation-applied-practice.md) — silent record
>   drop, fail-open clobber, dedup over-merge, schema-drift boundary tests, the *basic* incremental
>   lookback window, idempotency / UPSERT, BOM / encoding.
>
> This entry is the next altitude: **exactly-once stream processing, change-data-capture, schema-evolution
> strategy, watermarking for out-of-order data, incremental dedup at corpus scale, and event-driven
> orchestration**. Each item below = the technique + WHEN an expert reaches for it + the trade-off
> DIRECTION + an inline source + one line on how THIS galaxy applies it.

Status is **VERIFIED-PARTIAL**: every technique is WebFetch-confirmed, but this is an advanced-strategy
seed, not the galaxy's complete playbook, and no PRISM-specific numeric is promoted (see Owner-gate).

---

## A. Exactly-once and re-run correctness — the delivery-semantics ladder

### A1. Choose the delivery-semantics tier deliberately; do not default to "exactly-once everywhere"
The three guarantees are a cost ladder, not a quality ranking. **At-most-once**: *"Messages are delivered
once, and if there is a system failure, messages may be lost and are not redelivered."* **At-least-once**:
*"Messages are delivered one or more times. If there is a system failure, messages are never lost, but
they may be delivered more than once."* **Exactly-once**: *"Each message is delivered once and only once.
Messages are never lost or read twice even if some part of the system fails."* At-most-once buys the
lowest latency by accepting loss ("fire and forget"); exactly-once buys correctness at the cost of
transactional coordination. (Source: Confluent — *Kafka message delivery semantics*.)

- **When an expert reaches for it:** pick at-least-once + a downstream idempotent/UPSERT sink as the
  *default* for a corpus you can dedup on a key; reserve true exactly-once for sinks where a duplicate
  cannot be detected after the fact.
- **Trade-off direction:** moving up the ladder trades throughput/latency for stronger no-loss /
  no-duplicate guarantees — stronger guarantees cost more coordination, so buy only the tier the sink
  actually needs.
- **Corpus-aggregation use:** the galaxy's feeders are at-least-once by nature (a re-OCR or a re-mine
  re-emits the same record). The galaxy already pairs that with key-based dedup, which is the correct
  pattern — at-least-once delivery + idempotent merge gives effective exactly-once at the corpus without
  paying for cross-system transactions.

### A2. Idempotent producer + transactional write = exactly-once across the read-process-write loop
The idempotent producer prevents *retry* duplicates: *"Resending a message will not result in duplicate
entries in the log, and ... log order is maintained"* via broker-assigned producer IDs and sequence
numbers. True end-to-end exactly-once then needs the *offset* and the *output* to commit atomically:
*"The consumer's position is stored as a message in a topic, so offset data is written to Kafka in the
same transaction as when processed data is written to the output topics,"* ensuring atomicity across the
whole read-process-write step. (Source: Confluent — *Kafka message delivery semantics*.)

- **When an expert reaches for it:** any stateful aggregation where a crash between "I consumed input X"
  and "I wrote output Y" would otherwise either lose X or double-count Y.
- **Trade-off direction:** the atomic-commit / two-phase approach adds latency and complexity versus a
  naive append; you accept that overhead only when a post-hoc dedup of the output is impossible.
- **Corpus-aggregation use:** an aggregation script that reads a feed cursor AND writes a corpus shard
  must advance the cursor and write the shard as one unit (overwrite a deterministic partition), so a
  reaper-kill mid-run never leaves "cursor advanced but shard not written." This generalizes the
  galaxy's existing per-print resume-cursor pattern.

---

## B. Capturing change without full re-reads — CDC strategy

### B3. Log-based change-data-capture over query/trigger-based when re-scanning the whole source is wasteful
**CDC** is *"a set of software design patterns used to determine and track the data that has changed (the
'deltas') so that action can be taken using the changed data."* The methodologies trade off sharply.
*Timestamp-based*: *"Any row ... that has a timestamp ... more recent than the last time data was captured
is considered to have changed"* — simple but misses hard-deletes and needs a reliable mod-time column.
*Trigger-based*: triggers *"log events that happen to the transactional table into another queue table
that can later be 'played back'"* — captures everything but adds write-path overhead. *Transaction
log-based*: reading the source's transaction log gives *"minimal impact on the database," "no need for
programmatic changes to the applications," "low latency ... and transactional integrity,"* at the cost of
*"translation between physical storage formats"* and brittleness to *"changes to the format of the
transaction logs between versions."* (Source: Wikipedia — *Change data capture*.)

- **When an expert reaches for it:** when a source is large and changes slowly, so re-ingesting it whole
  each run dwarfs the actual delta.
- **Trade-off direction:** log-based CDC minimizes source impact and latency but raises implementation
  complexity and version-coupling; timestamp-based is cheap to build but blind to deletes. Move toward
  log-based as the source grows and "catch every delete" matters.
- **Corpus-aggregation use:** for a slow-changing feed like galaxy `MEMORY.md` files or the vendor
  catalog, prefer a delta-detection strategy (content-hash or mod-time watermark per source file)
  over re-reading the entire tree every aggregation run — the galaxy's "enumerate before read" rule sets
  the denominator; CDC-style delta tracking processes only what actually changed.

---

## C. Surviving source-shape change — schema-evolution strategy

### C4. Pick the compatibility mode from the upgrade ORDER, not from "what feels safe"
Schema evolution is governed by an explicit compatibility contract, and each mode dictates *who must be
upgraded first*. **Backward** (the usual default): *"Consumers using new schema can read data written
with old schema"* — permits adding optional fields and removing fields, and you *upgrade all consumers
before deploying new producer schemas*. **Forward**: *"Consumers using old schema can read data written
with new schema"* — allows adding fields and removing optional fields, and you *upgrade all producers
before upgrading consumers*. **Full** = both at once, *"Add/remove optional fields only,"* enabling
independent upgrades. **Transitive** extends the check *"across all previous versions rather than just the
most recent."* **None** disables checking and forces a simultaneous cutover. (Source: Confluent —
*Schema evolution and compatibility*.)

- **When an expert reaches for it:** the moment more than one independently-deployed producer or consumer
  touches the same record shape and they cannot be upgraded atomically.
- **Trade-off direction:** stricter modes (Full / transitive) cost you flexibility (optional-fields-only)
  but buy independent, any-order upgrades; None is maximally flexible per-change but forces a lockstep
  cutover. Move toward Full/transitive as the number of independent feeders grows.
- **Corpus-aggregation use:** the galaxy joins emits from 34 galaxies that drift independently per slot.
  Treat each emit shape as a registered contract with a declared compatibility mode (defaults on new
  fields, never repurpose a field name) so a slot adding a field never breaks the aggregator and never
  silently NULL-backfills history.

### C5. Default-valued additive evolution is what makes old data readable under a new schema
The mechanism behind backward compatibility is concrete: a *"new field ... has the default value 'green'.
This allows data encoded with old schema to be read with the new one."* Without a default, the same field
addition is a breaking change. (Source: Confluent — *Schema evolution and compatibility*.)

- **When an expert reaches for it:** every time you add a field to a shape that historical records were
  written under.
- **Trade-off direction:** requiring defaults on additions slightly constrains the schema but eliminates
  the "old record can't be parsed under new schema" failure entirely — a small authoring constraint
  buying corpus-wide readability.
- **Corpus-aggregation use:** when an aggregation script gains a new per-record field, give it a default
  in the merge, so already-written shards still parse and the field is not silently absent vs explicitly
  defaulted (the readable equivalent of the foundations entry's normalization discipline).

---

## D. Out-of-order and late data — watermarking strategy

### D6. Event-time + watermarks, not processing-time, when correctness must be order-independent
*"Processing time refers to the system time of the machine ... executing the ... operation"* (lowest
latency, non-deterministic in a distributed setting), whereas *"event time is the time that each
individual event occurred on its producing device"* and gives *"deterministic, consistent results
regardless of event arrival order."* A **watermark** carries that determinism: *"a Watermark(t) declares
that event time has reached time t in that stream, meaning that there should be no more elements ... with
a timestamp t' <= t."* At a multi-input operator the event-time clock becomes *"the minimum of its input
streams' event times."* (Source: Apache Flink — *Timely Stream Processing*.)

- **When an expert reaches for it:** any windowed/aggregated computation where records can arrive in a
  different order than they occurred (multiple feeders, retries, batched mines).
- **Trade-off direction:** event-time + watermarks costs you latency (you wait for the watermark to
  advance) and requires a timestamp per record, but buys reproducible results that don't depend on
  arrival order. Move toward event-time the instant arrival order can vary.
- **Corpus-aggregation use:** when merging feeds that emit at different cadences, key windows/aggregates
  on each record's own event/source time (not the moment the aggregator happened to read it), so a slow
  feeder catching up later produces the same corpus as if it had been timely.

### D7. Tune the lateness grace window: completeness vs freshness is the dial
Late elements *"arrive after the system's event time clock has surpassed their timestamp,"* and it is
*"impossible to specify a time by which all elements of a certain event timestamp will have occurred."*
The strategy is an explicit **allowed-lateness / grace period** — a configurable window before a window
*"closes"* during which still-late data is accepted. (Source: Apache Flink — *Timely Stream Processing*.)

- **When an expert reaches for it:** whenever a window must emit a result, but you also know stragglers
  exist (this is the principled version of the applied-practice entry's "lookback window," now framed as
  a tunable completeness/latency dial).
- **Trade-off direction:** a longer grace window captures more late data (higher completeness) at the
  cost of holding results open longer (lower freshness, more state retained); a shorter window emits
  sooner but drops more stragglers. Widen it for a training corpus you value completeness in; narrow it
  where freshness dominates.
- **Corpus-aggregation use:** set the trailing reprocess window on incremental corpus builds from the
  observed straggler spread of the feeders, and decide explicitly what happens to data that arrives past
  it (drop-and-log vs side-output for a later full rebuild) — never silently drop.

---

## E. Dedup, retention, and orchestration at corpus scale

### E8. Probabilistic membership (Bloom) and cardinality (HyperLogLog) when exact dedup won't fit in memory
A **Bloom filter** is *"a space-efficient probabilistic data structure ... used to test whether an element
is a member of a set,"* with the asymmetric guarantee *"False positive matches are possible, but false
negatives are not — ... a query returns either 'possibly in set' or 'definitely not in set'"* — *"fewer
than 10 bits per element ... for a 1% false positive probability, independent of the size."* Counting and
scalable variants add deletion and dynamic growth. For *how many distinct*, **HyperLogLog** solves the
count-distinct problem and *"can estimate cardinalities of > 10^9 with a typical accuracy (standard error)
of 2%, using 1.5 kB of memory,"* with relative error *"1.04 / sqrt(m)."* (Sources: Wikipedia — *Bloom
filter*; *HyperLogLog*.)

- **When an expert reaches for it:** when the set of "already-seen" keys (or the distinct-count) is too
  large to hold exactly, so an exact hash-set blows memory.
- **Trade-off direction:** both trade a bounded, tunable error for a massive memory reduction — a Bloom
  filter's false-positives mean it may *skip* a genuinely-new record (so use it as a cheap pre-filter,
  confirm hits against the exact store), and HyperLogLog gives an *estimate*, not an exact count. Accept
  the error only where the memory saving is the binding constraint.
- **Corpus-aggregation use:** for cross-feed incremental dedup at scales past the V8 single-string cap the
  galaxy already hit, use a Bloom pre-filter to cheaply reject "definitely new" candidates before the
  exact-key check, and HyperLogLog to report distinct-record counts for honest corpus sizing without
  materializing every key.

### E9. Compaction-style key-latest retention so the log itself can rebuild full state
**Log compaction** is *"a mechanism that allows you to retain the latest value for each message key ...
while discarding older values"* — unlike time/size retention it gives *"finer-grained per-record
retention"* and *"the log is guaranteed to have at least the last state for each key."* The payoff is
recoverability: *"any consumer progressing from the start of the log will see at least the final state of
all records in the order they were written,"* so a downstream can *"restore their own state off this
topic."* (Source: Confluent — *Kafka log compaction*.)

- **When an expert reaches for it:** when the change-stream is unbounded but you only need the *current*
  value per entity, and you want the ability to rebuild a full snapshot from the log alone.
- **Trade-off direction:** key-latest compaction discards intermediate history (you lose the audit trail
  unless you keep it elsewhere) in exchange for bounded storage plus snapshot-rebuild — the inverse of
  the SCD Type-2 choice below. Pair it with a Type-2 history table when you need both.
- **Corpus-aggregation use:** for a per-entity corpus (e.g. one record per vendor / per tool / per
  galaxy-MEMORY key), retain key-latest semantics so the corpus stays bounded and any consumer can
  rebuild the whole current state by replaying it, rather than carrying every superseded revision.

### E10. Slowly-changing-dimension typing — decide history-tracking strategy per attribute, not globally
**SCDs** store data that *"while generally stable, may change over time."* **Type 1** *"overwrites old with
new data, and therefore does not track historical data"* (simple, history lost). **Type 2** *"tracks
historical data by creating multiple records for a given natural key"* with version numbers / effective
date ranges (full history, more complexity). **Type 3** *"tracks changes using separate columns and
preserves limited history"* (only the most recent prior value). The core trade-off: *"Type 1 sacrifices
historical accuracy for simplicity, while Type 2 maintains full history at the cost of increased
complexity and ... performance overhead."* (Source: Wikipedia — *Slowly changing dimension*.)

- **When an expert reaches for it:** at corpus-design time, for every attribute that can change — decide
  whether its history matters before the first load, because retrofitting Type-2 history onto a Type-1
  overwrite is lossy after the fact.
- **Trade-off direction:** Type-1 overwrite is cheapest but unrecoverable history; Type-2 keeps everything
  at storage + complexity cost; Type-3 is the bounded middle. Choose per-attribute by whether a model or
  audit will ever need the prior value.
- **Corpus-aggregation use:** for reference data that the training corpus depends on (a tool spec, a
  material mapping), use Type-2 (effective-dated rows) so a model trained last month can be reconciled
  against the data as it was THEN — never silently overwrite (Type-1) a value the corpus already learned
  from.

### E11. Event-driven (data-aware) orchestration instead of fixed cron when the trigger is "data is ready"
Airflow **datasets** let pipelines fire on data availability, not the clock: a dataset is *"a stand-in for
a logical grouping of data,"* and *"dataset updates contribute to scheduling downstream 'consumer' DAGs"*
— *"Once the producer task ... has completed successfully, Airflow schedules the consumer DAG,"* but only
on success (*"if the task fails or ... is skipped, no update occurs"*), and a multi-input consumer runs
*"once all datasets it consumes have been updated."* (Source: Apache Airflow — *Data-aware scheduling /
datasets*.)

- **When an expert reaches for it:** when a downstream corpus build should run *because an upstream feed
  actually produced new data*, not because a cron minute elapsed (avoiding both "ran on empty" and "data
  ready but waiting for the next tick").
- **Trade-off direction:** data-aware scheduling trades the simplicity/predictability of cron for
  freshness and no-wasted-runs, at the cost of wiring an explicit producer-consumer dependency graph.
  Move toward it as the pipeline grows multi-stage and runs become expensive.
- **Corpus-aggregation use:** chain the galaxy's stages by data-readiness (mine -> sidecar rebuild ->
  synthesis-refresh) so the synthesis step fires when the mine genuinely produced output — closing the
  known gap where "compounding into brains needs sidecar rebuild + synthesis-refresh AFTER mining (not
  automatic)."

---

## Owner-gate (NOT promoted)

This entry is **VERIFIED-PARTIAL**, owner-gated to golf (corpus-aggregation galaxy owner). It is NOT
promoted to the main wiki index, CLAUDE.md, or any dispatcher until the owner reviews it.

- **No numeric constants or production thresholds are promoted.** Deliberately left for golf to set/verify
  against PRISM's live corpus and `mcp-server/src/physics/constants.ts` (the owner-gated home for any
  cutting/physics constant):
  - The actual **grace / lookback window length** for the galaxy's incremental builds (D7) — derive from
    the observed feeder straggler spread, do not inline a number here.
  - The **Bloom-filter bit-budget / target false-positive rate** and the **HyperLogLog register count /
    accepted relative error** for production dedup (E8) — choose from the live key-set size, not asserted.
  - Any **dedup match/merge threshold** (precision/recall operating point) — measured on live data, per
    the applied-practice entry; not a constant here.
  - The **schema-registry compatibility mode actually configured** per feed (C4/C5) and which **CDC method**
    each source actually uses (B3) — must be read from the aggregation code, not assumed from this theory.
  - **No cutting constant** (kc1.1, Taylor C/n, SFM/RPM/IPR/chip-load/feed/depth, coolant psi) appears or
    is implied — corpus-aggregation is a document-processing/ETL substrate; the only relationship-shapes
    stated here are streaming/ETL trade-off DIRECTIONS, never numbers. Any such physics number remains
    owner-gated to golf and lives only in `constants.ts`.
- **PRISM-mapping lines are galaxy context, not external claims** — the owner should confirm the named
  patterns (resume-cursor, per-galaxy MEMORY emits, vendor catalog, mine->sidecar->synthesis chain) still
  match the current aggregation surface before relying on them.
- **Freshness:** official docs (Flink, Kafka/Confluent, Airflow, dbt) are stable references; re-validate
  the Airflow datasets API (it has been renamed toward "assets" in newer majors) and the dbt incremental
  guidance if either majors past the version current on 2026-06-10.

## Sources

All URLs below were fetched live and confirmed on 2026-06-10. Sibling theory and gotchas are grounded in
[`corpus-aggregation-foundations.md`](corpus-aggregation-foundations.md) and
[`corpus-aggregation-applied-practice.md`](corpus-aggregation-applied-practice.md) and are not re-listed.

1. Apache Flink — *Timely Stream Processing* (event time vs processing time, watermarks, late elements / allowed lateness), official docs: https://nightlies.apache.org/flink/flink-docs-master/docs/concepts/time/
2. Confluent — *Kafka message delivery semantics* (at-most/at-least/exactly-once, idempotent producer, transactional read-process-write), official docs: https://docs.confluent.io/kafka/design/delivery-semantics.html
3. Confluent — *Schema evolution and compatibility* (backward/forward/full/transitive/none, default-valued additive evolution), official docs: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
4. Confluent — *Kafka log compaction* (key-latest retention, rebuild full state from the log), official docs: https://docs.confluent.io/kafka/design/log_compaction.html
5. Apache Airflow — *Data-aware scheduling / datasets* (producer/consumer DAGs, event-driven vs time-based), official docs: https://airflow.apache.org/docs/apache-airflow/2.9.0/authoring-and-scheduling/datasets.html
6. dbt Labs — *Writing custom generic data tests* (reusable boundary assertions / generic test blocks), official docs: https://docs.getdbt.com/best-practices/writing-custom-generic-tests
7. Wikipedia — *Change data capture* (timestamp/version/trigger/log-based CDC and their trade-offs): https://en.wikipedia.org/wiki/Change_data_capture
8. Wikipedia — *Bloom filter* (space-efficient probabilistic membership; false-positive-only guarantee; counting/scalable variants): https://en.wikipedia.org/wiki/Bloom_filter
9. Wikipedia — *HyperLogLog* (count-distinct / cardinality estimation; space-vs-accuracy trade-off): https://en.wikipedia.org/wiki/HyperLogLog
10. Wikipedia — *Slowly changing dimension* (Type 1 overwrite vs Type 2 history vs Type 3 limited): https://en.wikipedia.org/wiki/Slowly_changing_dimension
