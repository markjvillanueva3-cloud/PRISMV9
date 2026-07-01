---
name: tribal-mc-127
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "tab-placement", "slug-retention", "cleanup", "skim-pass"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-127.md
promoted_at: 2026-06-09T22:31:16.427Z
---

# Wire EDM tab positions should avoid critical dimensions and sharp corners

When placing tabs to retain slugs in Mastercam Wire, avoid locating them at dimensionally critical features, sharp internal corners, or areas requiring tight surface finish. Optimal tab locations are: mid-span of long straight segments, at blend radii where post-tab cleanup is easy, or at features that will be machined by a subsequent milling operation. Program tabs at uniform angular spacing around the profile (typically 90° apart for rectangular openings, 120° for round). Tab width of 0.3 mm minimizes cleanup effort while providing sufficient retention for slugs up to 500 g. For heavy slugs (>500 g), increase tab width to 0.5 mm and add additional tabs. Always program the final skim pass to include tab locations so the skim removes any step left by tab removal.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** wire_edm, finishing

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[mastercam-cam-tips-mc-055|Pencil toolpath targets fillet and concave blend regions for zero-scallop finish]]
