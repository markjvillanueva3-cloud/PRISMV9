---
id: "bc-130"
title: "BobCAD V36 Advanced Toolpath Simulation with G-Code Verification"
source: "web:bobcad-docs"
confidence: 0.89
category: "verification"
tags: ["v36", "g-code-simulation", "verification", "post-processor", "collision"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.559Z
---

# BobCAD V36 Advanced Toolpath Simulation with G-Code Verification

V36 adds G-code-level simulation that reads the posted NC code and simulates it against the machine kinematic model, catching post processor errors that toolpath-level simulation misses. Enable G-code verification after posting by selecting Simulation > G-Code Mode. The simulator reads actual G/M codes, verifies axis positions against machine limits, and detects rapid-move collisions. This catches issues like incorrect arc directions from IJK sign errors, missing tool length compensation, and wrong canned cycle formats that only manifest in the posted code.

**Category:** verification
**Confidence:** 0.89
**Source:** web:bobcad-docs
**Operations:** roughing, finishing, drilling

## Related
- [[cimatron-cam-tips-cim-018|Simulation Verification Before Post-Processing]]
- [[gibbscam-cam-tips-gc-170|Post processor verification compares G-code back to CAM toolpath for drift detection]]
- [[powermill-cam-tips-pm-023|ViewMill Verification Catches Gouges Before Machine]]
- [[surfcam-cam-tips-sc2-214|SURFCAM Post Processor Testing Methodology]]
- [[bobcad-cam-tips-bc-129|BobCAD V36 Dynamic Machining Maintains Constant Chip Load]]
