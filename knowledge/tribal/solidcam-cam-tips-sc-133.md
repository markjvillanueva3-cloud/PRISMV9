---
id: "sc-133"
title: "Wire EDM No-Core Cutting — Prevent Slug Drops in Tight Cavities"
source: "web:solidcam-docs"
confidence: 85
category: "cam_strategy"
tags: ["solidcam", "wire-edm", "no-core", "slug", "small-cavity"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.766Z
---

# Wire EDM No-Core Cutting — Prevent Slug Drops in Tight Cavities

No-core cutting eliminates the slug (waste piece) by converting the profile into a series of overlapping erosion passes that vaporize all material within the contour. Use no-core for small cavities (under 5mm) where the slug could jam, and for features where a start hole cannot be drilled. SolidCAM programs no-core by calculating parallel erosion passes spaced at 60-80% of the kerf width. Trade-off: no-core cutting takes 5-10x longer than profile cutting with slug drop, so restrict it to features that genuinely cannot use conventional slug removal. Set flushing pressure high to clear eroded debris from the closed cavity.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-064|No-Core Wire EDM for Non-Droppable Slugs]]
- [[camworks-cam-tips-cw-076|No-Core Cutting — Eliminate Slug Drop for Small and Fragile Features]]
- [[camworks-cam-tips-cw-159|Wire EDM No-Core Cutting — Prevent Core Drop Damage]]
- [[esprit-cam-tips-esp-054|Wire EDM No-Core Pocketing Eliminates Slug Handling]]
- [[esprit-cam-tips-esp-155|Wire EDM No-Core (Coreless) Cutting Strategy]]
