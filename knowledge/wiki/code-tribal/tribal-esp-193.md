---
name: tribal-esp-193
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gear", "bevel-gear", "face-milling", "spiral-bevel", "gleason"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-193.md
promoted_at: 2026-06-09T22:31:16.258Z
---

# Bevel Gear Machining with Face Milling Method

ESPRIT programs spiral bevel gears using the face milling (single-indexing) method. The face cutter head rotates to cut one tooth slot, then the workpiece indexes to the next tooth. Configure under Gear → Bevel → Face Milling with: cone distance, spiral angle, mean module, cutter diameter, number of blade groups, and machine root angle. ESPRIT generates the cradle-style motion (roll, tilt, swivel) that modern 6-axis CNC bevel gear machines (Gleason, Klingelnberg) use to replace mechanical gear generators. The post processor outputs the specific cycle format for your machine's controller (typically proprietary Gleason or Klingelnberg format).

**Category:** cam_strategy
**Confidence:** 0.79
**Source:** web:esprit-docs
**Operations:** gear_cutting

## Related
- [[topsolid-cam-tips-ts-169|TopSolid Bevel Gear Machining — Spiral and Straight Tooth]]
- [[esprit-cam-tips-esp-190|Gear Hobbing Cycle Programming in ESPRIT]]
- [[esprit-cam-tips-esp-191|Gear Shaping for Internal and External Gears]]
- [[esprit-cam-tips-esp-192|5-Axis Gear Milling with Standard Endmills]]
- [[esprit-cam-tips-esp-194|Worm and Worm Wheel Machining Strategies]]
