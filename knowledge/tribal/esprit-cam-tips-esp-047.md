---
id: "esp-047"
title: "Channel Programming for Citizen/Star/Tornos Swiss Machines"
source: "web:esprit-swiss"
confidence: 88
category: "cam_strategy"
tags: ["swiss-type", "channel", "citizen", "star", "tornos"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.477Z
---

# Channel Programming for Citizen/Star/Tornos Swiss Machines

ESPRIT supports machine-specific channel programming for all major Swiss brands. Citizen Cincom uses channels 1-3 (main, sub, back), Star uses $1/$2 channel notation, and Tornos uses PLC-synced channel pairs. Configure the machine model in ESPRIT's machine setup to get brand-specific sync codes, channel identifiers, and coordinate system conventions. The post processor then generates the correct multi-channel G-code format for each controller.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:esprit-swiss
**Operations:** swiss_turning

## Related
- [[esprit-cam-tips-esp-129|Swiss-Type Multi-Channel Synchronization with SyncChart]]
- [[esprit-cam-tips-esp-136|Swiss-Type Superimposed Axes for Complex Profiles]]
- [[esprit-cam-tips-esp-137|Swiss-Type Low-Frequency Vibration Cutting for Chip Breaking]]
- [[solidcam-cam-tips-sc-153-2|Kienzle Force Verification for iMachining]]
- [[controller-knowledge-tips-ctrl-038|Swiss lathe synchronization between spindles]]
