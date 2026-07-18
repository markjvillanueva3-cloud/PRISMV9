---
name: tribal-gc-062
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "turning", "back-boring", "reverse-feed", "counterbore"]
confidence: 84
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-062.md
promoted_at: 2026-06-09T22:31:16.328Z
---

# Back boring uses reverse-feed approach to machine internal features from behind

GibbsCAM supports back boring for machining counterbores, chamfers, and back faces inside through-holes. Program the tool to feed through the bore to the far side, then engage in reverse to cut the back-facing feature. Set the tool orientation to 'Reverse' and define the backside feature geometry. The critical parameter is the clearance inside the bore during the through-feed—ensure at least 1mm clearance between the back boring bar and the bore wall. GibbsCAM simulates the complete in-out-cut-retract sequence to verify no collisions occur during the through-feed.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-053|Rough turning with constant chip load adapts feed to varying diameter]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
- [[gibbscam-cam-tips-gc-056|Threading with multiple passes uses decreasing infeed for surface quality]]
- [[gibbscam-cam-tips-gc-057|Face turning with spiral path eliminates the center dwell mark]]
