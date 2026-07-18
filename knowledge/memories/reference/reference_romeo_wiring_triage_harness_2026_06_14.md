---
name: reference_romeo_wiring_triage_harness_2026_06_14
description: romeo wiring-triage harness (scripts/romeo-wiring-triage.mjs) + durable cron e8d08c68 — turns the 54-engine UNWIRED audit into a trustworthy ROI-ranked queue with singleton-constructability + dispatcher-existence gates
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.148Z
aliases: reference_romeo_wiring_triage_harness_2026_06_14
---


slot:romeo 2026-06-14, commit `86ebbf15f5` [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-HARNESS.

## What
`scripts/romeo-wiring-triage.mjs` is the romeo autonomous-loop harness (operator ask: "harnessed loops + crons to complete tasks autonomously"). It reads the freshest `state/shared/UNWIRED-ENGINE-AUDIT-*.json` (54 unwired engines on MAIN) and emits a TRUSTWORTHY ROI-ranked `state/shared/ROMEO-WIRING-QUEUE.md`.

## Why it beats the raw audit
The raw `audit-unwired-engines.mjs` proposes a `suggestedDispatcher` but leaves many UNKNOWN and never checks whether a candidate is actually a CLEAN romeo wire. The harness adds 4 gates:
1. **internal-layer** (`Adapter|Bridge|Client|Test|Shim|Bootstrap|Criterion|Refiner|StateMachine`, incl. the `+Engine` wrapped form) -> WIRE-EXEMPT. Romeo refuses wiring an engine consumed by another engine.
2. **AI/owner-internal** (`hermes|grok|deepseek|xproc|neural|tpe|moea|bayesian|lora|...`) -> CROSS-DOMAIN, owner slot decides (romeo refuses cross-domain wiring w/o justification).
3. **singleton-constructability** -- reads each engine source; a DI engine (required ctor args, no `export const x = new X()`) -> NEEDS-REVIEW (not a clean singleton wire; romeo refuses wiring-an-engine-that-throws-on-every-call). Caught EmbeddingGuardEngine (ctor: embedder, config).
4. **dispatcher-existence** -- a suggested dispatcher with no `*Dispatcher.ts` file -> NEEDS-REVIEW (owner must create it first). Caught MITCourse* -> prism_academy (no such dispatcher; lima's to create).

Live partition: **54 -> 21 WIREABLE / 5 cross-domain / 23 WIRE-EXEMPT / 5 review.** #1 verified-clean WIREABLE = `CounterfactualMillEngine -> prism_mill` (zero-arg singleton at line 464, dispatcher exists).

Deterministic core (R5); `--ollama` adds a per-candidate wiring hint via the local model (token-heavy off Claude ctx). 7/7 node:test (`romeo-wiring-triage.test.mjs`): partition completeness + Bridge-is-exempt + DI-is-review + missing-dispatcher-is-review + clean-singleton-is-wireable. Uses `process.execPath` not bare "node" (Windows spawnSync ENOENT).

## Cron
Durable recurring job **e8d08c68** (every 6h at :37, `.claude/scheduled_tasks.json`): refresh audit -> re-run triage --ollama -> wire #1 WIREABLE -> commit. **Auto-expires after 7 days** (recurring-cron limit) -- re-create after 2026-06-21 if still wanted.

## Hazards / honesty (R12)
- The audit MUST be generated from MAIN (`H:/prism` on cad-fusion-live-ms0), NOT the slot worktree (`H:/prism-slot-romeo`, ~3000 commits behind) -- a stale slot makes wired engines look unwired ([[feedback_romeo_check_main_not_slot_for_dormancy]]). Verified this run ran against MAIN.
- The task list marked CounterfactualMill/ERPImport/Subprogram/BarRemnant/Turret "completed" but they are 0-dispatcher-ref on MAIN -- those prior wirings landed on slot/romeo and never merged. They ARE genuinely unwired on MAIN, so they're legit queue entries.
- A cron cannot itself write dispatcher wiring (that's Claude reasoning); the cron keeps the QUEUE fresh + drives a wiring attempt when the REPL is idle.

Re-run: `node scripts/audit-unwired-engines.mjs && node scripts/romeo-wiring-triage.mjs --ollama`. Galaxy: [[reference_wiring_reachability_dispatch_2026_06_13]].
