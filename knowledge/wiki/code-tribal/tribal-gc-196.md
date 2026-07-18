---
name: tribal-gc-196
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "cpr", "deviation-analysis", "color-map", "quality"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-196.md
promoted_at: 2026-06-09T22:31:16.363Z
---

# GibbsCAM CPR deviation analysis color-maps machined surface against nominal model

Cut Part Rendering (CPR) in GibbsCAM can overlay the simulated machined result against the nominal CAD model and display a color-coded deviation map. Green indicates material within tolerance, blue shows excess stock (under-cut regions), and red shows gouge (over-cut regions). Set the deviation range to your machining tolerance (e.g., ±0.025 mm). This visual analysis catches programming errors before the part goes to the machine: a missed region appears as a blue patch, a toolpath gouge appears red. For 5-axis parts, rotate the deviation view to inspect all surfaces — small gouges on undercut walls are often invisible from standard viewing angles.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-085|Stock comparison overlay quantifies material deviation from design intent]]
- [[bobcad-cam-tips-bc-084|Gouge Check with Deviation Color Map]]
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
- [[gibbscam-cam-tips-gc-003|Facing operations benefit from climb milling with 65-75% stepover]]
