---
id: "ec-219"
title: "Tolerance Stack Analysis for Multi-Setup Machining"
source: "web:edgecam-docs"
confidence: 0.84
category: "quality"
tags: ["tolerance-stack", "multi-setup", "datum-transfer", "rss"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.437Z
---

# Tolerance Stack Analysis for Multi-Setup Machining

Analyze tolerance stacking when machining in multiple setups. Each setup introduces datum transfer error (typically ±0.01-0.02mm with probing). For a dimension spanning two setups, the total tolerance budget must include: machining tolerance + datum transfer error + fixturing repeatability. In Edgecam, model worst-case and RSS (root sum of squares) tolerance stacks. If the stack exceeds the drawing tolerance, consider: reducing the number of setups, tightening probe routine accuracy, or using reference features machined in the same setup as the critical dimension.

**Category:** quality
**Confidence:** 0.84
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[edgecam-cam-tips-ec-120|Multi-Setup Programming with Work Coordinate Systems]]
- [[camworks-cam-tips-cw-174|Monte Carlo Simulation for Tolerance Stack Analysis]]
- [[esprit-cam-tips-esp-199|Monte Carlo Simulation for Process Tolerance Stack-Up]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
