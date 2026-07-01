---
name: tribal-nx-080
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "c-axis", "polar-interpolation", "mill-turn", "face-milling"]
confidence: 83
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-080.md
promoted_at: 2026-06-09T22:31:16.482Z
---

# C-Axis Milling on Lathe with Polar Interpolation

When programming C-axis milling operations on a lathe in NX, enable Polar Interpolation (G12.1/G112) output in the post processor for face milling operations. NX generates XC-plane toolpaths that the controller converts to C-axis rotation plus X-axis linear motion. Set the interpolation tolerance to 0.005 mm to balance program length against surface accuracy. Always verify that your controller supports polar interpolation before posting — older controllers require XY-to-C conversion in the post instead.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:siemens-nx-docs
**Operations:** milling, mill-turn

## Related
- [[fusion360-cam-tips-f360-028|XZC Polar Mode for Off-Center Mill-Turn Features]]
- [[mastercam-cam-tips-mc-083|C-axis milling on lathes requires accurate spindle orient and live tool offset]]
- [[nx-cam-tips-ext-nx-081|Multi-Spindle Multi-Turret Channel Assignment]]
- [[nx-cam-tips-ext-nx-082|Mill-Turn Synchronization with Wait Codes]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
