---
name: tribal-sc-082
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "mill-turn", "c-axis", "y-axis", "coordinate-system"]
confidence: 89
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-082.md
promoted_at: 2026-06-09T22:31:16.590Z
---

# Mill-Turn C/Y-Axis Milling — Coordinate System Alignment

When programming C-axis and Y-axis milling operations on a mill-turn machine in SolidCAM, ensure the CoordSys Z-axis aligns with the spindle axis (typically the machine Z), not the tool axis. A common mistake is defining the milling CoordSys with Z pointing radially, which causes the post processor to output incorrect plane selections (G17/G18/G19). Use SolidCAM's Machine Coordinate System preview to verify the axis mapping before generating G-code.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** mill_turn_milling

## Related
- [[solidcam-cam-tips-sc-084|Mill-Turn Live Tooling — RPM vs. CSS Decision for Milling on Lathe]]
- [[solidcam-cam-tips-sc-083|Mill-Turn Sub-Spindle Transfer — Stock Model Carries Over]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
