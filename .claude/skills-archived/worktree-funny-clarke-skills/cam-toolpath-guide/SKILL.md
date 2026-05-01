---
name: cam-toolpath-guide
description: 'CAM toolpath generation guide. Use when the user needs toolpath strategies, simulation, collision checking, or toolpath optimization for milling, turning, and multi-axis operations.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
---

# CAM Toolpath Guide

## When to Use
- Selecting toolpath strategy for a given feature/material combination
- Generating and simulating toolpaths before posting
- Optimizing toolpaths for cycle time or surface finish
- Collision checking between tool assembly and workpiece/fixture

## How It Works
1. Select strategy from 680 toolpath strategies via decision tree
2. Generate toolpath via `prism_cam→toolpath_generate`
3. Simulate via `prism_cam→toolpath_simulate`
4. Check collisions via `prism_cam→collision_check_full`
5. Optimize via `prism_cam→toolpath_optimize`

## Returns
- Toolpath with strategy name, parameters, and estimated cycle time
- Collision report (clear/warning/collision with clearance values)
- Optimization suggestions (constant chip load, arc fitting, smooth linking)
- Post-ready toolpath data for G-code generation

## Example
**Input:** "Pocket 50x30x15mm in Ti-6Al-4V, minimize cycle time"
**Output:** Strategy: Adaptive clearing (Ae=1.5mm, Ap=15mm full depth), finish: parallel spiral (0.1mm stepover). Cycle: 8.2min adaptive + 3.1min finish = 11.3min. No collisions. MRR=22 cm3/min during rough.
