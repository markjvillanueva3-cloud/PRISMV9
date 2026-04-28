---
id: "sc2-052"
title: "OD Profiling with Multi-Pass Roughing and Single-Pass Finish"
source: "web:surfcam-lathe-profiling"
confidence: 88
category: "cam_strategy"
tags: ["od-profiling", "rough-finish", "multi-pass", "corner-dwell"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.071Z
---

# OD Profiling with Multi-Pass Roughing and Single-Pass Finish

SURFCAM OD profiling supports a combined rough-finish cycle where multiple roughing passes clear material at constant depth followed by a single finish pass at the final profile. Set rough stock allowance to 0.3-0.5mm and finish feed rate to 50-60% of roughing feed. For profiles with sharp corners, the system automatically inserts dwell at corners (G04 P_) to allow the tool to settle and prevent rounding. Enable 'Profile filtering' to smooth programmed geometry within tolerance.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-lathe-profiling
**Operations:** turning_roughing, turning_finishing

## Related
- [[bobcad-cam-tips-bc-050|Profiling with Combined Rough-Finish Cycles]]
- [[bobcad-cam-tips-bc-046|Threading with Multi-Pass Infeed and Spring Passes]]
- [[bobcad-cam-tips-bc-156|BobCAD Wire EDM Multi-Pass Technology Table Management]]
- [[camworks-cam-tips-cw-065|Grooving — Select Tool Width Relative to Groove Width for Optimal Cycles]]
- [[camworks-cam-tips-cw-066|Threading — Multiple Passes with Decreasing Depth for Clean Threads]]
