---
name: tribal-mc-079
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["mastercam", "look-ahead", "buffer", "nano-mode", "g05", "high-speed-control"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-079.md
promoted_at: 2026-06-09T22:31:16.415Z
---

# Look-ahead buffer size in the post must match the CNC control's capabilities

High-speed machining requires the CNC control to buffer upcoming blocks for acceleration planning. Mastercam's post processor can output NANO/FINE mode commands (e.g., G05.1 Q1 for Fanuc, G05 P10000 for Mazak) that activate the control's look-ahead buffer. Ensure the post outputs the correct high-speed mode activation at program start and deactivation at program end. Without look-ahead, feed rates above 5000 mm/min cause starvation jerking regardless of how smooth the CAM toolpath is.

**Category:** post_processor
**Confidence:** 85
**Source:** web:community
**Operations:** hsm, post_processing

## Related
- [[mastercam-cam-tips-mc-090|Control-specific optimization: output AICC/Nano mode commands for each control brand]]
- [[mastercam-cam-tips-mc-249|High-speed machine mode enables arc transitions and feed optimization for HSM-capable CNC controls]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
