---
name: reference_cag_warm_sweep_cron_2026_06_16
description: "SHIPPED 2026-06-16 (slot:alpha, commits 7ae1ad7c05-ish + 615b9afd3b): U-CAG-WARM-SWEEP + U-CAG-WARM-CYCLE -- a durable, Ollama-offloaded (\\$0) CAG/RAG warming cron that runs reasonForGalaxy across all 34 galaxies x 3 warming queries, populating the per-galaxy CAG cache so cold first-asks become warm reuse. Resumable cursor + os.freemem abort floor + reaper-immune scheduled task (PRISM CAG Galaxy Warm, daily 05:15, --resume --max-age-hours 20). LIVE: 34/34 galaxies warmed, warm payoff proven (re-ask -> cached:true, \\$0). Two scrutiny-caught fixes: degraded-path silent-skip + cursor cycle-awareness (daily re-warm)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.500Z
aliases: reference_cag_warm_sweep_cron_2026_06_16
---


# CAG/RAG warming cron -- SHIPPED (2026-06-16, slot:alpha)

## What + why (the real AI-subsystem improvement, not infra)
The galaxy-reasoning-bridge CAG/RAG hybrid (per-galaxy RAG over CLAUDE.md/SOUL/MEMORY/wiki -> Ollama
reasoning -> cache-augmented store) only pays off on a cache HIT, but a cold fleet caches nothing until
a question repeats. `scripts/cag-galaxy-warm-sweep.mjs` drives `reasonForGalaxy` across all 34 galaxies
(`GALAXY_KEYS` from galaxy-mining-registry) for 3 canonical warming queries each, pre-populating the
cache. Operator chose "build the durable warming cron" at the crossroad. This is the PRODUCER the CAG
warm-rate metric ([[reference_cag_warm_rate_legacy_quarantine_2026_06_16]]) was built to measure.

## Wired + validated (R15) -- LIVE EVIDENCE
- WIRE: composes reasonForGalaxy (auto-records CAG telemetry) + GALAXY_KEYS (R8, no dup;
  hermes-cron-prewarm warms the MODEL not the CACHE -- distinct). `install-cag-warm-task.ps1` registers
  a REAPER-IMMUNE scheduled task (clone of install-galaxy-mine-task.ps1 -- a scheduled-task node child's
  parent is Task Scheduler, not a claude.exe chat, so the fleet-reaper spares it). LIVE: task
  `PRISM CAG Galaxy Warm` State=Ready, daily 05:15, `--resume --max-age-hours 20`.
- TEST: 17 real-value tests (cursor parse/resume, os.freemem abort floor, summarize, classifyResult
  degraded, age-window fresh/stale/undated/back-compat). 3-of-3 PASS (twice) + 2-arm on the cycle delta.
- VALIDATE: ran the full sweep -> **34/34 galaxies warmed**, 0 errors; **warm payoff PROVEN** -- re-asking
  a warming query on already-warmed mill returns `cached:true` with NO Ollama call (\\$0, instant).

## Two scrutiny-caught fixes (R12 -- both real, both pinned by tests)
1. **Degraded-path silent-skip (arm C P1):** `reasonForGalaxy` returns `{ok:true,degraded:true}` when
   Ollama is down/timed-out -- NO cache written. The original code counted that as ok (cold miss) AND
   cursor-marked the galaxy done -> permanently skipped on resume while still cold. Fix: pure
   `classifyResult(r)` maps degraded -> ok:false; `appendCursor` only fires when `gErr===0` (a galaxy
   with any error/degraded query is left out of the cursor -> retried on resume).
2. **Cursor cycle-awareness (self-caught post-register, R12):** the permanent cursor meant the DAILY
   cron would find all 34 done forever and NO-OP after the first sweep (never re-warming a galaxy whose
   docs changed). Fix: `parseCursorDone(text, {maxAgeHours, nowMs})` -- a galaxy is "done" only if its
   row is within the window; the cron passes `--max-age-hours 20` so a 24h-later daily run re-warms
   (24>20 stale) while a same-day reaper-resume skips (minutes<20h fresh). No opts/window<=0 = count-all
   (back-compat within-run resume). Caught AFTER registering the task by reasoning about day-2 behavior.

## U-CAG-WARM-DEEP (same session) -- deep-reasoning warm across galaxies
Added `--deep` to the sweep: warms the DEEP-reasoning cache (gpt-oss:120b via reasonForGalaxy opts.deep)
instead of the default (qwen:32b), into a SEPARATE cursor `cag-warm-cursor-deep.jsonl` (deep + default
cache keys differ -> must not share resume state; pure `cursorPathFor(deep)` + 3x timeout for the big
model). ps1 `-Deep` registers a reaper-immune `PRISM CAG Galaxy Warm (deep)` task (06:30, 4h limit).
LIVE: deep reasoning ran on gpt-oss:120b (verified single call + 3 galaxies deep-warmed). 18 tests,
2-arm PASS. Closes the goal's "deep reasoning across all galaxies" (capability + cron; full warm runs
off-hours via the cron). Commit daf29550d7.

**FLEET-REAPER lesson (confirmed live):** a chat-spawned `run_in_background` deep warm warmed 3
galaxies then got KILLED by the fleet-reaper (a long node child of a chat is reapable; the Stop hook
even logged the reaper sweep). The default-mode sweeps (qwen:32b) finished fast enough to dodge the
reaper, but the slow 120b deep run ran long enough to be reaped. This is EXACTLY why the warming sweep
must run as a reaper-immune SCHEDULED TASK (node child of Task Scheduler, not a chat) -- do NOT rely on
a chat-bg run for a long (minutes) sweep; register the cron. (Sibling of install-galaxy-mine-task's
reaper-immunity rationale.)

## Lessons
- A scheduled task is the reaper-immune durable mechanism for an unattended \\$0 Ollama loop (a chat
  `run_in_background` sweep gets orphan-reaped on /compact). Clone install-galaxy-mine-task.ps1.
- On the shared `H:/prism` index, foreign peer files get staged into your index -- COMMIT WITH AN
  EXPLICIT PATHSPEC (`git commit <files> -m`) so a peer's staged work is never swept into your commit
  (sibling of the U-EXEC-POLICY index-churn split; [[reference_exec_policy_routing_graph_2026_06_16]]).
- A "warm once" cron that never re-warms is "looks done but isn't" -- a daily maintenance loop needs a
  staleness window, not a permanent done-marker. Reason about cycle N+1, not just cycle 1.
- P3 follow-up: the cursor is append-only (~1MB/year); add rotation when it exceeds ~5000 lines.

Sibling: [[reference_exec_policy_routing_graph_2026_06_16]] (the routing graph that DECLARES this
harness in the `learn`/`orchestrate` execution machinery).
