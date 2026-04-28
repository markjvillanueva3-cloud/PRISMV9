---
id: "gc-100"
title: "Air-cut detection eliminates toolpath segments that cut no material"
source: "web:gibbscam-docs"
confidence: 87
category: "cam_strategy"
tags: ["gibbscam", "optimization", "air-cut", "detection", "elimination", "near-net"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.909Z
---

# Air-cut detection eliminates toolpath segments that cut no material

Enable GibbsCAM's air-cut detection to identify and remove toolpath segments where the tool moves through empty space. The system compares the toolpath against the in-process workpiece and flags segments with zero material removal. For near-net-shape stock (castings, forgings, pre-machined parts), this eliminates passes over areas where no stock exists. Set the stock model accurately for maximum benefit. On a typical casting roughing job, air-cut removal saves 25-45% of cycle time. Verify the remaining toolpath is still continuous and safe after air-cut removal.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-008|Open pocket machining requires stock boundary definition for air-cut control]]
- [[gibbscam-cam-tips-gc-029|VoluMill air-cut elimination uses stock model to skip empty regions]]
- [[gibbscam-cam-tips-gc-073|Tombstone tool grouping minimizes tool changes across all parts]]
- [[gibbscam-cam-tips-gc-097|Automatic tool selection picks optimal tool from library based on feature geometry]]
- [[gibbscam-cam-tips-gc-098|Feed optimization with VERICUT integration achieves constant chip thickness]]
