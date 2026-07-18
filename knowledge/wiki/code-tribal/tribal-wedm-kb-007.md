---
name: tribal-wedm-kb-007
category: code-tribal
subdomain: troubleshooting
domain: tribal-knowledge
tags: ["wire-edm", "surface-finish", "Ra", "water-resistivity", "dielectric", "deionizer"]
confidence: 94
source: "handbook:klocke_2013_ch8"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-007.md
promoted_at: 2026-05-26T16:07:21.262Z
---

# Ra worse than expected: check water resistivity first

If surface finish (Ra) is 20-50% worse than predicted, check the dielectric water resistivity FIRST. Optimal range for finishing: 5-15 MΩ·cm (deionized). Resistivity below 3 MΩ·cm causes unstable discharges with irregular crater sizes → worse Ra. The deionizing resin needs replacement when resistivity drops below 3 MΩ·cm under load. Most machines have a resistivity gauge on the tank — check it before adjusting E-pack parameters.

**Category:** troubleshooting
**Confidence:** 94
**Source:** handbook:klocke_2013_ch8
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]]
- [[wedm-knowledge-tips-wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]]
- [[wedm-knowledge-tips-wedm-kb-010|Finishing pass wire speed affects Ra consistency]]
- [[wedm-knowledge-tips-wedm-kb-012|DC vs AC power supply affects Ra on aluminum]]
