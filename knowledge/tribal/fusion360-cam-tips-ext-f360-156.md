---
id: "f360-156"
title: "Machine Simulation Setup with Kinematic Model"
source: "web:fusion360-docs"
confidence: 0.87
category: "simulation"
tags: ["fusion360", "machine-simulation", "kinematic-model", "collision-detection", "axis-limits"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.751Z
---

# Machine Simulation Setup with Kinematic Model

Configure machine simulation in Fusion by selecting the correct machine model from the Machine Library (or importing a custom machine). The kinematic model defines the axis relationships — verify that your A/B/C axis directions match the physical machine. Set the axis travel limits (X/Y/Z linear, A/B/C rotary) to match your machine's actual limits, not the nominal spec. Run simulation at 'Detailed' level which checks tool holder, spindle, and machine component collisions. The 'Fast' level only checks the tool against the part. Always simulate the full program including tool changes and rapid moves — most collisions occur during non-cutting moves.

**Category:** simulation
**Confidence:** 0.87
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-088|Collision Detection Scope: Tool vs Holder vs Shaft]]
- [[fusion360-cam-tips-f360-024|Machine Simulation with Full Kinematic Model]]
- [[mastercam-cam-tips-mc-092|Machine Simulation detects axis over-travel that Verify completely misses]]
- [[surfcam-cam-tips-sc2-068|Machine Simulation with Full Kinematic Model]]
- [[surfcam-cam-tips-sc2-135|SURFCAM Traditional Verify vs 2023 Machine Simulation]]
