---
id: "spr-077"
title: "Impeller 5-Axis Roughing Strategy"
source: "web:sprutcam-docs"
confidence: 0.84
category: "cam_strategy"
tags: ["impeller", "5-axis", "plunge-roughing", "blade-passage"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.938Z
---

# Impeller 5-Axis Roughing Strategy

For impeller roughing in SprutCAM: use plunge roughing between blades to remove bulk material, followed by 5-axis contour roughing for the flow passages. Define hub, shroud, and blade surfaces. Set tool axis to follow the blade passage centerline. Use short, rigid tools — impeller passages have tight access. SprutCAM's simulation is essential to verify collision-free access between adjacent blades.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:sprutcam-docs
**Operations:** specialty

## Related
- [[tebis-cam-tips-teb-181|Impeller 5-Axis Roughing Strategy]]
- [[solidcam-cam-tips-sc-159-2|AMSAA Reliability Growth for Program Maturity]]
- [[bobcad-cam-tips-bc-038|Impeller and Blade Machining with Hub-to-Tip Strategy]]
- [[camworks-cam-tips-cw-051|Blade and Impeller Machining — Dedicated 5-Axis Strategies]]
- [[catia-cam-tips-cat-029|Impeller Blade Machining Requires Split Roughing and Finishing]]
