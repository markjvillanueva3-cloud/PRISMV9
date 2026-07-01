---
name: tribal-gc-174
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "worm-gear", "thread-turning", "lead-angle", "multi-pass"]
confidence: 81
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-174.md
promoted_at: 2026-06-09T22:31:16.358Z
---

# GibbsCAM worm gear machining requires multi-pass turning with precise lead control

Worm gears in GibbsCAM are programmed as thread-turning operations with the worm's lead, depth, and profile (typically involute or ZI profile). The worm is machined on a lathe or MTM using multiple passes — typically 8-15 spring passes for finish accuracy. Set the infeed angle to match the worm's lead angle (typically 1-5° for single-start, up to 25° for multi-start). GibbsCAM's threading cycle supports modified flank infeed where alternate passes feed from opposite flanks to equalize surface finish on both sides of the thread. For hardened worms (>50 HRC), use CBN inserts with flood coolant and reduce cutting speed to 60-80 m/min.

**Category:** cam_strategy
**Confidence:** 81
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-035|Blade finishing requires lead/lag angle control to prevent tip gouging]]
- [[gibbscam-cam-tips-gc-056|Threading with multiple passes uses decreasing infeed for surface quality]]
- [[gibbscam-cam-tips-gc-065|Skim cuts progressively improve surface finish and dimensional accuracy]]
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
