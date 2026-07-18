---
name: reference_post_ship_per-slot-galaxy-buildout-u-psgb-xray-render-timeout
description: Auto-distilled learnings from shipping PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-RENDER-TIMEOUT (commit ff51fadd7). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.975Z
aliases: reference_post_ship_per-slot-galaxy-buildout-u-psgb-xray-render-timeout
---


# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-RENDER-TIMEOUT

[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-RENDER-TIMEOUT (slot:xray): bump PDF render/count spawn timeout 60s->120s (configurable) — live pilots showed the python subprocess starves >60s under full-fleet host saturation (CPU+IO), not just GPU. PRISM_RENDER_TIMEOUT_MS override; batch runner #6 will need it.

**Shipped:** 2026-05-30T20:40:26-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[per-slot-galaxy-buildout-u-psgb-xray-render-timeout]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._