---
name: reference_post_ship_sfc-accuracy-sweep-u-osc-sweep-ledger-uncapped
description: Auto-distilled learnings from shipping SFC-ACCURACY-SWEEP/U-OSC-SWEEP-LEDGER-UNCAPPED (commit b7287949e). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.030Z
aliases: reference_post_ship_sfc-accuracy-sweep-u-osc-sweep-ledger-uncapped
---


# SFC-ACCURACY-SWEEP/U-OSC-SWEEP-LEDGER-UNCAPPED

[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-LEDGER-UNCAPPED (slot:oscar): persist prism_vc_uncapped_mpm + prism_rpm_capped in the sweep ledger row so india + accuracy analysis distinguish a TRUE over/under-speed from a machine-RPM-cap artifact WITHOUT a manual probe. The capped prism_vc_mpm masks the engine's true Vc on small/high-Vc tools -- proven this session: the HSS aggressive 'asymmetry' (carbide 1.13x vs hss 2.2x) was carbide cap-compression (uncapped both scale 2.2x), NOT HSS over-speed. Validated: prod smoke 117/576 rows rpm_capped=true; additive fields, prod-equal when uncapped.

**Shipped:** 2026-06-25T04:50:32-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[sfc-accuracy-sweep-u-osc-sweep-ledger-uncapped]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._