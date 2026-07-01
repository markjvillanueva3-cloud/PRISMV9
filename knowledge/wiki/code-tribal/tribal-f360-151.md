---
name: tribal-f360-151
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "pilot-hole", "deep-drilling", "straightness", "multi-step"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-151.md
promoted_at: 2026-06-09T22:31:16.289Z
---

# Pilot Hole Strategy for Deep Holes

For deep holes (>5xD), drill a pilot hole first to 2-3x diameter depth using a stub-length drill. The pilot hole guides the full-length drill, reducing walking and improving straightness. In Fusion, create a Drill operation with the stub drill followed by a second Drill operation with the deep drill, both referencing the same hole selection. The pilot hole diameter should match the deep drill diameter exactly — an undersized pilot causes the deep drill's chisel edge to re-cut, increasing thrust force. For critical straightness (±0.1mm over 100mm), consider a spot drill + pilot drill + deep drill sequence.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:fusion360-docs
**Operations:** drilling

## Related
- [[fusion360-cam-tips-ext-f360-152|Through-Spindle Coolant for Deep Hole Drilling]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
