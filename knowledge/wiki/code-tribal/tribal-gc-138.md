---
name: tribal-gc-138
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "wait-codes", "sync-points", "cutoff", "sub-spindle"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-138.md
promoted_at: 2026-06-09T22:31:16.348Z
---

# MTM wait codes synchronize part cutoff with sub-spindle catch for lights-out safety

In GibbsCAM MTM, insert explicit wait codes (M-code sync points) at critical transitions: before part cutoff, after sub-spindle pickup, and during bar feed. The wait code halts one channel until the other reaches the matching wait point. Without these synchronization gates, the sub-spindle may attempt to advance before cutoff is complete, causing a crash. For lights-out operation, add a mandatory sync after sub-spindle clamp confirmation (pressure switch verified) and before cutoff tool engagement. GibbsCAM's post processor translates these sync points into the machine-specific wait/sync M-codes (e.g., M200/M201 on Mazak, !L on Star).

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[gibbscam-cam-tips-gc-141|MTM C-axis milling on the sub-spindle requires transformed coordinate origin]]
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
