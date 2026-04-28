---
id: "f360-055"
title: "Horizontal Finishing for Flat Bottom Pockets"
source: "web:fusion360-docs"
confidence: 84
category: "cam_strategy"
tags: ["fusion360", "horizontal", "flat-finish", "pocket-floor", "inclination"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.667Z
---

# Horizontal Finishing for Flat Bottom Pockets

Use the Horizontal strategy for finishing flat regions at the bottom of pockets and on plateaus. Horizontal only generates toolpath on surfaces within a few degrees of horizontal (configurable via the Inclination Limit, typically 5-15 degrees), preventing the tool from running over walls where it would leave a poor finish. Combine Horizontal with Contour finishing to cover the entire part — Contour for walls, Horizontal for flats.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:fusion360-docs
**Operations:** horizontal

## Related
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
- [[fusion360-cam-tips-ext-f360-044|Control Entry Position to Avoid Thin Walls]]
