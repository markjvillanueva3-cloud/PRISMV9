---
name: tribal-gc-069
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "wire-edm", "auto-threading", "awt", "unattended", "multi-opening"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-069.md
promoted_at: 2026-06-09T22:31:16.329Z
---

# Automatic wire threading enables multi-opening unattended production

GibbsCAM Wire EDM programs the automatic wire threading (AWT) sequence between features. After completing one opening, the system cuts the wire, rapids to the next start hole, and threads the wire through. Program the wire thread M-code and set the 'Thread Retry Count' (typically 3 attempts). For reliable AWT, ensure start holes are at least 0.5mm larger than the wire diameter and are clean of burrs. GibbsCAM sequences the features to minimize rapid travel distance between start holes. Set the wire tension ramp-up distance after threading to allow the wire to stabilize before the rough cut begins.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-068|Glue stop technique uses adhesive to hold slugs for unattended operation]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[mastercam-cam-tips-mc-122|Automatic wire threading sequences enable unattended wire EDM operation]]
- [[solidcam-cam-tips-sc-134|Wire EDM Auto-Threading and Tab Strategy — Unattended Multi-Cavity Cutting]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
