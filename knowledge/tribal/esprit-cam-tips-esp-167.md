---
id: "esp-167"
title: "B-Axis Skiving for Internal Gear and Spline Profiles"
source: "web:esprit-docs"
confidence: 0.81
category: "cam_strategy"
tags: ["b-axis", "skiving", "internal-gear", "spline", "synchronous"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.603Z
---

# B-Axis Skiving for Internal Gear and Spline Profiles

ESPRIT programs B-axis power skiving for internal gears and splines on mill-turn machines with B-axis capability. The cutting tool (skiving cutter) rotates at high speed while the workpiece rotates synchronously, with the B-axis setting the crossed-axis angle (typically 15-25°). ESPRIT calculates the RPM ratio from the gear ratio (number of tool teeth : number of workpiece teeth), the feed per revolution, and the B-axis tilt. Multiple passes with increasing depth of cut achieve the final tooth profile. Skiving is 5-10x faster than shaping and produces better surface finish than broaching, making it ideal for EV transmission gears.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:esprit-docs
**Operations:** gear_cutting

## Related
- [[controller-knowledge-tips-ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]]
- [[edgecam-cam-tips-ec-047|Live Tooling Strategy for Mill-Turn Machines]]
- [[edgecam-cam-tips-ec-149|B-Axis Turning for Complex Contour Interpolation]]
- [[edgecam-cam-tips-ec-150|B-Axis Insert Clearance Angle Optimization]]
- [[edgecam-cam-tips-ec-151|B-Axis Prime Turning for Bi-Directional Cutting]]
