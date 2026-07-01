---
name: tribal-ec-064
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fixtures", "collision-detection", "modeling", "workholding"]
confidence: 89
source: "web:edgecam-part-modeler"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-064.md
promoted_at: 2026-06-09T22:31:16.175Z
---

# Fixture Modeling for Collision Detection

Model all workholding components in Part Modeler: vises, clamps, parallels, soft jaws, and fixture plates. Even simplified models (extruded profiles with correct envelope dimensions) are sufficient for collision detection. Assign fixtures as collision-check objects in the simulation setup. This catches tool-fixture collisions that account for 30% of all crash incidents. Update fixture models when the physical setup changes.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:edgecam-part-modeler
**Operations:** all

## Related
- [[bobcad-cam-tips-bc-082|Collision Detection for Tool Assembly and Fixtures]]
- [[gibbscam-cam-tips-gc-198|GibbsCAM simulation fixture and clamp modeling catches collisions before first article]]
- [[surfcam-cam-tips-sc2-064|Collision Detection for Tool Assembly and Fixtures]]
- [[camworks-cam-tips-cw-058|Assembly Machining — Program Fixtures, Vises, and Multi-Part Setups]]
- [[controller-knowledge-tips-ctrl-055|Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets]]
