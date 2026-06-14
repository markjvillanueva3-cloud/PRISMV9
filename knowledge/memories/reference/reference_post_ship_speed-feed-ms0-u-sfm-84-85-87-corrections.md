---
name: reference_post_ship_speed-feed-ms0-u-sfm-84-85-87-corrections
description: Auto-distilled learnings from shipping SPEED-FEED-MS0/U-SFM-84-85-87-CORRECTIONS (commit 5ed0a6186). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.762Z
aliases: reference_post_ship_speed-feed-ms0-u-sfm-84-85-87-corrections
---


# SPEED-FEED-MS0/U-SFM-84-85-87-CORRECTIONS

[MAIN] [SPEED-FEED-MS0]/U-SFM-84-85-87-CORRECTIONS (slot:tango /goal /loop /yolo iter7 2026-05-27): trio of Speed-Feed Vc correction algorithms — 8.4 HardnessToVcInverter (ISO-18265 HRC↔HB + per-ISO Sandvik exponents), 8.5 CoolantVcModifier (6 ISO × 5 coolant lookup, flood=1.0 baseline), 8.7 HPCVcBoostCalculator (P_bar/Q_L_min/jet-aim → boost multiplier per ISO k-factor). All three closed-form, no physics constants inlined, R12 fail-loud on adversarial input. 58/58 tests PASS. prism_calc:{hardness_vc_multiplier, coolant_vc_modifier, hpc_vc_boost} wired. Closes 3/25 remaining audit-confirmed gaps from 58-algorithm scope enumeration.

**Shipped:** 2026-05-27T09:48:13-05:00 by markjvillanueva3-cloud
**Files:** 8 touched

Full distillation: [[speed-feed-ms0-u-sfm-84-85-87-corrections]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._