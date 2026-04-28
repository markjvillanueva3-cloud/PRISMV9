---
id: "ts-069"
title: "Canned Cycle Output for Drilling Operations"
source: "web:topsolid-canned"
confidence: 91
category: "cam_strategy"
tags: ["canned-cycles", "drilling", "post-processor", "g-code"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.439Z
---

# Canned Cycle Output for Drilling Operations

TopSolid's post-processor converts drilling operations into appropriate canned cycles: G81 (spot drill), G83 (peck drill), G73 (chip-break drill), G84 (tapping), G85/G86 (boring), and G76 (fine boring). Configure the post to use the correct cycle variant for your controller and to handle cycle cancellation (G80) at operation boundaries. For deep-hole drilling, ensure the peck depth and retract amount are correctly formatted in the cycle call.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-canned
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[edgecam-cam-tips-ec-076|Canned Cycle Output for Standard Operations]]
- [[esprit-cam-tips-esp-074|Canned Cycle Output for Standard Hole Operations]]
- [[surfcam-cam-tips-sc2-212|SURFCAM Post Processor Canned Cycle Customization]]
- [[worknc-cam-tips-wnc-061|Canned Cycle Output for Standard Hole Operations]]
