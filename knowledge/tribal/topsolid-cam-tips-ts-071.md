---
id: "ts-071"
title: "Machine-Specific Post Handles Unique Controller Features"
source: "web:topsolid-machinepost"
confidence: 92
category: "cam_strategy"
tags: ["machine-specific", "controller", "post-processor", "fanuc", "siemens"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.440Z
---

# Machine-Specific Post Handles Unique Controller Features

TopSolid provides machine-specific posts for major controller brands (Fanuc, Siemens, Heidenhain, Mazak, Okuma, Haas, Brother). Each post handles brand-specific features: Mazak Smooth G-codes, Heidenhain Cycle 32 tolerance, Fanuc Nano smoothing, Okuma THINC macros. When switching between machine brands, never reuse a post from a different controller family—always start from the correct base post and customize from there.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-machinepost
**Operations:** general

## Related
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[edgecam-cam-tips-ec-077|Machine-Specific Post Configuration]]
- [[esprit-cam-tips-esp-073|Machine-Specific G-Code Output Optimization]]
- [[surfcam-cam-tips-sc2-073|Machine-Specific Post Processors for Major Brands]]
