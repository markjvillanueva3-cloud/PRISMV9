---
name: tribal-pm-004
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["offset-area-clear", "rest-roughing", "stock-model", "smaller-tool"]
confidence: 91
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-004.md
promoted_at: 2026-05-26T16:07:20.358Z
---

# Offset Area Clear Rest Roughing with Stock Model Input

For efficient rest roughing, calculate the primary Offset Area Clear toolpath, then create a stock model from it. Use this stock model as input for the secondary rest roughing operation with a smaller tool. PowerMill's stock model accurately represents actual remaining material rather than theoretical offsets, eliminating air cuts. Enable 'Rest from stock model' and set the rest material allowance to match the previous tool's thickness value.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:powermill-docs
**Operations:** roughing, rest_machining

## Related
- [[tebis-cam-tips-teb-018|Rest Roughing Targets Material Left by Larger Tools]]
- [[powermill-cam-tips-pm-001|Offset Area Clear Profile Order Reduces Air Cutting]]
- [[powermill-cam-tips-pm-002|Offset Area Clear Stepdown Strategy for Variable Stock]]
- [[powermill-cam-tips-pm-003|Offset Area Clear Helical Entry Prevents Plunge Shock]]
- [[powermill-cam-tips-pm-005|Offset Area Clear Thickness Settings for Multi-Stage]]
