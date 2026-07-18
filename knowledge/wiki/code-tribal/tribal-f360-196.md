---
name: tribal-f360-196
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["fusion360", "first-article", "inspection", "fai", "as9102"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-196.md
promoted_at: 2026-06-09T22:31:16.299Z
---

# First Article Inspection Workflow in Fusion 360

After machining the first part, use Fusion's Inspection workspace to create a first article inspection (FAI) plan. Import the GD&T from the drawing, assign measurement methods (CMM, caliper, pin gauge) to each dimension, and define acceptance criteria. The inspection plan references the same model used for CAM, ensuring dimensional traceability. Export the FAI report as AS9102 or PPAP format depending on customer requirements. Feed inspection results back into the CAM program: if a dimension consistently measures 0.02mm large, adjust the tool wear offset or stock-to-leave rather than changing the CAM geometry — this preserves the associativity between design and manufacturing.

**Category:** quality
**Confidence:** 0.85
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-120|Surface Inspection with In-Process Probing]]
- [[fusion360-cam-tips-ext-f360-162|Post-Machining Inspection Comparison in Simulation]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
