---
name: tribal-jm-die-012
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "tungsten-carbide", "wc", "wc-co", "zinc-coated", "e952", "e56xx", "acu", "cobalt"]
confidence: 92
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-012.md
promoted_at: 2026-05-26T16:07:21.208Z
---

# JM Die tungsten carbide — zinc-coated wire mandatory, E952+E56xx ACU sequence

Tungsten carbide (WC-Co, 6-15% cobalt) is used at JM Die for wear-critical die inserts and forming tools. Wire EDM of WC on the FA-20S requires: (1) zinc-coated brass wire (not plain brass) — the zinc coating prevents wire breakage in the high-energy rough cut, (2) E952 ACU roughing followed by E56xx ACU skim sequence (E5621-E5622-E5623 or E5627), (3) reduced flushing pressure (4 bar vs 6 bar for steel) to prevent wire deflection in the harder kerf. Cutting rate is 40-50% of steel due to WC's low electrical conductivity. Always run 4+ skim passes on WC — the cobalt binder melts preferentially during EDM, creating a cobalt-depleted surface layer that must be removed.

**Category:** machining
**Confidence:** 92
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
