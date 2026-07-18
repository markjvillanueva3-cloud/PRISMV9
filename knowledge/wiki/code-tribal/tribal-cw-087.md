---
name: tribal-cw-087
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "post-processor", "canned-cycles", "drilling", "g-code"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-087.md
promoted_at: 2026-06-09T22:31:16.006Z
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
