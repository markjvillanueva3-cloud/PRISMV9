---
name: tribal-cat-099
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "multi-setup", "datum-transfer", "positioning", "setup"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-099.md
promoted_at: 2026-06-09T22:31:16.053Z
---

# Multi-Setup Part Positioning and Datum Transfer

For parts requiring multiple setups in CATIA, define each setup as a separate Part Operation within the Manufacturing Program. Each Part Operation has its own machining origin, stock definition, and fixture model. Use datum transfer features (reference holes, face datums) to maintain alignment between setups. In the first setup, machine the datum features for the second setup (e.g., two tooling holes and a face). Document the setup change procedure in the CATIA shop floor documentation with clear flip/rotation instructions.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-096|Machine Setup Origin Alignment with Part Datum]]
- [[catia-cam-tips-cat-097|Stock Definition Accuracy Prevents Air Cutting and Crashes]]
- [[catia-cam-tips-cat-098|Fixture Design Integration with Machining Accessibility]]
- [[catia-cam-tips-cat-168|DMU Ergonomic Analysis of Operator Access During Setup]]
- [[catia-cam-tips-cat-181|Multi-Setup Manufacturing Program Organization in CATIA]]
