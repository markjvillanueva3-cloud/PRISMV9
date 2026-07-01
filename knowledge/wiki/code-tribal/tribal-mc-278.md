---
name: tribal-mc-278
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "tolerance", "stack-up", "multi-setup", "statistics", "positioning"]
confidence: 79
source: "web:mastercam-forum"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-278.md
promoted_at: 2026-06-09T22:31:16.464Z
---

# Statistical tolerance stack-up analysis validates multi-setup part accuracy before programming

Before programming a multi-setup part in Mastercam, perform a tolerance stack-up analysis to verify that the cumulative positioning errors across setups will not exceed the tightest feature tolerance. Sources of variation per setup: (1) fixture repeatability ±0.005-0.02 mm; (2) datum surface flatness error (measured); (3) machine positioning accuracy ±0.005 mm per axis; (4) thermal growth during machining ±0.01 mm/100mm/°C. For a 3-setup part with a ±0.05 mm true position callout between features machined in different setups, the RSS (root sum of squares) stack-up must be < 0.05/3 ≈ 0.017 mm per setup contribution. If the stack-up exceeds the tolerance, redesign the setup sequence to machine the critical features in a single setup, add a precision datum surface machined in Setup 1 and referenced in Setup 2, or specify a probing routine to measure and compensate for setup misalignment.

**Category:** cam_strategy
**Confidence:** 79
**Source:** web:mastercam-forum
**Operations:** general

## Related
- [[mastercam-cam-tips-mc-071|3+2 positioning uses indexed tilts instead of simultaneous 5-axis for rigidity]]
- [[mastercam-cam-tips-mc-074|Arc Fit Tolerance controls the smoothness vs accuracy tradeoff in HSM toolpaths]]
- [[mastercam-cam-tips-mc-146|Shut-off surface machining demands tight tolerances to prevent plastic flash at mold contact zones]]
- [[mastercam-cam-tips-mc-175|Spring passes in micro finishing remove deflection-induced oversize material]]
- [[mastercam-cam-tips-mc-200|Machine group properties define stock shape, material, and coordinate system for all contained operations]]
