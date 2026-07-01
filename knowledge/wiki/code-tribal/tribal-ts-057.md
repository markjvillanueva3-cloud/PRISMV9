---
name: tribal-ts-057
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["spark-gap", "edm", "surface-offset", "electrode"]
confidence: 90
source: "web:topsolid-sparkgap"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-057.md
promoted_at: 2026-05-26T16:07:20.757Z
---

# Spark Gap Management with Per-Surface Control

TopSolid allows spark gap values to be assigned per surface or per surface group on the electrode. Critical cosmetic surfaces may have a tighter gap (0.02-0.05 mm) for better finish, while structural surfaces use a larger gap (0.1-0.2 mm) for faster erosion. The gap value is automatically applied as a surface offset during electrode extraction. Verify that gap variations don't create thin-wall conditions on the electrode that could cause breakage during machining.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-sparkgap
**Operations:** edm

## Related
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
- [[tebis-cam-tips-teb-007|Electrode Design-to-NC Workflow Covers Full EDM Process]]
- [[worknc-cam-tips-wnc-145|WorkNC Designer Electrode Geometry — Extracting Burn Shapes]]
- [[edgecam-cam-tips-ec-135|Edgecam Designer Offset Surface for Electrode Design]]
- [[cimatron-cam-tips-cim-039|Process Variability in Electrode Spark Gap Control]]
