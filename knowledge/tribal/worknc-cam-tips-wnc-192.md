---
id: "wnc-192"
title: "Digital Twin Machine Accuracy Mapping — Volumetric Error Model"
source: "web:worknc-docs"
confidence: 83
category: "cam_strategy"
tags: ["digital-twin", "accuracy", "volumetric", "21-error", "ball-bar"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.783Z
---

# Digital Twin Machine Accuracy Mapping — Volumetric Error Model

Map each CNC machine's volumetric accuracy using ball-bar or laser interferometer tests. The digital twin stores the 21-error model (6 per linear axis + 3 squareness): positioning error, straightness (2 directions), roll, pitch, yaw for each axis, plus XY, XZ, YZ squareness. When programming critical parts in WorkNC, reference the accuracy map to assign the most accurate machine. For features requiring < 0.01mm accuracy, the accuracy map identifies which workspace volume achieves this — some areas of the machine envelope are 2-5× more accurate than others.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:worknc-docs
**Operations:** general

## Related
- [[esprit-cam-tips-esp-206|Digital Twin Thermal Compensation Feedback Loop]]
- [[worknc-cam-tips-wnc-184|Digital Twin Cycle Time Calibration — Matching Simulation to Reality]]
- [[nx-cam-tips-ext-nx-140|Volumetric Accuracy Compensation]]
- [[powermill-cam-tips-pm-157|Volumetric Accuracy Compensation]]
- [[tebis-cam-tips-teb-167|Volumetric Accuracy Compensation]]
