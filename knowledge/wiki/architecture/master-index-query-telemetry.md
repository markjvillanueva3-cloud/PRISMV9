---
name: master-index-query-telemetry
description: G2 from SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 — append-only telemetry of every master-index/tribal search; CLI aggregates popularity/zero-hit/low-score lists for doc-debt + ranking-tuning.
type: architecture
status: shipped
shipped_at: 2026-05-20
slot: sierra
commit_scope: SYSTEM-VIZ-HIGH-ROI-MS0
unit_ids:
  - U-VIZ-G2-QUERY-TELEMETRY
related:
  - "[[system-viz-type-backfill]]"
  - "[[master-index-surface]]"
  - "[[master-index-sidecar-2026-05-19]]"
---

# master-index query telemetry (G2)

Closes the "we don't know what users are searching for" gap. Before this unit
`runMasterIndexSearch` / `runTribalSearch` answered queries but emitted no
record of which terms were asked, how many hits came back, or how strong the
top match was — so we couldn't surface (a) missing wiki/memory entries by
demand (zero-hit queries), (b) weak-ranking queries that need BM25 tuning,
or (c) popularity to guide cache/index investment.

## Files

- `scripts/lib/master-index-query-log.mjs` — pure record + aggregator. Best-effort
  append, fail-soft never-throws. 25 `node:test` cases.
- `scripts/lib/master-index-query-log.test.mjs` — hermetic tmpdir tests.
- `scripts/master-index-query-stats.mjs` — CLI runner. `--top N`, `--json`,
  `--window <Nh|Nd>`, `--log <path>`, `--low-threshold N`, `--help`.
- `scripts/lib/master-index-search-lib.mjs` — 4 new lines wiring `recordQuery`
  into both `runMasterIndexSearch` (source=graph) and `runTribalSearch`
  (source=tribal).

## Schema (JSONL line)

```json
{
  "ts": "ISO-8601",
  "terms": ["..."],            // up to 16 tokens (clamped)
  "k": 5,                       // requested topK
  "hitsReturned": 3,            // actual after dedup + topK clamp
  "topScore": 19.5,             // null when 0 hits
  "source": "graph"|"tribal",
  "v": "1.0.0"
}
```

## Storage + rotation

- Log: `state/shared/master-index-query-log.jsonl`
- Rotation: when current file exceeds `maxBytes` (default 8 MB), rename to
  `.1` and start fresh. Single rotation depth — older history dropped.
- Aggregator reads current + `.1` by default; `--includeRotation=false` disables.

## Three actionable lists

1. **topQueried** — popularity ranking. Investment guide for cache/index
   improvements.
2. **topZeroHit** — queries returning 0 hits. Each one is **doc-debt by
   demand**: a wiki/memory entry the operator expected to exist but doesn't.
   The most direct PRISM doc-coverage signal we have.
3. **topLowScore** — queries with `topScore < threshold` (default 5).
   Ranking-tuning candidates: matches exist but rank weak. Surface the term
   bag for BM25 weight investigation.

## R12 + safety properties

- Telemetry NEVER throws into a search hot path (every appendFileSync wrapped
  in fail-soft try/catch).
- Knob: `PRISM_MASTER_INDEX_QUERY_LOG_DISABLE=1` skips writes entirely.
- Schema version pinned (`v:"1.0.0"`); future-incompatible records will be
  caught by aggregator's parseError counter rather than silent corruption.
- Order-independence: aggregator sorts `terms` alphabetically before
  hashing into the query key, so `["wedm","feed"]` and `["feed","wedm"]`
  collapse to one entry.

## Verify

```bash
cd H:/prism
node --test scripts/lib/master-index-query-log.test.mjs   # 25/25
node scripts/master-index-query-stats.mjs --top 10        # human
node scripts/master-index-query-stats.mjs --json --top 50 > /tmp/stats.json
```

## Wire-up

The telemetry is automatic once this commit lands — every existing call site
of `runMasterIndexSearch` (master-index-precheck-inject, subagent-start-context,
master-index dispatcher actions) and `runTribalSearch` (tribal-by-domain-inject,
spawned-agent-context-lib) records on every call.

## Pending follow-ups

- `U-VIZ-G2-WEEKLY-CRON`: scheduled-task or Stop-hook reader to digest the log
  into a weekly snapshot under `state/shared/master-index-query-stats-<week>.md`.
- `U-VIZ-G2-WINDOW-FILTER`: the `--window` flag is wired but not yet applied
  in the aggregator (R12 honesty note shipped in the CLI). One follow-up
  adds the ts-range filter pre-aggregate.
- `U-VIZ-G2-DOC-DEBT-FEED`: feed `topZeroHit` directly into the wiki-debt
  worklist so demand-side gaps drive doc generation.

## Side-finding (separate follow-up unit)

The G1 type-backfill bumped `system-graph.json` mtime to 2026-05-20T07:45;
the existing sidecar (`system-graph-index.json`) was built earlier and now
fails the `sourceMtimeMs >= graphStat.mtimeMs` staleness gate. Every
master-index call this session degraded to the architecture-graph fallback
(21.8 MB, ~24K nodes) instead of the full 250K-node graph. Fix: re-run
`scripts/build-graph-index.mjs` once. Tracked separately under
`U-MASTER-INDEX-SIDECAR-REFRESH`.
