---
name: tribal-bc-109
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["peck-drilling", "g83", "g73", "chip-break", "v37"]
confidence: 89
source: "web:bobcad-peck-drill"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-109.md
promoted_at: 2026-06-09T22:31:15.959Z
---

# Peck Drilling with Configurable Retract Strategy

BobCAD peck drilling supports full-retract (G83) and chip-break (G73) modes. For G83: set first peck to 2x diameter, subsequent to 1x, with full retract between pecks. For G73: use 0.1mm retract only. Reduce peck depth 20% per subsequent peck for deep holes. V37 supports machine-specific peck cycle variations — output matches Fanuc, Siemens, Heidenhain, or Haas format automatically based on the selected post processor.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-peck-drill
**Operations:** drilling

## Related
- [[surfcam-cam-tips-sc2-093|Peck Drilling with Configurable Retract and Peck Depth]]
- [[mastercam-cam-tips-mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]]
- [[edgecam-cam-tips-ec-098|Peck Drilling Depth by Material Type]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[solidcam-cam-tips-sc-140|Peck Drilling Optimization — Chip Break vs Full Retract Strategies]]
