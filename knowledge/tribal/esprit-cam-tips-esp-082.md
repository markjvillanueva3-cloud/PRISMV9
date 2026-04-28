---
id: "esp-082"
title: "Reaming Cycle with Controlled Feed and Dwell"
source: "web:esprit-drilling"
confidence: 88
category: "cam_strategy"
tags: ["reaming", "dwell", "bore-size", "surface-finish"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.504Z
---

# Reaming Cycle with Controlled Feed and Dwell

Program reaming in ESPRIT with reduced spindle speed (30-50% of drilling speed) and steady feed rate. Add a dwell (0.5-1.0s) at the bottom of the hole to ensure the reamer fully sizes the bore before retracting. Use G85 (feed-out) for through holes and G89 (dwell + feed-out) for blind holes. Set the stock allowance for reaming to 0.1-0.2mm on diameter after drilling. Excessive stock causes reamer chatter; too little causes the reamer to burnish rather than cut.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:esprit-drilling
**Operations:** reaming

## Related
- [[bobcad-cam-tips-bc-112|Reaming for Precision Hole Finishing]]
- [[surfcam-cam-tips-sc2-096|Reaming with Controlled Feed and Speed for Accuracy]]
- [[topsolid-cam-tips-ts-089|Reaming with Controlled Feed and Speed]]
- [[worknc-cam-tips-wnc-085|Reaming with Controlled Feed and Speed]]
- [[camworks-cam-tips-cw-102|Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes]]
