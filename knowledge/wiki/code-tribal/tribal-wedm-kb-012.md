---
name: tribal-wedm-kb-012
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["wire-edm", "surface-finish", "Ra", "aluminum", "power-supply", "dc", "ac"]
confidence: 83
source: "handbook:reliable_edm_ch5"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-012.md
promoted_at: 2026-06-09T22:31:16.789Z
---

# DC vs AC power supply affects Ra on aluminum

For aluminum and copper alloys, AC-type power supplies produce 20-30% better Ra than DC. The alternating polarity prevents material buildup on the wire (DC causes aluminum to plate onto the wire surface, degrading discharge uniformity). Mitsubishi FA series and Sodick AQ series have switchable DC/AC modes. If your machine is DC-only and cutting aluminum, reduce ON time by 15% and increase OFF time by 20% to partially compensate.

**Category:** speeds_feeds
**Confidence:** 83
**Source:** handbook:reliable_edm_ch5
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-kb-007|Ra worse than expected: check water resistivity first]]
- [[wedm-knowledge-tips-wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]]
- [[wedm-knowledge-tips-wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]]
- [[wedm-knowledge-tips-wedm-kb-010|Finishing pass wire speed affects Ra consistency]]
