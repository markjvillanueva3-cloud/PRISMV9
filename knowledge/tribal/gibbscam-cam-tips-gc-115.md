---
id: "gc-115"
title: "Part setup probing establishes datum positions automatically on the machine"
source: "web:gibbscam-docs"
confidence: 88
category: "cam_strategy"
tags: ["gibbscam", "probing", "part-setup", "datum", "work-offset", "touch-probe"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.922Z
---

# Part setup probing establishes datum positions automatically on the machine

GibbsCAM's in-process probing module programs touch-probe cycles to automatically find part datum positions. Define the probing points on the part model—typically 3 points on a face (to establish a plane) plus edge/bore touches for X/Y/Z zeros. The post processor outputs the probe cycle G-codes (e.g., G65 P9801-P9814 macro calls for Renishaw, or native cycles for other vendors). The probe results are stored in work offset registers, eliminating manual indicator setup. For parts with casting variability, probe multiple surfaces and use the best-fit alignment to minimize stock-to-leave variance across the part.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-116|Tool measurement probing sets length and diameter offsets automatically]]
- [[gibbscam-cam-tips-gc-117|Rotary axis alignment probing corrects angular positioning errors]]
- [[gibbscam-cam-tips-gc-118|In-process inspection catches dimensional drift before scrapping parts]]
- [[gibbscam-cam-tips-gc-119|Finished part inspection with probing documents conformance on the machine]]
- [[gibbscam-cam-tips-gc-120|Probe collision prevention with maximum deflection limits protects expensive styli]]
