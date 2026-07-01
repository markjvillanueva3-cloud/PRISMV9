---
name: reference_post_ship_psn-octopus-fleet-synergy-ms0-u-fleet-p1-leg-starvation-fix
description: Auto-distilled learnings from shipping PSN-OCTOPUS-FLEET-SYNERGY-MS0/U-FLEET-P1-LEG-STARVATION-FIX (commit a6e4f165a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.996Z
aliases: reference_post_ship_psn-octopus-fleet-synergy-ms0-u-fleet-p1-leg-starvation-fix
---


# PSN-OCTOPUS-FLEET-SYNERGY-MS0/U-FLEET-P1-LEG-STARVATION-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-OCTOPUS-FLEET-SYNERGY-MS0]/U-FLEET-P1-LEG-STARVATION-FIX (slot:bravo): fs legs run before the slow index stage so the octopus stops starving to 1/5 legs (smoke: 1->4 legs, 17.7s->2.6s); +PRISM_OCTOPUS_SKIP_INDEX_LEGS escape hatch; 3 fail-on-revert tests, 2x scrutiny PASS

**Shipped:** 2026-05-31T19:24:43-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[psn-octopus-fleet-synergy-ms0-u-fleet-p1-leg-starvation-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._