---
id: "gc-118"
title: "In-process inspection catches dimensional drift before scrapping parts"
source: "web:gibbscam-docs"
confidence: 87
category: "cam_strategy"
tags: ["gibbscam", "probing", "in-process", "inspection", "closed-loop", "adaptive"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.924Z
---

# In-process inspection catches dimensional drift before scrapping parts

Insert probing cycles between machining operations in GibbsCAM to measure critical features in-process. For example: rough a bore, probe the bore diameter, adjust the finish boring offset based on the measured size. This closed-loop approach compensates for thermal drift, tool wear, and material variation in real time. Program a conditional branch: if the measured dimension is within tolerance, skip the probe; if out of tolerance, apply correction and re-cut. For high-value aerospace parts, in-process probing prevents scrapping an otherwise completed part due to a single out-of-tolerance feature.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[gibbscam-cam-tips-gc-119|Finished part inspection with probing documents conformance on the machine]]
- [[camworks-cam-tips-cw-152|ShopFloor In-Process Inspection Feedback — Closed-Loop Quality]]
- [[edgecam-cam-tips-ec-111|In-Process Inspection Between Operations]]
- [[esprit-cam-tips-esp-117|In-Process Inspection Between Operations]]
