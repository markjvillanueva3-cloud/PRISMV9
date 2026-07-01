---
name: tribal-cw-168
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "swiss-type", "micro-drilling", "deep-hole", "peck"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-168.md
promoted_at: 2026-06-09T22:31:16.022Z
---

# Swiss-Type Micro-Drilling — Deep Holes in Small Diameters

Swiss-type machines excel at micro-drilling (< 1mm diameter) with gun drills or micro-drills through the guide bushing. In CAMWorks, program peck cycles with 0.5-1x diameter peck depth and full retract for chip clearing. Use through-spindle coolant (oil, not water-soluble — micro-drills clog with emulsion). Maximum drill speed: RPM = (Vc × 1000) / (π × D), but cap at the machine's spindle speed limit. For drills < 0.3mm diameter, use vibration-assisted drilling (oscillating Z) if the machine supports it.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[camworks-cam-tips-cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
