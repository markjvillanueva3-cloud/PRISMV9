---
id: "cw-146"
title: "TBM Flatness and Perpendicularity — Face Milling Strategy Adjustment"
source: "web:camworks-docs"
confidence: 88
category: "cam_strategy"
tags: ["camworks", "tbm", "flatness", "perpendicularity", "face-milling"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.758Z
---

# TBM Flatness and Perpendicularity — Face Milling Strategy Adjustment

TBM interprets flatness callouts to adjust face milling parameters. Flatness < 0.02mm triggers a climb-only finish pass with 50% stepover and spring pass (zero additional stock). Perpendicularity to a datum triggers edge-referenced face milling with datum alignment verification in the setup. The TechDB defines cutter body diameter selection (minimum 1.5x face width for flatness < 0.05mm) and wiper insert requirements for fine flatness specifications.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** milling, finishing

## Related
- [[camworks-cam-tips-cw-011|Step Recognition — Detect Shoulder and Step Features for Face Milling]]
- [[camworks-cam-tips-cw-035|Flat Area Detection — Automatic Identification of Horizontal Surfaces]]
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-139|TBM Surface Finish Mapping — Ra to Strategy Selection]]
