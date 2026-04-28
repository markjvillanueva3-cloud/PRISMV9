---
id: "wnc-179"
title: "Robust Parameter Design for Multi-Cavity Molds — Cavity-to-Cavity Consistency"
source: "web:worknc-docs"
confidence: 84
category: "cam_strategy"
tags: ["robust-design", "multi-cavity", "consistency", "taguchi", "mold"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.773Z
---

# Robust Parameter Design for Multi-Cavity Molds — Cavity-to-Cavity Consistency

Multi-cavity molds require cavity-to-cavity dimensional consistency. Apply Taguchi's robust design: control factors are CAM parameters (stepover, feed, depth), noise factors are cavity position on the machine table (thermal gradients vary by position) and tool wear progression across cavities. The robust parameter set minimizes variation between cavities despite noise. Key finding: reducing stepover improves cavity-to-cavity consistency more than reducing feed because stepover directly controls the cusp height component of variation. Apply the robust parameters in WorkNC templates used for multi-cavity mold finishing.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:worknc-docs
**Operations:** finishing

## Related
- [[camworks-cam-tips-cw-183|Robust Parameter Design — Taguchi Method for Noise Insensitivity]]
- [[cimatron-cam-tips-cim-048|Robust Design for Variable Material Hardness]]
- [[nx-cam-tips-ext-nx-146|Taguchi Robust Parameter Design for NX Programs]]
- [[sprutcam-cam-tips-spr-038|Taguchi Robust Parameter Design]]
- [[topsolid-cam-tips-ts-184|Taguchi Robust Design — Noise-Resistant Cutting Parameters]]
