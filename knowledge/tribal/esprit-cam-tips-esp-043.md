---
id: "esp-043"
title: "Sub-Spindle Transfer Sequence Critical for Part Quality"
source: "web:esprit-swiss"
confidence: 89
category: "cam_strategy"
tags: ["swiss-type", "sub-spindle", "transfer", "collet"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.473Z
---

# Sub-Spindle Transfer Sequence Critical for Part Quality

Program the sub-spindle transfer sequence carefully in ESPRIT: (1) retract all tools to safe positions, (2) advance sub-spindle to grip position with defined pressure, (3) synchronize spindle speeds, (4) close sub-spindle collet, (5) open main collet, (6) retract sub-spindle. Set the sub-spindle approach speed to 10-20% of rapid for the final 5mm to prevent impact marks. Include a dwell (0.2-0.5s) after collet close to ensure positive grip before main spindle release.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:esprit-swiss
**Operations:** swiss_turning

## Related
- [[bobcad-cam-tips-bc-170|BobCAD Swiss-Type Sub-Spindle Back-Working Operations]]
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
- [[esprit-cam-tips-esp-131|Swiss-Type Sub-Spindle Pickup and Cutoff Sequencing]]
- [[solidcam-cam-tips-sc-154-2|Taylor Tool Life for Economic Speed Selection]]
- [[surfcam-cam-tips-sc2-156|SURFCAM Swiss Multi-Spindle Synchronization]]
