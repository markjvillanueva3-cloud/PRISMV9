---
name: tribal-sc2-093
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["peck-drilling", "g83", "g73", "chip-break", "retract"]
confidence: 89
source: "web:surfcam-drilling-peck"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-093.md
promoted_at: 2026-06-09T22:31:16.680Z
---

# Peck Drilling with Configurable Retract and Peck Depth

SURFCAM peck drilling (G83) supports configurable peck depth, retract amount, and dwell time. For standard peck drilling, set first peck to 2x drill diameter and subsequent pecks to 1x diameter, with full retract (R-plane) between pecks. For chip-break drilling (G73), use 0.1mm retract only — sufficient to break the chip without full retraction. Reduce peck depth by 20% for each subsequent peck to account for chip packing in deep holes.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-drilling-peck
**Operations:** drilling

## Related
- [[bobcad-cam-tips-bc-109|Peck Drilling with Configurable Retract Strategy]]
- [[mastercam-cam-tips-mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]]
- [[edgecam-cam-tips-ec-098|Peck Drilling Depth by Material Type]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[solidcam-cam-tips-sc-140|Peck Drilling Optimization — Chip Break vs Full Retract Strategies]]
