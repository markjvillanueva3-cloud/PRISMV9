---
name: tribal-mc-157
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "peck-drilling", "chip-break", "g83", "depth-ratio", "material-specific"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-157.md
promoted_at: 2026-06-09T22:31:16.433Z
---

# Chip break peck patterns must be tuned to material type and hole depth ratio

The peck depth pattern in Mastercam drill cycles controls chip length and evacuation. For ductile materials (aluminum, low-carbon steel), use decreasing pecks — start at 1× drill diameter and reduce by 0.5 mm per peck (e.g., 5.0, 4.5, 4.0 mm) because chips get longer as the hole deepens and the flutes pack. For brittle materials (cast iron, brass), use constant pecks at 1.5–2× diameter since chips break naturally. For gummy materials (stainless 316, Inconel), use aggressive chip-break pecks with full retract (G83) every 0.5–1× diameter to clear stringy chips. In Mastercam, set the First Peck, Peck Decrement, and Minimum Peck fields to create these patterns automatically. The dwell at the bottom of each peck should be 0 for most materials, 0.5–1.0 s for finishing reamed holes.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community
**Operations:** drilling, hole_making

## Related
- [[bobcad-cam-tips-bc-109|Peck Drilling with Configurable Retract Strategy]]
- [[edgecam-cam-tips-ec-098|Peck Drilling Depth by Material Type]]
- [[surfcam-cam-tips-sc2-093|Peck Drilling with Configurable Retract and Peck Depth]]
- [[mastercam-cam-tips-mc-088|Canned cycle post output requires matching control-specific G-code sequences]]
- [[mastercam-cam-tips-mc-163|Peck depth optimization balances chip evacuation time against total drill cycle time]]
