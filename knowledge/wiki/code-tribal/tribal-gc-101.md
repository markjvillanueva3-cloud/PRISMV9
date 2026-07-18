---
name: tribal-gc-101
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "optimization", "rapid", "shortest-path", "retract"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-101.md
promoted_at: 2026-06-09T22:31:16.338Z
---

# Rapid optimization uses shortest-path calculation between retract points

GibbsCAM can optimize rapid moves to use the shortest safe path between retract points rather than always retracting to the Z-clearance plane. Enable 'Optimized Rapids' to let the system calculate direct rapid moves that clear all obstacles. This is most effective on parts with widely spaced features where the default retract-traverse-plunge sequence wastes time on the vertical legs. For safety, the optimized rapid path maintains the user-specified minimum clearance from all solid bodies. Always verify optimized rapids in machine simulation before sending to the shop floor.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-099|Linking optimization reduces non-cutting travel between operations]]
- [[tebis-cam-tips-teb-029|Rapid Retract Height Optimization Reduces Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-073|Tombstone tool grouping minimizes tool changes across all parts]]
- [[gibbscam-cam-tips-gc-097|Automatic tool selection picks optimal tool from library based on feature geometry]]
- [[gibbscam-cam-tips-gc-098|Feed optimization with VERICUT integration achieves constant chip thickness]]
