---
id: "cw-022"
title: "TechDB Material-Specific Settings — Hardness-Dependent Cutting Parameters"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "techdb", "material", "hardness", "cutting-data"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.647Z
---

# TechDB Material-Specific Settings — Hardness-Dependent Cutting Parameters

Configure TechDB entries with hardness ranges for the same base material. For example, create separate entries for 4140 steel at 28-32 HRC (annealed), 38-42 HRC (tempered), and 52-58 HRC (hardened). Each hardness range should have dramatically different cutting parameters — hardened 4140 may require 1/3 the surface speed and 1/5 the feed per tooth compared to annealed. This prevents catastrophic tool failure when a programmer forgets to check part hardness.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** milling, turning

## Related
- [[camworks-cam-tips-cw-016|Feed/Speed Defaults — Material-Specific Cutting Data in TechDB]]
- [[camworks-cam-tips-cw-013|TechDB Knowledge-Based Machining — Capture Best Practices for Reuse]]
- [[camworks-cam-tips-cw-014|Operation Mapping Rules — Link Feature Types to Machining Strategies]]
- [[camworks-cam-tips-cw-015|Tool Selection Rules in TechDB — Automate Tool Choice by Feature Size]]
- [[camworks-cam-tips-cw-017|Strategy Templates — Save Complete Operation Plans for Part Families]]
