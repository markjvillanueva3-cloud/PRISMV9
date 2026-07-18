---
name: tribal-bc-151
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "simultaneous", "helical-groove", "superimposed", "live-tool"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-151.md
promoted_at: 2026-06-09T22:31:15.969Z
---

# BobCAD Mill-Turn Simultaneous Milling During Turning

Advanced mill-turn machines allow simultaneous milling (live tool) while the main spindle turns the part. BobCAD programs this by superimposing a milling toolpath onto a turning motion. Use this for helical features on cylindrical parts: the part rotates on the spindle while the live tool cuts a helical groove. The combined feed rate must account for both the turning surface speed and the milling feed. Set the turning RPM low (50-200) to maintain controllable combined feed rates. The post processor outputs C-axis and Z-axis interpolation simultaneously with XY milling moves.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:bobcad-docs
**Operations:** milling, turning

## Related
- [[esprit-cam-tips-esp-149|Mill-Turn Simultaneous Milling and Turning]]
- [[mastercam-cam-tips-mc-083|C-axis milling on lathes requires accurate spindle orient and live tool offset]]
- [[gibbscam-cam-tips-gc-139|MTM superimposed machining runs two turrets on the same spindle simultaneously]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
- [[bobcad-cam-tips-bc-054|Y-Axis Milling for Off-Center Features]]
