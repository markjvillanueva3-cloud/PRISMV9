---
name: tribal-sc-084
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "mill-turn", "live-tooling", "c-axis", "rpm"]
confidence: 85
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-084.md
promoted_at: 2026-06-09T22:31:16.590Z
---

# Mill-Turn Live Tooling — RPM vs. CSS Decision for Milling on Lathe

Live tooling milling operations on mill-turn machines always run at constant RPM (not CSS), but the workpiece C-axis positioning accuracy depends on the spindle servo response. For interpolated milling (circular pockets, helical arcs) on parts larger than 200mm diameter, reduce feed rate by 15-20% to account for C-axis acceleration limitations. SolidCAM's MCO (Machine Control Operations) can insert a C-axis clamp/unclamp sequence between positioned and interpolated milling to improve rigidity.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** mill_turn_milling

## Related
- [[solidcam-cam-tips-sc-082|Mill-Turn C/Y-Axis Milling — Coordinate System Alignment]]
- [[solidcam-cam-tips-sc-155-2|Sobol Sensitivity for Parameter Importance]]
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
- [[fusion360-cam-tips-ext-f360-078|Live Tooling Coordinate System and Speed Limits]]
