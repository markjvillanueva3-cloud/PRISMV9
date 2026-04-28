---
id: "f360-088"
title: "Collision Detection Scope: Tool vs Holder vs Shaft"
source: "web:fusion360-docs"
confidence: 88
category: "safety"
tags: ["fusion360", "collision-detection", "holder", "shaft", "clearance"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.696Z
---

# Collision Detection Scope: Tool vs Holder vs Shaft

Fusion checks three collision zones: Tool (cutter body), Shaft (shank above flutes), and Holder (collet/chuck). In the Collision tab, enable all three and define accurate geometry for each in your tool library. Most shop-floor collisions involve the holder hitting a clamp or vise jaw, not the cutter hitting the part. Set the Collision Clearance to 2mm minimum for holder checks — thermal expansion and machine backlash can close a gap that looks safe in simulation.

**Category:** safety
**Confidence:** 88
**Source:** web:fusion360-docs
**Operations:** simulation

## Related
- [[fusion360-cam-tips-ext-f360-156|Machine Simulation Setup with Kinematic Model]]
- [[fusion360-cam-tips-ext-f360-159|Simulation Speed Control for Collision Investigation]]
- [[esprit-cam-tips-esp-065|Collision Detection Against Full Machine Envelope]]
- [[topsolid-cam-tips-ts-062|Collision Detection Covers Full Tool Assembly]]
- [[worknc-cam-tips-wnc-124|Auto5 Collision Body Definition — Tool, Holder, and Spindle]]
