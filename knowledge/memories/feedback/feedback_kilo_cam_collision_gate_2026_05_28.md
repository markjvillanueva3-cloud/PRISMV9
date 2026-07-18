---
name: feedback_kilo_cam_collision_gate_2026_05_28
description: Standing rule — no CAM toolpath ships without a collision/gouge check at the operating engagement
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.432Z
aliases: feedback_kilo_cam_collision_gate_2026_05_28
---


Standing rule (slot:kilo CAM galaxy): **no toolpath leaves CAM without `collision_check_full` (holder + fixture + stock + gouge) at the operating engagement**, and the verdict carries the CLEARANCE NUMBER — never a bare "safe".

**Why:** a collision/gouge is the highest-severity CAM failure (crashed spindle, scrapped part, operator hazard). A strategy can be physically optimal and still gouge an island or clip a clamp; the safety verdict is orthogonal to the strategy quality, so it must be a SEPARATE gate, not folded into the recommendation. shop_floor tier (Ω≥0.95, S(x)≥0.98) demands it.

**How to apply:** step 4 of `/cam-route-kilo` is mandatory and non-skippable. Any gouge/collision → reject → return to strategy selection. Report e.g. "min clearance 2.3mm at the holder near feature F3" not "safe". Pairs with [[feedback_kilo_cam_defer_gcode_to_echo_2026_05_28]] — kilo validates, echo emits.
