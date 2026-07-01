---
name: tribal-mc-094
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["mastercam", "compare-cad", "overcut", "undercut", "stock-deviation", "tolerance-band"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-094.md
promoted_at: 2026-06-09T22:31:16.418Z
---

# Stock Model comparison to CAD reveals both overcut and undercut regions visually

After simulation, use Mastercam's Compare to CAD feature which colors the simulated stock model based on distance to the target CAD surface: green for within tolerance, red for overcut (gouged), blue for remaining stock (undercut). Set the tolerance band to your part specification (e.g., +0.00/-0.02 mm). This instantly identifies programming errors that would be invisible in standard Verify. Pay special attention to fillet regions and sharp internal corners where tool radius compensation may leave excess material.

**Category:** quality
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** verification

## Related
- [[mastercam-cam-tips-mc-242|Mastercam Dynamic OptiRough detects undercut stock conditions and adjusts roughing automatically]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-041|Dynamic Mill approach distance controls initial engagement ramp length]]
