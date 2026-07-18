---
name: reference_post_ship_ai-synergy-cag-u-cag-warm-cycle
description: Auto-distilled learnings from shipping AI-SYNERGY-CAG/U-CAG-WARM-CYCLE (commit 615b9afd3). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.737Z
aliases: reference_post_ship_ai-synergy-cag-u-cag-warm-cycle
---


# AI-SYNERGY-CAG/U-CAG-WARM-CYCLE

[MAIN-FORCE] [AI-SYNERGY-CAG]/U-CAG-WARM-CYCLE (slot:alpha): make the warming cron cycle-aware -- parseCursorDone gains a maxAgeHours window so the daily task re-warms galaxies whose entry is >20h stale (was: no-op forever after the first full sweep, all 34 marked done permanently). 17 tests, 2-arm PASS; task re-registered --resume --max-age-hours 20

**Shipped:** 2026-06-16T22:09:43-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[ai-synergy-cag-u-cag-warm-cycle]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._