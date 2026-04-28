---
id: "sc2-207"
title: "SURFCAM Best-Fit Alignment Probing for Castings"
source: "web:surfcam-docs"
confidence: 0.84
category: "setup"
tags: ["probing", "best-fit", "casting", "alignment", "stock-distribution"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.210Z
---

# SURFCAM Best-Fit Alignment Probing for Castings

For cast or forged parts with irregular stock distribution, SURFCAM supports best-fit alignment probing. Probe 10-20 points on the raw stock surface and run a best-fit algorithm to find the optimal WCS position that maximizes minimum stock allowance across all surfaces. The machine macro computes the best-fit transformation (translation + rotation) and applies it to the active WCS. This ensures no surface is undermachined due to casting shift. Program the probing routine before any cutting operations. The probe point density should be highest near critical features.

**Category:** setup
**Confidence:** 0.84
**Source:** web:surfcam-docs
**Operations:** probing, roughing

## Related
- [[topsolid-cam-tips-ts-110|Best-Fit Alignment Optimizes Part Position in Stock]]
- [[edgecam-cam-tips-ec-110|Alignment Probing for Castings and Forgings]]
- [[esprit-cam-tips-esp-116|Alignment Probing for Castings and Forgings]]
- [[fusion360-cam-tips-ext-f360-092|Part Alignment Probing for Castings and Forgings]]
- [[worknc-cam-tips-wnc-118|Best-Fit Alignment for Castings and Forgings]]
