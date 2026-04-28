---
id: "mc-173"
title: "High RPM strategy for micro tools balances surface speed against tool resonance"
source: "web:community"
confidence: 84
category: "cam_strategy"
tags: ["mastercam", "micro-machining", "high-rpm", "spindle-resonance", "surface-speed", "air-bearing"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.245Z
---

# High RPM strategy for micro tools balances surface speed against tool resonance

Micro end mills (0.1–1.0 mm diameter) require extremely high spindle speeds to achieve effective cutting speeds: a 0.5 mm end mill at 50 m/min surface speed needs 31,830 RPM. In Mastercam, set the spindle speed based on the tool manufacturer's recommended surface speed, not by scaling from larger-tool experience. Many high-speed spindles have resonance bands (specific RPM ranges where vibration spikes) — program speeds that avoid these bands, which are documented in the spindle manufacturer's specs. If the required RPM exceeds the spindle maximum, reduce surface speed to 70–80% rather than using a larger tool that cannot reach the feature. For tools under 0.3 mm, air bearing spindles (60,000–160,000 RPM) are necessary. In Mastercam, verify that the post processor outputs spindle speed as an integer and that the control accepts the RPM value without truncation.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** roughing, finishing, micro

## Related
- [[mastercam-cam-tips-mc-172|Small tool compensation in Mastercam must account for tool runout exceeding 10% of feature size]]
- [[mastercam-cam-tips-mc-174|Feature size limits in micro machining are constrained by tool deflection, not geometry]]
- [[mastercam-cam-tips-mc-175|Spring passes in micro finishing remove deflection-induced oversize material]]
- [[mastercam-cam-tips-mc-176|Scaling micro toolpath output verifies dimensional accuracy before committing machine time]]
- [[mastercam-cam-tips-mc-177|Micro-burr avoidance requires climb milling with sharp tools and controlled exit angles]]
