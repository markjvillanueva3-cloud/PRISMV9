---
title: Self-imposed utilization governors + the deliberately-disabled cron ledger
created: 2026-06-25
slot: sierra
tags: [utilization, scheduled-tasks, fleet-hygiene, ollama-offload, self-healer, governor, blackwell]
commits: [U-CRON-DELIBERATE-LEDGER, U-CRON-LEDGER-GUARD]
related: [[fleet-task-health-ms0]] [[ollama-pipeline-ms0]] [[fleet-task-health-recovery]] [[ollama-wedge-recovery-disabled-task-brick-2026-06-23]]
---

# Self-imposed utilization governors (sierra /goal, 2026-06-25)

Operator /goal: *"fully exploit everything we've built to its fullest potential, never hamper the potential of anything"* + *"why did we settle for 30%?"*. The durable lesson: on a high-capacity box (96GB Blackwell) the backend-dev utilization gap is almost never **capacity** -- it is **self-imposed governors**: things we built that throttle *themselves* below the hardware. Hunt these, not "is the GPU big enough."

## The governor taxonomy (what to look for)

1. **A dark self-healer.** `Get-ScheduledTask PRISM*` showed **51 of 77 Disabled** -- root cause was that the daily `PRISM Task Hardener` (runs `.claude/helpers/harden-prism-tasks.ps1`, which re-enables every valid-script task) **was itself disabled**. One dark meta-healer => unbounded drift. Re-enabling 45 light+heavy crons took fleet health **35/88 -> 76/88**. Lesson: audit the *healer's own* enabled-state first; a dark self-healer hides N dark children.
2. **Detect-only pipelines.** Ollama offload ran ~2% conversion: `executedOffloads:5` vs `silentSuggestions:259`; `large-read-digest-advisory` fired 234 -> executed 0. By design (`ollama-task-offloader.mjs:368`) *"Claude owns execution"* -- there is no execution arm, so a nudge-only system converts at model-compliance rate (~2%). A *background* drainer does NOT fix inline offload (the result is needed in-conversation; background = prompt latency). The batch-offload "drainer" IS the cron fabric (galaxy-mine/synthesis). Inline is behavioral.
3. **Frozen recovery-floors read as targets.** "30% offload" was a 13.8%->recovery milestone that ossified into doctrine. A floor is not a ceiling. Re-derive the real ceiling (~all mechanical/non-safety ops local), don't chase the frozen number.
4. **`%TEMP%` runner scripts.** `Tribal Consolidate Weekly`'s task ran a script under `C:\Users\...\AppData\Local\Temp\` -- the OS/Tmp-Sweep cleans it, the script vanishes, the hardener's scriptMissing guard correctly darks the task. An installer that writes its runner to `%TEMP%` builds a task that silently dies. (Left dormant here because it is a tribal-index mutator = the fragile 537MB domain.)

## The fix that compounds: a deliberately-disabled ledger

`harden-prism-tasks.ps1` did `Enabled = -not scriptMissing` -- which blindly resurrects completed one-shot migrations every 24h. Added `state/shared/fleet/deliberately-disabled-tasks.json` (schemaVersion 1.0.0, **fail-OPEN** on parse error -- a corrupt ledger degrades to "migrations re-enable" = harmless noise, never a fleet outage) that the hardener honors: `Enabled = (-not scriptMissing) -and (-not isDeliberate)`.

**Two scrutiny arm-C P1s the gate caught (and why they matter):**
- **Load-bearing guard.** A ledger with no guard lets a future editor dark a crash-critical reaper (Fleet Reaper / MCP Server). Fix: a `$crashCritical` allowlist (mirror of `MUST_EXIST_TASKS`+`CRASH_CRITICAL_TASKS`) that forces ENABLED + WARN if a safety net is ever ledgered. **A "keep-this-off" mechanism must refuse to turn off a safety net.**
- **Single source of truth across two self-healers.** The hardener kept tasks dark, but `fleet-task-health-watch.mjs` only suppressed their WARN while `MIGRATION-FREEZE-ACTIVE.flag` existed -> deleting the flag = permanent false-WARN. Fix: the watcher reads the SAME ledger (`readDeliberatelyDisabledTasks()`, merged into `expectedDisabled`, OR'd so it is freeze-independent). **Two healers acting on the same state must read one ledger, or they contradict.**

## Don't-chase-phantoms corollary

Confirmed two **non-bugs** rather than "fixing" them (R12, the dashboard scar): `Fleet Task Health` exit-1 is a *by-design* unhealth signal (`exitCode = level==='warn' ? 1 : 0`); `Galaxy Synthesis Refresh` exit-3 was a *transient* (Ollama not warm), runs clean now. And an auto-resume loop synthesized a phantom "fix the qwen2.5-coder JSDoc drift" task from a commit message -- but that drift was already fixed (`U-ZULU-ROUTE-MODEL-DOCDRIFT`) and the remaining refs are the correct Blackwell defaults. Verify a synthesized "next action" against current code before chasing it.

See [[reference_sierra_utilization_governor_audit_2026_06_25]] (memory) for the full audit.
