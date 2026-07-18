---
name: tribal-sc2-168
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["wire-edm", "wire-threading", "awt", "start-hole", "re-thread"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-168.md
promoted_at: 2026-06-09T22:31:16.696Z
---

# SURFCAM Wire EDM Wire Threading and Re-Threading Sequences

SURFCAM generates automatic wire threading (AWT) sequences at each start hole and after wire breaks. Program the threading sequence in the post processor: position over hole, lower upper guide, thread wire through, confirm threading sensor, tension wire, begin cut. For multiple cavities, optimize the cutting order to minimize threading operations — cut all shapes from a single start hole when possible using bridge connections. Set the re-thread retry count to 3 in the post, with 5-second delays between attempts.

**Category:** post_processing
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[bobcad-cam-tips-bc-160|BobCAD Wire EDM Automatic Wire Threading Point Optimization]]
- [[mastercam-cam-tips-mc-122|Automatic wire threading sequences enable unattended wire EDM operation]]
- [[wedm-knowledge-tips-wedm-kb-003|Wire break recovery: re-thread 2mm behind break point]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
