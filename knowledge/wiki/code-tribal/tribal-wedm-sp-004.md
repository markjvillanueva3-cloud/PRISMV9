---
name: tribal-wedm-sp-004
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "makino", "sp43", "sp64", "carbide", "wc", "wc-co", "5xxx-epack", "ra-4", "flushing", "conductivity", "cobalt-binder"]
confidence: 90
source: "mastercam:makino_sp43_sp64_tech_file_mgw_s"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-sp-004.md
promoted_at: 2026-05-26T16:07:21.351Z
---

# SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin

When cutting tungsten carbide (WC or WC-Co) on the Makino SP43/SP64, the roughing E-pack Ra starts at 51 µin (1.3µm) — significantly lower than the 72 µin starting Ra for steel. This is because carbide ablates more slowly per discharge, producing a finer initial surface. The WC library (5025/5035/5045/5055/5065 rough + 52XX–52XX skims) achieves Ra 4 µin (0.10µm) in 4 passes for thicknesses up to 0.75", and 5 passes for 1.0"–1.25" sections. Offset values are slightly higher than steel at equivalent thickness due to the smaller spark gap on carbide (lower conductivity requires slightly larger compensation). Flushing note: use deionized water conductivity ≤ 5 µS/cm for carbide — higher conductivity causes electrolytic attack on the cobalt binder, creating subsurface micro-cracks invisible to surface inspection. Check conductivity every 4 hours when running long carbide programs.

**Category:** machining
**Confidence:** 90
**Source:** mastercam:makino_sp43_sp64_tech_file_mgw_s
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]]
- [[wedm-knowledge-tips-wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]]
- [[wedm-knowledge-tips-wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]]
- [[wedm-knowledge-tips-wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]]
- [[wedm-knowledge-tips-wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]]
