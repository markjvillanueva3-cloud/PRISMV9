---
name: tribal-ts-071
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["machine-specific", "controller", "post-processor", "fanuc", "siemens"]
confidence: 92
source: "web:topsolid-machinepost"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-071.md
promoted_at: 2026-05-26T16:07:20.780Z
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
