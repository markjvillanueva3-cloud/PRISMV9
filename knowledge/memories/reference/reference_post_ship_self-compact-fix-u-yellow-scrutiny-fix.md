---
name: reference_post_ship_self-compact-fix-u-yellow-scrutiny-fix
description: Auto-distilled learnings from shipping SELF-COMPACT-FIX/U-YELLOW-SCRUTINY-FIX (commit 9e49fdf2d). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.025Z
aliases: reference_post_ship_self-compact-fix-u-yellow-scrutiny-fix
---


# SELF-COMPACT-FIX/U-YELLOW-SCRUTINY-FIX

[MAIN-FORCE] [SELF-COMPACT-FIX]/U-YELLOW-SCRUTINY-FIX (slot:bravo): close 3-of-3 arm-C P2s -- (1) gate YELLOW->compact on worstPct>=0.5 (the producer emits action:wrap-up for ALL of YELLOW, so without a pct gate every slot would nudge compact from 25%; now only past the band midpoint -- prudent); (2) complete the zebra->zulu import fix the prior commit only did for the TEST: 3 LIVE consumers (zulu-context-load, zulu-context-fleet-dashboard hard-crashed on launch; generate-chat-slot-nodes-features silently degraded) now import the real lib. 139/139 tests; live YELLOW/0.70/wrap-up -> recommend=compact; lib exports verified for the fixed consumers. (arm-B flag: prior sierra U-LINK-ZULU-CORPUS corpus wiring appears lost in shared-tree absorption -- for sierra to re-land, NOT this unit.)

**Shipped:** 2026-06-17T20:09:43-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[self-compact-fix-u-yellow-scrutiny-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._