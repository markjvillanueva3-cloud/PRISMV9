---
id: "ts-080"
title: "Feature Recognition Drives Automatic Operation Assignment"
source: "web:topsolid-afr-auto"
confidence: 91
category: "cam_strategy"
tags: ["feature-recognition", "automatic", "process-mapping", "holes"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.446Z
---

# Feature Recognition Drives Automatic Operation Assignment

TopSolid's automatic feature recognition identifies holes (through, blind, countersunk, counterbored), pockets (open, closed, stepped), slots, faces, and contours from imported solid models. Each recognized feature type is mapped to a standard process (e.g., countersunk hole → center drill + drill + countersink). Customize the feature-to-process mapping per machine capability. Review unmapped features manually—typically complex blends and freeform surfaces require manual strategy assignment.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-afr-auto
**Operations:** drilling, pocketing, general

## Related
- [[worknc-cam-tips-wnc-108|Feature Recognition Automates Hole Processing]]
- [[bobcad-cam-tips-bc-070|Feature Recognition for Automated Operation Suggestion]]
- [[cimatron-cam-tips-cim-086|Feature Recognition for Automated Hole Programming]]
- [[esprit-cam-tips-esp-089|Automatic Feature Recognition from Solid Models]]
- [[fusion360-cam-tips-ext-f360-115|Feature Recognition for Automated Hole Programming]]
