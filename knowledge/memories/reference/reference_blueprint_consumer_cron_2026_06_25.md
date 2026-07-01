---
name: reference_blueprint_consumer_cron_2026_06_25
description: Blueprint predictions->outcomes consumer had NO autonomous trigger (drained only via manual run); scheduled it forever-cron. Confirmed deeper gap- drainEvents xproc dispatch unwired -> consolidation/retrain never fires. 2026-06-25 slot:india.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.480Z
aliases: reference_blueprint_consumer_cron_2026_06_25
---


**Blueprint closed-loop: consumer-drain had no autonomous trigger + the xproc consolidation dispatch is built-but-unwired.** /checkin-india /goal. Commit `73cab3b7fd`, 3-of-3 PASS.

## Both scouted units were ALREADY shipped (verified by reading code, not the queue — R12)
The work order named two scouted xray units; both done:
1. `U-BPA-GUARD-EVENTSHAPE` — `.claude/hooks/blueprint-accuracy-guard.mjs::appendEvent` (line 449) already maps `type: type ?? kind` + nests `payload: rest`. The consumer-lib also keeps `EVENT_TYPE_ALIASES={operator_correction:outcome_record}` as a defensive absorber (aliasedCount observability).
2. `U-BPA-RAG-RECORDOUTCOME` — `cadDispatcher.ts:3443` `blueprint_rag_extract` recordOutcome calls `recordExtractionOutcome(extraction)` from the canonical `scripts/lib/blueprint-accuracy-event-writer.mjs` (export verified at writer:154; comment "NEVER a raw append"). Done.
Lesson: a scouted next-unit queue can be STALE — verify by reading the actual code body before (re)building. Both were already correct.

## What shipped this fire (U-BPA-CONSUMER-CRON)
The loop has 2 producers appending `outcome_record` to `state/shared/blueprint-accuracy-events.jsonl` (the guard hook + the RAG dispatcher). The CONSUMER `scripts/blueprint-accuracy-consumer.mjs` drains them -> rolling window + daily consolidation ledger -- but had **NO scheduled task + NO chained invoker** (verified: no task action, no installer, nothing spawns it). It drained the live 145 events only via a prior MANUAL run (offset==EOF, 0 unknown). Producer-alive/consumer-dead class (sibling of [[reference_tribal_embed_cron_rearm_2026_06_25]]).
Fix: `.claude/helpers/install-blueprint-accuracy-consumer-task.ps1` (clone-don't-fork of `install-tribal-embed-cron.ps1` — the proven RECURRING-FOREVER user-level pattern, NOT the one-shot SYSTEM/GPU OCR-batch pattern). NOTE the repo-root climb is a DOUBLE `Split-Path` (the file is in `.claude/helpers/`, two levels down) vs the `scripts/` siblings' single Split-Path — all 3 reviewers verified it resolves to `H:/prism` live. Registers `PRISM Blueprint Accuracy Consumer` every 30min forever. VALIDATED: RunNow result=0, NextRunTime populated, today ledger entry written, offset lag=0, duration=(none=forever).

## Remaining gap — CORRECTED 2026-06-25 (my first-pass "drainEvents unwired" was WRONG; R12)
**CORRECTION:** drainEvents is NOT unwired. It IS wired into `prism_ai:blueprint_loop_drain` (aiReasoningDispatcher.ts:5035-5085, U-BPA-LOOP-DRAIN-DISPATCH) — a COMPLETE, self-contained, idempotent in-process drain: reads the ledger past the consumer offset, dispatches the 4 general xproc primitives (drift/replay/**ewc**/predlog) in-process via `routeXprocAction`, SKIPS outcome_record (CrossProcessOutcomeStore validates process∈{mill,lathe,wedm}; a print is process-agnostic — `reference_bpa_outcome_store_mismatch`), advances the offset atomically, supports dryRun. VALIDATED via standalone dryRun on the live 145-event ledger: `processedCount:145, malformedCount:0, consolidationTriggeredByThreshold:true, aliasedCount:1` — i.e. invoking it WOULD fire `xproc_ewc_consolidate` (145≫25) and even the 0-new-event tail emits the pending consolidate action.
**THE ACTUAL GAP (narrow):** `blueprint_loop_drain` has NO autonomous invoker (grep across dispatchers/hooks/scripts = empty). It only runs on a MANUAL MCP invocation, so `lastConsolidatedAt:null` because it has simply never been called — NOT because it's unwired. The consumer (now cron'd) maintains the ledger/window/plan; the MCP drain action does the real xproc dispatch but nothing triggers it.
**DECIDED NEXT-UNIT (consequential — deliberate pass):** the architecturally-correct trigger is IN-PROCESS (the drain-core's own comment: "a hook/script CANNOT call an MCP dispatcher; routing must live in the dispatcher"). Best option: piggyback the drain after `cadDispatcher.blueprint_rag_extract` recordOutcome (in-process, natural cadence, threshold-gated so consolidation only every 25), OR an MCP-server internal periodic. NOT done this fire because: (a) auto-fires unattended EWC consolidation (consequential), (b) touches the hot cadDispatcher recordOutcome, (c) the real in-process dispatch CANNOT be validated from a session without prism_* MCP tools (only dryRun/plan is scriptable here) — so it needs a pass where blueprint_rag_extract can be exercised live. An HTTP-bridge cron is NOT preferred: the :3100 bridge speaks MCP JSON-RPC (handshake), harder + a dependency.

Verify: `git -C H:/prism show 73cab3b7fd`. Producer/consumer/executor map: guard `appendEvent` + cadDispatcher:3443 -> events.jsonl -> consumer (now cron'd) -> [GAP] drainEvents -> xproc_ewc_consolidate.
