---
id: "gc-122"
title: "GibbsCAM 14 multi-body part management simplifies tombstone and multi-part programming"
source: "web:gibbscam-docs"
confidence: 83
category: "cam_strategy"
tags: ["gibbscam", "v14", "multi-body", "tombstone", "machining-groups"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.927Z
---

# GibbsCAM 14 multi-body part management simplifies tombstone and multi-part programming

GibbsCAM 14's multi-body management allows distinct solid bodies to be independently selected, transformed, and assigned to different machining groups within a single workspace. For tombstone setups, import all part instances as separate bodies, position them on the fixture using body-level transformations, then assign each body to its own machining group with independent coordinate systems. The system tracks which bodies have been machined and which are pending. This eliminates the manual geometry duplication that previously slowed tombstone programming by 30-50%.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-071|TMS duplicates part-fixture combinations across tombstone faces automatically]]
- [[gibbscam-cam-tips-gc-072|Fixture design in TMS includes clamp bodies for collision verification]]
- [[gibbscam-cam-tips-gc-073|Tombstone tool grouping minimizes tool changes across all parts]]
- [[gibbscam-cam-tips-gc-074|Part orientation optimization reduces setups from multiple to single tombstone load]]
- [[gibbscam-cam-tips-gc-121|GibbsCAM 14 Solid Machining uses B-rep kernels for direct solid feature recognition]]
