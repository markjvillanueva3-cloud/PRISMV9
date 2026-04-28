---
id: "cw-059"
title: "Weldment Machining — Handle Multi-Body Parts and Weldment Profiles"
source: "web:camworks-docs"
confidence: 85
category: "cam_strategy"
tags: ["camworks", "solidworks", "weldments", "multi-body"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.676Z
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
