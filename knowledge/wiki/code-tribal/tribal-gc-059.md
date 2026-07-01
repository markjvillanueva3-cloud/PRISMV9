---
name: tribal-gc-059
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "turning", "drilling", "center-drill", "positional-accuracy"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-059.md
promoted_at: 2026-06-09T22:31:16.327Z
---

# Center drilling before through-drilling ensures positional accuracy

In GibbsCAM turning, always program a center drill or spot drill operation before through-drilling. Define the center drill in the tool library with the appropriate point angle (60° or 90°) and set the depth to produce a pilot dimple 1.1-1.2× the through-drill diameter. This prevents the through-drill from wandering at entry. For deep holes (L/D > 5), follow the center drill with a stub drill (L/D = 3) before the full-depth drill. GibbsCAM's drill tile feature chains these operations automatically with correct depth relationships.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[surfcam-cam-tips-sc2-051|Turning Center Drilling with Configurable Canned Cycles]]
- [[gibbscam-cam-tips-gc-004|Drill tile supports spot-drill-tap sequences with automatic depth linking]]
- [[gibbscam-cam-tips-gc-053|Rough turning with constant chip load adapts feed to varying diameter]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
