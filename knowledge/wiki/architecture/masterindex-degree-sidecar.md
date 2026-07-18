---
title: Master-index degree sidecar (over-cap graph utilization restore)
type: architecture
status: current
created: 2026-07-05
slot: sierra
unit: U-SIERRA-MASTERINDEX-DEGREE-SIDECAR
commit: fc14c925cd, f7863136df
tags: [system-viz, master-index, sidecar, utilization, degree, over-cap, schema-drift, R15]
aliases: [degree-sidecar, master-index-degree-sidecar, over-cap-degree-restore]
---

# Master-index degree sidecar

## Problem
`state/shared/system-viz/system-graph.json` grew past V8's ~512MB max-string
length (915MB as of 2026-07-05). `readFileSync(,"utf8")` throws above it, so the
2026-07-04 fix ([[masterindex-sidecar-read]], `5a495e15cb`) kept **search** alive
by falling back to the parseable `system-graph-index.json` sidecar — but that
sidecar carried **nodes only, no edges**. So in/out-degree, utilization ranking,
and hub/orphan/ghost classification degraded fleet-wide: `classifyAllNodes`
returned an empty dashboard, every `getNodeStatus` reported `degreeUnavailable`.
The commit itself flagged the fix: *"shard/bound below 512MB or emit a degree sidecar."*

## Fix: emit a degree sidecar (fc14c925cd)
`scripts/build-graph-index.mjs` already reads the full graph — **including
edges** — via `readGraphStreaming` (`scripts/lib/graph-io.mjs`, byte-walks
off-heap, bypasses the 512MB cap). So edges are already in memory at build time;
the builder just never looked at them. It now tallies per-node in/out-degree from
`graphObj.edges` and emits (schema `1.0.0`→`1.1.0`):

```
degrees: { in: number[], out: number[], maxIn: number }
```

`in`/`out` are **index-aligned to `nodes[]`** (pushed in lockstep with
`nodes.push`, so a skipped node never misaligns columns). `maxIn` is the
graph-wide max in-degree. Edge validity (`from`/`to` must be strings) mirrors
`MasterIndexEngine.buildGraphCache` **exactly** — pinned by an emit↔restore
round-trip test. `MasterIndexEngine` rehydrates `inDegree`/`outDegree`/
`maxInDegree` from the block (length-guarded), sets a new `degreesAvailable` flag,
and the 3 degraded consumer sites gate on `!degreesAvailable` (not
`sidecarFallback`). A degree-carrying sidecar restores **full function without
loading the 915MB string**. Legacy 1.0.0 sidecars degrade exactly as before.

## The P1 that scrutiny caught (f7863136df)
`system-graph-index.json` has **two independent readers**. The engine
(`MasterIndexEngine.ts`) was updated; `scripts/lib/master-index-search-lib.mjs`
(used by the large-heap `master-index-daemon.mjs` for fleet search) was **not** —
it strict-rejected `schemaVersion !== "1.0.0"`, so the live 1.1.0 sidecar was
rejected and the daemon silently fell back to the 59MB architecture graph,
re-degrading the exact fleet search it exists to fix. Masked because its test
fixture hard-coded `"1.0.0"`.

Fix: the `degrees` block is purely additive and this reader consumes only
`nodes`+`inverted`, so the gate is now **major-version compatible**
(`sidecarSchemaCompatible`) — additive minor bumps pass, a breaking major (2.x)
is rejected → safe legacy degradation. **Lesson: when you bump a shared artifact's
schema version, grep for EVERY reader of that artifact and propagate — a strict
`!==` version gate turns an additive bump into a silent breaking change.**

## Live validation (915MB over-cap graph)
Regen: 389,665 / 389,955 nodes wired, `maxIn` 66,578, 18.9s.
- `classifyAllNodes`: `nodesScanned` **211,272** (was 0) — hubs 12,253 · sinks
  16,633 · sources 18,701 · orphans 14,463 · ghosts 25,778.
- `getNodeStatus(dispatcher-calc)`: inDegree 3,020, outDegree 1,355, util 0.72.

## Operational note
Emitted on every `build-graph-index.mjs` run (the path `regen-viz` invokes), so it
stays fresh with the graph. If utilization reads degraded again: `node
scripts/build-graph-index.mjs`.

## Follow-up fix: `totals.normal` phantom key (2026-07-05, slot:sierra)
The Live-validation list ABOVE originally omitted `normal` — because of a sibling
bug in the SAME `classifyAllNodes`. The flat `totals` accumulator derived its bucket
key by suffixing the class name with `s` (a template literal + `as keyof typeof
totals` cast). Five classes pluralize to real keys, but the `totals` type
deliberately used the SINGULAR key `normal` — so `normal` suffixed to `normals`, a
phantom property absent from the type (the `as keyof` cast silenced the TS error),
and `totals.normal` stayed permanently **0**. Live it was really **123,444 (58% of
211,272 nodes)** — the dashboard under-reported by more than half. No automated
consumer reads the field (`sessionDispatcher` opaque passthrough, input-only schema),
so nothing broke, but a human reading the dashboard was badly misled.

Fixed with an exhaustive `Record<UtilizationClass, Exclude<keyof typeof totals,
"nodesScanned">>` bucket map (`normal → "normal"`), dropping the `as keyof` cast — a
new `UtilizationClass` without a bucket is now a COMPILE error, not a silent 0. The
dashboard test was strengthened to the exact partition `hubs+sinks+sources+orphans+
ghosts+normal === nodesScanned` (fails against the pre-fix code). **Corrected live
counts:** hubs 12,253 · sinks 16,633 · sources 18,701 · orphans 14,463 · ghosts
25,778 · **normal 123,444** · sum **211,272**. **Lesson: never derive a typed-counter
key by string-munging an enum member + `as keyof` cast — map explicitly with a
`Record` so the compiler enforces it.** Memory:
[[reference_sierra_masterindex_totals_normal_key_2026_07_05]].

## Related
- [[masterindex-sidecar-read]] — the 2026-07-04 search-restore fix this completes
- [[master-index-surface]] · [[cheap-node-access-ms0]] (sibling sidecar, same builder)
- `scripts/lib/graph-io.mjs` `readGraphStreaming` — the >512MB-safe reader
- Doctrine: R15 (wire→test→validate→apply), R12 (fail loud), schema-drift-propagation
