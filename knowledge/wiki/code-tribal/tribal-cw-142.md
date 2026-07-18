---
name: tribal-cw-142
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "tbm", "stock-allowance", "tolerance", "finishing"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-142.md
promoted_at: 2026-05-26T16:07:19.984Z
---

# TBM Automatic Stock Allowance from Tolerance Analysis

TBM calculates finishing stock allowances from the tolerance stack. For a ±0.02mm dimension, TBM assigns a 0.1-0.2mm finishing stock (5-10x the tolerance) to ensure adequate material for the finish pass without risking undersized cuts. Tight tolerances (< ±0.01mm) trigger a semi-finish + finish sequence with 0.05mm stock between passes. This automated stock calculation prevents the two most common errors: too much stock (poor finish, tool deflection) and too little stock (missed spots, witness marks).

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** milling, finishing

## Related
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[camworks-cam-tips-cw-034|Z-Level Finish — Constant-Z Contouring for Steep Walls]]
- [[camworks-cam-tips-cw-036|Steep Area vs. Shallow Area — Split Finishing by Surface Inclination]]
