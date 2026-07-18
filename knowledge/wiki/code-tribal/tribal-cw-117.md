---
name: tribal-cw-117
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "probing", "in-process", "inspection", "closed-loop"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-117.md
promoted_at: 2026-06-09T22:31:16.012Z
---

# In-Process Inspection — Verify Critical Dimensions Mid-Program

Insert probing operations between machining stages to verify critical dimensions before committing to finishing passes. For bore operations: rough bore → probe bore diameter → if within tolerance apply finish bore, if oversize alarm, if undersize adjust tool offset and re-cut. This closed-loop approach eliminates scrap from undetected errors. Program probe moves at reduced feed (F500mm/min) with approach from 2-5mm away from the expected surface for reliable contact detection.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** probing, boring

## Related
- [[camworks-cam-tips-cw-152|ShopFloor In-Process Inspection Feedback — Closed-Loop Quality]]
- [[gibbscam-cam-tips-gc-118|In-process inspection catches dimensional drift before scrapping parts]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
- [[camworks-cam-tips-cw-197|In-Process Probing for Tool Wear Compensation — Closed-Loop Machining]]
- [[edgecam-cam-tips-ec-111|In-Process Inspection Between Operations]]
