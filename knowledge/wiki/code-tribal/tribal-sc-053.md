---
name: tribal-sc-053
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "imachining-3d", "stock-awareness", "castings", "forgings"]
confidence: 89
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-053.md
promoted_at: 2026-06-09T22:31:16.583Z
---

# iMachining 3D Stock Awareness — Enable for Castings and Forgings

When roughing castings or forgings with near-net-shape stock, enable the Stock Model definition in iMachining 3D and import the actual stock shape (STL or SolidWorks body). Without stock awareness, the Wizard assumes a rectangular bounding box, generating air-cutting passes over areas with no material. For complex cast shapes, stock awareness typically reduces cycle time by 20-40% and prevents full-engagement plunges into thin stock sections that cause tool deflection.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** 3d_roughing

## Related
- [[solidcam-cam-tips-sc-171-2|iMachining 2D vs 3D Strategy Selection]]
- [[solidcam-cam-tips-sc-050|iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy]]
- [[solidcam-cam-tips-sc-051|iMachining 3D Morphing Between Levels — Smooth Transitions on Complex Geometry]]
- [[solidcam-cam-tips-sc-052|iMachining 3D Auto Step-Down — Wizard Increases Feed at Shallower Depths]]
- [[solidcam-cam-tips-sc-054|iMachining 3D Multiple Depth Passes — Layer Roughing for Very Deep Cavities]]
