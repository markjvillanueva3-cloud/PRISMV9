---
name: tribal-gc-137
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "sync-chart", "utilization", "idle-time"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-137.md
promoted_at: 2026-06-09T22:31:16.347Z
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
