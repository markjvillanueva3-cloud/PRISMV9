---
id: "cw-143"
title: "TBM Thread Tolerance — Automatic Tap vs Thread Mill Selection"
source: "web:camworks-docs"
confidence: 89
category: "cam_strategy"
tags: ["camworks", "tbm", "threading", "tap", "thread-mill"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.755Z
---

# TBM Thread Tolerance — Automatic Tap vs Thread Mill Selection

TBM reads thread callouts (M, UNC, UNF) with tolerance class (6H, 2B, etc.) to select the threading method. Standard tolerance threads (6H/6g, 2A/2B) use tapping; tight tolerance threads (4H/4h) or large diameters (> 20mm) route to thread milling for better size control. Left-hand threads automatically get thread milling since left-hand taps are expensive and often unavailable. The TechDB stores tap/thread-mill routing rules per thread family.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** threading, drilling

## Related
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-066|Threading — Multiple Passes with Decreasing Depth for Clean Threads]]
- [[camworks-cam-tips-cw-077|Wire Threading Strategy — Automatic Re-Threading for Multi-Opening Parts]]
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-139|TBM Surface Finish Mapping — Ra to Strategy Selection]]
