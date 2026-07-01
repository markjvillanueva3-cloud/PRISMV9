---
name: tribal-ec-157
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["thread-whirling", "post-processor", "synchronization", "multi-spindle"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-157.md
promoted_at: 2026-06-09T22:31:16.198Z
---

# Thread Whirling Post Processor Requirements

Thread whirling requires specific post processor support for synchronized multi-axis output. The post must output: whirling spindle speed (often on a secondary spindle command like S2=), main spindle speed (S1=), Z-axis feed synchronized to main spindle rotation (G32 or G33 thread cutting mode), and whirling head engage/retract sequences. Verify the post handles the coordinate system correctly — some controllers require the whirling head as a C2 axis, not B-axis.

**Category:** post_processing
**Confidence:** 0.79
**Source:** web:edgecam-docs
**Operations:** turning, threading

## Related
- [[bobcad-cam-tips-bc-171|BobCAD Swiss-Type Thread Whirling for Medical Screws]]
- [[edgecam-cam-tips-ec-154|Thread Whirling Programming for Bone Screws]]
- [[surfcam-cam-tips-sc2-158|SURFCAM Swiss-Type Thread Whirling Operations]]
- [[controller-knowledge-tips-ctrl-038|Swiss lathe synchronization between spindles]]
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
