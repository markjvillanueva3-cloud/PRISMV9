---
id: "ctrl-002"
title: "Fanuc Nano Smoothing vs AI Contour Control"
source: "controller:fanuc_smoothing_guide"
confidence: 88
category: "programming"
tags: ["fanuc", "nano-smoothing", "aicc", "nurbs", "hsm"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.154Z
---

# Fanuc Nano Smoothing vs AI Contour Control

Fanuc offers two smoothing modes: AI Contour Control (G05.1 Q1) optimizes acceleration/deceleration for contouring. Nano Smoothing (G05.1 Q2) converts short line segments into smooth NURBS curves internally. Use AICC for general 3+2 axis work, Nano Smoothing for complex freeform 5-axis. On 31i-B5 both can be active simultaneously. On 0i-MF, only basic AICC is available.

**Category:** programming
**Confidence:** 88
**Source:** controller:fanuc_smoothing_guide

## Related
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[controller-knowledge-tips-ctrl-063|Fanuc G08 Advanced Preview Control for high-speed machining]]
- [[mastercam-cam-tips-mc-090|Control-specific optimization: output AICC/Nano mode commands for each control brand]]
- [[topsolid-cam-tips-ts-094|Smooth Flow Toolpaths Minimize Direction Changes]]
- [[worknc-cam-tips-wnc-090|Smooth Flow with NURBS Output for HSM]]
