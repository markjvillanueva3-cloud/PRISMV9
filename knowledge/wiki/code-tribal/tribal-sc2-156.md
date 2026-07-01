---
name: tribal-sc2-156
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "multi-spindle", "synchronization", "sub-spindle", "cutoff"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-156.md
promoted_at: 2026-06-09T22:31:16.694Z
---

# SURFCAM Swiss Multi-Spindle Synchronization

For Swiss-type machines with main and sub spindles, SURFCAM coordinates operations across both spindles with synchronized timing. Define the part transfer point (cutoff + sub-spindle pickup) in the operation sequence. Program the sub-spindle approach to grip the part 0.5-1mm before the cutoff tool severs it. Use SURFCAM's synchronization manager to overlap main spindle operations with sub-spindle back-working, reducing total cycle time by 30-40%. Verify spindle speed matching during transfer to prevent surface marks.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** turning

## Related
- [[esprit-cam-tips-esp-131|Swiss-Type Sub-Spindle Pickup and Cutoff Sequencing]]
- [[solidcam-cam-tips-sc-154-2|Taylor Tool Life for Economic Speed Selection]]
- [[esprit-cam-tips-esp-041|Swiss-Type Multi-Spindle Synchronization Reduces Cycle Time]]
- [[surfcam-cam-tips-sc2-160|SURFCAM Swiss-Type Part-Off Optimization with Overlap]]
- [[bobcad-cam-tips-bc-170|BobCAD Swiss-Type Sub-Spindle Back-Working Operations]]
