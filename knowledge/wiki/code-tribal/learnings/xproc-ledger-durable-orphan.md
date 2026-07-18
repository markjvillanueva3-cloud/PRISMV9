---
title: The xproc semantic outcome ledger was an in-memory R15 orphan (durability never wired)
type: lesson
slot: india
date: 2026-06-16
tags: [self-improving-loop, outcome-bus, persistence, R15-orphan, reload-dedup, fail-loud, shared-tree-absorption, harness-engineering]
commit: cad-fusion-live-ms0 9b61cfb734 (+ 1a0790fb89 impl absorbed, 5b9aa53883 test)
---

# The self-improving loop ran on volatile memory (slot:india 2026-06-16)

Article-driven (0xCodez "Agent harness engineering": *"almost no one is talking about what the loop runs on"*). PRISM has a rich self-improving loop -- but its SEMANTIC feedback substrate was never made durable.

## The orphan
`CrossProcessOutcomeStore` is the cross-process learning ledger that `xproc_outcome_publish` feeds with real shop-floor outcomes (bridge/process/actual_metrics). The live learners subscribe to it: `CAMLoRAAdapterTrainerEngine` (incremental LoRA), `ConformalPredictionLogEngine` (prediction pairing), `ConformalCalibrationMonitorEngine` (calibration window).

It was **in-memory only**:
- `configureStorePath()` had **ZERO production callers** -- grep proved it (the dist references were the method definition + doc strings, never an invocation).
- `record()` is sync and **never calls `persistEvent()`**. The doc comment "After this call, every record() also [persists]" was aspirational -- the wiring was never done.

So every MCP restart wiped the entire shop-floor outcome history the learners depend on. The persistence machinery (configureStorePath + persistEvent + reload + ~400 lines of tests) was **built + tested but never wired** -- a textbook R15 orphan: code that exists, passes its tests, and does nothing because nothing calls it.

## The fix (without touching the sync record() hot path)
A new india-owned module `XprocOutcomeLedgerDurability.ts`: `ensureXprocLedgerDurable()` subscribes to `outcome.recorded`/`outcome.completed` and persists each via `persistEvent` (append-only jsonl) + calls `configureStorePath` to reload-on-restart. Race-free (subscribe-before-await + cold-start buffer). Idempotent (shared configurePromise). **OPT-IN** via `PRISM_XPROC_LEDGER_DURABLE=1` (default OFF preserves boot semantics for the shared consumers -- activation is a deliberate one-env-var fleet decision, the way PRISM ships every behavior-changing capability). Wired into the adapter funnel (`publish`/`updateOutcome`) + the dispatcher inline handlers.

## Two scrutiny P1s the gate caught (the value of 3-of-3 + adversarial verify)
1. **Reload double-count**: append-only means a pending->terminal transition writes TWO lines for one id. `configureStorePath` reload `push`-ed both -> `events[]` had duplicate id entries -> `replay()`/`replaySince()` double-count after restart. Enabling reload for the first time SURFACED this latent store behavior. Fix: dedup-by-id on reload (replace-in-place, latest wins).
2. **Silent disk-write failure**: a bare `void persistEvent(id)` swallows `fs.appendFile` rejections -> "durable" silently lies on disk-full/EPERM. Fix: `.catch()` + `persistErrors` counter + `console.error` (fail-loud, R12).

Lesson: **when you enable a previously-dormant code path (here: reload, by wiring configureStorePath for the first time), you inherit its latent bugs.** The orphan's reload logic had never run in prod, so its dup-on-reload was invisible until durability triggered it. Audit the dormant path's full behavior before lighting it up.

## Sibling lesson: shared-tree commit absorption
Building this on the shared trunk from a slot chat, staged files got ABSORBED into a peer's commit (a `git-sync`/peer `git add .` + commit swept my staged index), and later a peer's files got absorbed into mine. On the contended shared index (4+ peers + recurring git-sync), `git add` protects untracked files from `git clean` but NOT from a peer's `git reset`/commit -- only a FAST atomic stage+commit in ONE command within a single turn is safe. The `git-add-lane-guard` honors a literal `[MAIN-FORCE]` token in the command itself (the R11 escape) -- the sanctioned bypass for a slot's owned shared surface, no settings-env change.

## Verify
`cd mcp-server && npx vitest run src/__tests__/XprocOutcomeLedgerDurability.test.ts` -> 15/15.
Memory: [[reference_xproc_ledger_durable_2026_06_16]]. Sibling: [[reference_outcome_bus_diversity_2026_06_16]] (the shell-bus monoculture -- the other "what the loop runs on" gap).
