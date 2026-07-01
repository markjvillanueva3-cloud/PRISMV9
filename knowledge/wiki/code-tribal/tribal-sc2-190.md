---
name: tribal-sc2-190
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["control-chart", "x-bar-r", "production", "process-drift", "tool-compensation"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-190.md
promoted_at: 2026-06-09T22:31:16.701Z
---

# Control Chart Monitoring for SURFCAM Production Runs

Implement X-bar and R control charts for dimensions produced by SURFCAM programs in production. Sample 5 parts every 25 parts and plot the mean and range. Upper/lower control limits at ±3σ detect process drift before parts go out of spec. When a point exceeds control limits, investigate: tool wear (progressive drift), thermal growth (cyclical pattern), or fixturing shift (sudden jump). Feed the drift data back into SURFCAM as tool diameter compensation adjustments — typically 0.005-0.015mm per 50 parts for finishing operations.

**Category:** quality
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** finishing

## Related
- [[bobcad-cam-tips-bc-206|SPC Integration with BobCAD for Adaptive Process Control]]
- [[cimatron-cam-tips-cim-111|SPC Control Charts for Mold Dimensions]]
- [[hypermill-cam-tips-ext-hm-151|SPC Control Charts for Production Monitoring]]
- [[solidcam-cam-tips-sc-150-2|SPC Control Charts for Production Monitoring]]
- [[sprutcam-cam-tips-spr-087|SPC Control Charts for Production Monitoring]]
