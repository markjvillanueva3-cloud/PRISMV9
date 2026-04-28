---
id: "cw-194"
title: "Additive Stock Definition — Scan Data to CAMWorks Stock Model"
source: "web:camworks-docs"
confidence: 84
category: "cam_strategy"
tags: ["camworks", "additive", "scan-data", "stl", "stock-model"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.795Z
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
