---
id: "wnc-104"
title: "Retract Minimization for Multi-Pass Operations"
source: "web:worknc-retract"
confidence: 89
category: "cam_strategy"
tags: ["retract-minimization", "multi-pass", "air-time", "efficiency"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.702Z
---

# Retract Minimization for Multi-Pass Operations

WorkNC minimizes retract movements between passes in multi-pass operations by connecting adjacent passes with smooth arcs at the minimum safe height. For Z-level finishing, the retract between levels can be reduced from safe-plane height to just 1-2 mm above the stock surface. Enable 'Connect passes' to create continuous toolpaths that minimize air time between cuts by up to 40%.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-retract
**Operations:** finishing

## Related
- [[bobcad-cam-tips-bc-046|Threading with Multi-Pass Infeed and Spring Passes]]
- [[bobcad-cam-tips-bc-156|BobCAD Wire EDM Multi-Pass Technology Table Management]]
- [[camworks-cam-tips-cw-065|Grooving — Select Tool Width Relative to Groove Width for Optimal Cycles]]
- [[camworks-cam-tips-cw-066|Threading — Multiple Passes with Decreasing Depth for Clean Threads]]
- [[camworks-cam-tips-cw-160|Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts]]
