---
name: tribal-gc-070
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "wire-edm", "corner", "wire-lag", "dwell", "accuracy"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-070.md
promoted_at: 2026-06-09T22:31:16.330Z
---

# Corner strategies balance accuracy versus wire lag compensation

Wire EDM corners require special handling because wire deflection (lag) causes the wire to undercut on inside corners and overcut on outside corners. GibbsCAM offers corner strategies: 'Dwell' (pause at corner for wire to catch up), 'Reduced Power' (lower generator settings approaching corners), and 'Backtrack' (reverse slightly past the corner, then continue). For die-making with sharp internal corners, use a combination of reduced power and dwell—set the corner approach distance to 1-2mm and the dwell time to 0.5-2 seconds based on workpiece thickness. Thicker parts need longer dwell for wire lag to dissipate.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-022|VoluMill minimum toolpath radius controls feed rate potential in corners]]
- [[gibbscam-cam-tips-gc-026|VoluMill corner approach uses smooth arc transitions instead of sharp turns]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
- [[gibbscam-cam-tips-gc-064|4-axis taper EDM requires top/bottom profile synchronization with tight tolerance]]
- [[gibbscam-cam-tips-gc-065|Skim cuts progressively improve surface finish and dimensional accuracy]]
