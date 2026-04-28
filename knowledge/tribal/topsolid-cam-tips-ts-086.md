---
id: "ts-086"
title: "Peck Drilling with Optimized Retract Heights"
source: "web:topsolid-peck"
confidence: 92
category: "cam_strategy"
tags: ["peck-drilling", "deep-hole", "retract", "chip-evacuation"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.452Z
---

# Peck Drilling with Optimized Retract Heights

TopSolid's peck drilling (G83) uses configurable peck depth, retract amount, and dwell time. For deep holes (L/D > 3), set the initial peck depth to 1x diameter and reduce by 20-30% for each subsequent peck as chip evacuation becomes more difficult. The retract can be set to 'full retract' (to R-plane) for horizontal drilling or 'partial retract' (1-3 mm) for vertical drilling where gravity assists chip evacuation. Enable through-tool coolant for L/D > 5.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-peck
**Operations:** drilling

## Related
- [[worknc-cam-tips-wnc-082|Peck Drilling with Optimized Retract Strategy]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[edgecam-cam-tips-ec-160|Peck Drilling Depth Progression for Deep Holes]]
- [[solidcam-cam-tips-sc-140|Peck Drilling Optimization — Chip Break vs Full Retract Strategies]]
- [[surfcam-cam-tips-sc2-093|Peck Drilling with Configurable Retract and Peck Depth]]
