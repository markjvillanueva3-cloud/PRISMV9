---
name: tribal-teb-003
category: code-tribal
subdomain: mold_die
domain: tribal-knowledge
tags: ["cad-quality", "surface-healing", "import", "data-repair"]
confidence: 91
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-003.md
promoted_at: 2026-05-26T16:07:20.600Z
---

# Surface Healing Repairs Imported CAD Data Before Machining

Tebis CAD/Quality module detects and repairs surface defects in imported STEP/IGES/Parasolid data: gaps, overlaps, tangency breaks, and micro-surfaces. Run surface analysis first to color-code problem areas. Use Heal Topology to close gaps up to 0.01mm automatically. For larger gaps, use Fill Surface with G2 continuity. Clean CAD data produces toolpaths with uniform scallop height and eliminates witness lines caused by surface discontinuities.

**Category:** mold_die
**Confidence:** 91
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[sprutcam-cam-tips-spr-188|Surface Analysis Before Programming]]
- [[camworks-cam-tips-cw-145|TBM with Imported Models — STEP AP242 PMI Support]]
- [[camworks-cam-tips-cw-154|Solid Edge Synchronous Technology — Direct Edit Models in CAMWorks]]
- [[cimatron-cam-tips-cim-087|Cimatron CAD Repair for Imported Models]]
- [[edgecam-cam-tips-ec-133|Edgecam Designer Geometry Repair for Imported Models]]
