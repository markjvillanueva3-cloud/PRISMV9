---
name: tribal-esp-058
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "unattended", "lights-out", "sequencing"]
confidence: 87
source: "web:esprit-wire-edm"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-058.md
promoted_at: 2026-06-09T22:31:16.226Z
---

# Wire EDM Automatic Operation Sequencing for Lights-Out

For lights-out wire EDM operation in ESPRIT, sequence operations as: (1) all rough cuts with slugs dropping, (2) all tab-held rough cuts, (3) return to remove tabs (operator-assisted or with slug catcher), (4) all first skim passes, (5) all subsequent skim passes. This minimizes wire changes and re-threading. Enable machine-specific unattended parameters (wire break detection, fluid level monitoring, fire suppression) in the post processor output.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:esprit-wire-edm
**Operations:** wire_edm_2axis, wire_edm_4axis

## Related
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[bobcad-cam-tips-bc-158|BobCAD Wire EDM Multi-Cavity Optimization with Common Start Holes]]
- [[camworks-cam-tips-cw-162|Wire EDM Auto-Threading and Recovery — Unattended Operation]]
- [[edgecam-cam-tips-ec-052|Wire EDM Threading and Slug Management]]
- [[esprit-cam-tips-esp-056|Wire EDM Threading and Start Hole Optimization]]
