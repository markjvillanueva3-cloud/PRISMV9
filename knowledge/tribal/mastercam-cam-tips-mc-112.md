---
id: "mc-112"
title: "Probe moves must be verified in simulation to prevent probe tip crashes"
source: "web:community"
confidence: 88
category: "safety"
tags: ["mastercam", "probe-safety", "simulation", "search-distance", "crash-prevention", "stylus"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.197Z
---

# Probe moves must be verified in simulation to prevent probe tip crashes

Probe tips (typically ruby spheres on thin styli) are fragile — a collision at rapid traverse speed destroys the probe ($2,000-5,000 replacement). Always simulate all probe cycles using Backplot and Machine Simulation before running on the machine. Verify that: (1) search distances are sufficient to find the feature but not so long the probe crashes into the opposite wall, (2) pre-position moves clear all fixtures and clamps, (3) retract moves do not collide with adjacent features. Set search distance to expected feature location +5 mm, never more than +15 mm.

**Category:** safety
**Confidence:** 88
**Source:** web:community
**Operations:** probing, verification

## Related
- [[mastercam-cam-tips-mc-089|Machine Definition kinematic chain must exactly match physical machine for simulation]]
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
- [[mastercam-cam-tips-mc-223|Batch verification runs Machine Simulation on all operations unattended for overnight checking]]
- [[mastercam-cam-tips-mc-299|Mastercam machine definition accuracy settings must match actual machine capability for reliable simulation]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
