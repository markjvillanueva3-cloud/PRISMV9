---
name: tribal-gc-141
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "c-axis", "sub-spindle", "coordinate-transform"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-141.md
promoted_at: 2026-06-09T22:31:16.348Z
---

# MTM C-axis milling on the sub-spindle requires transformed coordinate origin

When performing C-axis milling operations on the sub-spindle in GibbsCAM MTM, the coordinate system origin shifts from the main spindle's face to the sub-spindle's face. The Z-axis direction reverses (positive Z points toward the main spindle). Define a separate coordinate system for sub-spindle C-axis work with the origin at the sub-spindle face and Z-axis pointing outward. All milling geometry and toolpaths on the sub-spindle reference this transformed CS. The post processor translates between the two coordinate systems automatically, but the programmer must verify the first part carefully — a coordinate inversion error will crash tools into the chuck.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[gibbscam-cam-tips-gc-047|C-axis milling converts the lathe spindle into a rotary positioning axis]]
- [[gibbscam-cam-tips-gc-138|MTM wait codes synchronize part cutoff with sub-spindle catch for lights-out safety]]
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
