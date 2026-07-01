---
name: tribal-wedm-sp-005
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wire-edm", "makino", "sp43", "sp64", "mgw-s", "flushing", "nozzle-standoff", "coaxial-flush", "wire-break", "submerged", "immersion"]
confidence: 88
source: "mastercam:makino_sp43_sp64_tech_file_mgw_s"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-sp-005.md
promoted_at: 2026-06-09T22:31:16.797Z
---

# SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap

The Makino SP43/SP64 with 0.004" wire uses very small upper and lower flushing nozzles. The nozzle standoff (distance from nozzle face to workpiece surface) must be ≤ 0.010" (0.25mm) to maintain adequate coaxial flush pressure around the 0.004" wire. With the MGW-S control, flushing pressure is set automatically by the E-pack condition — the operator only needs to verify nozzle position. Symptoms of excessive standoff: wire breaks in the middle of long straight cuts (not at corners), inconsistent Ra from top to bottom of the cut, and visible debris accumulation in the cut kerf. For interrupted surfaces (holes, slots, or stepped workpieces), use the machine's broken-surface flushing mode — on MGW-S this is activated via the C-cycle parameter. Do NOT use standard nozzle-flush on workpieces with openings larger than 0.5" in the flushing path — use submerged (immersion) cutting instead.

**Category:** setup
**Confidence:** 88
**Source:** mastercam:makino_sp43_sp64_tech_file_mgw_s
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]]
- [[wedm-knowledge-tips-wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]]
- [[wedm-knowledge-tips-wedm-kb-021|Submerged vs non-submerged: always submerge when possible]]
- [[wedm-knowledge-tips-wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]]
- [[wedm-knowledge-tips-wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]]
