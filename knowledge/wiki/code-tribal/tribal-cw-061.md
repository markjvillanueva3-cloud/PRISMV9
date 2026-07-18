---
name: tribal-cw-061
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "solidworks", "tbm", "tolerance", "pmi", "gdt"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-061.md
promoted_at: 2026-05-26T16:07:19.890Z
---

# Tolerance-Based Machining — Read PMI for Automatic Strategy Selection

CAMWorks Tolerance-Based Machining (TBM) reads GD&T annotations, tolerance ranges, and surface finish callouts from SOLIDWORKS PMI (Product Manufacturing Information). A ±0.01mm tolerance on a bore automatically triggers a rough-semi-finish-finish-bore sequence instead of a simple drill operation. TBM eliminates the risk of a programmer overlooking a tight tolerance and using an insufficient strategy. Ensure your SOLIDWORKS model has complete PMI annotations for TBM to be effective.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** milling, drilling

## Related
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[camworks-cam-tips-cw-141|TBM GD&T Integration — Datum Features Drive Setup Order]]
- [[camworks-cam-tips-cw-142|TBM Automatic Stock Allowance from Tolerance Analysis]]
- [[camworks-cam-tips-cw-145|TBM with Imported Models — STEP AP242 PMI Support]]
