---
id: "ts-038"
title: "Blade Finishing with Automatic Fillet Radius Detection"
source: "web:topsolid-blade"
confidence: 90
category: "cam_strategy"
tags: ["blade", "fillet", "finishing", "detection"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.415Z
---

# Blade Finishing with Automatic Fillet Radius Detection

TopSolid's blade finishing automatically detects the fillet radius between blade and hub surfaces and generates a dedicated fillet finishing pass. If no explicit fillet surfaces exist in the model, the system calculates the theoretical fillet based on adjacent surface tangencies. Use a ball-nose cutter with radius equal to or slightly smaller than the fillet radius. Set the stepover to 0.05-0.1 mm for optical-quality blisk surfaces.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-blade
**Operations:** 5_axis, finishing

## Related
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[worknc-cam-tips-wnc-160|WorkNC Flat Area Detection — Automatic Face Milling Where Possible]]
- [[bobcad-cam-tips-bc-038|Impeller and Blade Machining with Hub-to-Tip Strategy]]
- [[camworks-cam-tips-cw-051|Blade and Impeller Machining — Dedicated 5-Axis Strategies]]
- [[catia-cam-tips-cat-029|Impeller Blade Machining Requires Split Roughing and Finishing]]
