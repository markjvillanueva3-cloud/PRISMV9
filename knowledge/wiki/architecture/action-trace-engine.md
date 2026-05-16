---
title: ActionTraceEngine (D4 — agent-write trace log)
kind: architecture
milestone: OBSIDIAN-INTELLIGENCE-MS3/U-ACTION-TRACES
status: current
created: 2026-05-16
---

# ActionTraceEngine — append-only agent-write trace log

OBSIDIAN-INTELLIGENCE-MS3 / U-ACTION-TRACES (D4). Ship commit `f432ace7`.

## What it is

Every agent write (memory mirror, wiki write, file Edit/Write) can be recorded
as one graph edge:

```
{ ts, agent, sessionId, promptHash, tool, target, action }
```

The log is an **append-only JSONL** at `state/shared/action-traces.jsonl`.
`recordTrace` only ever `appendFileSync`s one newline-terminated line — never
rewrites/truncates/sorts. Rollback = stop calling `recordTrace`; the JSONL
stays as the historical record. `queryTraces` is read-only.

## Surfaces

| Surface | Path |
|---------|------|
| Engine | `mcp-server/src/engines/ActionTraceEngine.ts` (`recordTrace`, `queryTraces`, `hashPrompt`, `ActionTraceEdgeSchema`, frozen `actionTraceEngine` singleton) |
| Dispatcher | `prism_session:action_trace_query` (read-only filter/limit/order; absolute log path stripped to basename through the MCP surface) |
| Schema | `sessionActionSchemas.ts` → `action_trace_query` (`.strict()`, all filters optional) |
| Test | `mcp-server/src/__tests__/ActionTrace.test.ts` (22 cases, hermetic temp file via `PRISM_ACTION_TRACE_FILE`) |
| Overlay | `scripts/system-viz-action-overlay.mjs` → read-only `state/shared/system-viz/staging/action-trace-overlay.json` (per-agent/tool/target rollups + hourly timeline; `promptHash`+`sessionId` dropped from `recent[]`) |

## Load-bearing invariants

- **ts normalized to canonical UTC `Z` in `recordTrace`** — makes the
  `sinceTs` lexical-compare invariant in `queryTraces` true by construction
  (an offset/epoch `ts` would otherwise sort wrong under string `<`).
  Unparseable `ts` throws (fail-loud, Karpathy R12).
- **`recordTrace` validates against the strict Zod edge schema BEFORE
  appending** — never writes junk the overlay can't read.
- **`queryTraces` is resilient** — missing file → empty result (not throw);
  corrupt/schema-invalid line → skipped + counted (one torn concurrent
  append must not blind the timeline).
- **`limit<=0`/NaN guard is intentional** — defends the direct-API path
  (test + a future PostToolUse hook bypass the dispatcher's `.positive()`
  schema); falls back to 1000.
- **Overlay is read-only w.r.t. the graph** — writes only its own staging
  sidecar (verified: no system-viz regen consumer globs `staging/*.json`),
  atomic write + tmp-orphan sweep, honest empty-state exit 0.

## Knobs

- `PRISM_ACTION_TRACE_FILE` — override the log path (engine + overlay both
  honour it; used for hermetic tests).

## Follow-up (NOT in D4 scope)

- A PostToolUse hook calling `recordTrace` on every agent write (the
  write-path has no production caller yet — engine is non-orphan via the
  query action; documented in-file).
- Tail-read / rotation when the JSONL grows past ~tens of MB or a
  cross-host shared-volume scenario appears (single-host ≤12-chat fleet
  volume is fine with full `readFileSync`).

Memory: [[reference_d4_action_traces_2026_05_16]]. Sister D-series:
[[reference_e1_ideablock_extractor_2026_05_15]] (D2 ontology + D1 provenance
are the other memory-layer units in this milestone).
