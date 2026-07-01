---
name: tribal-ts-185
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "spc", "xbar-r", "control-charts", "quality"]
confidence: 88
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-185.md
promoted_at: 2026-06-09T22:31:16.778Z
---

# SPC Implementation for TopSolid-Programmed Parts — Xbar-R Control Charts

Implement Statistical Process Control on dimensions machined by TopSolid-generated programs. Sample 5 consecutive parts every hour, measure critical dimensions, and plot Xbar-R charts. Establish control limits from 25 subgroups of stable production. Action rules: 1 point beyond 3σ → stop, 7 points on one side → trend, 2 of 3 beyond 2σ → shift. Common assignable causes in CNC: tool wear (gradual upward trend on bore diameters), thermal drift (systematic shift after machine warm-up), and loose fixture (increased subgroup range). Feed SPC findings back to TopSolid templates to adjust stock allowances and tool change intervals.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:topsolid-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-176|Statistical Process Control — Xbar-R Charts for CNC Dimensions]]
- [[cimatron-cam-tips-cim-047|SPC Integration for Mold Shop Quality]]
- [[powermill-cam-tips-pm-085|SPC Control Charts for Critical Dimensions]]
- [[bobcad-cam-tips-bc-122|Verification Probing with SPC Data Output]]
- [[nx-cam-tips-ext-nx-145|SPC Integration for Aerospace Production]]
