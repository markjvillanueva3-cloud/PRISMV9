---
name: tribal-gc-051
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "bar-feeder", "stock-advance", "remnant"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-051.md
promoted_at: 2026-06-09T22:31:16.325Z
---

# Bar feeder integration automates stock advance between part cycles

GibbsCAM MTM programs the bar feeder advance as part of the cycle. Set the 'Bar Feed Length' to the part length plus cutoff width plus facing stock. The post processor outputs the bar feed M-code and advances the Z-axis to position the new stock. For remnant management, GibbsCAM tracks how many parts can be cut from a bar and inserts a bar-change sequence when the remainder is too short. Set the 'Minimum Remnant Length' to the guide bushing engagement length plus 5-10mm to ensure the bar is always supported during cutting.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[mastercam-cam-tips-mc-152|Bar feeder programming in Mastercam automates stock advance and remnant handling]]
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
- [[gibbscam-cam-tips-gc-044|Multi-turret synchronization allows simultaneous cutting on opposite sides]]
