---
name: tribal-gc-056
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "turning", "threading", "flank-infeed", "multi-pass", "g76"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-056.md
promoted_at: 2026-06-09T22:31:16.326Z
---

# Threading with multiple passes uses decreasing infeed for surface quality

GibbsCAM's threading cycle supports modified flank infeed where each pass enters at a 29-30° angle relative to the thread axis, putting cutting action on the leading flank only. Set the number of passes based on thread pitch: 4-6 passes for fine threads (< 1.0mm pitch), 8-12 for coarse (1.5-3.0mm). The last 2 passes should use reduced depth (0.02-0.05mm) as spring passes. For acme and buttress threads, use the ThreadTracer plugin for multi-pass segmented G32/G33 threading with custom profiles that the standard G76 cycle cannot produce.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[camworks-cam-tips-cw-066|Threading — Multiple Passes with Decreasing Depth for Clean Threads]]
- [[bobcad-cam-tips-bc-046|Threading with Multi-Pass Infeed and Spring Passes]]
- [[gibbscam-cam-tips-gc-053|Rough turning with constant chip load adapts feed to varying diameter]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
