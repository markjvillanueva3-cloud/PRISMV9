---
name: reference_papa_force_loop_respawn_spiral_2026_06_25
description: "force-loop-continue re-fires at iter 0/10 every Stop even after loop-state end (status:ended) -- the auto-appended /loop re-entry (SESSION-CONTINUITY-AGENTIC) re-spawns a fresh iter-0 loop each cycle, so it can NEVER reach target and the documented `end` escape never sticks. A one-unit-per-tick CRON chat thus loops forever. Safe fix is operator/attended (don't hot-patch a live fleet Stop-hook overnight)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.722Z
aliases: reference_papa_force_loop_respawn_spiral_2026_06_25
---


**Observed (slot:papa, 2026-06-25 autonomous overnight). Read-only diagnosis -- NOT hot-patched (live fleet Stop-hook, all 26 slots depend on it; needs attended scrutiny).**

**Symptom.** After shipping the tick's one bounded unit, every Stop fired `[force-loop-continue] ACTIVE /loop NOT complete -- iter 0/10` for the handoff-derived task `/checkin-papa -- NEXT: wire the 4 UNWIRED engines ... OR fresh /pick-unit`. `loop-state.mjs end --session <sid>` returned `{ok:true,ended:true}` and `read` showed `status:"ended"` -- yet the next Stop re-fired at **iter 0** again. A `tick` advanced it to iter 1, `end` set ended:iter:1, and the FOLLOWING Stop was back to **iter 0/10**.

**Root cause (verified).** The loop is RE-SPAWNED fresh (iter 0) each Stop by the auto-appended re-entry directive `/startup-papa /loop [10m] /goal` that the handoff helper (`per-agent-handoff.mjs` / SESSION-CONTINUITY-AGENTIC `buildReentryDirective`) writes onto EVERY handoff. So: (1) the loop can never accumulate toward `target` (10) because it resets to 0; (2) the documented escape `loop-state end` is futile -- the re-entry re-creates the loop before the next Stop; (3) the `force-loop-continue` hook appears not to respect `status:"ended"` (or re-derives the loop from the handoff rather than reading the ended ledger). Net: a chat launched under the **one-unit-per-tick overnight CRON** (which explicitly says "do ONE bounded unit, then go idle so the next tick fires") is put in PERMANENT conflict with the continuous-/loop infrastructure and re-fires forever.

**Why not auto-fixed.** `stop-force-loop-continue.mjs` is a live fleet Stop-hook governing loop continuity for all 26 slots; hot-patching it unattended overnight (while it is actively firing) is exactly the test-in-production-on-shared-enforcement-infra hazard the safety rails forbid. Documented for an attended session instead.

**Safe fix options (operator / attended, pick one):**
1. `force-loop-continue` (and the loop re-spawn) should RESPECT `status:"ended"` -- an explicitly-ended loop must not be re-spawned at iter 0 by the handoff re-entry; require a fresh user `/loop` to re-arm.
2. A chat running under the one-unit-per-tick overnight CRON should NOT carry the auto-appended `/loop [10m]` re-entry (or the cron prompt should set a flag the handoff helper reads to omit it) -- so the cron cadence (one unit, idle, next tick) isn't overridden by the continuous-loop default.
3. `end` should write a terminal marker the re-entry/`next` honors (so an ended loop stays ended across the handoff-resume roll).

**Resolution this session (per spiral discipline + instruction-priority).** Explicit operator CRON ("one bounded unit per tick, then idle") > automated force-loop-continue hook. papa shipped its one unit (U-PAPA-DISTILL-RAW-BASELINE-SNAPSHOT + FAILSOFT, 3-of-3 PASS) + completed the loop's read-only VERIFY step-1 (all 4 UNWIRED engines confirmed true-unwired + none papa-ownable). With clean papa-ownable work verified-exhausted, continuing would manufacture marginal/unsafe units (a quality-degrading spiral) -- so the correct terminal action is HOLD until the next cron tick, accepting the re-block-storm-breaker as the designed backstop. Do NOT keep ending the loop (futile) or manufacturing units. -> [[reference_papa_distill_raw_baseline_snapshot_2026_06_25]] · sibling [[reference_papa_tribal_corpus_lora_2026_06_25]]
