---
name: tribal-f360-055
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "horizontal", "flat-finish", "pocket-floor", "inclination"]
confidence: 84
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-055.md
promoted_at: 2026-06-09T22:31:16.265Z
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
