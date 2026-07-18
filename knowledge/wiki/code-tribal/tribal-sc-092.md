---
name: tribal-sc-092
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "simulation", "machine-model", "stl", "collision"]
confidence: 89
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-092.md
promoted_at: 2026-06-09T22:31:16.592Z
---

# Machine Simulation Setup — Import Exact Machine STL Models

For accurate collision detection, import manufacturer-provided STL or STEP models of your machine components rather than using simplified SolidCAM generic models. Define each component (spindle, column, table, rotary axes, tool changer) as a separate collision body with the correct kinematic parent. Even 5mm simplification errors on the spindle head can cause false collision clearances in 5-axis work. Request machine models from your MTB (machine tool builder) — most provide them for CAM simulation purposes.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** simulation, verification

## Related
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[sprutcam-cam-tips-spr-012|Machine Simulation Collision Detection Setup]]
- [[solidcam-cam-tips-sc-055|iMachining 3D Undercut Detection — Avoid Gouging on Draft Angles]]
- [[solidcam-cam-tips-sc-093|Collision Zone Margins — Set Per-Component Safety Distances]]
- [[solidcam-cam-tips-sc-094|Stock Comparison — Real-Time Remaining Material Visualization]]
