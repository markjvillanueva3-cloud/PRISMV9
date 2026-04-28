---
id: "gc-137"
title: "MTM sync chart superimposition detects idle time wasted on one channel"
source: "web:gibbscam-docs"
confidence: 85
category: "cam_strategy"
tags: ["gibbscam", "mtm", "sync-chart", "utilization", "idle-time"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.939Z
---

# MTM sync chart superimposition detects idle time wasted on one channel

GibbsCAM's MTM synchronization chart displays all channels (main spindle, sub-spindle, turrets, milling spindle) on parallel timelines. Look for gaps in any channel's timeline — these represent idle time where that channel waits for another to finish. The sync chart's 'Utilization %' readout per channel should be above 80% for efficient programs. To fill gaps, reorder operations so that the idle channel performs independent work (e.g., while the main spindle turns OD, the milling spindle drills cross-holes). Drag operations between channels in the sync chart to test different sequences without regenerating toolpaths.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-044|Multi-turret synchronization allows simultaneous cutting on opposite sides]]
- [[gibbscam-cam-tips-gc-045|B-axis milling on MTM machines enables 5-axis capability from a lathe platform]]
