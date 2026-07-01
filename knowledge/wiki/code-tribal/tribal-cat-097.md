---
name: tribal-cat-097
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "stock", "definition", "casting", "forging", "setup"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-097.md
promoted_at: 2026-06-09T22:31:16.052Z
---

# Stock Definition Accuracy Prevents Air Cutting and Crashes

Define the stock model in CATIA as close to the actual raw material shape as possible. For castings and forgings, import the actual casting/forging 3D model as stock rather than using a bounding box. This eliminates air cutting passes over material that doesn't exist and prevents crashes into casting risers or parting line flash. For bar stock, specify the exact diameter and length. For plate stock, specify thickness plus 1-2mm per side for saw-cut tolerance. The stock definition directly affects roughing tool path computation.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** setup

## Related
- [[topsolid-cam-tips-ts-007|Hybrid Solid-Surface Modeling for Complex Stock Definitions]]
- [[catia-cam-tips-cat-096|Machine Setup Origin Alignment with Part Datum]]
- [[catia-cam-tips-cat-098|Fixture Design Integration with Machining Accessibility]]
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[catia-cam-tips-cat-168|DMU Ergonomic Analysis of Operator Access During Setup]]
