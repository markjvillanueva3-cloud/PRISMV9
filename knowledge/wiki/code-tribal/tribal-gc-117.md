---
name: tribal-gc-117
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "probing", "rotary-alignment", "angular-correction", "4th-axis"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-117.md
promoted_at: 2026-06-09T22:31:16.342Z
---

# Rotary axis alignment probing corrects angular positioning errors

GibbsCAM probing supports rotary axis alignment for 4th and 5th axis machines. The probe touches a reference surface, the rotary axis indexes to a new position, the probe touches again, and the system calculates the angular offset between the programmed and actual rotary positions. This corrects for rotary axis calibration drift and fixturing angular errors. Program this at the start of jobs that require tight angular tolerances (e.g., indexed hole patterns on different faces). The correction is applied as a work offset shift that compensates for the measured angular error.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-115|Part setup probing establishes datum positions automatically on the machine]]
- [[gibbscam-cam-tips-gc-116|Tool measurement probing sets length and diameter offsets automatically]]
- [[gibbscam-cam-tips-gc-118|In-process inspection catches dimensional drift before scrapping parts]]
- [[gibbscam-cam-tips-gc-119|Finished part inspection with probing documents conformance on the machine]]
- [[gibbscam-cam-tips-gc-120|Probe collision prevention with maximum deflection limits protects expensive styli]]
