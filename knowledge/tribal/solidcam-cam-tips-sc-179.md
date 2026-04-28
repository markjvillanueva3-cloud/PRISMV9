---
id: "sc-179"
title: "Barrel Cutter Lens and Oval Types — Select by Surface Accessibility"
source: "web:solidcam-docs"
confidence: 82
category: "cam_strategy"
tags: ["solidcam", "barrel-cutter", "lens", "oval", "tool-geometry"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.801Z
---

# Barrel Cutter Lens and Oval Types — Select by Surface Accessibility

SolidCAM recognizes three barrel cutter subtypes: (1) Standard Barrel — curved side only, used for open surfaces and walls; (2) Lens (double barrel) — curved profile on both sides of the tool tip, used for floor and wall transitions; (3) Oval (taper barrel) — tapered barrel profile for undercut or near-vertical surfaces. Define the exact barrel geometry in the Tool Crib: barrel radius, tip radius, and taper angle. For walls steeper than 75 degrees, use standard barrel with the side tangent. For walls between 15-75 degrees, use lens type for maximum coverage. For undercuts, oval type allows negative tilt angles. Always verify the barrel cutter geometry in the SolidCAM tool display before calculating the toolpath.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:solidcam-docs
**Operations:** 5axis, finishing

## Related
- [[solidcam-cam-tips-sc-058|Turbo HSR Hybrid Rib Roughing — Single Operation for Thin Ribs]]
- [[solidcam-cam-tips-sc-064|HSM Horizontal Area Detection — Automatic Flat Region Strategy]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
