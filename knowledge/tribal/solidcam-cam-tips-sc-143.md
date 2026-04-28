---
id: "sc-143"
title: "Back Spot-Facing — Machining the Far Side of Through-Holes"
source: "web:solidcam-docs"
confidence: 84
category: "cam_strategy"
tags: ["solidcam", "back-spot-facing", "through-hole", "bolt-seating", "special-tool"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.774Z
---

# Back Spot-Facing — Machining the Far Side of Through-Holes

Back spot-facing creates a flat or chamfered surface on the far side of a through-hole, typically for bolt head or nut seating. In SolidCAM, program back spot-facing using a dedicated back-spotfacing tool (flip-type or Keo-style) with a custom tool definition. The cycle: rapid to position, feed through the pre-drilled hole at reduced RPM (50% of normal), engage the flip blade past the far surface, then feed at 0.03-0.08mm/rev to cut the spot face. Critical: set spindle speed low enough for the flip blade to deploy reliably and retract without catching. Define the tool's cutting geometry accurately in SolidCAM's tool definition to enable proper collision checking.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:solidcam-docs
**Operations:** drilling

## Related
- [[solidcam-cam-tips-sc-149-2|Thermal Compensation for Long Operations]]
- [[solidcam-cam-tips-sc-170-2|iMachining Material Level Calibration]]
- [[cimatron-cam-tips-cim-042|Monte Carlo Cycle Time Estimation]]
- [[cimatron-cam-tips-cim-102|Monte Carlo Cycle Time Estimation]]
- [[hypermill-cam-tips-ext-hm-146|Monte Carlo Cycle Time Estimation]]
