---
name: tribal-mc-083
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "c-axis", "live-tool", "polar-interpolation", "mill-turn", "m19"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-083.md
promoted_at: 2026-06-09T22:31:16.416Z
---

# C-axis milling on lathes requires accurate spindle orient and live tool offset

C-axis milling (polar interpolation) on Mastercam Mill-Turn locks the main spindle at a specific angular position and uses a live tool for milling features like flats, keyways, and cross-holes. Critical settings: set the C-axis orient angle accurately (0 = reference mark), define the live tool centerline height precisely (Y=0 is spindle center), and configure the post to output M19 (spindle orient) before C-axis moves. Incorrect Y-offset produces features at wrong angular positions, which is invisible until the part is inspected.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** turning, milling, mill_turn

## Related
- [[fusion360-cam-tips-f360-028|XZC Polar Mode for Off-Center Mill-Turn Features]]
- [[nx-cam-tips-ext-nx-080|C-Axis Milling on Lathe with Polar Interpolation]]
- [[mastercam-cam-tips-mc-084|Y-axis operations enable off-center milling for complex turned parts]]
- [[mastercam-cam-tips-mc-085|Sub-spindle transfer in Sync Manager requires precise handoff timing]]
- [[mastercam-cam-tips-mc-253|Mastercam 2025 B-axis contour turning enables complex profile turning with live tooling on mill-turn]]
