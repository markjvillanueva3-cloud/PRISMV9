---
name: tribal-ec-035
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["5-axis", "multi-surface", "drive-check", "clearance"]
confidence: 88
source: "web:edgecam-5axis"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-035.md
promoted_at: 2026-06-09T22:31:16.168Z
---

# Multi-Surface 5-Axis with Drive and Check Surfaces

For complex multi-surface 5-axis machining, define drive surfaces (the surfaces being machined) and check surfaces (surfaces the tool must avoid). Edgecam tilts the tool to maintain contact with drive surfaces while respecting check surface clearance. Set the check surface offset to the tool radius + 1-2mm clearance. This is essential for machining between walls, inside channels, and around bosses.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-5axis
**Operations:** 5axis_simultaneous

## Related
- [[bobcad-cam-tips-bc-036|Multi-Surface 5-Axis with Gouge Protection]]
- [[camworks-cam-tips-cw-048|Multi-Surface 5-Axis — Machine Multiple Faces in a Single Operation]]
- [[catia-cam-tips-cat-033|Collision Avoidance Tool Axis Retraction Strategy]]
- [[esprit-cam-tips-esp-032|5-Axis Multi-Surface Finishing with Lead/Lag Control]]
- [[gibbscam-cam-tips-gc-032|Multi-surface 5-axis machining handles complex blended geometry transitions]]
