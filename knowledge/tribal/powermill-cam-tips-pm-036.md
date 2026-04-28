---
id: "pm-036"
title: "ViewMill Stock Verification Before Post-Processing"
source: "web:powermill-docs"
confidence: 0.92
category: "cam_strategy"
tags: ["viewmill", "verification", "simulation", "gouge-check"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.555Z
---

# ViewMill Stock Verification Before Post-Processing

Always run ViewMill simulation before post-processing. ViewMill shows: (1) remaining stock colored by thickness, (2) collision detection with holder/machine, (3) gouge detection on finished surfaces. Use 'Compare' mode to overlay the machined stock against the target model — any red zones indicate unmachined material. Set simulation resolution to 0.02mm for finishing verification.

**Category:** cam_strategy
**Confidence:** 0.92
**Source:** web:powermill-docs
**Operations:** setup

## Related
- [[powermill-cam-tips-pm-023|ViewMill Verification Catches Gouges Before Machine]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-084|Toolpath Verification — Step Through Individual Points for Debugging]]
- [[cimatron-cam-tips-cim-018|Simulation Verification Before Post-Processing]]
- [[edgecam-cam-tips-ec-068|Full Machine Simulation with Kinematic Model]]
