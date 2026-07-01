---
name: tribal-teb-009
category: code-tribal
subdomain: mold_die
domain: tribal-knowledge
tags: ["assembly", "multi-component", "datum", "slides"]
confidence: 86
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-009.md
promoted_at: 2026-06-09T22:31:16.709Z
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
