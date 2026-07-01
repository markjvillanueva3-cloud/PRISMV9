---
name: tribal-f360-189
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["fusion360", "high-pressure-coolant", "turning", "chip-breaking", "stainless"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-189.md
promoted_at: 2026-06-09T22:31:16.297Z
---

# High-Pressure Coolant for Chip Breaking in Turning

In Fusion Turning operations, enable high-pressure coolant (HPC) by configuring the post processor to output the HPC activation code (machine-specific, typically M50-M59 or a custom macro). HPC at 70-150 bar directed at the rake face lifts the chip and breaks it into manageable segments, essential for gummy materials like 304 stainless, Inconel 718, and low-carbon steel. The chip breaker effect of HPC allows 20-30% higher feed rates because the chip no longer wraps around the workpiece. Set the nozzle diameter to 1-2mm for a focused jet with maximum velocity. Verify the machine's coolant pump capacity — HPC requires 20-40 liters/min at 70+ bar.

**Category:** speeds_feeds
**Confidence:** 0.86
**Source:** web:fusion360-docs
**Operations:** turning_roughing, turning_finishing

## Related
- [[fusion360-cam-tips-ext-f360-126|Turning Profile Roughing with Chip Breaking]]
- [[fusion360-cam-tips-ext-f360-074|Turning Roughing Profile with DOC Pattern Selection]]
- [[fusion360-cam-tips-ext-f360-075|Turning Face Operation with Constant Surface Speed]]
- [[fusion360-cam-tips-ext-f360-076|Grooving with Peck Cycle for Deep Narrow Slots]]
- [[fusion360-cam-tips-ext-f360-077|Single-Point Threading with Spring Passes]]
