---
name: tribal-bc-145
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "dual-spindle", "part-transfer", "cutoff", "synchronization"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-145.md
promoted_at: 2026-06-09T22:31:15.967Z
---

# BobCAD Mill-Turn Dual-Spindle Part Transfer Programming

BobCAD's Mill-Turn module programs dual-spindle machines by defining main spindle (Op1) and sub-spindle (Op2) operations in separate setups. The part transfer sequence includes: sub-spindle approach, grip the part, cutoff, sub-spindle retract. Program the transfer in BobCAD's Synchronization Manager — set the sub-spindle grip position 1mm inside the cutoff point, synchronize spindle speeds to within 5% before grip, and retract with the part at a safe RPM. After transfer, the sub-spindle operations machine the back end (face, bore, chamfer). Verify transfer clearances in simulation to prevent crashes.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** turning, milling

## Related
- [[fusion360-cam-tips-ext-f360-079|Part Transfer Between Main and Sub Spindle]]
- [[surfcam-cam-tips-sc2-211|SURFCAM Multi-Channel Post for Mill-Turn Machines]]
- [[bobcad-cam-tips-bc-148|BobCAD Mill-Turn Synchronization Timeline for Overlapping Operations]]
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
- [[edgecam-cam-tips-ec-145|Code Wizard Multi-Channel Output for Mill-Turn]]
