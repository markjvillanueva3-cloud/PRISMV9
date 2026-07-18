---
name: tribal-wedm-sp-003
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "makino", "sp43", "sp64", "high-precision", "both-away", "tolerance", "form-accuracy", "recast", "distortion", "d2", "a2", "s7"]
confidence: 91
source: "mastercam:makino_sp43_sp64_tech_file_mgw_s"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-sp-003.md
promoted_at: 2026-05-26T16:07:21.348Z
---

# SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy

The Makino SP43/SP64 MGW-S library offers two primary cutting methods for steel: High Precision and Both Away. High Precision (E-packs 1025/1035/1045/1055/1065) uses tighter servo references and lower spark energy on each pass — optimized for achieving dimensional tolerance ±0.0001" (±2.5µm) on straightforward 2D profiles with predictable deflection. Both Away (E-packs 1026/1036/1046) alternates the direction of skim passes to cancel the directional recast layer and thermal bow — preferred when the part has a tendency to bow or stress-relieve during cutting (pre-hardened tool steels above 60 HRC, asymmetric cross-sections). Both Away typically requires one additional skim pass to reach equivalent Ra, adding ~15–25% cut time. For JM Die die-making: use High Precision for standard die openings in D2/A2, Both Away for thin-web sections in S7 or pre-hardened 4140 where distortion is a concern.

**Category:** machining
**Confidence:** 91
**Source:** mastercam:makino_sp43_sp64_tech_file_mgw_s
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]]
- [[wedm-knowledge-tips-wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]]
- [[wedm-knowledge-tips-wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]]
- [[wedm-knowledge-tips-wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]]
- [[wedm-knowledge-tips-wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]]
