---
title: Ollama burst-wedge + stale-vs-hung scheduled-task signals
tags: [code-tribal, ollama, scheduled-tasks, fleet-health, diagnostics, R5, R12]
slot: papa
date: 2026-06-25
related: [[reference_papa_lora_distill_burst_wedge_2026_06_24]] [[reference_stale_tasks_overdue_not_broken_2026_06_25]] [[reference_tribal_index_v8_string_cap_2026_06_08]]
---

# Ollama burst-wedge + stale-vs-hung scheduled-task signals

Two reusable infra-diagnosis lessons from the slot:papa autonomous-overnight run (2026-06-24/25).

## 1. A BURST of rapid local-LLM calls wedges Ollama even when single calls work

`domain-corpus-to-lora-dataset.mjs --distill` synthesizes one Q&A pair per (PDF,domain) via
`fetch` to Ollama `/api/generate`. Single calls (`--limit 1/2`) returned real grounded Q&A in
3-5s each. The FULL 65-PDF run (~100 rapid sequential calls) returned **0 distilled / all
raw-fallback in ~30-40s** -- ~0.3s/call = fast *errors*, not inference. Ollama was HEALTHY
throughout (tags OK; a single generate + single distill both worked immediately after).

**Diagnosis:** a burst of rapid concurrent/sequential calls bursts past Ollama's request
handling and returns fast errors, even though the model is loaded and single calls are fine.
The GIGO-safe raw fallback caught every failure (no garbage rows), so it was non-fatal -- but
the quality upgrade silently didn't land.

**Fix (do NOT hand-roll a `sleep`+retry loop):** route the calls through
`scripts/lib/ollama-fanout.mjs` (the RATE-LIMIT-FIX primitive, slot:bravo). Its
bounded-concurrency worker pool (`DEFAULT_CONCURRENCY=3`, env `PRISM_FANOUT_CONCURRENCY`) +
fail-soft `callOllamaOnce` is purpose-built for exactly this -- it ELIMINATES the burst. A
hand-rolled pacer would duplicate it (the duplication guard would block it).

**Lesson:** route ANY fan-out of N local-LLM calls through `ollama-fanout` (bounded concurrency),
never an un-paced `for...await` of raw `fetch`. "Single call works" does NOT imply "100 rapid
calls work."

## 2. "stale" task-health is an AGE signal; `state=Running` >> interval is a HUNG-RUN signal

The `fleet-task-health-watch` Stop-hook WARN ("PRISM <task>=stale ... re-register from an
ELEVATED shell") over-states the fix. `node scripts/fleet-task-health-watch.mjs --json` keys
"stale" purely on **last-completion age vs (interval x3)** -- it is NOT a failure signal:

- A task with `state=Ready, lastTaskResult=0 (success)` that merely hasn't fired recently is
  HEALTHY + overdue -- it does NOT need re-registering; it needs a TRIGGER (or the scheduler to
  catch up). Re-registering just rewrites an already-correct registration.
- BUT a task with `state=Running` and `LastRunTime` far older than its interval (e.g. a
  30-min-interval task Running for ~5 hours) has a **HUNG / stuck run** -- which is ALSO why it
  reads "stale" (a stuck run never completes, so last-completion age grows). `Start-ScheduledTask`
  on an already-Running task is a NO-OP (you cannot start a running task), so "just trigger it"
  does nothing for a hung run.

**Decision tree before recommending an action on a "stale" task:**
1. `lastTaskResult != 0` or `state != Ready/Running` -> genuinely failing/disabled -> investigate / re-register.
2. `state=Ready`, `lastTaskResult=0`, just overdue -> TRIGGER (`Start-ScheduledTask`) or let the scheduler catch up. NOT a re-register.
3. `state=Running` for >> the interval -> HUNG run -> investigate the process; `Stop-ScheduledTask`
   + restart ONLY if safe. For the tribal-embed specifically, a mid-write stop risks a torn-index
   CORRUPTION of the 537MB brain ([[reference_tribal_index_v8_string_cap_2026_06_08]]) -- SUPERVISED only.

**Lesson:** staleness is orthogonal to health (sibling of the token-awareness stale-zone fix).
Read `lastTaskResult` + `state` + (LastRunTime-age vs interval) together; a hung Running run and a
never-fired overdue task both surface as "stale" but need OPPOSITE actions.
