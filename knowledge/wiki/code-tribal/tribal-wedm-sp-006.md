---
name: tribal-wedm-sp-006
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "makino", "sp43", "sp64", "copper", "cu", "7xxx-epack", "3-pass", "electrode", "sinker-edm", "graphite", "ra-12"]
confidence: 87
source: "mastercam:makino_sp43_sp64_tech_file_mgw_s"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-sp-006.md
promoted_at: 2026-06-09T22:31:16.797Z
---

# SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting

The Makino SP43/SP64 includes a dedicated Cu (copper) E-pack library (7XXX series: 7025/7035/7045/7055/7065 roughing + 72XX skims) for cutting copper electrodes for sinker EDM. Unlike the steel and carbide libraries which support 4–5 passes, the copper library completes in 3 passes, achieving Ra 12 µin (0.30µm) — sufficient for EDM electrode surface finish requirements. The copper roughing Ra is 72 µin (same as steel), but the final skim offsets are smaller (0.0023–0.0024" vs 0.0022–0.0023" for steel), reflecting the softer material's lower spark gap requirement. Practical use at shops like JM Die: use the Cu library when cutting profiled copper or brass fixtures, die-set components, or graphite EDM electrodes if the machine's WC library is not applicable (note: graphite is not in the SP43/SP64 library — use steel parameters as a starting point for graphite, derated by 30% on roughing power). Cu library is NOT appropriate for steel die cavities regardless of copper-colored surface coatings.

**Category:** machining
**Confidence:** 87
**Source:** mastercam:makino_sp43_sp64_tech_file_mgw_s
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]]
- [[wedm-knowledge-tips-wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]]
- [[wedm-knowledge-tips-wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]]
- [[wedm-knowledge-tips-wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]]
- [[wedm-knowledge-tips-wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]]
