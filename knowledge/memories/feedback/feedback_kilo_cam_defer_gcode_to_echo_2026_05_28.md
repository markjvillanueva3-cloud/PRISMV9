---
name: feedback_kilo_cam_defer_gcode_to_echo_2026_05_28
description: Standing rule — CAM (kilo) terminates in a validated strategy handoff; G-code dialect emission is echo's (post-processor)
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.432Z
aliases: feedback_kilo_cam_defer_gcode_to_echo_2026_05_28
---


Standing rule (slot:kilo CAM galaxy): **CAM terminates in a validated strategy + toolpath handoff, NOT a vendor G-code program.** Dialect emission belongs to the post-processor galaxy (echo).

**Why:** separation of concerns + the current operator CHAT-SLOT-DOMAINS (KILO=CAM, ECHO=post-processor). The same validated toolpath posts to many controllers; baking dialect into CAM couples the strategy to one machine and duplicates echo's controller knowledge (14-controller AGI surface). Per-machine cut physics likewise belongs to the mill/lathe/wedm wizards (foxtrot/whiskey/mike), speed/feed numerics to oscar (SFC), retrain to india.

**How to apply:** kilo's output edge is `strategy + toolpath → echo`. Do not emit `O####`/`G##` dialect from a CAM engine. NOTE the slot-domain-drift trap: older artifacts (e.g. `reference_order_flow_canonical_2026_05_27`) say "CAM mill flows through echo" — that pre-dates kilo=CAM; surface the conflict, follow the CURRENT CHAT-SLOT-DOMAINS. Pairs with [[feedback_kilo_cam_collision_gate_2026_05_28]].
