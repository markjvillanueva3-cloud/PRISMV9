---
name: tribal-cat-045
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "rest-material", "roughing", "reference-tool"]
confidence: 90
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-045.md
promoted_at: 2026-05-26T16:07:20.045Z
---

# Rest Material Roughing References Previous Tool Size

In CATIA rest material roughing, always reference the actual previous tool used, not a theoretical tool size. CATIA computes the residual stock envelope based on the prior tool's swept volume. If you specify a tool smaller than actually used, CATIA misses material; if larger, it air-cuts unnecessarily. Define the reference tool in the Rest Material tab by selecting the prior operation directly — CATIA extracts the tool geometry automatically. Verify by enabling stock display in the tool path replay.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-043|Multi-Slice Roughing Maximizes Material Removal Rate]]
- [[catia-cam-tips-cat-044|Adaptive Roughing Maintains Constant Tool Engagement]]
- [[catia-cam-tips-cat-047|Stock-Aware Roughing Uses In-Process Stock Model]]
- [[catia-cam-tips-cat-048|Z-Level Roughing With Helical Entry for Hard Materials]]
