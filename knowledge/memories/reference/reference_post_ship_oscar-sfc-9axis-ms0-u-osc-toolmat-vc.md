---
name: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-toolmat-vc
description: Auto-distilled learnings from shipping OSCAR-SFC-9AXIS-MS0/U-OSC-TOOLMAT-VC (commit 134895d84). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.966Z
aliases: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-toolmat-vc
---


# OSCAR-SFC-9AXIS-MS0/U-OSC-TOOLMAT-VC

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-VC (slot:oscar): close the #1 inert-axis gap — SFC now differentiates tool material in Vc. Was: carbide≡HSS≡ceramic (UltimateSpeedFeedEngine:2081 had no tool-material term). Now: canonical CANONICAL_TOOL_MATERIAL_SPEED_FACTOR (physics/constants.ts, cited Machinery's Handbook/Sandvik, clamped 0.3-3.0, fail-safe→carbide) scales the carbide-anchored base Vc. HSS 0.35x (SAFER — was over-speeding ~3x), carbide 1.0 (gauntlet identity, 52/52 preserved), ceramic/cbn/pcd 2.5x (aggressive dir, backed by downstream RPM cap + S(x) gate). 9/9 new tests incl HSS<carbide<ceramic integration proof. SAFETY: changes recommended Vc → flagged for physics-reviewer/S(x)

**Shipped:** 2026-06-09T08:43:20-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[oscar-sfc-9axis-ms0-u-osc-toolmat-vc]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._