---
id: "spr-008"
title: "Laser Cutting with Kerf Compensation"
source: "web:sprutcam-docs"
confidence: 0.82
category: "cam_strategy"
tags: ["laser", "cutting", "kerf", "compensation"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.852Z
---

# Laser Cutting with Kerf Compensation

For laser cutting in SprutCAM, set kerf compensation based on material thickness and laser power: thin sheet (<3mm) kerf ≈ 0.1-0.15mm per side, thick plate (>10mm) kerf ≈ 0.2-0.3mm per side. Use 'Lead-In' with a small radius arc (1-2mm) to prevent burn marks at the entry point. Program corner loops or dwell to prevent corner burn-through on thick materials.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:sprutcam-docs
**Operations:** specialty

## Related
- [[camworks-cam-tips-cw-200|Tool Length and Diameter Measurement — Laser and Touch Probes]]
- [[surfcam-cam-tips-sc2-115|Tool Length Measurement with Laser or Touch Probe]]
- [[topsolid-cam-tips-ts-136|TopSolid'Design Sheet Metal — Flat Pattern to CNC Laser/Punch]]
- [[sprutcam-cam-tips-spr-007|Waterjet Cutting Path Optimization]]
- [[sprutcam-cam-tips-spr-015|Plasma Cutting with THC (Torch Height Control)]]
