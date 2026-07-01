---
name: tribal-cw-059
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "solidworks", "weldments", "multi-body"]
confidence: 85
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-059.md
promoted_at: 2026-06-09T22:31:16.000Z
---

# Weldment Machining — Handle Multi-Body Parts and Weldment Profiles

SOLIDWORKS weldment parts contain multiple solid bodies (structural members, gussets, plates). CAMWorks treats each body as a separate machinable entity. Define which bodies are stock (to be machined) and which are fixture/reference. Run AFR on each target body individually. For post-weld machining (facing weld joints, drilling bolt holes through assemblies), select faces across multiple bodies as a single feature using IFR.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:camworks-docs
**Operations:** milling, drilling

## Related
- [[camworks-cam-tips-cw-062|Multi-Body Part Machining — Separate Operations per Solid Body]]
- [[camworks-cam-tips-cw-055|Associative Machining — Automatic Toolpath Update on Design Changes]]
- [[camworks-cam-tips-cw-056|Design Change Propagation — Handle Feature Addition and Removal]]
- [[camworks-cam-tips-cw-057|Configuration Management — Separate CAM Setups per SOLIDWORKS Config]]
- [[camworks-cam-tips-cw-058|Assembly Machining — Program Fixtures, Vises, and Multi-Part Setups]]
