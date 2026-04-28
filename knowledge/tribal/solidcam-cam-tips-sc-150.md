---
id: "sc-150"
title: "Parting Line Machining — Clean Shut-Off Surfaces for Injection Molds"
source: "web:solidcam-docs"
confidence: 89
category: "cam_strategy"
tags: ["solidcam", "parting-line", "injection-mold", "shut-off", "precision"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.779Z
---

# Parting Line Machining — Clean Shut-Off Surfaces for Injection Molds

Injection mold parting lines require precise machining where core and cavity halves meet. In SolidCAM, program parting line surfaces as separate finishing operations with tighter tolerance (0.005mm) than general cavity surfaces (0.01mm). Use a bull-nose end mill rather than a ball end mill for parting surfaces — the flat bottom produces a true planar surface that seals properly. Machine the parting surface with Constant Stepover strategy using 5-8% stepover for excellent surface finish. After machining, verify parting line flatness with a Solid Probe surface scan comparing to the nominal CAD surface. Parting line mismatch of more than 0.02mm causes flash in molded parts.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** finishing, 3d_surface

## Related
- [[solidcam-cam-tips-sc-161-2|Wiener Process for Stochastic iMachining Wear]]
- [[solidcam-cam-tips-sc-165-2|Mutual Information for SPC Feature Selection]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
