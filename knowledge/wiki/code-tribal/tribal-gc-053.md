---
name: tribal-gc-053
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "turning", "roughing", "constant-chip-load", "css", "g96"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-053.md
promoted_at: 2026-06-09T22:31:16.325Z
---

# Rough turning with constant chip load adapts feed to varying diameter

GibbsCAM's rough turning supports constant chip load mode where the feed rate adjusts based on the instantaneous cutting diameter. At smaller diameters, the surface speed increases for a given RPM, so the feed per revolution must decrease to maintain a constant chip cross-section. Enable 'Constant Surface Speed' (CSS) and GibbsCAM automatically outputs G96 with the target surface speed. Set the maximum RPM limit (G50) to prevent spindle overspeed when the tool reaches small diameters—typically 3000-4000 RPM for most chucked work.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-014|Waterline roughing with constant Z-step provides predictable load per level]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
- [[gibbscam-cam-tips-gc-056|Threading with multiple passes uses decreasing infeed for surface quality]]
- [[gibbscam-cam-tips-gc-057|Face turning with spiral path eliminates the center dwell mark]]
