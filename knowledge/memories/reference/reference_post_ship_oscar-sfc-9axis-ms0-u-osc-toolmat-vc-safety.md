---
name: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-toolmat-vc-safety
description: Auto-distilled learnings from shipping OSCAR-SFC-9AXIS-MS0/U-OSC-TOOLMAT-VC-SAFETY (commit 658c8280f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.966Z
aliases: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-toolmat-vc-safety
---


# OSCAR-SFC-9AXIS-MS0/U-OSC-TOOLMAT-VC-SAFETY

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-VC-SAFETY (slot:oscar): physics-reviewer P2 — apply tool-material factor ONLY when EXPLICITLY chosen. inferToolMaterial(H)→cbn would silently give a hardened cut the aggressive 2.5x CBN speed even if the shop runs coated carbide; now inferred→1.0 (carbide-conservative, no surprise over-speed), explicit HSS still 0.35x / explicit cbn still 2.5x (user opted in). +safety test locking inferred==carbide-baseline. 62/62 (10 toolmat + 52 gauntlet)

**Shipped:** 2026-06-09T08:49:49-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[oscar-sfc-9axis-ms0-u-osc-toolmat-vc-safety]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._