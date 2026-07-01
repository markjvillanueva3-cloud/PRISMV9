---
name: tribal-gc-151
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "swiss", "polygon-turning", "hex", "synchronization"]
confidence: 81
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-151.md
promoted_at: 2026-06-09T22:31:16.351Z
---

# Swiss-type polygonal turning creates flats and hex shapes without milling

Polygonal turning (polygon machining) in GibbsCAM synchronizes a spinning polygon cutter with the workpiece rotation to cut flats. For a hex shape, the cutter and workpiece rotate at a 3:1 ratio; for a square, 2:1. Program this in GibbsCAM by defining the polygon cutter geometry (number of edges, inscribed circle diameter) and the synchronization ratio. The cut happens in a single pass at high speed — no reciprocating motion. This process is 5-10× faster than milling flats on a Swiss machine. Critical: the polygon must be concentric with the part axis, and the angular index (C-axis starting angle) determines the rotational orientation of the flat pattern.

**Category:** cam_strategy
**Confidence:** 81
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[gibbscam-cam-tips-gc-052|Gang tooling layout minimizes tool change time on Swiss machines]]
- [[gibbscam-cam-tips-gc-145|Guide bushing clearance in GibbsCAM Swiss mode affects surface finish and roundness]]
- [[gibbscam-cam-tips-gc-146|Swiss-type sub-spindle backworking in GibbsCAM handles second-operation features]]
- [[gibbscam-cam-tips-gc-147|Swiss gang slide tool layout optimization reduces rapid traverse time]]
