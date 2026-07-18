---
name: tribal-f360-129
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "turning", "grooving", "peck-cycle", "chip-packing"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-129.md
promoted_at: 2026-06-09T22:31:16.284Z
---

# Turning Grooving with Peck Cycle

For groove depths exceeding 2x the insert width, use the peck grooving cycle in Fusion Turning. Set the peck depth to 0.5-1.0x insert width per pass and the retract amount to 0.1-0.2mm. Enable dwell at the groove bottom (0.5-1.0 seconds) to achieve a flat bottom finish. For narrow grooves (<3mm), reduce the feed rate to 50% of the insert manufacturer's recommendation to prevent insert breakage from chip packing. Always program coolant-on (G8 or M8) for grooving — the confined chip space generates concentrated heat.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:fusion360-docs
**Operations:** turning_grooving

## Related
- [[fusion360-cam-tips-ext-f360-076|Grooving with Peck Cycle for Deep Narrow Slots]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
- [[fusion360-cam-tips-ext-f360-074|Turning Roughing Profile with DOC Pattern Selection]]
- [[fusion360-cam-tips-ext-f360-075|Turning Face Operation with Constant Surface Speed]]
- [[fusion360-cam-tips-ext-f360-077|Single-Point Threading with Spring Passes]]
