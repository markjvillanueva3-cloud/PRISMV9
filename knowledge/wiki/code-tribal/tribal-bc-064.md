---
name: tribal-bc-064
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "no-core", "slug", "safety"]
confidence: 87
source: "web:bobcad-wire-edm-nocore"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-064.md
promoted_at: 2026-06-09T22:31:15.948Z
---

# No-Core Wire EDM for Non-Droppable Slugs

BobCAD no-core wire EDM machines the slug into small pieces during cutting rather than producing a droppable slug. Used when slugs can't fall safely (large slugs, complex shapes). The toolpath alternates between profile segments, cutting the slug into strips flushed away by the dielectric. Cycle time is 2-3x conventional but eliminates manual slug handling and the risk of slug damage to the lower guide assembly.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-wire-edm-nocore
**Operations:** wire_edm

## Related
- [[surfcam-cam-tips-sc2-058|No-Core Wire EDM Eliminates Slug Removal]]
- [[camworks-cam-tips-cw-076|No-Core Cutting — Eliminate Slug Drop for Small and Fragile Features]]
- [[camworks-cam-tips-cw-159|Wire EDM No-Core Cutting — Prevent Core Drop Damage]]
- [[esprit-cam-tips-esp-054|Wire EDM No-Core Pocketing Eliminates Slug Handling]]
- [[esprit-cam-tips-esp-155|Wire EDM No-Core (Coreless) Cutting Strategy]]
