---
id: "cw-154"
title: "Solid Edge Synchronous Technology — Direct Edit Models in CAMWorks"
source: "web:camworks-docs"
confidence: 88
category: "cam_strategy"
tags: ["camworks", "solid-edge", "synchronous", "direct-edit", "import"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.765Z
---

# Solid Edge Synchronous Technology — Direct Edit Models in CAMWorks

CAMWorks for Solid Edge handles Synchronous Technology (history-free) models by recognizing features from the current B-rep rather than the feature tree. This means imported STEP/IGES files machined in Solid Edge get the same AFR quality as native SOLIDWORKS parts. The trade-off: design changes to Synchronous models may not preserve feature identity, so CAMWorks operations may need re-mapping after edits. For production parts that rarely change, Synchronous mode is ideal.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-145|TBM with Imported Models — STEP AP242 PMI Support]]
- [[camworks-cam-tips-cw-153|CAMWorks for Solid Edge — Same Engine, Different Host CAD]]
- [[camworks-cam-tips-cw-155|Cross-Platform Post Processor Sharing — SOLIDWORKS and Solid Edge]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
