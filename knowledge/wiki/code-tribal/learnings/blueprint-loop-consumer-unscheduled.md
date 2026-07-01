---
title: blueprint-loop-consumer-unscheduled
type: code-tribal
domain: ai-systems-cad-learning
slot: india
created: 2026-06-25
commit: 73cab3b7fd
tags: [closed-loop, scheduled-task, producer-consumer, blueprint, retrain, R12]
---

# Blueprint predictions→outcomes loop: consumer unscheduled + consolidation dispatch unwired

## Lesson (generalizable)
A multi-stage closed loop (producer → ledger → consumer → dispatch → retrain) is only as closed as its **least-scheduled stage**. Verify EVERY stage has an autonomous trigger, and that "looks wired" at the code level ≠ "fires autonomously" at the OS/scheduler level. Two distinct producer-alive/consumer-dead failures hid here:

1. **Consumer had no scheduler.** Two producers (the `blueprint-accuracy-guard.mjs` hook + `cadDispatcher.blueprint_rag_extract` recordOutcome via the canonical writer) correctly append `outcome_record` events to `state/shared/blueprint-accuracy-events.jsonl`. The consumer `scripts/blueprint-accuracy-consumer.mjs` (drains → rolling window + daily consolidation ledger) had **no scheduled task and no chained invoker** — it drained only via a prior manual run. Fix: `.claude/helpers/install-blueprint-accuracy-consumer-task.ps1` (clone of the proven `install-tribal-embed-cron.ps1` recurring-forever pattern). Same class as the tribal-embed cron (`U-TRIBAL-EMBED-CRON-REARM`).

2. **The dispatch action exists + is wired, but has no autonomous invoker (the real, narrow gap).** [CORRECTED — a first pass wrongly called `drainEvents` "unwired"; R12.] The consumer is print-only (`resolveDispatch` plans, never executes), BUT `drainEvents` IS wired into `prism_ai:blueprint_loop_drain` (aiReasoningDispatcher:5035) — a complete in-process drain that dispatches drift/replay/**ewc**/predlog via `routeXprocAction`, skips outcome_record (process-agnostic print), advances the offset atomically, supports dryRun. VALIDATED via standalone dryRun on the live 145-event ledger: `consolidationTriggeredByThreshold:true` — invoking it WOULD fire `xproc_ewc_consolidate`. The gap: **nothing autonomously invokes `blueprint_loop_drain`** (grep across dispatchers/hooks/scripts = empty), so it only runs on a manual MCP call → `lastConsolidatedAt:null` because it's never been called, NOT because it's unwired. **Lesson: "built-but-unwired" vs "wired-but-untriggered" are different gaps — read the dispatchers (not just the script callers) before concluding "unwired," and prove dormancy by the live ledger + a grep for invokers.**

## Method that found it (reusable)
- **Read the body, not the scouted-queue title.** Both "scouted next-units" were already shipped; verified by reading `appendEvent` + the cadDispatcher recordOutcome + confirming `recordExtractionOutcome` is actually exported (writer:154) — not by trusting the queue.
- **Prove loop-closure with the ledger/offset numbers**, not mtime or "it's wired": `consumer-state.lastProcessedOffset == events.jsonl size` (lag 0) proved the consume stage; `lastConsolidatedAt:null` with `outcomesSinceConsolidate:145` exposed the dormant consolidate stage.
- **Check the scheduler, not just the code**: `Get-ScheduledTask` action-args grep + installer search + spawner grep to confirm a stage has (or lacks) an autonomous trigger.

## Status
- Stage "consume": CLOSED autonomously (this commit — the consumer cron).
- Stage "dispatch→consolidate→retrain": BUILT + VALIDATED (dryRun), but UNTRIGGERED — `prism_ai:blueprint_loop_drain` does the real in-process xproc dispatch; it just has no autonomous invoker. Decided next-unit: an IN-PROCESS trigger (piggyback the drain after `cadDispatcher.blueprint_rag_extract` recordOutcome — the drain-core's own "routing must live in the dispatcher" design; threshold-gated so consolidation fires only every 25), OR an MCP-server internal periodic. NOT an HTTP-bridge cron (the :3100 bridge speaks MCP JSON-RPC). Consequential (unattended EWC consolidation) + touches hot recordOutcome + needs a live-MCP session to validate the real dispatch → deliberate pass, not a tail-end push.

Related: [[reference_tribal_embed_cron_rearm_2026_06_25]] · [[reference_blueprint_consumer_cron_2026_06_25]]
