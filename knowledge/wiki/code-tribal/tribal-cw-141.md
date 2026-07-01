---
name: tribal-cw-141
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "tbm", "gdt", "datum", "setup-sequence"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-141.md
promoted_at: 2026-06-09T22:31:16.016Z
---

# TBM GD&T Integration — Datum Features Drive Setup Order

TBM interprets GD&T datum references to determine machining setup sequence. Primary datum features are machined first to establish the reference frame, then secondary and tertiary datums. Profile tolerances with datum references trigger specific toolpath strategies that respect the datum relationship. For example, a profile of a surface with respect to datum A triggers a finish pass that references datum A's machined surface rather than the raw stock.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** milling, general

## Related
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-139|TBM Surface Finish Mapping — Ra to Strategy Selection]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[camworks-cam-tips-cw-142|TBM Automatic Stock Allowance from Tolerance Analysis]]
