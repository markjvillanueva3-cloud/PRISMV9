---
name: tribal-jm-die-020
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "optimization", "productivity", "feed-rate", "ra", "tolerance", "cycle-time"]
confidence: 93
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-020.md
promoted_at: 2026-05-26T16:07:21.223Z
---

# JM Die program optimization target — maximize productivity while maintaining Ra and tolerance

The ultimate goal of JM Die WEDM program optimization: maximize cutting area per hour (in²/hr) while achieving the specified Ra and tolerance. Optimization hierarchy: (1) Never sacrifice tolerance — ±0.0005" is sacred for die work. (2) Never exceed Ra spec — 16-20 µin standard, 12 µin for precision. (3) Maximize feed rate within physics limits for the material/thickness. (4) Minimize passes only if Ra spec allows — 3-pass for Ra 32+, 4-pass for Ra 16-20, 5-pass for Ra <16. (5) Use adaptive control (M90) to auto-optimize feed rate. The WEDMProgramOptimizerEngine computes expected improvements: typical gains are 10-25% cycle time reduction on amateur programs while matching or improving quality.

**Category:** machining
**Confidence:** 93
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]]
- [[wedm-knowledge-tips-jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]]
- [[wedm-knowledge-tips-jm-die-016|JM Die program quality scoring — 4 factors: completeness, correctness, optimization, safety]]
- [[bobcad-cam-tips-bc-158|BobCAD Wire EDM Multi-Cavity Optimization with Common Start Holes]]
