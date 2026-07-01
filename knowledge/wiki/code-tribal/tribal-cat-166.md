---
name: tribal-cat-166
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "simulation", "cycle-time", "analysis", "optimization"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-166.md
promoted_at: 2026-06-09T22:31:16.069Z
---

# Machine Process Simulation Cycle Time Analysis

CATIA's Machine Simulation provides cycle time estimation including rapid moves, cutting time, tool changes, and spindle speed-up/slow-down. Access the cycle time report from Simulation > Analysis > Cycle Time. The report breaks down time by: (1) cutting time (tool in material), (2) air-cutting time (tool moving but not cutting), (3) rapid traverse time (G00 moves), (4) tool change time (configurable per machine), (5) spindle dwell/orientation time. Use this to identify optimization targets — high air-cutting percentage (>20%) indicates poor approach/retract strategies or excessive clearance plane heights. Reduce by using 'Optimized Retract' mode.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:catia-docs
**Operations:** simulation

## Related
- [[fusion360-cam-tips-f360-025|Simulation Timeline for Cycle Time Estimation]]
- [[catia-cam-tips-cat-047|Stock-Aware Roughing Uses In-Process Stock Model]]
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[catia-cam-tips-cat-052|Material Removal Simulation Video Mode vs Photo Mode]]
- [[catia-cam-tips-cat-055|Stock Model Accuracy Affects Simulation Fidelity]]
