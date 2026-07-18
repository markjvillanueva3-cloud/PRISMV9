---
name: reference_post_ship_self-compact-fix-u-yellow-branch
description: Auto-distilled learnings from shipping SELF-COMPACT-FIX/U-YELLOW-BRANCH (commit e92d13b56). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.025Z
aliases: reference_post_ship_self-compact-fix-u-yellow-branch
---


# SELF-COMPACT-FIX/U-YELLOW-BRANCH

[MAIN-FORCE] [SELF-COMPACT-FIX]/U-YELLOW-BRANCH (slot:bravo): self-compaction never activated in the prudent band -- ROOT CAUSE: deriveZebraDecision had NO YELLOW branch (only GREEN=suppress + RED/CRITICAL=compact), so the 25-65% band fell through to noop; /compact was only ever recommended at RED (>65%, near native ~95% autocompact), defeating proactive 'compact when prudent'. FIX: (1) YELLOW branch honoring the token-awareness writer's own action (wrap-up/compact -> recommend compact; mild -> noop; stale -> noop); (2) slot-context-bundle-inject now surfaces the actionable self-compact.mjs command on recommend:compact (was just showing 'compact' with no actuation); (3) fixed stale zebra-context-bundle.mjs import that left the test DORMANT since the rename. Live-validated: this chat's real YELLOW/wrap-up now -> recommend=compact; 137/137 tests (+7 YELLOW). Actuator itself already works (dry-run resolved WT tab 'BRAVO').

**Shipped:** 2026-06-17T19:58:19-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[self-compact-fix-u-yellow-branch]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._