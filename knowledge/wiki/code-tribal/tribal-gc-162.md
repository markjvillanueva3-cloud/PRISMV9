---
name: tribal-gc-162
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "custom-tools", "form-tools", "tool-editor", "profile"]
confidence: 84
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-162.md
promoted_at: 2026-06-09T22:31:16.354Z
---

# GibbsCAM custom tool shapes for form tools and special profiles

For custom form tools (dovetail cutters, T-slot cutters, special profile inserts), GibbsCAM's tool editor allows defining the cutting profile as a 2D wireframe. Draw the tool's cutting edge profile in the tool editor using lines and arcs. The system uses this profile for accurate gouge detection, simulation rendering, and toolpath offset calculations. For indexable form inserts, define both the insert profile and the holder body separately. When the insert is rotated (e.g., 4 cutting edges), update only the edge number in the tool definition while keeping the same profile. This prevents simulation errors from using a generic tool shape for form-tool operations.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
- [[gibbscam-cam-tips-gc-003|Facing operations benefit from climb milling with 65-75% stepover]]
- [[gibbscam-cam-tips-gc-004|Drill tile supports spot-drill-tap sequences with automatic depth linking]]
- [[gibbscam-cam-tips-gc-005|Thread milling uses helical interpolation for precision internal threads]]
