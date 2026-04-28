---
id: "gc-119"
title: "Finished part inspection with probing documents conformance on the machine"
source: "web:gibbscam-docs"
confidence: 86
category: "cam_strategy"
tags: ["gibbscam", "probing", "inspection", "conformance", "documentation", "spc"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.924Z
---

# Finished part inspection with probing documents conformance on the machine

GibbsCAM probing can generate a final inspection routine that measures all critical dimensions while the part is still fixtured on the machine. Program probe points at all GD&T callout locations. The control outputs the measured values to a file (DPRNT or equivalent) for quality documentation. This provides immediate feedback—the operator knows if the part is good before removing it from the fixture. For SPC (Statistical Process Control), the measured data can be exported to a network folder where quality software monitors trends across production runs. This eliminates the lag between machining and CMM inspection.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-118|In-process inspection catches dimensional drift before scrapping parts]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
- [[gibbscam-cam-tips-gc-115|Part setup probing establishes datum positions automatically on the machine]]
- [[gibbscam-cam-tips-gc-116|Tool measurement probing sets length and diameter offsets automatically]]
- [[gibbscam-cam-tips-gc-117|Rotary axis alignment probing corrects angular positioning errors]]
