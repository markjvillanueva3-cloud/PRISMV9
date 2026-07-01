---
name: tribal-mc-280
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "mold", "electrode", "edm", "core-cavity", "parting-line"]
confidence: 82
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-280.md
promoted_at: 2026-06-09T22:31:16.465Z
---

# Mold core/cavity workflow uses solid model split and electrode extraction for integrated EDM planning

Mastercam's mold/die workflow starts with the solid model of the finished part. Use the Solid Model > Split function to separate the core and cavity halves along the parting line. For features that cannot be directly machined (deep narrow ribs, sharp internal corners < R0.2 mm), extract electrode shapes using the 'Electrode Extraction' utility: select the target feature faces and Mastercam creates a solid body representing the required electrode with the specified overburn gap (typically 0.1-0.2 mm per side for finishing electrodes, 0.3-0.5 mm for roughing electrodes). Program the electrode as a separate part with its own Machine Group. This integrated workflow ensures that the electrode geometry precisely matches the cavity feature, eliminating the manual CAD work of creating electrode bodies, which is error-prone and typically takes 30-60 minutes per electrode.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:mastercam-docs
**Operations:** edm, finishing

## Related
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
- [[mastercam-cam-tips-mc-143|Parting line machining requires precise Z-level control and smooth surface finish]]
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
