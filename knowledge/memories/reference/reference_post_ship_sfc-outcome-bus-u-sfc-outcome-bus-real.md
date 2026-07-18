---
name: reference_post_ship_sfc-outcome-bus-u-sfc-outcome-bus-real
description: Auto-distilled learnings from shipping SFC-OUTCOME-BUS/U-SFC-OUTCOME-BUS-REAL (commit 962e4e017). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.037Z
aliases: reference_post_ship_sfc-outcome-bus-u-sfc-outcome-bus-real
---


# SFC-OUTCOME-BUS/U-SFC-OUTCOME-BUS-REAL

[MAIN-FORCE] [SFC-OUTCOME-BUS]/U-SFC-OUTCOME-BUS-REAL (slot:oscar): fix R12 fake-100% bug -- SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture() was hardwired 'return true' (bus_capture_success_rate_pct fabricated 100%, flagged bravo 2026-06-11). Now calls real captureSFC(sfcOutcomeWire)+returns its ok; NineAxis layer actually reaches the canonical bus (orchestrator does not emit captureSFC for that layer -> no double-capture; the 'circular dep/upstream' rationale was false -- sync middleware imported statically by 6 engines). 8-test proof incl R9 mixed-ratio 66.67% (fails vs old hardwired-true); 24/24 with existing wire tests; full tsc clean. Galaxy CLAUDE.md+MEMORY.md updated (no stale KNOWN-BUG text)

**Shipped:** 2026-06-22T10:47:53-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[sfc-outcome-bus-u-sfc-outcome-bus-real]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._