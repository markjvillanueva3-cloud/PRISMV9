---
title: Brain-refresh rollup stale-read -> false brain-FAILED SessionStart alarm
type: lesson
slot: sierra
unit: U-SIERRA-BRAIN-ROLLUP-FRESH
date: 2026-06-28
tags: [brain-refresh, vault-health, false-positive, watchdog, read-ordering, system-viz]
---

# Brain-refresh rollup stale-read -> false brain-FAILED alarm

## Symptom
Every SessionStart injected `overnight brain-refresh FAILED -- FAILED: vault-links (4/8 pipelines ok)`, yet:
- live `.brain-refresh-last-run.json` had `verdict:deferred`, `failedSteps:[]`, `vault-links status:ok`
- a direct `node scripts/vault-link-doctor.mjs --ambiguous` exited 0

A fleet-wide false alarm.

## Root cause — read-ordering staleness
`vault-health` is the **last step inside** `brain-refresh`. Its child (`vault-health.mjs`) reads `.brain-refresh-last-run.json` to build the "brain-refresh" rollup row in the cached `vault-health.json` — and that cached file is what the SessionStart brain-health inject reads.

But `brain-refresh.mjs::main()` publishes the durable last-run record **only after all steps finish** (`realWriteLastRun(buildLastRunReport(result, ...))`). So when the `vault-health` step runs, the on-disk record is still the **previous** run's — which had a genuine vault-links timeout under fleet load. The rollup baked "FAILED: vault-links" into `vault-health.json`; the fresh clean record was written afterward. Net: the cached rollup is structurally one cycle stale. The `4/8` off-by-one (the live record has 5 ok) is the tell.

Decisive proof: cached `vault-health.json` row = `warn :: FAILED: vault-links (4/8)` while a fresh live `vault-health --json` recompute (reading the current record) = `info :: deferred (Ollama down; 5 ran)`.

## Fix
`scripts/brain-refresh.mjs` (4 surgical edits): flush a provisional **current-run** last-run record to disk right before the consumer reads it.
- `ALL_STEPS` vault-health step gains `consumesLastRun: true`.
- `executeRefresh` gains optional injected `flushLastRun`/`nowIso`; before any `consumesLastRun` step it flushes `{...buildLastRunReport(partial), provisional:true}`.
- `orchestrate` threads `flushLastRun` from deps + `nowIso` from `now`.
- `main()` wires `flushLastRun: realWriteLastRun`. The end-of-run final write still finalizes the complete record.
- 6 new R9 tests (RED pre-fix). 74/74. 2-arm scrutiny PASS.

## Generalizable lesson
A rollup/summary step that READS a record its own parent run hasn't published yet is **structurally one-run stale**. Publish a provisional current-run record before the consumer reads it (or move the consumer after the publish). This is the watchdog false-positive class (sibling: MCP false-positive, ollama-localhost probe, taskhealth-overnight stale-flag, token-awareness stale-zone). A false "FAILED" on every SessionStart erodes trust and masks real failures — the R12 cry-wolf inversion.
