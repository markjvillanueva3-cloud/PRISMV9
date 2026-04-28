---
id: "sc-180"
title: "Cusp Height Control — Calculate Stepover from Target Surface Roughness"
source: "web:solidcam-docs"
confidence: 89
category: "cam_strategy"
tags: ["solidcam", "cusp-height", "surface-roughness", "stepover", "constant-cusp"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.802Z
---

# Cusp Height Control — Calculate Stepover from Target Surface Roughness

In SolidCAM finishing operations, the relationship between stepover, tool radius, and cusp height is: cusp_height = R - sqrt(R² - (stepover/2)²) where R is the effective cutting radius. For a target Ra of 0.8μm (equivalent to approximately 3.2μm cusp height Rz), a 10mm ball end mill requires stepover ≤ 0.36mm. SolidCAM's 'Constant Cusp' mode automates this: enter the target cusp height and SolidCAM varies the stepover based on local surface curvature. On convex surfaces the stepover increases (larger effective radius), on concave surfaces it decreases. This produces uniform surface finish across varying geometry, unlike constant-stepover which creates visible bands at curvature transitions.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** finishing, 3d_surface

## Related
- [[solidcam-cam-tips-sc-166-2|Renewal Theory for iMachining Replacement]]
- [[solidcam-cam-tips-sc-127|iMachining Hardened Steel — Level 1-2 with CBN or Coated Micro-Grain Carbide]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
