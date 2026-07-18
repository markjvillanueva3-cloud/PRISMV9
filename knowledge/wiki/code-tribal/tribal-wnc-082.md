---
name: tribal-wnc-082
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["peck-drilling", "deep-hole", "retract", "chip-evacuation"]
confidence: 91
source: "web:worknc-peck"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-082.md
promoted_at: 2026-05-26T16:07:21.500Z
---

# Peck Drilling with Optimized Retract Strategy

WorkNC's peck drilling uses configurable peck depth, retract amount, and dwell. For deep holes (L/D > 3), set initial peck to 1x diameter, reducing by 20-30% per subsequent peck. Use full retract (to R-plane) for horizontal drilling or partial retract (1-3 mm) for vertical drilling where gravity assists chip evacuation. Enable through-tool coolant for L/D ratios exceeding 5:1.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-peck
**Operations:** drilling

## Related
- [[topsolid-cam-tips-ts-086|Peck Drilling with Optimized Retract Heights]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[edgecam-cam-tips-ec-160|Peck Drilling Depth Progression for Deep Holes]]
- [[solidcam-cam-tips-sc-140|Peck Drilling Optimization — Chip Break vs Full Retract Strategies]]
- [[surfcam-cam-tips-sc2-093|Peck Drilling with Configurable Retract and Peck Depth]]
