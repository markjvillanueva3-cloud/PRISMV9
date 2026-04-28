---
id: "cat-183"
title: "Datum Feature Reference Consistency Across Machining Setups"
source: "web:catia-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["catia", "multi-setup", "datum", "axis-system", "gdt"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.959Z
---

# Datum Feature Reference Consistency Across Machining Setups

Maintain datum reference consistency by defining CATIA Manufacturing Axis Systems from the same GD&T datum features used in the design. For a part with Datum A (primary face), Datum B (primary hole), Datum C (secondary hole), set: OP10 machining axis origin at Datum A face center, X-axis toward Datum B, Y-axis toward Datum C. OP20 (flip part) reuses the same datums but with the axis system transformed by the fixture re-orientation matrix. Use CATIA's 'Publish' function to expose datum features from the design model, then reference the published datums in all Manufacturing Axis System definitions to maintain associativity.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:catia-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-096|Machine Setup Origin Alignment with Part Datum]]
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[catia-cam-tips-cat-170|FBM Manufacturing Rules for Hole Tolerance-Based Process Selection]]
- [[catia-cam-tips-cat-181|Multi-Setup Manufacturing Program Organization in CATIA]]
- [[catia-cam-tips-cat-182|Stock Transfer Between Setups with Intermediate Stock Bodies]]
