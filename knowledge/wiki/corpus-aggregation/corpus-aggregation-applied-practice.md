---
title: Corpus Aggregation - Applied Practice (Practitioner Knowledge)
galaxy: corpus-aggregation
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Every CS-engineering claim confirmed by WebFetch against a free/legal primary source (official dbt docs, official Apache Airflow docs, Python docs, RFC 3629, Wikipedia ETL/Record-linkage). Each gotcha cites its source inline. PRISM-mapping lines are galaxy context, not external claims. No benchmark numerics asserted."
tags: [corpus-aggregation, etl, data-engineering, tribal-knowledge, applied-practice, dbt, airflow, dedup, schema-drift, incremental, encoding, idempotency, golf]
---

# Corpus Aggregation - Applied Practice

> The **practitioner-knowledge layer** for the corpus-aggregation galaxy: the ETL/data-aggregation gotchas, failure modes, and technique decisions that pure theory does not teach. Read `corpus-aggregation-foundations.md` first for the theory (extract/transform/load model, idempotency definition, set-merge semantics, water-mark concept) -- this entry does NOT repeat it. Here we capture *what goes wrong when you actually aggregate heterogeneous feeds into one corpus, and how an expert avoids it*.
>
> corpus-aggregation is the **aggregation layer** sibling of `knowledge-conversion` (the conversion layer). PRISM's aggregation scripts (`scripts/build-vendor-catalog-db.mjs`, `build-fleet-training-corpus-inventory.mjs`, `build-print-corpus-manifest.mjs`, `assemble-fleet-lora-corpus.mjs`, `cag-stats-aggregator.mjs`, `lib/octopus-corpus-loader.mjs`, `lib/extraction-aggregator-lib.mjs`) all merge records from many feeds of differing shape -- so every gotcha below has a live PRISM target.

---

## 1. Silent record drop vs fail-loud "loaded N of M"

**Gotcha -- a decoder that drops a malformed record on `'ignore'` returns plausible-but-incomplete output with no error.** The Python Unicode HOWTO shows exactly this trap: decoding bytes with the wrong codec under `errors='ignore'` "just leave[s] the character out of the Unicode result" -- the example `b'\x80abc'.decode("utf-8", "ignore")` returns `'abc'`, silently losing the leading byte, while `errors='strict'` would raise `UnicodeDecodeError: invalid start byte` (Python docs, *Unicode HOWTO*). The guide notes `'ignore'` "results in data loss" with no warning. **Why it bites aggregation specifically:** at corpus scale you process thousands of records; a per-record `try/catch` that swallows the failure converts a loud error into a silent shrinkage you only notice when a downstream count looks low.

- **Expert avoidance:** default to `errors='strict'` (or `'replace'` so the loss is *visible* as `U+FFFD`), never `'ignore'`. Always emit a `loaded N of M (dropped K: <reasons>)` summary so a partial load fails loud rather than masquerading as success. (PRISM ties this to R12 "fail loud" -- "loaded the corpus" is a lie if K records were skipped.)
- **PRISM hit:** `build-vendor-catalog-db.mjs` and `octopus-corpus-loader.mjs` merge many JSONL/text feeds; a swallowed parse error there silently undercounts the 425-vendor / multi-leg corpus. Emit the N-of-M tally per feed.

**Gotcha -- a fail-open `catch -> return empty` on an EXISTING corpus is silent total destruction, not graceful degradation.** Airflow's idempotency guidance frames the safe pattern as *overwrite a known partition*, never blind-append (Apache Airflow, *Best Practices*); but the dangerous inversion is reading: if a loader's read path catches any error and returns an empty base "to start fresh", a later merge-and-write clobbers the populated corpus with the staged delta only.

- **Expert avoidance:** a `catch` on a file that *exists* must **fail loud**, never return empty-then-write. Guard the write against an unexplained large shrink.
- **PRISM hit:** this is exactly the 2026-06-08 tribal-brain clobber (33,639 -> 1 entries) -- a fail-open `readIndex` catch returned `{entries:[]}`, then `writeIndex` clobbered the corpus. The fix added a >50%-shrink clobber-guard. Any new aggregation writer in this galaxy must carry the same guard.

