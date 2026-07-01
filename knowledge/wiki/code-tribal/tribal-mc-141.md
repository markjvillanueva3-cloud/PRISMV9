---
name: tribal-mc-141
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "core-cavity", "mold", "machine-group", "wcs", "parting-line"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-141.md
promoted_at: 2026-06-09T22:31:16.430Z
---

# Core/cavity split machining uses separate machine groups for each mold half

For mold work in Mastercam, create separate Machine Groups for the core and cavity halves. Each group has its own stock definition, work coordinate system, and tool list. This separation prevents toolpath errors from incorrect stock references — the cavity group uses the cavity solid as the part and a block as stock, while the core group references the core solid. Set WCS origins at the parting line center for both groups so the mold halves align when assembled. Use separate Tool Planes for angled features (lifters, slides) within each group. This organization also enables independent posting — cavity operations post to one NC file, core operations to another, allowing parallel machining on two machines.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** mold_die, setup

## Related
- [[mastercam-cam-tips-mc-280|Mold core/cavity workflow uses solid model split and electrode extraction for integrated EDM planning]]
- [[mastercam-cam-tips-mc-143|Parting line machining requires precise Z-level control and smooth surface finish]]
- [[mastercam-cam-tips-mc-200|Machine group properties define stock shape, material, and coordinate system for all contained operations]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[topsolid-cam-tips-ts-114|Core/Cavity Split with Automatic Parting Line Detection]]
