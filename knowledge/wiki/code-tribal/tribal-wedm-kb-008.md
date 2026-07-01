---
name: tribal-wedm-kb-008
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["wire-edm", "surface-finish", "Ra", "skim-pass", "toenshoff", "passes"]
confidence: 91
source: "handbook:toenshoff_edm_ch6"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-008.md
promoted_at: 2026-05-26T16:07:21.276Z
---

# Skim pass count vs Ra: diminishing returns after 4 passes

Each skim pass improves Ra by roughly 60-70% (Toenshoff energy cascade: E_n = E_rough × 0.25^(n-1)). Typical progression: Pass 1 (rough) Ra=3.2µm → Skim 1 Ra=1.6µm → Skim 2 Ra=0.8µm → Skim 3 Ra=0.4µm → Skim 4 Ra=0.2µm. After 4 skim passes (5 total), further passes yield <0.05µm improvement — diminishing returns. For Ra<0.2µm, switch to lapping rather than adding more WEDM passes. Published data from Makino U6 confirms this plateau.

**Category:** speeds_feeds
**Confidence:** 91
**Source:** handbook:toenshoff_edm_ch6
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[solidcam-cam-tips-sc-130|Wire EDM Profile Cutting — 2-Axis Contour with Multiple Skim Passes]]
- [[wedm-knowledge-tips-wedm-kb-007|Ra worse than expected: check water resistivity first]]
- [[wedm-knowledge-tips-wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]]
- [[wedm-knowledge-tips-wedm-kb-010|Finishing pass wire speed affects Ra consistency]]
