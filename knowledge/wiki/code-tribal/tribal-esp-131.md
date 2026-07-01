---
name: tribal-esp-131
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "sub-spindle", "cutoff", "pickup", "synchronization"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-131.md
promoted_at: 2026-06-09T22:31:16.242Z
---

# Swiss-Type Sub-Spindle Pickup and Cutoff Sequencing

The critical sequence for sub-spindle pickup in ESPRIT: (1) sub-spindle advances to pickup position with synchronized RPM matching main spindle, (2) sub-spindle collet closes (M-code), (3) sync point ensures both spindles confirmed, (4) cutoff tool feeds to center + 0.2mm overcut, (5) main spindle retracts bar to next part length, (6) sub-spindle retracts with the part for back-working. Program 0.5-1.0mm overlap between sub-spindle face and cutoff position to ensure positive grip. Always deburr the cutoff witness mark in the sub-spindle back-working sequence.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:esprit-docs
**Operations:** turning_cutoff, turning_finishing

## Related
- [[solidcam-cam-tips-sc-154-2|Taylor Tool Life for Economic Speed Selection]]
- [[surfcam-cam-tips-sc2-156|SURFCAM Swiss Multi-Spindle Synchronization]]
- [[surfcam-cam-tips-sc2-160|SURFCAM Swiss-Type Part-Off Optimization with Overlap]]
- [[bobcad-cam-tips-bc-170|BobCAD Swiss-Type Sub-Spindle Back-Working Operations]]
- [[bobcad-cam-tips-bc-171|BobCAD Swiss-Type Thread Whirling for Medical Screws]]
