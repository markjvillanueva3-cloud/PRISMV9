---
name: tribal-ts-003
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["assembly", "fixtures", "collision", "context"]
confidence: 91
source: "web:topsolid-assembly"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-003.md
promoted_at: 2026-05-26T16:07:20.668Z
---

# Assembly Machining Respects Full Machine Context

TopSolid's assembly machining mode allows you to program operations in the context of the full assembly, including fixtures, clamps, and neighboring components. The system automatically detects collision zones from assembly components and restricts toolpaths accordingly. This is critical for multi-part fixture setups where tool access is limited by adjacent workpieces or clamp locations.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-assembly
**Operations:** general

## Related
- [[solidcam-cam-tips-sc-098|Assembly Machining — Reference Fixture Bodies for Collision Avoidance]]
- [[topsolid-cam-tips-ts-138|TopSolid'Design Assembly Context — Machine Parts in Assembly Position]]
- [[bobcad-cam-tips-bc-082|Collision Detection for Tool Assembly and Fixtures]]
- [[bobcad-cam-tips-bc-139|BobCAM for SOLIDWORKS Assembly-Level Machining Setup]]
- [[camworks-cam-tips-cw-058|Assembly Machining — Program Fixtures, Vises, and Multi-Part Setups]]
