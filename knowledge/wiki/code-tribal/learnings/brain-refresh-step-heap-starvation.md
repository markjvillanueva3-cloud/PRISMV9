---
title: Brain-refresh step OOM under a heap-capped parent -> false brain-FAILED:vault-links alarm
type: lesson
slot: sierra
unit: U-SIERRA-BRAIN-STEP-HEAP
date: 2026-06-28
tags: [brain-refresh, vault-health, false-positive, heap-oom, spawn, NODE_OPTIONS, watchdog, system-viz]
---

# Brain-refresh step OOM under a heap-capped parent -> false brain-FAILED alarm

## Symptom
Every SessionStart injected `overnight brain-refresh FAILED -- FAILED: vault-links` fleet-wide.
But `vault-link-doctor.mjs --ambiguous` run standalone exits 0 and produces a healthy
ambiguous-links report (11 links). The last-run record showed `vault-links -> failed (3796ms)` --
a *fast* failure, nowhere near the step's 300s timeout.

This is a DISTINCT bug from the prior stale-read false alarm ([[brain-refresh-rollup-stale-read]]):
that one was a read-ordering artifact; this one is a *genuine* fast OOM in the spawned step.

## Root cause -- heap-cap starvation across the spawn boundary
`brain-refresh.realRunStep` spawns each pipeline step via
`execFileSync(process.execPath, [scriptPath, ...args])` with **no explicit `--max-old-space-size`**.
The child inherits whatever heap context the parent runs under. When brain-refresh runs in a
heap-capped context -- a Stop-hook / portable-node 384MB cap, or an inherited
`NODE_OPTIONS=--max-old-space-size=384` -- the heavy `vault-link-doctor` step (it loads ALL ~22k
vault `.md` files into memory to resolve ambiguous links) hits the V8 heap ceiling and crashes in
~3.8s with `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`.

Standalone (interactive shell, `NODE_OPTIONS=[]`, full-heap stock node) the same step exits 0 --
which is why the failure was invisible to manual runs and only bit the capped overnight context.

Decisive proof: `node --max-old-space-size=384 scripts/vault-link-doctor.mjs --ambiguous` ->
`FATAL ERROR: Reached heap limit`; the same step inside brain-refresh under
`NODE_OPTIONS=--max-old-space-size=384` flips `failed(3.8s)` -> `ok(8s)` after the fix.

A compounding **opacity** bug hid the cause: `realRunStep` discarded the child's `e.stderr` and
`buildLastRunReport` dropped the per-step `err` field entirely, so the durable record recorded a
bare `failed` with no reason -- the FATAL heap message never surfaced.

## Fix (`scripts/brain-refresh.mjs`, mirrors nn-graph-retrain-lifecycle `nodeArgsWithHeap`)
- `stepNodeArgs()` prepends an explicit `--max-old-space-size` (default 4096, floored 512) before
  the script path. A command-line `--max-old-space-size` is applied after, and overrides, any
  `NODE_OPTIONS` value -- so a capped parent can no longer starve a step.
- `sanitizeChildEnv()` strips an inherited `--max-old-space-size` from the child `NODE_OPTIONS`
  (belt-and-suspenders; all other env -- PATH/PRISM_*/OLLAMA_*/other NODE_OPTIONS flags -- passes
  through faithfully).
- `stderrTail()` + carrying `err` through `buildLastRunReport`: the child's real stderr cause
  (prefers a FATAL/heap/Error marker) now lands in the durable `.brain-refresh-last-run.json`, so a
  future failed step self-diagnoses instead of a forensic dig.
- 6 new R9 tests (heap-arg ordering/floor, env-strip both `=N` and ` N` forms, stderr-marker
  priority, end-to-end opacity carry). 79/79. Per-file 2-arm scrutiny PASS.

## Generalizable lesson
When an orchestrator spawns child steps via `process.execPath` AND those children do heavy work,
the children inherit the parent's heap context -- a capped parent silently starves a heavy child
into a fast OOM that looks like a step "failure". Give every spawned heavy step explicit heap
headroom at the spawn site, never rely on the inherited limit. And always surface a failed child's
stderr tail into the durable record -- a bare "failed" with no cause turns every future failure
into a forensic dig (sibling of the watchdog false-positive class:
[[brain-refresh-rollup-stale-read]], MCP false-positive, ollama-localhost probe,
taskhealth-overnight stale-flag, token-awareness stale-zone). The same class already bit the GNN
retrain lifecycle (`8d6a481080`): a parent that spawns a heap-bumped child but also does heavy work
in its own process needs the bump too.

## See also
- memory `reference_sierra_brain_step_heap_2026_06_28`
- `reference_ai_systems_6unit_complete_2026_06_11` (the nn-graph-retrain-lifecycle heap-reexec sibling)
- [[brain-refresh-rollup-stale-read]] (the prior, distinct brain-refresh false-alarm)
