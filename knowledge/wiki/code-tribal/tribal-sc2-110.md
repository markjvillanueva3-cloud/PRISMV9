---
name: tribal-sc2-110
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["fixtures", "collision-objects", "vise", "clamps", "clearance"]
confidence: 87
source: "web:surfcam-fixtures"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-110.md
promoted_at: 2026-06-09T22:31:16.684Z
---

# Fixture Modeling for Collision-Safe Toolpath Generation

Import fixture models (vises, clamps, angle plates, tombstones) into the SURFCAM setup as collision objects. The toolpath generator will avoid these fixtures during linking and rapid moves. Model fixtures with a 2mm clearance envelope to account for positioning tolerance and dynamic deflection. For custom fixtures, use simple solid bodies (blocks, cylinders) rather than detailed assemblies — collision detection only needs the outer envelope, not bolt details.

**Category:** setup
**Confidence:** 87
**Source:** web:surfcam-fixtures
**Operations:** setup

## Related
- [[gibbscam-cam-tips-gc-198|GibbsCAM simulation fixture and clamp modeling catches collisions before first article]]
- [[bobcad-cam-tips-bc-082|Collision Detection for Tool Assembly and Fixtures]]
- [[camworks-cam-tips-cw-058|Assembly Machining — Program Fixtures, Vises, and Multi-Part Setups]]
- [[controller-knowledge-tips-ctrl-055|Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets]]
- [[edgecam-cam-tips-ec-062|Part Modeler Creates Stock and Fixtures for CAM]]
