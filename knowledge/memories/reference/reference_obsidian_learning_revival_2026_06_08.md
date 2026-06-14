---
name: reference-obsidian-learning-revival-2026-06-08
description: "OBSIDIAN-HERMES-CONTEXT-ACCEL/U-LEARN-REVIVE01 — no-elevation self-heal actuator that lights PRISM's dark offline context-learning loop (lever"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.231Z
aliases: reference_obsidian_learning_revival_2026_06_08
---


# Obsidian/Hermes offline-learning revival actuator (lever #4, slot:papa, 2026-06-08)

**What was dark:** PRISM compounds context offline via two Hermes memory-synthesis engines — `hermes-dream-cycle-synth.mjs` (nightly Jaccard cross-memo connection discovery → `knowledge/memories/dreams/<date>.md`) and `hermes-self-reflect-populater.mjs` (weekly → `weekly-hermes-reflection-<sunday>.md`). Both are driven by Windows scheduled tasks. On 2026-06-08 BOTH tasks were **Disabled** (not "missing" as the spec guessed) and dream output was frozen at `2026-06-04.md` = **4 nights of zero offline compounding**. `fleet-task-health-watch.mjs` DETECTS the dark task and names the elevated re-enable, but by design never actuates — so the loop stayed dark until an operator opened an elevated shell.

**The insight (the whole lever):** the synth ENGINES are pure `.mjs` (mechanical, no LLM, <2s) needing **NO elevation**. Reviving the scheduled TASK needs admin; running its ENGINE does not. So this turn (a) ran both engines directly → produced `dreams/2026-06-08.md` (11211 memos, 200 connections) + `weekly-hermes-reflection-2026-06-07.md`, lighting the loop immediately; (b) built the durable actuator.

**Shipped (commit on `cad-fusion-live-ms0`, `[OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-LEARN-REVIVE01`):**
- `scripts/obsidian-learning-revival.mjs` — imports `sampleScheduledTasks`/`classifyTask`/`smallestIntervalMs`/`DEFAULT_STALE_MULTIPLIER` from `fleet-task-health-watch.mjs` (single source of truth — NO re-enumeration), checks output freshness, spawns the engine ONLY when the period's output is stale, then VERIFIES the output file landed (R12: green exit + no file = `failed`, not `revived`). Idempotent (fresh output ⇒ skip — a same-day dream file is the sole skip condition). Pins the engine to the SAME probed `--date`/`--anchor` it re-probes, so a `23:59:59Z` pass can't false-fail on UTC rollover. NEVER enables/registers a task (elevation-free by design — the detector owns naming that fix).
- `.claude/hooks/obsidian-learning-revival-sessionstart.mjs` — SessionStart arm: fail-soft, throttled (30min, collapses 26 boots → 1 run), detached-spawns the actuator, surfaces last revival/failure. **Wired in the LIVE harness settings `H:/.claude/settings.json` SessionStart array (timeout 3000)** — NOTE the git-tracked `H:/prism/.claude/settings.json` is a SEPARATE peer-managed copy that did NOT receive this entry; the c-to-h mirror writes C: → `H:/.claude`, which is what the harness reads. Wiring is functional; don't commit the repo copy.
- 26 tests (19 actuator + 7 hook), all injected sampler/spawn/io (no real PowerShell/engine in test). 3-of-3 scrutiny cleared.

**Knobs:** `PRISM_OBSIDIAN_REVIVAL_{DISABLE,TIMEOUT_MS,STALE_MULT}`.

**Operator durable fix (still the right thing, needs elevation):** `Enable-ScheduledTask -TaskName 'PRISM Hermes Dream-Cycle Synth'` (+ `Self-Reflect Weekly`), or `.claude/helpers/install-hermes-*-task.ps1 -RunNow`. The actuator is the fail-soft FLOOR under that, not a replacement.

**Bug found by scrutiny reviewer-C (R12 regression class — both per-file reviewers + scrutiny A/B missed it):** `appendTelemetry`/`appendChatBus` originally guarded only `mkdirSync`, not the `appendFileSync`. Those run AFTER outcomes are finalized `revived`. An `appendFileSync` EACCES/ENOSPC throw propagated out of `runOnce` → CLI mapped ANY throw to `exit(2)` "measurement failure" → **a revival that physically succeeded was reported as a total failure, and the telemetry row the SessionStart hook reads was never written** (self-heal silently dropped). Fix: appends are now fully best-effort (swallow-with-stderr-warn, never throw) + a regression test asserting a write-fail keeps `revived`/exit-0. Lesson: a non-load-bearing side-channel write (telemetry/log) must never alter the exit code of the load-bearing operation it describes.

Source spec: `state/shared/specs/OBSIDIAN-HERMES-CONTEXT-LEARNING-ACCEL-2026-06-06.md` (ranked lever synthesis; #1 L5 source-chain + #2 PSN-attribution already shipped; #3 compaction→memo emitter is next). Related: [[reference_fleet_task_health_ms0_2026_05_17]] (the detector this reuses), [[feedback_psn_definition]] (Obsidian brain = PSN leg #1).