---

## 2. Dedup over-merge across heterogeneous sources

**Gotcha -- without a shared unique identifier, dedup is record linkage, and the match threshold is a precision/recall tradeoff -- set it too loose and you over-merge two distinct entities.** Record linkage "is necessary when joining different data sets based on entities that may or may not share a common identifier... due to differences in record shape, storage location, or curator style" and "[d]etermining where to set the match/non-match thresholds is a balancing act between obtaining an acceptable sensitivity (recall...) and positive predictive value (precision...)" (Wikipedia, *Record linkage*). It is "highly sensitive to the quality of the data being linked." The ETL article makes the heterogeneous-key problem concrete: the same customer "might be represented in several data sources, with their Social Security number as the primary key in one source, their phone number in another, and a surrogate in the third" (Wikipedia, *Extract, transform, load*).

- **Expert avoidance:** prefer an exact shared key when one exists; when fuzzy-matching is unavoidable, tune the threshold toward *precision* (fewer false merges) for a corpus you will train/decide on -- a false merge silently fuses two real things and is much harder to detect later than a false split. Use surrogate keys + a lookup table to bridge heterogeneous source keys rather than concatenating fields.
- **PRISM hit:** `build-vendor-catalog-db.mjs` merges 425 vendors + 77 catalog-vendors + 131 SFC-maker pointers from feeds with different naming/keying. A loose name-normalization dedup over-merges two distinct vendors into one catalog row -- bias the matcher to leave them split and flag for review.

**Gotcha -- a non-null, genuinely-unique key is a precondition for correct dedup/upsert; a key with nulls or duplicates corrupts the merge.** dbt warns that columns used as `unique_key` "should not contain any nulls, or the incremental model may fail to match rows and generate duplicate rows", and that "if there's a unique_key with more than one row in either the existing target table or the new incremental rows, the incremental model may fail" (dbt, *Incremental models*). It recommends a list of columns (`unique_key=['user_id','session_number']`) over a concatenated string expression.

- **Expert avoidance:** validate the dedup key is non-null and actually unique *before* using it to merge; pass composite keys as a tuple/list, never a concatenated string (concatenation invents collisions, e.g. `('a','bc')` vs `('ab','c')`).
- **PRISM hit:** `extraction-aggregator-lib.mjs` and `aggregate-extractions-to-template.mjs` key extracted records; a null or non-unique merge key there silently duplicates or drops dimensions.

---

## 3. Schema drift between sources breaking the join

**Gotcha -- aggregation assumes a stable source shape; when an upstream feed adds/renames/changes a column, the join breaks or silently mis-binds, and added columns are NOT backfilled into old records.** dbt's `on_schema_change` controls this, but with a sharp caveat: "**None of the `on_schema_change` behaviors backfill values in old records for newly added columns**" (dbt, *Incremental models*). Character-set incompatibility is a flavor of the same drift: "Character sets that may be available in one system may not be in others" (Wikipedia, *Extract, transform, load*).

- **Expert avoidance:** assert the source contract before the join (column presence, type, accepted values) and decide drift policy explicitly -- `fail` (loud) for a corpus you trust, `append_new_columns` only when you accept NULL history. Never let a renamed column silently become all-NULL.
- **PRISM hit:** `build-fleet-training-corpus-inventory.mjs` and `cag-stats-aggregator.mjs` join across 34-galaxy feeds whose shapes drift independently per slot; a renamed field in one galaxy's emit must fail loud, not produce a NULL column.

**Gotcha -- catch drift at the boundary with cheap assertion tests, before it propagates downstream.** dbt's four built-in data tests exist precisely for this: `not_null`, `unique`, `accepted_values` (value must be in a supplied list), and `relationships` (referential integrity to a parent table) are "assertions about a column, table, or view" that catch "schema drift and data quality issues (like unexpected nulls) before they propagate downstream into dependent models" (dbt, *Data tests*).

