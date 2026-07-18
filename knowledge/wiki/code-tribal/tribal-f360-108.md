---
name: tribal-f360-108
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["fusion360", "corner-slowdown", "feed-optimization", "directional-change", "engagement"]
confidence: 87
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-108.md
promoted_at: 2026-06-09T22:31:16.278Z
---

# Corner Slow-Down Based on Directional Change

In Feed Optimization, the Maximum Directional Change parameter (30-90 degrees) determines at which corners the feed rate drops. Set it to 30-45 degrees for aggressive cornering protection on hardened materials and 60-90 degrees for aluminum where the tool handles sudden engagement changes better. The Reduced Feedrate should be 40-60% of nominal for steel and 60-80% for aluminum. Combine this with the Reduced Feedrate Distance (1-3mm) to control how far before the corner the slowdown begins.

**Category:** speeds_feeds
**Confidence:** 87
**Source:** web:fusion360-docs
**Operations:** 2d_contour, 2d_pocket

## Related
- [[fusion360-cam-tips-ext-f360-087|Force-Based Feed Optimization to Reduce Cycle Time]]
- [[bobcad-cam-tips-bc-103|Feed Optimization for Variable Engagement Zones]]
- [[bobcad-cam-tips-bc-006|Feed Optimization Based on Instantaneous Engagement]]
- [[edgecam-cam-tips-ec-091|Feed Optimization Based on Cutting Load]]
- [[esprit-cam-tips-esp-103|Feed Optimization Based on Engagement Analysis]]
