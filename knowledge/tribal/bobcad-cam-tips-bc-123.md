---
id: "bc-123"
title: "Tool Measurement with On-Machine Probe"
source: "web:bobcad-tool-measurement"
confidence: 86
category: "probing"
tags: ["tool-measurement", "tool-setter", "wear-detection", "offset-update"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.553Z
---

# Tool Measurement with On-Machine Probe

BobCAD programs automatic tool length and diameter measurement using the machine's tool setter. Insert measurement cycles before first use of each tool and periodically during cutting for wear detection. Measured values update tool offset registers automatically. For finishing cutters, program measurement every N minutes of cutting to detect wear progression and adjust offsets. BobCAD outputs the measurement cycle in the correct format for the installed probe system.

**Category:** probing
**Confidence:** 86
**Source:** web:bobcad-tool-measurement
**Operations:** probing, setup

## Related
- [[surfcam-cam-tips-sc2-115|Tool Length Measurement with Laser or Touch Probe]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-200|Tool Length and Diameter Measurement — Laser and Touch Probes]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
- [[gibbscam-cam-tips-gc-116|Tool measurement probing sets length and diameter offsets automatically]]
