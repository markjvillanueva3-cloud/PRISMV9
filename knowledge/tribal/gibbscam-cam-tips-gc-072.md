---
id: "gc-072"
title: "Fixture design in TMS includes clamp bodies for collision verification"
source: "web:gibbscam-docs"
confidence: 87
category: "cam_strategy"
tags: ["gibbscam", "tombstone", "fixture-design", "collision-check", "tms"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.888Z
---

# Fixture design in TMS includes clamp bodies for collision verification

Define fixture components (clamps, vises, stops, risers) as solid bodies in the TMS fixture library. GibbsCAM uses these bodies for collision checking during simulation—tools, holders, and the spindle are verified against fixture geometry on every toolpath move. Set a safety clearance of 2-5mm around fixture bodies to account for tolerances and vibration. For toggle clamps, model them in both the open and closed positions to verify tool access during operations and clearance during tool changes. Store reusable fixtures in the TMS library for instant recall on future jobs.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-071|TMS duplicates part-fixture combinations across tombstone faces automatically]]
- [[gibbscam-cam-tips-gc-073|Tombstone tool grouping minimizes tool changes across all parts]]
- [[gibbscam-cam-tips-gc-074|Part orientation optimization reduces setups from multiple to single tombstone load]]
- [[gibbscam-cam-tips-gc-075|Pallet management extends TMS concept to horizontal machining centers]]
- [[gibbscam-cam-tips-gc-094|Tool holder definitions enable accurate collision checking in simulation]]
