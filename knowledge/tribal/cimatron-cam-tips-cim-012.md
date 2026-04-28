---
id: "cim-012"
title: "Deep Gun Drilling with Peck Cycles"
source: "web:cimatron-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["gun-drilling", "deep-hole", "peck-cycle", "mold-base"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.991Z
---

# Deep Gun Drilling with Peck Cycles

For deep holes (>10×D) in mold bases, use Cimatron's gun drilling cycle with progressive peck depths. Start with 3×D initial peck, then reduce to 1×D for subsequent pecks. Enable 'Chip Breaking' mode (G73) for depths up to 15×D; switch to full retract (G83) beyond 15×D. Set dwell at bottom to 0.5s for through-coolant pressure stabilization.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:cimatron-docs
**Operations:** drilling

## Related
- [[edgecam-cam-tips-ec-158|Gun Drilling Strategy with Pilot Hole Requirement]]
- [[mastercam-cam-tips-mc-160|Gun drilling parameters focus on straight-line accuracy and coolant flow for extreme depth ratios]]
- [[solidcam-cam-tips-sc-139|Gun Drilling — Single-Flute Deep Hole Strategy with Guide Bushing]]
- [[cimatron-cam-tips-cim-032|Cooling Channel Drilling Sequences]]
- [[cimatron-cam-tips-cim-078|Cooling Channel Drilling and Milling]]
