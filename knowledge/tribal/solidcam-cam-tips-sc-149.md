---
id: "sc-149"
title: "Micro-Retract Strategy — Minimize Air Cutting in Complex Mold Finishing"
source: "web:solidcam-docs"
confidence: 88
category: "cam_strategy"
tags: ["solidcam", "micro-retract", "cycle-time", "die-mold", "finishing"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.778Z
---

# Micro-Retract Strategy — Minimize Air Cutting in Complex Mold Finishing

In mold finishing with many disconnected surface patches, tool retracts between segments waste significant cycle time. SolidCAM's micro-retract option lifts the tool only 0.5-2mm above the surface (vs. full retract to safe plane at 50+mm) when transitioning between adjacent cutting segments. Enable micro-retract in the HSM linking parameters and set the retract height based on the maximum cusp height plus a safety margin (typically 1mm). For open mold cavities without obstruction risk, micro-retract can reduce finishing cycle time by 20-40%. Disable micro-retract when cutting near vertical walls or deep narrow slots where collision risk exists.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** finishing, 3d_surface

## Related
- [[solidcam-cam-tips-sc-160-2|Deflection Compensation δ=FL³/3EI for Finishing]]
- [[camworks-cam-tips-cw-179|Thermal Compensation Strategies — Time-Based Offset Adjustment]]
- [[cimatron-cam-tips-cim-108|Thermal Compensation for Long Operations]]
- [[hypermill-cam-tips-ext-hm-155|Thermal Compensation for Long Operations]]
- [[powermill-cam-tips-pm-082|Thermal Compensation for Long Roughing Operations]]
