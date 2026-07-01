---
name: tribal-sc2-094
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["tapping", "rigid-tap", "floating-tap", "g84", "synchronous"]
confidence: 89
source: "web:surfcam-drilling-tap"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-094.md
promoted_at: 2026-06-09T22:31:16.680Z
---

# Tapping with Rigid and Floating Modes

SURFCAM supports both rigid tapping (G84 synchronous) and floating tap holder modes. For rigid tapping, the spindle speed and feed rate must be perfectly synchronized: feed (mm/min) = RPM × pitch (mm). Set the retract speed to 1.5x the cutting speed for faster cycle time. For floating tap holders, program a slightly higher feed rate (2-5% above synchronous) to allow the holder to compensate. Always include a G04 dwell (0.5-1 second) at the bottom of the hole before retract.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-drilling-tap
**Operations:** tapping

## Related
- [[bobcad-cam-tips-bc-110|Tapping with Rigid and Floating Modes]]
- [[camworks-cam-tips-cw-101|Tapping — Synchronize Spindle Speed and Feed for Thread Quality]]
- [[topsolid-cam-tips-ts-087|Tapping with Synchronous Spindle Control]]
- [[worknc-cam-tips-wnc-083|Rigid Tapping with Synchronous Spindle Control]]
- [[catia-cam-tips-cat-114|Tapping Synchronization and Feedrate Calculation]]
