---
name: tribal-cw-194
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "additive", "scan-data", "stl", "stock-model"]
confidence: 84
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-194.md
promoted_at: 2026-06-09T22:31:16.029Z
---

# Additive Stock Definition — Scan Data to CAMWorks Stock Model

For hybrid additive-subtractive workflows, create the stock model from scan data of the as-printed part rather than the nominal CAD model. Use structured light scanning or CMM touch probing to capture the actual printed shape. Import the scan as an STL mesh into SOLIDWORKS, then define it as the CAMWorks stock. This ensures toolpaths account for actual material distribution — preventing air cuts where the printed part is undersized and insufficient stock where it's oversized.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:camworks-docs
**Operations:** milling, finishing

## Related
- [[camworks-cam-tips-cw-043|Rest Machining — Automatic Stock Model for Multi-Tool Finishing]]
- [[camworks-cam-tips-cw-193|Hybrid Additive + Subtractive Workflow — Near-Net Shape to Finish]]
- [[camworks-cam-tips-cw-195|Support Structure Removal — Programming for Additive Post-Processing]]
- [[catia-cam-tips-cat-160|Hybrid Manufacturing: Additive STL to Subtractive CATIA Workflow]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
