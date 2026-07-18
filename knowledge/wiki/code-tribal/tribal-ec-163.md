---
name: tribal-ec-163
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["ejector-drilling", "extreme-depth", "dual-tube", "chip-evacuation"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-163.md
promoted_at: 2026-06-09T22:31:16.199Z
---

# Ejector Drilling for Extreme Depth-to-Diameter Ratios

For L/D ratios exceeding 20:1, program ejector drilling which uses dual-tube coolant supply and Venturi-effect chip evacuation. In Edgecam, set up the ejector drill as a custom tool type with the actual cutting diameter and body diameter. Program the guide bushing engagement sequence as a preliminary operation. Set spindle speed at 40-60% of standard drill speed and feed at 0.005-0.015 mm/rev for steel. The post must output the coolant system activation codes specific to the ejector unit.

**Category:** cam_strategy
**Confidence:** 0.78
**Source:** web:edgecam-docs
**Operations:** drilling

## Related
- [[bobcad-cam-tips-bc-007|Trochoidal Slotting for Full-Width Channel Cuts]]
- [[bobcad-cam-tips-bc-014|Slot Milling with Ramp Entry and Full-Width Control]]
- [[bobcad-cam-tips-bc-025|Spiral Finishing for Axisymmetric Features]]
- [[camworks-cam-tips-cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]]
- [[catia-cam-tips-cat-010|Multi-Level Pocket Depth Ordering for Chip Evacuation]]
