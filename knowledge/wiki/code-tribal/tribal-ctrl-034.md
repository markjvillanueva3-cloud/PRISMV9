---
name: tribal-ctrl-034
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["makino", "pro6", "sgi", "surface-finish", "motion-control"]
confidence: 88
source: "controller:makino_pro6_overview"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-034.md
promoted_at: 2026-06-09T22:31:16.139Z
---

# Makino Pro6 SGI.5 surface finish optimization

Makino's Professional 6 (Pro6) controller includes SGI.5 (Super Geometric Intelligence version 5) — a motion control algorithm that analyzes upcoming toolpath geometry and optimizes servo response for each segment. It automatically distinguishes between corners (where it decelerates precisely) and curves (where it maintains smooth feed). No user parameters needed — it's always active. This is why Makino achieves superior surface finish at high feed rates.

**Category:** programming
**Confidence:** 88
**Source:** controller:makino_pro6_overview

## Related
- [[controller-knowledge-tips-ctrl-102|Makino SGI.5 — high-speed micro-block processing for mold finishing]]
- [[controller-knowledge-tips-ctrl-103|Makino Pro6 is Fanuc-based — standard G-codes with Makino enhancements]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[controller-knowledge-tips-ctrl-035|Makino Hyper-i touchscreen control features]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
