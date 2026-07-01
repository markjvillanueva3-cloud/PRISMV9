---
name: tribal-sc-098
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "solidworks", "assembly", "fixtures", "collision"]
confidence: 87
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-098.md
promoted_at: 2026-06-09T22:31:16.593Z
---

# Assembly Machining — Reference Fixture Bodies for Collision Avoidance

In SolidCAM Assembly Mode, import fixture components (vises, clamps, parallels) as SolidWorks assembly components rather than separate STL bodies. This maintains parametric associativity — if you adjust clamp position in SolidWorks, SolidCAM's collision zones update automatically. Define each fixture body as a 'Fixture' component type in the Machine Simulation setup. Set fixture components as transparent in the simulation display to see toolpath-to-fixture proximity during playback.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** setup, simulation

## Related
- [[camworks-cam-tips-cw-058|Assembly Machining — Program Fixtures, Vises, and Multi-Part Setups]]
- [[camworks-cam-tips-cw-156|SOLIDWORKS Assembly Machining — Fixture and Multi-Part Setups]]
- [[topsolid-cam-tips-ts-003|Assembly Machining Respects Full Machine Context]]
- [[solidcam-cam-tips-sc-055|iMachining 3D Undercut Detection — Avoid Gouging on Draft Angles]]
- [[solidcam-cam-tips-sc-092|Machine Simulation Setup — Import Exact Machine STL Models]]
