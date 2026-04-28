---
id: "wnc-195"
title: "WorkNC Feature Recognition — Automatic Hole Pattern Detection"
source: "web:worknc-docs"
confidence: 89
category: "cam_strategy"
tags: ["feature-recognition", "holes", "drilling", "automation"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.786Z
---

# WorkNC Feature Recognition — Automatic Hole Pattern Detection

WorkNC's feature recognition detects hole patterns (bolt circles, grid patterns, through holes, blind holes, tapped holes) from the 3D model and automatically assigns drilling operations. The system identifies: hole diameter, depth, tolerance (from PMI if available), and bottom shape (flat, drill-point, through). Based on hole attributes, WorkNC assigns the operation sequence: center drill → drill → ream (for H7 holes), or center drill → drill → tap (for threaded holes). Review the auto-assigned sequences before posting — verify tap sizes and hole depth calculations.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-docs
**Operations:** drilling

## Related
- [[powermill-cam-tips-pm-058|Feature Recognition for Automated Hole Machining]]
- [[cimatron-cam-tips-cim-008|Automatic Feature Recognition for Drilling]]
- [[cimatron-cam-tips-cim-086|Feature Recognition for Automated Hole Programming]]
- [[fusion360-cam-tips-ext-f360-115|Feature Recognition for Automated Hole Programming]]
- [[sprutcam-cam-tips-spr-016|SprutCAM X Feature Recognition]]
