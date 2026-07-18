---
name: tribal-gc-061
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "turning", "parting", "burr-prevention", "breakthrough"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-061.md
promoted_at: 2026-06-09T22:31:16.328Z
---

# Parting off with reduced RPM at breakthrough prevents burr formation

When programming parting operations in GibbsCAM, reduce the spindle RPM to 50-60% of the cutting speed at the last 1-2mm before breakthrough. This prevents the thin remaining material from deflecting and tearing, which creates burrs. Set the final feed rate to 0.02-0.04 mm/rev for steel and 0.04-0.08 mm/rev for aluminum. For parts that fall into a parts catcher, program a brief dwell (0.5s) at the end of the part-off to ensure clean separation. Enable coolant flush to direct the parted piece away from the tool.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-053|Rough turning with constant chip load adapts feed to varying diameter]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
- [[gibbscam-cam-tips-gc-056|Threading with multiple passes uses decreasing infeed for surface quality]]
- [[gibbscam-cam-tips-gc-057|Face turning with spiral path eliminates the center dwell mark]]
