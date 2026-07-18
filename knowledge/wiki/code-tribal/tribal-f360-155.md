---
name: tribal-f360-155
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "gun-drill", "deep-hole", "high-pressure-coolant", "single-flute"]
confidence: 0
source: "web:autodesk-forum"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-155.md
promoted_at: 2026-06-09T22:31:16.290Z
---

# Gun Drill Programming in Fusion 360

For holes deeper than 10x diameter (up to 100x diameter), program gun drill operations in Fusion using the Drill cycle with custom parameters. Gun drills require: counter-rotation of the workpiece (for turning) or single-flute guide-pad design (for machining centers), through-tool coolant at 50-100 bar, and a pre-drilled pilot hole at 0.5-1x diameter depth. In Fusion, set the Peck type to None (gun drills do not peck — continuous feed with TSC evacuation). Feed rate: 0.01-0.03mm/rev for steels, 0.03-0.08mm/rev for aluminum. Start with a 50% feed rate override and increase after confirming clean chip formation through the coolant return flow.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:autodesk-forum
**Operations:** drilling

## Related
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[fusion360-cam-tips-ext-f360-189|High-Pressure Coolant for Chip Breaking in Turning]]
- [[bobcad-cam-tips-bc-113|Deep Hole Drilling and Pattern Optimization]]
- [[catia-cam-tips-cat-117|Deep Hole Drilling Beyond 10xD Requires Gun Drill Strategy]]
- [[edgecam-cam-tips-ec-101|Deep Hole Drilling with Gun Drill Support]]
