---
name: reference_post_ship_cad-learning-ai-u-bpa-loop-drain-core
description: Auto-distilled learnings from shipping CAD-LEARNING-AI/U-BPA-LOOP-DRAIN-CORE (commit da9f7cc3c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.798Z
aliases: reference_post_ship_cad-learning-ai-u-bpa-loop-drain-core
---


# CAD-LEARNING-AI/U-BPA-LOOP-DRAIN-CORE

[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-LOOP-DRAIN-CORE (slot:india): injectable closed-loop drain core (resolveDispatch + drainEvents, fail-soft per action, caller-owned offset) -- the pure foundation the next-fire prism_ai:blueprint_loop_drain dispatcher consumes via routeXprocAction (consumer was print-only, nothing routed its plan). Wired into the consumer CLI as additive --dispatch-plan mode; default path unchanged. P1 FIX (arm-C scrutiny): EVENT_TO_XPROC_ACTION.outcome_record pointed at xproc_outcome_record_outcome which THROWS without an id no producer emits -> retargeted to create action xproc_outcome_record (matches the hook dispatch). 14/14 drain-core + 44/44 consumer-lib (+1 lock); LIVE 145 -> 146 resolved dispatches; default mode 0 plan lines.

**Shipped:** 2026-06-25T00:34:10-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[cad-learning-ai-u-bpa-loop-drain-core]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._