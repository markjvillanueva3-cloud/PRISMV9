---
name: tribal-wedm-sp-001
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "makino", "sp43", "sp64", "mgw-s", "0.004-wire", "fine-wire", "inside-radius", "die-work", "intricate"]
confidence: 95
source: "mastercam:makino_sp43_sp64_tech_file_mgw_s"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-sp-001.md
promoted_at: 2026-05-26T16:07:21.344Z
---

# Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles

The Makino SP43 and SP64 use 0.004" (0.10mm) brass wire as the standard library wire — half the diameter of the 0.008" (0.20mm) wire used on most Makino DUO and Mitsubishi FA-10S machines. This enables a minimum programmed inside corner radius of approximately 0.003" (0.076mm), compared to ~0.006" on 0.008" wire machines. Practical consequence: SP43/SP64 can cut wire guide dies, extrusion nozzles, and fine-blanking punches with inside radii that would require secondary EDM sinking or hand lapping on coarser-wire machines. Programming note: always set the lead-in to at least 2× wire diameter (0.008" min) and use straight leads, never arcs, to avoid compensation singularities at entry.

**Category:** machining
**Confidence:** 95
**Source:** mastercam:makino_sp43_sp64_tech_file_mgw_s
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[wedm-knowledge-tips-wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]]
- [[wedm-knowledge-tips-wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]]
- [[wedm-knowledge-tips-wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]]
