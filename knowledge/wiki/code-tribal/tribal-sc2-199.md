---
name: tribal-sc2-199
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["batch-post", "multi-setup", "automation", "setup-sheets", "naming"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-199.md
promoted_at: 2026-06-09T22:31:16.703Z
---

# SURFCAM Batch Post Processing for Multi-Setup Parts

SURFCAM's batch post processor generates NC code for all setups in a multi-setup part with a single command. Define the post processor and output directory for each setup, then run Batch Post. The system generates separate NC files per setup with consistent naming (PartNumber_Setup1.nc, PartNumber_Setup2.nc). Include setup sheets in the batch output — SURFCAM generates HTML or PDF setup documentation showing tool lists, WCS origins, and operation sequences. Automate batch posting via the API for lights-out programming workflows.

**Category:** post_processing
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** roughing, finishing, drilling

## Related
- [[solidcam-cam-tips-sc-108|Coordinate System Automation — Auto-Detect Machining Origins from Model]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[catia-cam-tips-cat-181|Multi-Setup Manufacturing Program Organization in CATIA]]
- [[catia-cam-tips-cat-182|Stock Transfer Between Setups with Intermediate Stock Bodies]]
