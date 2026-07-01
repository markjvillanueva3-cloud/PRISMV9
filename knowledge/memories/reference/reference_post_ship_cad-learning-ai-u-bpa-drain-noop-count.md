---
name: reference_post_ship_cad-learning-ai-u-bpa-drain-noop-count
description: Auto-distilled learnings from shipping CAD-LEARNING-AI/U-BPA-DRAIN-NOOP-COUNT (commit 179ca3d72). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.798Z
aliases: reference_post_ship_cad-learning-ai-u-bpa-drain-noop-count
---


# CAD-LEARNING-AI/U-BPA-DRAIN-NOOP-COUNT

[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-DRAIN-NOOP-COUNT (slot:india): drainEvents no longer counts a no-dispatch-fn (plan-only) run as a real dispatch -- closes the arm-C P2 from U-BPA-LOOP-DRAIN-CORE. New dispatchedNoop counter + a per-row dispatched:true/false flag so a caller reading dispatchedOk never sees a phantom dispatch. 15/15 (rewrote the no-op test to the corrected intent + added a real-vs-noop lock).

**Shipped:** 2026-06-25T00:49:23-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[cad-learning-ai-u-bpa-drain-noop-count]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._