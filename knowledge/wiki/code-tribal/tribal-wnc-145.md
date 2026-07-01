---
name: tribal-wnc-145
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["worknc-designer", "electrode", "extraction", "spark-gap", "edm"]
confidence: 90
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-145.md
promoted_at: 2026-05-26T16:07:21.629Z
---

# WorkNC Designer Electrode Geometry — Extracting Burn Shapes

WorkNC Designer extracts electrode geometry from cavity models: select the cavity region requiring EDM, offset surfaces by the spark gap (0.1-0.3mm for roughing, 0.01-0.05mm for finishing), and create the electrode solid with mounting features. Designer adds electrode extensions (clearance faces beyond the burn area), blend radii at sharp transitions, and datum reference features for the EROWA/System 3R holder. Each electrode is saved as a separate model linked to the parent cavity for associative updates when the cavity design changes.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** edm

## Related
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
- [[tebis-cam-tips-teb-007|Electrode Design-to-NC Workflow Covers Full EDM Process]]
- [[topsolid-cam-tips-ts-053|Automatic Electrode Extraction from Mold Geometry]]
- [[topsolid-cam-tips-ts-057|Spark Gap Management with Per-Surface Control]]
