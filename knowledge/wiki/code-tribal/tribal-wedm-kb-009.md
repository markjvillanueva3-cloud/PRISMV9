---
name: tribal-wedm-kb-009
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["wire-edm", "surface-finish", "Ra", "material", "hardness", "crater"]
confidence: 89
source: "handbook:klocke_2013_ch8"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-009.md
promoted_at: 2026-06-09T22:31:16.789Z
---

# Material affects achievable Ra: hardened steel is better than aluminum

Counter-intuitively, hardened tool steels (D2, A2, S7 at 58-62 HRC) produce BETTER surface finish in WEDM than soft materials like aluminum 6061. Reason: hard materials produce smaller, more uniform discharge craters. Typical achievable Ra after 4 skim passes: D2 hardened=0.15µm, 304SS=0.25µm, 6061 Al=0.4µm, WC=0.10µm. Klocke (2013) attributes this to the higher melting point and lower thermal conductivity concentrating discharge energy into smaller craters.

**Category:** speeds_feeds
**Confidence:** 89
**Source:** handbook:klocke_2013_ch8
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-kb-007|Ra worse than expected: check water resistivity first]]
- [[wedm-knowledge-tips-wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]]
- [[wedm-knowledge-tips-wedm-kb-010|Finishing pass wire speed affects Ra consistency]]
- [[wedm-knowledge-tips-wedm-kb-012|DC vs AC power supply affects Ra on aluminum]]
