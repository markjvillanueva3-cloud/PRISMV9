---
id: "gc-120"
title: "Probe collision prevention with maximum deflection limits protects expensive styli"
source: "web:gibbscam-docs"
confidence: 86
category: "cam_strategy"
tags: ["gibbscam", "probing", "collision-prevention", "deflection-limit", "stylus-protection"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.925Z
---

# Probe collision prevention with maximum deflection limits protects expensive styli

GibbsCAM probing includes collision avoidance that checks the probe assembly (stylus, extension, body) against the part and fixture geometry during all traverse and measurement moves. Set the 'Maximum Deflection' parameter to the probe's safe deflection limit (typically ±1-2mm for standard styli). Any programmed move that would deflect the probe beyond this limit is flagged as a collision. Safe traverse heights between probe points should clear all features by at least 5mm. For complex parts with deep pockets, program intermediate safe positions to navigate the probe around obstacles without risking a collision that could break the expensive ruby-tipped stylus.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-115|Part setup probing establishes datum positions automatically on the machine]]
- [[gibbscam-cam-tips-gc-116|Tool measurement probing sets length and diameter offsets automatically]]
- [[gibbscam-cam-tips-gc-117|Rotary axis alignment probing corrects angular positioning errors]]
- [[gibbscam-cam-tips-gc-118|In-process inspection catches dimensional drift before scrapping parts]]
- [[gibbscam-cam-tips-gc-119|Finished part inspection with probing documents conformance on the machine]]
