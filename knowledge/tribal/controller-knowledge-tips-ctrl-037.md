---
id: "ctrl-037"
title: "Citizen Cincom Swiss lathe guide bushing programming"
source: "controller:citizen_cincom_manual"
confidence: 87
category: "programming"
tags: ["citizen", "cincom", "swiss-lathe", "guide-bushing", "programming"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.181Z
---

# Citizen Cincom Swiss lathe guide bushing programming

Citizen swiss lathes with Cincom/Mitsubishi M70V control: guide bushing mode is controlled by machine parameter, not G-code. Z-axis moves the headstock (bar feeder), not the tool. B-axis gang slide and rotary tools have separate coordinate systems. Key: always program in terms of the part, the control handles guide bushing compensation. Program structure: main spindle block + sub spindle block, synchronized via M-code handshaking.

**Category:** programming
**Confidence:** 87
**Source:** controller:citizen_cincom_manual

## Related
- [[controller-knowledge-tips-ctrl-107|Citizen detachable guide bushing and programming impact]]
- [[controller-knowledge-tips-ctrl-038|Swiss lathe synchronization between spindles]]
- [[controller-knowledge-tips-ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]]
- [[esprit-cam-tips-esp-047|Channel Programming for Citizen/Star/Tornos Swiss Machines]]
- [[esprit-cam-tips-esp-129|Swiss-Type Multi-Channel Synchronization with SyncChart]]
