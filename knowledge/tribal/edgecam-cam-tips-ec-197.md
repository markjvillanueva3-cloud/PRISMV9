---
id: "ec-197"
title: "Bar Feeder Lights-Out Operation Safety Programming"
source: "web:edgecam-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["bar-feeder", "lights-out", "safety", "unattended"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.420Z
---

# Bar Feeder Lights-Out Operation Safety Programming

For unattended bar feeder operation, add safety checks in the Edgecam program: tool breakage detection (G65 probe macro checking part diameter after each operation), chip wrap detection (spindle load monitoring via adaptive feed M-codes), bar-end detection (probe touch at expected Z-position), and coolant level monitoring (M-code to check coolant sensor). Program alarm-and-stop sequences (M00 with message) for each failure mode. Set maximum parts-per-tool limits in the tool life management system.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:edgecam-docs
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-060|Bar Feeder Integration for Lights-Out Production]]
- [[esprit-cam-tips-esp-058|Wire EDM Automatic Operation Sequencing for Lights-Out]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[catia-cam-tips-cat-156|CATIA Lathe Sub-Spindle Transfer and Bar-Feeder Programming]]
- [[edgecam-cam-tips-ec-195|Bar Feeder Integration with Part Counter]]
