---
id: "ts-087"
title: "Tapping with Synchronous Spindle Control"
source: "web:topsolid-tapping"
confidence: 91
category: "cam_strategy"
tags: ["tapping", "rigid", "synchronous", "thread"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.453Z
---

# Tapping with Synchronous Spindle Control

TopSolid supports rigid tapping (G84 with synchronous spindle) and floating tap holder modes. For rigid tapping, the feed rate is locked to spindle speed × pitch (F = S × pitch). Set the retract speed to 1.5-2x the cutting speed for faster cycle times on through-holes. For blind holes, set the depth to ensure 2-3 full threads beyond the minimum engagement length. TopSolid calculates the deceleration distance automatically based on spindle inertia parameters.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-tapping
**Operations:** drilling, threading

## Related
- [[worknc-cam-tips-wnc-083|Rigid Tapping with Synchronous Spindle Control]]
- [[edgecam-cam-tips-ec-099|Rigid Tapping with Speed-Feed Synchronization]]
- [[esprit-cam-tips-esp-081|Rigid Tapping with Synchronized Spindle and Feed]]
- [[camworks-cam-tips-cw-101|Tapping — Synchronize Spindle Speed and Feed for Thread Quality]]
- [[surfcam-cam-tips-sc2-094|Tapping with Rigid and Floating Modes]]
