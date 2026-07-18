---
name: tribal-wedm-kb-011
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["wire-edm", "recast-layer", "surface-integrity", "ams-2628", "aerospace"]
confidence: 93
source: "handbook:klocke_2013_ch8"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-011.md
promoted_at: 2026-05-26T16:07:21.278Z
---

# Recast layer thickness determines part integrity

WEDM always leaves a recast (white) layer on the cut surface. Thickness: rough cut 15-25µm, after 2 skims 5-10µm, after 4 skims 1-3µm. For aerospace (AMS 2628) and medical parts, maximum recast is typically 7.5µm (0.0003in). If recast exceeds spec after WEDM, mechanical polishing or chemical etching is required. Thermal penetration depth follows Carslaw-Jaeger: d = 2×sqrt(α×t_on). Lower ON time = thinner recast.

**Category:** quality
**Confidence:** 93
**Source:** handbook:klocke_2013_ch8
**Operations:** wire_edm

## Related
- [[mastercam-cam-tips-mc-120|Skim cuts in wire EDM progressively improve surface finish and dimensional accuracy]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
