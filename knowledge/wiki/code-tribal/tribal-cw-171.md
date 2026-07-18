---
name: tribal-cw-171
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "swiss-type", "polygon", "hex", "flats"]
confidence: 87
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-171.md
promoted_at: 2026-06-09T22:31:16.023Z
---

# Swiss-Type Polygon Machining — Flats and Hex on Round Stock

Polygon machining creates flats (hex, square, Torx) on cylindrical parts by synchronizing spindle rotation with a polygon cutter. The main spindle and polygon spindle rotate at a fixed ratio (1:1 for squares, 2:3 for hex). In CAMWorks, define the polygon as a custom cycle with the ratio parameter. The result is a flat surface on a turned part without stopping the spindle — much faster than milling flats with a live tool. Ensure the polygon attachment is properly aligned; 0.1° misalignment creates tapered flats.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** turning

## Related
- [[topsolid-cam-tips-ts-173|TopSolid Swiss-Type Polygon Machining — Hex and Square Profiles]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
- [[camworks-cam-tips-cw-168|Swiss-Type Micro-Drilling — Deep Holes in Small Diameters]]
