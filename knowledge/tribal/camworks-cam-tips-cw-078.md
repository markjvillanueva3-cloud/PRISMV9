---
id: "cw-078"
title: "Wire EDM Corner Strategy — Power Reduction and Dwell for Sharp Corners"
source: "web:camworks-docs"
confidence: 89
category: "cam_strategy"
tags: ["camworks", "wire-edm", "corners", "power-reduction", "accuracy"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.691Z
---

# Wire EDM Corner Strategy — Power Reduction and Dwell for Sharp Corners

Sharp internal corners in wire EDM tend to overwash (radius larger than wire radius + gap) due to spark concentration. Set corner power reduction to 30-50% of main cut power and add a corner dwell time (0.5-2 seconds) to allow the gap to stabilize. For corners requiring radius < wire radius (0.1-0.15mm), use thinner wire (0.15mm instead of 0.25mm) and accept slower cutting speed. CAMWorks corner strategy parameters are accessible per feature in the operation settings.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[camworks-cam-tips-cw-164|Wire EDM Corner Strategy — Sharp Corners Without Overburn]]
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[bobcad-cam-tips-bc-065|Corner Strategy with Power Reduction]]
- [[surfcam-cam-tips-sc2-059|Corner Strategies: Power Reduction and Overburn Control]]
- [[topsolid-cam-tips-ts-148|TopSolid Wire EDM Corner Accuracy — Power and Speed Modulation]]
