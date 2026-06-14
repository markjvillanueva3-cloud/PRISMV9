---
name: reference-master-index-query-telemetry-2026-05-20
description: "2026-05-20 sierra G2 — append-only telemetry of every master-index/tribal search; CLI emits topQueried + topZeroHit (doc-debt by demand) + topLowScore (ranking-tuning) lists; fail-soft + rotated."
aliases: reference_master_index_query_telemetry_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.202Z
---


## SYSTEM-VIZ-HIGH-ROI-MS0 / U-VIZ-G2-QUERY-TELEMETRY — master-index query log

**Shipped:** 2026-05-20 (slot sierra, /loop iter-1)

**Problem:** `runMasterIndexSearch` and `runTribalSearch` were answering queries
but emitting no record — so we couldn't see which terms users asked for,
which returned zero hits (= missing wiki/memory by demand), or which ranked
weakly (= BM25 tuning candidates). G2 was second on the high-ROI audit
because of compounding leverage: every other future signal that asks "what
do operators search for?" leans on this stream.

**Fix:** small pure lib + 4-line wire-in:

- `scripts/lib/master-index-query-log.mjs` — `buildQueryRecord`, `recordQuery`
  (best-effort fail-soft append, 8 MB rotation to `.1`), `aggregateQueryLog`
  (pure), `loadAndAggregate` (file → stats).
- `scripts/lib/master-index-query-log.test.mjs` — 25 `node:test` cases:
  record shape + clamps + rotation + parse-error tolerance + topQueried/
  topZeroHit/topLowScore correctness + roundtrip with real `recordQuery`.
- `scripts/master-index-query-stats.mjs` — CLI: `--top N` `--json`
  `--window Nh|Nd` `--log <path>` `--low-threshold N` `--help`.
- `scripts/lib/master-index-search-lib.mjs` — 4 added lines: import + 2
  call sites tagged `source:"graph"` and `source:"tribal"`.

**Schema** (JSONL): `{ts, terms[], k, hitsReturned, topScore|null, source, v}`.

**R12 + safety**:
- Telemetry NEVER throws — every write fail-soft (returns boolean).
- `PRISM_MASTER_INDEX_QUERY_LOG_DISABLE=1` is the kill switch.
- terms sorted alphabetically inside aggregator → `["wedm","feed"]` and
  `["feed","wedm"]` collapse into one bucket.

**Live first-run:** 3 manual queries via runMasterIndexSearch wrote 735 B
into `state/shared/master-index-query-log.jsonl`; the CLI rendered all
three correctly with topScore range 19.5..lower. By the time the stats
CLI was invoked a peer hook had already added 2 more entries from its own
`master-index-precheck-inject` call — confirming the wire-in catches every
call site without further code change.

**Side-finding:** the G1 type-backfill (yesterday's iter-2) bumped
`system-graph.json` mtime; the existing `system-graph-index.json` sidecar
now fails the `sourceMtimeMs >= graphStat.mtimeMs` staleness gate, so every
master-index call this session degrades to the architecture-graph fallback
(21.8 MB, ~24K nodes). Fix is one `build-graph-index.mjs` invocation;
tracked under separate `U-MASTER-INDEX-SIDECAR-REFRESH`.

**Doctrine:** the prior 2026-05-15 subagent-presearch refactor lesson —
"add I/O to a hot path only behind a fail-soft + kill-switch" — is honored
here. The lib's behavior under `PRISM_MASTER_INDEX_QUERY_LOG_DISABLE=1`
is byte-identical to pre-G2 (one early-return, recordQuery never invoked).

Wiki: [[master-index-query-telemetry]]. Related:
[[reference_system_viz_type_backfill_2026_05_20]] · [[reference_master_index_sidecar_2026_05_19]].
