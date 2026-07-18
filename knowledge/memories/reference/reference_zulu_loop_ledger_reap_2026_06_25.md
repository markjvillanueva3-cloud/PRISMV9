---
name: reference_zulu_loop_ledger_reap_2026_06_25
description: "Fleet loop-state ledger now self-maintains via the zulu orchestrator sweep (reap was never scheduled, 318 stale records had piled up)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.283Z
aliases: reference_zulu_loop_ledger_reap_2026_06_25
---


# Loop-ledger self-maintenance wired into zulu orchestrator (U-ZULU-LOOP-REAP, 2026-06-25, slot:zulu)

Commit `8071bda22a` on `cad-fusion-live-ms0`.

**Problem (measured, not assumed):** the fleet's per-session loop-state records
(`state/shared/loop-state/*.json`) were accumulating unbounded. `loop-state.mjs reap`
(deletes finished loops >4h, flips `running`>4h to `status:"stale"`; `STALE_MS`=4h)
EXISTED but was **never scheduled** -- `CronList` showed 8 build/loop crons and 0
ledger-maintenance crons. Live count was **395 records, 69 of them ghost-`running`**
from crashed/compacted sessions that never called `end`.

**Fix:** new exported fail-soft `reapLoopLedger(env, spawnFn)` in
`scripts/zulu-orchestrator-sweep.mjs`, called inside `main()` **before** the
single-instance lock (so it runs even when a concurrent sweep holds the lock; reap is
idempotent). Every path returns a typed `{ok,...}` object -- a reap error can never
break the sweep. Knob: `PRISM_ZULU_LOOP_REAP_DISABLE=1`. Piggybacks the existing
`PRISM Zulu Orchestrator` scheduled cadence -- serves all 26 slots' loops, no new task.

**Proof:** 9/9 tests (`scripts/zulu-orchestrator-sweep.reap.test.mjs`, injected spawn,
happy + 3 failure + 3 adversarial); live ledger **395 -> 8** (387 reaped across two
passes); live real-subprocess round-trip `reapLoopLedger()` -> `{ok:true,reaped:69}`.
Per-file 2-arm scrutiny PASS (reviewer + code-analyzer).

**Honest reconnaissance finding for the next pass:** the operator's "harden ollama
offloading" premise was mostly already met -- Hermes (`ask-hermes` hook) saved
**282,864 tokens** (165/165 offloaded), `ollama-task-offloader` saved 35,841. The
`ollama-route-pretooluse` 560-fire/0-offload pattern is **correct** (passes source +
sub-threshold reads; only reroutes large gist-safe bulk data in auto mode), not a bug.
The real gaps are advisory hooks that never convert (`large-read-digest-advisory`:
246 suggest / 0 offload) -- a candidate next unit, though sierra/alpha are already on
auto-invoke conversion. See [[feedback_synergy_definition]] · [[feedback_psn_definition]].
