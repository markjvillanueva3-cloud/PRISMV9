---
id: "cw-062"
title: "Multi-Body Part Machining — Separate Operations per Solid Body"
source: "web:camworks-docs"
confidence: 86
category: "cam_strategy"
tags: ["camworks", "solidworks", "multi-body", "fixture", "setup"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.679Z
---

# Multi-Body Part Machining — Separate Operations per Solid Body

SOLIDWORKS multi-body parts allow multiple solids in one file. CAMWorks machines each body independently or together depending on setup. For progressive machining (machine body 1 first, then body 2 references body 1), create separate setups per body with appropriate stock definitions. Use the 'Combine Bodies' feature in SOLIDWORKS if bodies share machining operations. Multi-body is powerful for fixture design — machine the fixture and part in the same CAMWorks session.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:camworks-docs
**Operations:** milling

## Related
- [[camworks-cam-tips-cw-057|Configuration Management — Separate CAM Setups per SOLIDWORKS Config]]
- [[camworks-cam-tips-cw-059|Weldment Machining — Handle Multi-Body Parts and Weldment Profiles]]
- [[camworks-cam-tips-cw-156|SOLIDWORKS Assembly Machining — Fixture and Multi-Part Setups]]
- [[camworks-cam-tips-cw-158|SOLIDWORKS Configurations — One Model, Multiple CAM Setups]]
- [[camworks-cam-tips-cw-055|Associative Machining — Automatic Toolpath Update on Design Changes]]
