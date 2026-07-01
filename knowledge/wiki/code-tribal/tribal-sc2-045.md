---
name: tribal-sc2-045
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["turning", "od-roughing", "stock-recognition", "depth-of-cut"]
confidence: 90
source: "web:surfcam-lathe-roughing"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-045.md
promoted_at: 2026-05-26T16:07:20.536Z
---

# OD Roughing with Automatic Stock Recognition

SURFCAM Lathe OD roughing automatically detects the raw stock boundary (round, hex, or custom profile) and generates a minimum number of passes to clear material to the finished profile plus stock allowance. Set the depth of cut to 2-4mm for carbide inserts in steel (80% of insert edge length maximum). Use 'Constant depth' mode for consistent chip load or 'Variable depth' for adaptive cuts that avoid thin slices on the final pass.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-lathe-roughing
**Operations:** turning_roughing

## Related
- [[bobcad-cam-tips-bc-043|OD Roughing with Automatic Stock Recognition]]
- [[camworks-cam-tips-cw-063|Turn Roughing — Optimize Stock Removal with Proper Depth of Cut Sequence]]
- [[edgecam-cam-tips-ec-036|Turning Roughing with Optimized Pass Distribution]]
- [[fusion360-cam-tips-ext-f360-074|Turning Roughing Profile with DOC Pattern Selection]]
- [[bobcad-cam-tips-bc-044|Finish Turning with Insert Angle Gouge Protection]]
