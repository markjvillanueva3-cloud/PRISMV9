---
name: tribal-mc-120
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "skim-cut", "trim-pass", "surface-finish", "recast-layer"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-120.md
promoted_at: 2026-06-09T22:31:16.425Z
---

# Skim cuts in wire EDM progressively improve surface finish and dimensional accuracy

After the initial rough cut, program 2–4 skim (trim) passes in Mastercam Wire to achieve target surface finish and tolerance. Each skim pass removes 0.01–0.05 mm per side with reduced power settings. The first skim uses ~60% of rough power and removes the recast layer; subsequent skims use 30–15% power for finish quality. Mastercam's wire technology tables store optimal power, wire tension, and flushing parameters for each skim pass by material and thickness. Always use the machine manufacturer's technology tables as a starting point and fine-tune based on actual test cuts. Three skim passes typically achieve Ra 0.4 µm; four passes reach Ra 0.2 µm on hardened steel.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** wire_edm, finishing

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[esprit-cam-tips-esp-156|Wire EDM Skim Cut Strategy for Surface Finish Optimization]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
