---
name: tribal-esp-056
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "threading", "start-holes", "unattended"]
confidence: 88
source: "web:esprit-wire-edm"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-056.md
promoted_at: 2026-06-09T22:31:16.225Z
---

# Wire EDM Threading and Start Hole Optimization

Optimize wire threading in ESPRIT's unattended operations by: (1) grouping all rough cuts first, (2) grouping all skim cuts second, (3) minimizing re-threading by cutting multiple slugs before skimming. Place start holes at least 2mm from the profile and in material that won't distort when the slug separates. For automatic wire threading, ensure start holes are 0.5-1mm larger than the wire guide diameter. ESPRIT's auto-threading sequence includes wire cut, thread, tension verify, and power test.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:esprit-wire-edm
**Operations:** wire_edm_2axis

## Related
- [[edgecam-cam-tips-ec-052|Wire EDM Threading and Slug Management]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[camworks-cam-tips-cw-077|Wire Threading Strategy — Automatic Re-Threading for Multi-Opening Parts]]
- [[camworks-cam-tips-cw-162|Wire EDM Auto-Threading and Recovery — Unattended Operation]]
