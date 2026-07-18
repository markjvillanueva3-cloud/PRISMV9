---
name: tribal-mc-186
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wear-compensation", "g41", "g42", "production", "offset-adjustment"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-186.md
promoted_at: 2026-06-09T22:31:16.441Z
---

# Wear compensation in Mastercam outputs center-line toolpath with G41/G42 for on-machine adjustment

Wear compensation combines Computer and Control compensation: Mastercam generates the toolpath at the tool center (like Computer comp) but also outputs G41/G42 cutter compensation codes (like Control comp). The tool offset register on the machine is set to zero initially — the operator then enters small wear values (±0.005 to ±0.05 mm) to fine-tune part dimensions during production. This is ideal for production runs where tool wear gradually shifts dimensions: the operator monitors part dimensions with a gauge and enters wear offset adjustments without re-posting the program. In Mastercam, select Wear compensation type on the Contour or Pocket toolpath. The same physical tool used in Mastercam must be used on the machine since the toolpath is calculated for the programmed tool diameter. Wear compensation is the most common production setting for precision 2D contouring.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** contouring, pocketing

## Related
- [[mastercam-cam-tips-mc-078|Cutter compensation in HSM should be applied on the control, not in CAM]]
- [[mastercam-cam-tips-mc-188|Control compensation outputs geometry-line toolpath with G41/G42 for full on-machine control]]
- [[mastercam-cam-tips-mc-191|Inverse compensation uses an undersized tool with positive offset to achieve target dimensions]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
