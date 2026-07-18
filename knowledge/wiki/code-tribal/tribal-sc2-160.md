---
name: tribal-sc2-160
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "part-off", "cutoff", "sub-spindle", "burr-free"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-160.md
promoted_at: 2026-06-09T22:31:16.695Z
---

# SURFCAM Swiss-Type Part-Off Optimization with Overlap

SURFCAM optimizes Swiss-type part-off by overlapping the cutoff operation with sub-spindle back-working. Program the cutoff tool to begin its cycle while the previous part is still being back-worked on the sub-spindle. Set the cutoff feed rate to 0.01-0.03 mm/rev for clean burr-free separation. Use a cutoff tool width of 1.0-1.5mm to minimize material waste. Enable coolant flood during cutoff — the narrow groove traps chips and heat. Program a 0.1mm Z-overlap past center to ensure complete separation.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** turning

## Related
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
- [[esprit-cam-tips-esp-050|Part-Off Strategy with Chip Management]]
- [[esprit-cam-tips-esp-131|Swiss-Type Sub-Spindle Pickup and Cutoff Sequencing]]
- [[solidcam-cam-tips-sc-154-2|Taylor Tool Life for Economic Speed Selection]]
- [[surfcam-cam-tips-sc2-156|SURFCAM Swiss Multi-Spindle Synchronization]]
