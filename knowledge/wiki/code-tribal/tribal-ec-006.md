---
name: tribal-ec-006
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["waveform", "rest-machining", "stock-model", "cleanup"]
confidence: 89
source: "web:edgecam-waveform"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-006.md
promoted_at: 2026-06-09T22:31:16.162Z
---

# Rest Machining from Waveform with Smaller Cutter

After Waveform roughing, use rest machining with a smaller cutter (40-60% of the roughing tool) to clean corners and fillets that the larger tool couldn't reach. Edgecam references the in-process stock model from Waveform to target only remaining material. Enable minimum material threshold to skip areas with less than 0.3mm stock remaining — this eliminates air cutting that wastes 15-30% of cycle time in complex geometries.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:edgecam-waveform
**Operations:** rest_machining, semi_finishing

## Related
- [[mastercam-cam-tips-mc-262|Rest machining with stock model reference precisely targets only remaining material from larger tool passes]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
- [[camworks-cam-tips-cw-043|Rest Machining — Automatic Stock Model for Multi-Tool Finishing]]
- [[cimatron-cam-tips-cim-005|Pencil Milling for Corner Cleanup]]
