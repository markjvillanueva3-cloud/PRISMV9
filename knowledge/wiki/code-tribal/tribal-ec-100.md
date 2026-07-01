---
name: tribal-ec-100
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["boring", "dwell", "feed-out", "precision"]
confidence: 88
source: "web:edgecam-drilling"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-100.md
promoted_at: 2026-06-09T22:31:16.184Z
---

# Bore Cycle with Dwell and Feed-Out

Program boring in Edgecam with reduced speed (30-50% of drilling) and steady feed. Add dwell (0.5-1.0 second) at hole bottom to ensure full sizing. Use G85 (feed-out) for through holes, G89 (dwell + feed-out) for blind holes. Leave 0.1-0.2mm stock on diameter after drilling for the reamer or bore to remove. For precision bores (IT6-IT7), use G76 fine bore with oriented spindle retract to prevent scoring.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-drilling
**Operations:** boring, reaming

## Related
- [[camworks-cam-tips-cw-103|Boring — Single-Point Precision for Interpolated Holes]]
- [[catia-cam-tips-cat-115|Boring Cycle for Precision Hole Diameter and Position]]
- [[esprit-cam-tips-esp-083|Boring Cycle for Precision Hole Finishing]]
- [[sprutcam-cam-tips-spr-051|Boring Cycle for Precision Internal Features]]
- [[sprutcam-cam-tips-spr-180|Boring Cycle with Spring Pass]]
