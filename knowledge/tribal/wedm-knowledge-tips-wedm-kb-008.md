---
id: "wedm-kb-008"
title: "Skim pass count vs Ra: diminishing returns after 4 passes"
source: "handbook:toenshoff_edm_ch6"
confidence: 91
category: "speeds_feeds"
tags: ["wire-edm", "surface-finish", "Ra", "skim-pass", "toenshoff", "passes"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.559Z
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
