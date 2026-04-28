---
id: "sc2-156"
title: "SURFCAM Swiss Multi-Spindle Synchronization"
source: "web:surfcam-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["swiss-type", "multi-spindle", "synchronization", "sub-spindle", "cutoff"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.170Z
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
