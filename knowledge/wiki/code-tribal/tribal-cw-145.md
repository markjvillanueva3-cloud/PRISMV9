---
name: tribal-cw-145
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "tbm", "step", "ap242", "import", "pmi"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-145.md
promoted_at: 2026-06-09T22:31:16.017Z
---

# TBM with Imported Models — STEP AP242 PMI Support

When working with imported STEP AP242 or JT files containing PMI, CAMWorks TBM can read embedded tolerance annotations. Enable 'Import PMI' during file import to preserve GD&T, surface finish, and dimension data. For STEP AP203 files without PMI, manually apply tolerances in SOLIDWORKS using DimXpert, then TBM processes them normally. IGES files have no PMI support — convert to STEP AP242 at the source CAD system whenever possible.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-139|TBM Surface Finish Mapping — Ra to Strategy Selection]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[camworks-cam-tips-cw-141|TBM GD&T Integration — Datum Features Drive Setup Order]]
