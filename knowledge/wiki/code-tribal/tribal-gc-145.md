---
name: tribal-gc-145
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "swiss", "guide-bushing", "clearance", "surface-finish"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-145.md
promoted_at: 2026-06-09T22:31:16.350Z
---

# Guide bushing clearance in GibbsCAM Swiss mode affects surface finish and roundness

In GibbsCAM's Swiss-type machine configuration, set the guide bushing bore clearance to match the actual bushing installed (typically 0.005-0.015 mm over bar diameter). This parameter affects Z-axis programming: the tool engages the part at the guide bushing face, and the bar feeds through the bushing as Z advances. For parts requiring <Ra 0.4 µm finish, use a precision-ground guide bushing with <0.008 mm clearance. Excessive clearance allows bar deflection during cut, degrading both finish and roundness. GibbsCAM's post automatically coordinates Z-axis motion between the headstock (bar feed) and the guide bushing position.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-052|Gang tooling layout minimizes tool change time on Swiss machines]]
- [[gibbscam-cam-tips-gc-057|Face turning with spiral path eliminates the center dwell mark]]
- [[gibbscam-cam-tips-gc-065|Skim cuts progressively improve surface finish and dimensional accuracy]]
- [[gibbscam-cam-tips-gc-146|Swiss-type sub-spindle backworking in GibbsCAM handles second-operation features]]
