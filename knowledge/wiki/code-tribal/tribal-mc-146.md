---
name: tribal-mc-146
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "shut-off", "mold", "flash-prevention", "tolerance", "interference"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-146.md
promoted_at: 2026-06-09T22:31:16.431Z
---

# Shut-off surface machining demands tight tolerances to prevent plastic flash at mold contact zones

Shut-off surfaces in injection molds are areas where core and cavity steel meet to seal off the plastic flow (through-holes, windows, undercuts). These surfaces must mate perfectly — any gap allows flash. In Mastercam, machine shut-off surfaces using Contour or Parallel finishing with tolerance set to 0.005 mm or tighter. Apply a stock-to-leave of -0.005 to -0.01 mm (negative stock) to create slight interference that ensures positive contact under clamping pressure. Use the same tool and feed rate for both core and cavity shut-off surfaces to ensure matching surface texture. Verify shut-off contact using Mastercam's section analysis: overlay core and cavity models and check for gaps exceeding 0.01 mm. Any gap at a shut-off will produce visible flash on every molded part.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** finishing, mold_die

## Related
- [[mastercam-cam-tips-mc-043|OptiRough Critical Depths in 2026 flatten stepped floors automatically]]
- [[mastercam-cam-tips-mc-071|3+2 positioning uses indexed tilts instead of simultaneous 5-axis for rigidity]]
- [[mastercam-cam-tips-mc-074|Arc Fit Tolerance controls the smoothness vs accuracy tradeoff in HSM toolpaths]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
