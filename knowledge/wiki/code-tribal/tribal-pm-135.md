---
name: tribal-pm-135
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["cad-repair", "import", "gaps", "tangency"]
confidence: 0
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-135.md
promoted_at: 2026-06-09T22:31:16.566Z
---

# CAD Surface Repair Before Programming

Imported STEP/IGES often have gaps, overlaps, tangency breaks. PowerMill's surface repair: close gaps to 0.1mm, extend short surfaces, rebuild degenerate faces. Run surface analysis first. Fix before programming — machining amplifies surface defects. Clean geometry is prerequisite for accurate toolpath generation, especially for 5-axis operations.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:powermill-docs
**Operations:** setup

## Related
- [[cimatron-cam-tips-cim-087|Cimatron CAD Repair for Imported Models]]
- [[sprutcam-cam-tips-spr-132|CAD Surface Repair Before Programming]]
- [[tebis-cam-tips-teb-094|Tebis CAD Repair for Imported Surfaces]]
- [[powermill-cam-tips-pm-187|CAD Repair for Import Quality]]
- [[tebis-cam-tips-teb-191|CAD Surface Repair Best Practices]]
