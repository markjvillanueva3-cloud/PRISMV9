---
name: tribal-mc-202
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "tool-plane", "named-plane", "3plus2", "angled-feature", "rotary-axis"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-202.md
promoted_at: 2026-06-09T22:31:16.445Z
---

# Tool plane alignment for angled features uses named planes and 3+2 positioning

When machining features at angles (holes on inclined faces, pockets on wedge surfaces), align the Tool Plane to the angled surface in Mastercam. Create a named plane in the Plane Manager: select the angled face, and Mastercam generates a plane normal to that face. Assign this named plane as the Tool Plane for operations on that feature. The WCS can remain at the main origin — only the Tool Plane rotates. For 3+2 machines, Mastercam outputs the rotary axis positions (A/B/C angles) needed to align the spindle with the Tool Plane, then executes the 2D or 3D toolpath in the rotated coordinate system. Verify the rotary angles in the operation properties — they must be achievable by the machine without collision. Use Machine Simulation (not just Backplot) to verify 3+2 positioning, as Backplot does not check rotary axis limits or physical clearance.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** setup, drilling, pocketing

## Related
- [[mastercam-cam-tips-mc-200|Machine group properties define stock shape, material, and coordinate system for all contained operations]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-041|Dynamic Mill approach distance controls initial engagement ramp length]]
