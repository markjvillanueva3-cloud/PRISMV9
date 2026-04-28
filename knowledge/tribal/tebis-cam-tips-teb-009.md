---
id: "teb-009"
title: "Multi-Component Mold Assemblies Share Reference Geometry"
source: "web:tebis-docs"
confidence: 86
category: "mold_die"
tags: ["assembly", "multi-component", "datum", "slides"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.227Z
---

# Multi-Component Mold Assemblies Share Reference Geometry

For mold assemblies with core, cavity, slides, and lifters, create a master assembly in Tebis with shared coordinate systems. Each component references the same mold datum. Use the assembly structure to check interference between components and verify shut-off surfaces. Program each component in its own NCJob set but reference the master datum for consistent alignment on the machine.

**Category:** mold_die
**Confidence:** 86
**Source:** web:tebis-docs
**Operations:** setup

## Related
- [[worknc-cam-tips-wnc-040|Insert Machining with Multi-Component Coordination]]
- [[bobcad-cam-tips-bc-040|Collision Avoidance with Full Assembly Checking]]
- [[bobcad-cam-tips-bc-082|Collision Detection for Tool Assembly and Fixtures]]
- [[bobcad-cam-tips-bc-139|BobCAM for SOLIDWORKS Assembly-Level Machining Setup]]
- [[camworks-cam-tips-cw-058|Assembly Machining — Program Fixtures, Vises, and Multi-Part Setups]]
