---
name: tribal-cim-087
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["cad-repair", "import", "surface-gaps", "tangency"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-087.md
promoted_at: 2026-06-09T22:31:16.103Z
---

# Cimatron CAD Repair for Imported Models

Imported STEP/IGES models often have surface gaps, overlaps, and tangency breaks. Cimatron CAD repair: close gaps (up to 0.1mm), extend short surfaces, rebuild degenerate faces, smooth tangency transitions. Run surface analysis first to identify problems. Fix before generating toolpaths — machining amplifies surface quality problems. Clean geometry is prerequisite for good machining results.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:cimatron-docs
**Operations:** setup

## Related
- [[tebis-cam-tips-teb-094|Tebis CAD Repair for Imported Surfaces]]
- [[powermill-cam-tips-pm-135|CAD Surface Repair Before Programming]]
- [[powermill-cam-tips-pm-187|CAD Repair for Import Quality]]
- [[sprutcam-cam-tips-spr-132|CAD Surface Repair Before Programming]]
- [[tebis-cam-tips-teb-191|CAD Surface Repair Best Practices]]
