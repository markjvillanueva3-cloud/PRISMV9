---
id: "nx-077"
title: "Turning Roughing with Wiper Insert Geometry Definition"
source: "web:siemens-nx-docs"
confidence: 84
category: "speeds_feeds"
tags: ["siemens-nx", "turning-roughing", "wiper-insert", "surface-finish", "feed-rate"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.382Z
---

# Turning Roughing with Wiper Insert Geometry Definition

When defining turning inserts in NX, specify the wiper flat length (typically 0.8-2.0 mm) in the Tool dialog for inserts with wiper geometry. NX uses this dimension to calculate the actual surface finish the insert produces, enabling accurate comparison between roughing strategies. Set the feed rate to match the wiper flat length (feed = wiper length x 0.8) to achieve finish-quality surfaces directly from roughing, eliminating a separate finish pass on non-critical diameters.

**Category:** speeds_feeds
**Confidence:** 84
**Source:** web:siemens-nx-docs
**Operations:** turning, roughing

## Related
- [[nx-cam-tips-ext-nx-055|Fixed Contour with Guiding Curves for Custom Toolpaths]]
- [[nx-cam-tips-ext-nx-056|Streamline Finishing for UV-Flow Surface Machining]]
- [[nx-cam-tips-ext-nx-106|Arc Output Settings for Smooth High-Speed Machining]]
- [[nx-cam-tips-ext-nx-107|Smooth Flow Corner Treatment for Constant Feed]]
- [[catia-cam-tips-cat-154|CATIA Lathe Roughing with Wiper Insert Geometry]]
