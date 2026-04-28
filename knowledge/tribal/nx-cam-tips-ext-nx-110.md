---
id: "nx-110"
title: "On-Machine Probing with Automatic WCS Alignment"
source: "web:siemens-nx-docs"
confidence: 88
category: "quality"
tags: ["siemens-nx", "on-machine-probing", "wcs-alignment", "setup-reduction", "datum"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.413Z
---

# On-Machine Probing with Automatic WCS Alignment

NX On-Machine Probing generates probing routines that measure part datum features and automatically update the Work Coordinate System before machining begins. Define probe points on 3 mutually perpendicular faces for a full 6-DOF alignment or use a bore + face combination for rotational parts. NX outputs the probing cycle (G65 Macro on Fanuc, CYCLE977/978 on Siemens) and stores measured offsets in the specified G54-G59 register. This eliminates manual edge-finding and reduces setup time by 5-15 minutes per part.

**Category:** quality
**Confidence:** 88
**Source:** web:siemens-nx-docs
**Operations:** probing, setup

## Related
- [[surfcam-cam-tips-sc2-203|SURFCAM In-Process Probing for WCS Alignment]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
