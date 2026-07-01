---
name: tribal-cat-154
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "wiper-insert", "roughing", "surface-finish"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-154.md
promoted_at: 2026-06-09T22:31:16.066Z
---

# CATIA Lathe Roughing with Wiper Insert Geometry

CATIA Lathe Machining supports wiper insert geometry definition for improved surface finish during roughing. In the tool editor, set the nose radius to the primary radius and add the 'Wiper Edge Length' parameter (the extended flat or large-radius wiper segment). With wiper inserts, increase the feed rate by 80-100% while maintaining the same surface finish as standard inserts at lower feed. CATIA's surface finish estimation algorithm accounts for wiper geometry — verify in the 'Theoretical Roughness' display. Wiper inserts work best in stable setups with minimal overhang (L/D < 4).

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:catia-docs
**Operations:** turning

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[solidcam-cam-tips-sc-078|Turning Roughing — Use Wiper Insert Geometry for Better Surface Direct from Rough]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
