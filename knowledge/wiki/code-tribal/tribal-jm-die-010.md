---
name: tribal-jm-die-010
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "m2", "high-speed-steel", "hss", "carbide", "recast-layer", "temper", "surface-hardness"]
confidence: 88
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-010.md
promoted_at: 2026-06-09T22:31:16.784Z
---

# JM Die M2 high-speed steel — aggressive roughing OK, add skim for surface hardness

M2 high-speed steel (0.85%C, 4%Cr, 5%Mo, 6%W, 2%V) at 60-65 HRC is used at JM Die for forming punches and extrusion tooling. Despite high hardness, M2 cuts well on wire EDM due to good electrical conductivity from tungsten/molybdenum carbides. On FA-20S: E12xx standard at full power (100%), no derating needed. However, M2's surface hardness is affected by EDM recast — the recast layer loses the secondary hardening from carbide precipitation. Always use 4+ skim passes on M2 to fully remove recast layer. After wire EDM, M2 parts often receive a light temper (400-450°F for 1 hour) to restore surface hardness.

**Category:** machining
**Confidence:** 88
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]]
- [[wedm-knowledge-tips-jm-die-019|JM Die wire break risk factors — thickness, material, corner radius, flushing]]
- [[mastercam-cam-tips-mc-120|Skim cuts in wire EDM progressively improve surface finish and dimensional accuracy]]
- [[wedm-knowledge-tips-wedm-kb-005|Coated wire reduces breaks in carbide and PCD]]
- [[wedm-knowledge-tips-wedm-kb-011|Recast layer thickness determines part integrity]]
