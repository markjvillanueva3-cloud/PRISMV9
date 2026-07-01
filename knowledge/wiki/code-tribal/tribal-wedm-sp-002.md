---
name: tribal-wedm-sp-002
category: code-tribal
subdomain: troubleshooting
domain: tribal-knowledge
tags: ["wire-edm", "makino", "sp43", "sp64", "mitsubishi", "fa-10s", "e-pack", "e-code", "incompatible", "cross-apply"]
confidence: 98
source: "mastercam:makino_sp43_sp64_tech_file_mgw_s"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-sp-002.md
promoted_at: 2026-05-26T16:07:21.346Z
---

# Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes

Makino MGW-S E-packs (SP43/SP64) use a completely different numbering and power parameter scheme from Mitsubishi FA-10S E-codes. Makino steel High Precision uses 1XXX roughing (e.g., 1025, 1035, 1045) + 12XX skim passes. Mitsubishi steel uses E12XX series (E1221–E1285). Despite the superficial similarity, these codes are NOT interchangeable — voltage, pulse width, servo reference, and flushing parameters all differ. Loading Makino codes on a Mitsubishi (or vice versa) will at minimum produce wrong surface finish, and at worst cause wire breaks and part damage. Mitsubishi carbide uses E-codes in the 5XXX range; Makino carbide ALSO uses 5XXX range (5025, 5035...) — this overlap makes the confusion especially dangerous. Always verify the machine type and control before selecting an E-pack family.

**Category:** troubleshooting
**Confidence:** 98
**Source:** mastercam:makino_sp43_sp64_tech_file_mgw_s
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[wedm-knowledge-tips-wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]]
- [[wedm-knowledge-tips-wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]]
- [[wedm-knowledge-tips-wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]]
- [[wedm-knowledge-tips-wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]]
