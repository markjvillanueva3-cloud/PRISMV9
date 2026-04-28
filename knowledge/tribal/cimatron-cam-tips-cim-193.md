---
id: "cim-193"
title: "Collision with Full Assembly and Safety Margin"
source: "web:cimatron-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["collision", "safety-margin", "gouge", "assembly"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.147Z
---

# Collision with Full Assembly and Safety Margin

Include shank, holder, taper, spindle + 0.5mm margin. Shrink-fit for min profile. Extended tools: 50% feed at 7:1 L/D. Gouge check every finish op. Machine simulation catches machine-level interference. Critical for hardened steel where a gouge means expensive rework or scrapped mold.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:cimatron-docs
**Operations:** roughing, finishing

## Related
- [[bobcad-cam-tips-bc-139|BobCAM for SOLIDWORKS Assembly-Level Machining Setup]]
- [[camworks-cam-tips-cw-156|SOLIDWORKS Assembly Machining — Fixture and Multi-Part Setups]]
- [[catia-cam-tips-cat-059|Tool Holder Definition Enables Accurate Collision Checking]]
- [[edgecam-cam-tips-ec-081|Holder Assembly Models for Collision Accuracy]]
- [[gibbscam-cam-tips-gc-084|Collision detection settings must include tool holder and spindle nose geometry]]
