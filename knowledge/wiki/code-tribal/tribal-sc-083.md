---
name: tribal-sc-083
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "mill-turn", "sub-spindle", "stock-transfer", "part-off"]
confidence: 90
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-083.md
promoted_at: 2026-05-26T16:07:20.431Z
---

# Mill-Turn Sub-Spindle Transfer — Stock Model Carries Over

When transferring a part from the main spindle to the sub-spindle in SolidCAM, the updated stock model transfers automatically. This means subsequent sub-spindle operations see the exact material state from main-spindle machining. Always define the part-off operation before the sub-spindle pickup to ensure the stock model is correctly split. If you modify main-spindle operations after setting up sub-spindle work, regenerate all sub-spindle operations to update the transferred stock model.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** mill_turn, sub_spindle

## Related
- [[solidcam-cam-tips-sc-154-2|Taylor Tool Life for Economic Speed Selection]]
- [[solidcam-cam-tips-sc-082|Mill-Turn C/Y-Axis Milling — Coordinate System Alignment]]
- [[solidcam-cam-tips-sc-084|Mill-Turn Live Tooling — RPM vs. CSS Decision for Milling on Lathe]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
