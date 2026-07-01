---
name: reference_post_ship_cad-learning-ai-u-bpa-loop-drain-dispatch
description: Auto-distilled learnings from shipping CAD-LEARNING-AI/U-BPA-LOOP-DRAIN-DISPATCH (commit 1f7d03f33). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.798Z
aliases: reference_post_ship_cad-learning-ai-u-bpa-loop-drain-dispatch
---


# CAD-LEARNING-AI/U-BPA-LOOP-DRAIN-DISPATCH

[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-LOOP-DRAIN-DISPATCH (slot:india): the LIVE final arrow -- prism_ai:blueprint_loop_drain. New india-group action (INDIA_AI_ORPHAN unit 8) + body case in the non-fallthrough region: reads the accuracy ledger past the consumer's isolated offset, routes the 4 GENERAL cross-process learning primitives (drift/replay/ewc/predlog) in-process via routeXprocAction, and SKIPS outcome_record (CrossProcessOutcomeStore.record validates process in {mill,lathe,wedm}; a blueprint extraction is process-agnostic -> ledger-only). Idempotent via the consumer-state offset; dryRun=plan-only. Drain core gained a skipActions option + dispatchedSkipped counter so the summary never overstates real dispatches (R12). 17/17 drain + 44/44 consumer-lib + 2/2 dispatcher round-trip (through executeAIReasoningAction, hermetic temp fixture); tsc clean on changed files (the 2 repo tsc errors are pre-existing in lima's ReinforcementLearningCAMFeedbackEngine, untouched). LIVE: 145 outcome_records skipped, 1 ewc routed, idempotent re-run.

**Shipped:** 2026-06-25T01:06:44-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[cad-learning-ai-u-bpa-loop-drain-dispatch]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._