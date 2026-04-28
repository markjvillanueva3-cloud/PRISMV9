---
id: "wnc-061"
title: "Canned Cycle Output for Standard Hole Operations"
source: "web:worknc-canned"
confidence: 90
category: "cam_strategy"
tags: ["canned-cycles", "drilling", "post-processor", "hole-making"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.669Z
---

# Canned Cycle Output for Standard Hole Operations

WorkNC posts drilling operations as appropriate canned cycles: G81 (spot), G83 (peck), G73 (chip-break), G84 (tap), G85/G86 (bore). The post handles cycle-specific parameters including peck depth, retract amount, dwell time, and spindle orient. Verify that cycle cancellation (G80) is properly placed at operation boundaries. For deep-hole drilling, ensure peck depth formatting matches controller requirements.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-canned
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[edgecam-cam-tips-ec-076|Canned Cycle Output for Standard Operations]]
- [[esprit-cam-tips-esp-074|Canned Cycle Output for Standard Hole Operations]]
- [[esprit-cam-tips-esp-151|Mill-Turn Canned Cycle Optimization for Holes]]
- [[surfcam-cam-tips-sc2-212|SURFCAM Post Processor Canned Cycle Customization]]
