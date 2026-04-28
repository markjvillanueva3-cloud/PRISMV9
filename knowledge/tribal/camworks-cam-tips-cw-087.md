---
id: "cw-087"
title: "Canned Cycle Output — Map Operations to Controller Drill Cycles"
source: "web:camworks-docs"
confidence: 89
category: "cam_strategy"
tags: ["camworks", "post-processor", "canned-cycles", "drilling", "g-code"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.711Z
---

# Canned Cycle Output — Map Operations to Controller Drill Cycles

Configure the post to output canned drill cycles (G81, G83, G73, G84, G76, G85, G86) instead of explicit point-to-point moves. Each drill operation type (spot, peck, chip-break, tap, bore, ream) should map to the correct G-code cycle. Verify peck depth parameters match the controller's format — some controllers use incremental peck depth (Q), others use total accumulated depth. Test tapping cycle output especially carefully: synchronous tap (G84.2/G84.3) vs. floating tap (G84).

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** drilling

## Related
- [[edgecam-cam-tips-ec-076|Canned Cycle Output for Standard Operations]]
- [[esprit-cam-tips-esp-074|Canned Cycle Output for Standard Hole Operations]]
- [[topsolid-cam-tips-ts-069|Canned Cycle Output for Drilling Operations]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
