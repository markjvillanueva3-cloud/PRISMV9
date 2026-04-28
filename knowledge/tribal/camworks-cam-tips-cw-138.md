---
id: "cw-138"
title: "TBM Reads PMI to Auto-Assign Machining Parameters"
source: "web:camworks-docs"
confidence: 92
category: "cam_strategy"
tags: ["camworks", "tbm", "tolerance", "pmi", "mbd", "automation"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.752Z
---

# TBM Reads PMI to Auto-Assign Machining Parameters

CAMWorks Tolerance Based Machining (TBM) reads Product Manufacturing Information (PMI) — dimensions, tolerances, surface finish symbols — directly from SOLIDWORKS MBD or imported STEP AP242 files. TBM automatically assigns appropriate roughing/finishing strategies, tool selections, and cutting parameters based on the tolerance requirements. A ±0.01mm dimension gets fine finishing with spring passes; a ±0.5mm dimension gets rough machining only. This eliminates the manual interpretation of drawings that causes 30% of programming errors.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:camworks-docs
**Operations:** milling, general

## Related
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[camworks-cam-tips-cw-142|TBM Automatic Stock Allowance from Tolerance Analysis]]
- [[camworks-cam-tips-cw-145|TBM with Imported Models — STEP AP242 PMI Support]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
