---
name: tribal-wedm-mcam-009
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "tab", "skim-cut", "multiple-contour", "slug", "batch", "mastercam"]
confidence: 88
source: "mastercam_wire_tutorial:page26-27"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-mcam-009.md
promoted_at: 2026-06-09T22:31:16.795Z
---

# Tab with skim cuts after — efficient multi-contour slug management

When cutting multiple contours from a single piece of stock, use 'Tab' option with 'Make tab cutoff move with skim cut' and 'Skim cuts after tab'. This sequence: (1) Rough cuts all contours leaving tabs, (2) Skim cuts on all contours (tabs still in place), (3) Final tab burn-out cuts to release parts. Benefits: all parts remain attached during skimming for stability, batch processing is more efficient, and operator can position catch tray before tab burn-out. Set Tab Width to 1.5-2.0mm for tool steels. Add optional stop (M01 / glue stop) before tab burn-out sequence for operator intervention.

**Category:** machining
**Confidence:** 88
**Source:** mastercam_wire_tutorial:page26-27
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-120|Skim cuts in wire EDM progressively improve surface finish and dimensional accuracy]]
- [[wedm-knowledge-tips-wedm-kb-026|Tab/slug management for closed contour cuts]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
