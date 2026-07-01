---
name: tribal-ts-095
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["arc-fitting", "file-size", "smooth-motion", "interpolation"]
confidence: 91
source: "web:topsolid-arcfit"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-095.md
promoted_at: 2026-05-26T16:07:21.045Z
---

# Arc Fitting Reduces NC File Size and Improves Motion

TopSolid's arc fitting converts sequences of short linear segments into circular arc moves (G02/G03), reducing NC file size by 50-80% and enabling smoother machine motion. The arc fitting tolerance should be set equal to or tighter than the machining tolerance (typically 0.005 mm). Enable arc fitting for all finishing operations. Note: some controllers handle arcs better than others—Heidenhain and Siemens excel at arc interpolation, while some older Fanuc controls may need linear output for best results.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-arcfit
**Operations:** finishing

## Related
- [[fusion360-cam-tips-ext-f360-106|Arc Fitting to Replace Linear Segments]]
- [[mastercam-cam-tips-mc-248|Toolpath filtering and arc fitting reduce NC file size and improve machine motion quality]]
- [[worknc-cam-tips-wnc-046|Arc Fitting Reduces File Size and Improves Motion]]
- [[bobcad-cam-tips-bc-101|Smooth Flow and Arc Fitting for HSM Controllers]]
- [[camworks-cam-tips-cw-114|Arc Fitting for Surface Quality — Smooth Linear Segments into Arcs]]
