---
name: tribal-mc-152
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "swiss", "bar-feeder", "stock-advance", "remnant", "material-yield"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-152.md
promoted_at: 2026-06-09T22:31:16.432Z
---

# Bar feeder programming in Mastercam automates stock advance and remnant handling

Swiss machines use automatic bar feeders for continuous production. In Mastercam, the bar feed operation is programmed as a specific operation type that advances the bar stock by the part length plus cutoff width plus face stock (typically part length + 2–3 mm). Set the bar remnant length in Machine Group Properties — when the remaining bar is shorter than one part plus the minimum grip length, the machine ejects the remnant and loads a new bar. Program a bar-end sensing routine that probes the bar face position after each advance to compensate for bar length variations. For high-volume production (>1,000 parts), verify that the total bar advance count × part length matches the bar stock length minus remnant to maximize material utilization (target >95% yield).

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** turning, swiss, automation

## Related
- [[gibbscam-cam-tips-gc-051|Bar feeder integration automates stock advance between part cycles]]
- [[mastercam-cam-tips-mc-148|Guide bushing proximity in Swiss machining limits unsupported material length for rigidity]]
- [[mastercam-cam-tips-mc-149|Sub-spindle synchronization in Mastercam enables back-side machining after part-off]]
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
- [[mastercam-cam-tips-mc-151|B-axis milling on Swiss machines enables off-axis holes and flats without re-chucking]]