- **Expert avoidance:** run cheap schema/value assertions at ingest, not after the corpus is built and a model has trained on the corruption. An `accepted_values` check on a category column catches an upstream enum change immediately.
- **PRISM hit:** add `not_null`/`accepted_values`-style guards at the head of each aggregation script (e.g. assert every vendor record has a non-null id and a known `unit` field) -- pairs with the units-first safety rail.

---

## 4. Incremental vs full reload correctness; late / out-of-order data

**Gotcha -- incremental aggregation inevitably DRIFTS from source over time because late-arriving facts fall behind the high-water mark and accumulate.** dbt states it plainly: incremental models "inevitably **drift from the source data over time.** Due to the imperfection of loaders and the reality of late arriving facts, we can't help but miss some day in-between our incremental runs, and this accumulates" (dbt, *Incremental models best practice*). The core mechanism: a record whose timestamp is older than the `max(event_time)` filter but which *arrives* after that watermark was computed is simply skipped on the next run (dbt, *Incremental models*).

- **Expert avoidance:** (1) use a **lookback window** -- filter `>= max(event_time)` (not `>`) and reprocess a trailing window (dbt's `incremental_predicates` example keeps a 7-day scan window to catch out-of-order arrivals); (2) schedule a **periodic full refresh** -- dbt's recommended pattern is "run a full refresh on the weekend... weekly or monthly, to consistently reset the drift from late arriving facts."
- **PRISM hit:** `assemble-fleet-lora-corpus.mjs` and the print-corpus manifest aggregate incrementally as galaxies emit; without a lookback + periodic full rebuild, the training corpus quietly diverges from the live emits.

**Gotcha -- you MUST full-refresh when the aggregation/transform logic itself changes, or new rows diverge from historical rows in the same table.** dbt: "If your incremental model logic has changed, the transformations on your new rows of data may diverge from the historical transformations, which are stored in your target table" -- the remedy is `dbt run --full-refresh --select my_model+` (the `+` also rebuilds downstream) (dbt, *Incremental models*).

- **Expert avoidance:** treat a change to the aggregation rule as a full-rebuild trigger; never leave a corpus that is half old-logic, half new-logic. Full refresh (rebuild everything) is "the easiest and most accurate option" when you can afford the time/compute (dbt, *Incremental models best practice*) -- reach for incremental only when full rebuild is too expensive.
- **PRISM hit:** when a feature/normalization rule in `generate-cadcam-training-corpus-features.mjs` changes, rebuild the whole corpus, not just the delta -- a mixed-logic corpus poisons the trained model with no error.

---

## 5. Idempotency, encoding, and re-run safety

**Gotcha -- a non-idempotent aggregation step duplicates rows on every retry/backfill; INSERT-on-rerun is the classic bug.** Airflow: "Airflow can retry a task if it fails. Thus, the tasks should produce the same outcome on every re-run." The specific anti-pattern is using INSERT during a rerun (it "cause[s] duplicate rows"); the fix is **UPSERT** (overwrite, not append). And: "**Never read the latest available data in a task. Someone may update the input data between re-runs, which results in different outputs**" -- pin to a partition key like `data_interval_start`; avoid `now()` for any value that lands in the output (Apache Airflow, *Best Practices*).

- **Expert avoidance:** make every aggregation step idempotent -- write to a deterministic partition you fully overwrite, upsert on a validated key, and never stamp output rows with wall-clock `now()` (it makes re-runs non-reproducible and breaks delta detection). A re-run must be a no-op on output, not a doubling.
- **PRISM hit:** any aggregation script invoked by a cron/scheduled task (the corpus inventory + LoRA-corpus builders run on schedules) must be safe to re-fire -- overwrite the manifest deterministically, do not append.

**Gotcha -- encoding mismatch across feeds: do not assume UTF-8, and beware a leading BOM that a naive parser treats as data.** RFC 3629 notes the UTF-8 BOM "always appears as EF BB BF" and that an initial `U+FEFF` is a *signature* only at the start of a stream -- "appearing at any position other than the beginning of a stream MUST be interpreted with the semantics for the zero-width non-breaking space, and MUST NOT be interpreted as a signature", and it RECOMMENDS stripping the initial signature "only when really necessary" but handling it deliberately (RFC 3629, sec. 6). A BOM left on the front of the first record silently corrupts that record's first field (e.g. a leading-`﻿` key never matches).

- **Expert avoidance:** detect/declare each feed's encoding rather than assuming UTF-8; strip a leading BOM at read time as a deliberate step; for unknown-encoding fallback, the Unicode HOWTO offers `errors='surrogateescape'` (round-trips unknown bytes) over `'ignore'` (drops them) (Python docs, *Unicode HOWTO*).
- **PRISM hit:** JM Die / vendor feeds arrive from many tools (Windows codepage exports, BOM-prefixed CSVs). `build-vendor-catalog-db.mjs` merging a BOM-prefixed first row silently mis-keys the first vendor -- strip BOM and verify encoding per feed (the repo already hit the PS 5.1 codepage-mangling class -- `feedback_verify_actual_contract_not_proxy`).

---

## Owner-gate (NOT promoted)

This entry is **VERIFIED-PARTIAL**, owner-gated to golf (corpus-aggregation galaxy owner). It is NOT promoted to the main wiki index, CLAUDE.md, or any dispatcher until the owner slot reviews it.

- Every external CS-engineering claim is WebFetch-confirmed against a free/legal primary source and cited inline (8 distinct source URLs). No claim is asserted from memory.
- **PRISM-mapping lines are galaxy context, not external claims** -- the owner should confirm the named scripts (`build-vendor-catalog-db.mjs`, `build-fleet-training-corpus-inventory.mjs`, `build-print-corpus-manifest.mjs`, `assemble-fleet-lora-corpus.mjs`, `cag-stats-aggregator.mjs`, `lib/octopus-corpus-loader.mjs`, `lib/extraction-aggregator-lib.mjs`, `aggregate-extractions-to-template.mjs`, `generate-cadcam-training-corpus-features.mjs`) still match the current aggregation surface before relying on them.
- **No benchmark-specific numerics are asserted here.** Any drift-rate, dedup-precision, or load-throughput figure for PRISM's actual corpora is owner-gated and must be measured on live data (NUMERICS_LEFT_GATED).
- Freshness: official docs (dbt, Airflow, Python, RFC) are stable references; re-validate the dbt incremental-models guidance if dbt majors past the version current on 2026-06-10.

## Sources

1. dbt Labs - *Incremental models* (official docs): https://docs.getdbt.com/docs/build/incremental-models -- is_incremental()/full-refresh, unique_key null+uniqueness rules, lookback window + incremental_predicates, on_schema_change no-backfill caveat.
2. dbt Labs - *Materializations best practice: Incremental models* (official docs): https://docs.getdbt.com/best-practices/materializations/4-incremental-models -- incremental drift from late-arriving facts, full-refresh as easiest/most-accurate, weekly/monthly full-refresh pattern.
3. dbt Labs - *Data tests* (official docs): https://docs.getdbt.com/reference/resource-properties/data-tests -- not_null / unique / accepted_values / relationships as boundary assertions catching schema drift before downstream.
4. Apache Airflow - *Best Practices* (official docs): https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html -- task idempotency, UPSERT-not-INSERT on rerun, never-read-latest, avoid now(), pin to partition key.
5. Python - *Unicode HOWTO* (official docs): https://docs.python.org/3/howto/unicode.html -- errors= strict/replace/ignore behavior, 'ignore' silent data loss, surrogateescape fallback for unknown encodings.
6. IETF - *RFC 3629: UTF-8, a transformation format of ISO 10646*: https://www.rfc-editor.org/rfc/rfc3629 -- UTF-8 BOM (EF BB BF), signature-only-at-start rule, deliberate strip guidance.
7. Wikipedia - *Record linkage*: https://en.wikipedia.org/wiki/Record_linkage -- match/non-match threshold as precision/recall balance, linkage needed without shared identifier, sensitivity to data quality.
8. Wikipedia - *Extract, transform, load*: https://en.wikipedia.org/wiki/Extract,_transform,_load -- dedup + join across heterogeneous vendor systems, heterogeneous-key example (SSN vs phone vs surrogate), character-set incompatibility.
