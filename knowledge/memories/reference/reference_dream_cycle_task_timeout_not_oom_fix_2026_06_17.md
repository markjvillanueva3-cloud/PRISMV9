---
name: reference_dream_cycle_task_timeout_not_oom_fix_2026_06_17
description: "The Hermes Dream-Cycle cron's 267014 'failure' was NOT an OOM (a pass-1 assessment mislabel) -- 267014 = SCHED_S_TASK_TERMINATED, i.e. the run hit the task's ExecutionTimeLimit. The PT2M (120s) cap was sized for a ~700-memo no-LLM no-cascade job; since then corpus->19K + --llm-synth + the unbounded galaxy-cascade tail were added, so the nightly job overran 120s and was OS-killed even though the dream md was already written. Fix: raise the task limit 2min->30min + give the cascade execFileSync a 20min self-timeout (fail-soft)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.557Z
aliases: reference_dream_cycle_task_timeout_not_oom_fix_2026_06_17
---


# Dream-Cycle 267014 = task-timeout, NOT an OOM (2026-06-17, slot:bravo)

## Symptom
`PRISM Hermes Dream-Cycle Synth` scheduled task showed `LastTaskResult 267014`
every night. A pass-1 Hermes assessment (`HERMES-FULL-ASSESSMENT-2026-06-17.md`)
labeled it an **OOM** and prescribed a heap bump. That was an UNVERIFIED
assumption — the same trap as [[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]]
(an ambiguous exit code is not an OOM without a FATAL marker).

## Root cause (proven, R12)
- `267014 = 0x41306 = SCHED_S_TASK_TERMINATED` = "the run was *terminated*"
  (time-limit / external kill), NOT an OOM. No FATAL/heap marker exists.
- The task had `ExecutionTimeLimit = PT2M` (120s), set in
  `.claude/helpers/install-hermes-dream-cycle-task.ps1` with a comment sized for
  the ORIGINAL ~700-memo, no-LLM, no-cascade synth (slot:alpha, 2026-05-27).
- The synth ALONE = ~9s over 19,156 memos (measured; the 2026-06-04
  inverted-index fix in `findConnections` holds). The dream md
  (`knowledge/memories/dreams/<date>.md`) is written successfully every night —
  the OUTPUT was never the problem.
- Three things were bolted onto the nightly job since the cap was set, none
  re-sizing it: (1) corpus ~700 -> 19K memos; (2) the action gained `--llm-synth`
  (qwen2.5-coder:32b cold-load + per-edge Ollama calls <=30s each); (3) the
  `runGalaxyCascade` tail (2026-06-11) spawns `galaxy-synthesis-refresh.mjs` with
  NO timeout (Ollama L1 regen + sidecar rebuilds — MINUTES when galaxies changed;
  blunt sibling B1 ~= 20min).
- So synth(9s)+llm-synth+cascade routinely overran 120s -> OS-killed at the limit
  -> 267014, AFTER the dream md was already written (the synth writes the md, THEN
  spawns the cascade, THEN `process.exit(0)` — the kill landed in the cascade tail).

## Fix
1. `install-hermes-dream-cycle-task.ps1`: `ExecutionTimeLimit` 120s -> **30 min**
   (generous, still bounded). The LIVE task was updated in place via
   `Set-ScheduledTask` (no elevation needed for the current user's S4U task);
   verified `PT30M`.
2. `scripts/hermes-dream-cycle-synth.mjs::runGalaxyCascade`: the `execFileSync`
   now self-times-out at **20 min** (`PRISM_DREAM_CASCADE_TIMEOUT_MS`, < the 30min
   task limit) and treats a timeout as **fail-soft**. On Node v22.12.0 a timeout
   throws with `killed=undefined` but `code='ETIMEDOUT'` (proven live) — so the
   detection MUST be `killed===true || code==='ETIMEDOUT'`; the ETIMEDOUT clause is
   the load-bearing one, `killed` is the older-node fallback.

## Why this guarantees green
The CLI does `process.exit(0)` after the synth succeeds, attaching the cascade
result but never gating the exit code on it. Once the cascade can no longer hang
or be OS-killed (bounded + fail-soft), the process ALWAYS reaches exit 0 -> task
result 0. 40/40 tests (4 new cascade-timeout: ETIMEDOUT fail-soft, killed-without-
code fallback, timeout-option-passed, knob-override).

## Lesson
A time-limit/guard sized for an early version of a job silently becomes a killer
as work is bolted on (corpus growth + an LLM pass + an unbounded spawned tail) —
re-size the cap when you add cost to a scheduled job. And: 267014 is a TIMEOUT/kill
code, never assume OOM without a heap/FATAL marker — prove the failure mode from the
task config + logs first. A spawned `execFileSync` tail on a time-limited task MUST
carry its own timeout well under the task limit, or the OS task-kill (which looks
like a failure) is the only thing bounding it. Related:
[[reference_dream_cycle_galaxy_cascade_2026_06_11]] (the cascade tail this bounds),
[[reference_obsidian_dream_llm_synth_2026_06_09]] (the --llm-synth pass).
