---
name: tribal-gc-071
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "tombstone", "tms", "multi-part", "duplication"]
confidence: 89
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-071.md
promoted_at: 2026-06-09T22:31:16.330Z
---

# TMS duplicates part-fixture combinations across tombstone faces automatically

GibbsCAM's Tombstone Management System (TMS) allows creating a single part-fixture setup, then automatically duplicating it across multiple tombstone faces and positions. Define the part, fixture, and machining operations once, then specify the tombstone layout (number of faces, parts per face, spacing). TMS handles the coordinate system offsets for each instance. For a 4-face tombstone with 6 parts per face, this programs 24 parts from a single setup—changes to the master operation automatically propagate to all 24 instances.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-072|Fixture design in TMS includes clamp bodies for collision verification]]
- [[gibbscam-cam-tips-gc-073|Tombstone tool grouping minimizes tool changes across all parts]]
- [[gibbscam-cam-tips-gc-074|Part orientation optimization reduces setups from multiple to single tombstone load]]
- [[gibbscam-cam-tips-gc-075|Pallet management extends TMS concept to horizontal machining centers]]
- [[gibbscam-cam-tips-gc-122|GibbsCAM 14 multi-body part management simplifies tombstone and multi-part programming]]
