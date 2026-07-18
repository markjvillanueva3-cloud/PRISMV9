---
name: tribal-cat-185
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "multi-setup", "fixture-design", "collision-check", "integration"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-185.md
promoted_at: 2026-06-09T22:31:16.074Z
---

# Multi-Setup Fixture Design Integration with Machining Program

Design fixtures within the same CATIA product structure as the machining program so fixture geometry is available for collision checking. Create fixture components as separate CATIA parts, assemble them in the Manufacturing Product using 'Fixture' constraint type. CATIA's machining operations automatically include fixture bodies in the collision-check set. When designing progressive fixtures (OP10 fixture holds raw stock, OP20 fixture holds partially machined part), use the intermediate stock body from OP10 as the fixture design reference for OP20 clamp positioning — this ensures clamps contact only machined surfaces for better repeatability.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:catia-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[catia-cam-tips-cat-181|Multi-Setup Manufacturing Program Organization in CATIA]]
- [[catia-cam-tips-cat-182|Stock Transfer Between Setups with Intermediate Stock Bodies]]
- [[catia-cam-tips-cat-183|Datum Feature Reference Consistency Across Machining Setups]]
- [[catia-cam-tips-cat-184|In-Process Probing Between Setups for Alignment Verification]]
