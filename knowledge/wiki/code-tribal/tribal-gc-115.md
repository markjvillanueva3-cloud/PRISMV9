---
name: tribal-gc-115
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "probing", "part-setup", "datum", "work-offset", "touch-probe"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-115.md
promoted_at: 2026-06-09T22:31:16.341Z
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
