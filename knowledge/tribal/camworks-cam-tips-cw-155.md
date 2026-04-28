---
id: "cw-155"
title: "Cross-Platform Post Processor Sharing — SOLIDWORKS and Solid Edge"
source: "web:camworks-docs"
confidence: 89
category: "cam_strategy"
tags: ["camworks", "post-processor", "solid-edge", "solidworks", "cross-platform"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.766Z
---

# Cross-Platform Post Processor Sharing — SOLIDWORKS and Solid Edge

Post processors created for CAMWorks for SOLIDWORKS work directly in CAMWorks for Solid Edge without modification. The post processor engine is platform-independent — it reads the same toolpath data format from both hosts. This means shops transitioning from SOLIDWORKS to Solid Edge (or running both) can use their existing proven post processors. Test the first job on each machine to verify, but the output G-code will be identical for the same toolpath.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-153|CAMWorks for Solid Edge — Same Engine, Different Host CAD]]
- [[camworks-cam-tips-cw-055|Associative Machining — Automatic Toolpath Update on Design Changes]]
- [[camworks-cam-tips-cw-056|Design Change Propagation — Handle Feature Addition and Removal]]
- [[camworks-cam-tips-cw-057|Configuration Management — Separate CAM Setups per SOLIDWORKS Config]]
- [[camworks-cam-tips-cw-058|Assembly Machining — Program Fixtures, Vises, and Multi-Part Setups]]
