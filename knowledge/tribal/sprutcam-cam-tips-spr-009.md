---
id: "spr-009"
title: "Turning Groove Cycle with Chip Breaking"
source: "web:sprutcam-tutorials"
confidence: 0.86
category: "cam_strategy"
tags: ["grooving", "turning", "chip-breaking", "peck"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.853Z
---

# Turning Groove Cycle with Chip Breaking

For grooving operations, use SprutCAM's dedicated groove cycle with chip breaking enabled. Set 'Peck Depth' to 0.5-1.0mm per peck and 'Retract Amount' to 0.1mm for chip breaking without full retract. For narrow grooves (<3mm width), use a single plunge with oscillating feed (G76-style) to manage chip evacuation. Program side walls after rough grooving for dimensional accuracy.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:sprutcam-tutorials
**Operations:** turning

## Related
- [[edgecam-cam-tips-ec-038|Grooving Cycles with Peck and Chip Management]]
- [[solidcam-cam-tips-sc-081|Grooving — Peck Cycle with Chip Breaking for Deep Grooves]]
- [[topsolid-cam-tips-ts-045|Grooving with Peck Cycles for Deep Grooves]]
- [[bobcad-cam-tips-bc-045|Grooving with Plunge, Oscillating, and Side-Turn Modes]]
- [[camworks-cam-tips-cw-065|Grooving — Select Tool Width Relative to Groove Width for Optimal Cycles]]
