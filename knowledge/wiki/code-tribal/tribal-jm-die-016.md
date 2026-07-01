---
name: tribal-jm-die-016
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "quality-score", "program-review", "completeness", "correctness", "optimization", "safety"]
confidence: 90
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-016.md
promoted_at: 2026-05-26T16:07:21.217Z
---

# JM Die program quality scoring — 4 factors: completeness, correctness, optimization, safety

JM Die WEDM programs are scored 0-100 across 4 factors: (1) Completeness (25%): required codes present — startup sequence, E-codes, H-registers, shutdown sequence. (2) Correctness (25%): proper E-code ordering (rough before skim), offset cascade decreasing, M-code sequence valid. (3) Optimization (30%): parameters match physics benchmarks for material/thickness — feed rates, offsets, pass count appropriate. (4) Safety (20%): proper shutdown, no dangerous sequences, tank fill/drain logic correct. Programs scoring <70% should be reviewed before production. The WEDMBatchProgramAnalyzerEngine computes these scores automatically. Target score for production: >85%.

**Category:** quality
**Confidence:** 90
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-020|JM Die program optimization target — maximize productivity while maintaining Ra and tolerance]]
- [[bobcad-cam-tips-bc-064|No-Core Wire EDM for Non-Droppable Slugs]]
- [[bobcad-cam-tips-bc-158|BobCAD Wire EDM Multi-Cavity Optimization with Common Start Holes]]
- [[camworks-cam-tips-cw-163|Wire EDM Start Hole Optimization — Minimize Pre-Drilling]]
- [[surfcam-cam-tips-sc2-058|No-Core Wire EDM Eliminates Slug Removal]]
