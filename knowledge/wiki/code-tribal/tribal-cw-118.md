---
name: tribal-cw-118
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "probing", "alignment", "rotation", "castings"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-118.md
promoted_at: 2026-06-09T22:31:16.013Z
---

# Part Alignment Probing — Compensate for Misaligned Raw Stock

Use multi-point probing to measure the actual position and orientation of the raw stock, then apply coordinate rotation and offset to align the program to the physical part. This is critical for castings and forgings where the stock position in the vise varies by 0.5-2mm. Probe at least 4 points on the datum surfaces to calculate rotation (A-axis and B-axis angular offsets) in addition to linear XYZ offsets. CAMWorks probing generates the measurement cycle; the probe macro handles the offset calculation.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-199|Fixture Probing — Work Coordinate System Alignment from Part Features]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
