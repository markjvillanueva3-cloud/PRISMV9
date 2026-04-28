---
id: "cat-181"
title: "Multi-Setup Manufacturing Program Organization in CATIA"
source: "web:catia-docs"
confidence: 0.89
category: "cam_strategy"
tags: ["catia", "multi-setup", "part-operation", "fixture", "organization"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.958Z
---

# Multi-Setup Manufacturing Program Organization in CATIA

CATIA structures multi-setup machining using 'Part Operations' within the Manufacturing Program tree. Each Part Operation represents one physical setup (fixture orientation) with its own machining axis, stock definition, and fixture references. Create separate Part Operations for OP10 (top), OP20 (bottom), OP30 (side), etc. Within each Part Operation, define the local machining axis system aligned to the fixture datum. CATIA maintains the global coordinate relationship between setups — when the part model updates, all setup-specific axis systems update consistently. Use 'Copy with Link' to duplicate common operations (same holes accessible from multiple setups).

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:catia-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-057|Tool Catalog Organization by Operation Type and Material]]
- [[catia-cam-tips-cat-098|Fixture Design Integration with Machining Accessibility]]
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[catia-cam-tips-cat-182|Stock Transfer Between Setups with Intermediate Stock Bodies]]
- [[catia-cam-tips-cat-183|Datum Feature Reference Consistency Across Machining Setups]]
