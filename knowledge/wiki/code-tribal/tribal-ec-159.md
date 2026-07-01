---
name: tribal-ec-159
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bta-drilling", "deep-hole", "large-diameter", "chip-evacuation"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-159.md
promoted_at: 2026-06-09T22:31:16.198Z
---

# BTA Drilling Programming for Large Diameter Deep Holes

BTA (Boring and Trepanning Association) drilling for holes >18mm diameter uses external coolant supply through the drill body with chip evacuation through the center. Program the approach sequence: rapid to 5mm above surface, feed at 50% rate for 1.5x diameter to establish the guide bushing, then full feed. Set BTA drill speed to 60-80% of standard drill speed for the same diameter. Monitor spindle load — if it exceeds 70% of rated, reduce feed by 20%.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:edgecam-docs
**Operations:** drilling

## Related
- [[mastercam-cam-tips-mc-159|Deep hole BTA drilling requires through-tool coolant programming and guide pad alignment]]
- [[solidcam-cam-tips-sc-138|BTA Deep Hole Drilling — Programming Long Bore Cycles in SolidCAM]]
- [[camworks-cam-tips-cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[gibbscam-cam-tips-gc-149|Swiss-type low-pressure coolant nozzle positioning affects chip evacuation in deep bores]]
