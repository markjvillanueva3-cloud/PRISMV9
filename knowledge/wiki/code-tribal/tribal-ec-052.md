---
name: tribal-ec-052
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "threading", "slug-management", "unattended"]
confidence: 88
source: "web:edgecam-wire-edm"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-052.md
promoted_at: 2026-06-09T22:31:16.172Z
---

# Wire EDM Threading and Slug Management

For unattended wire EDM in Edgecam, manage slugs carefully. Large slugs (>50g) need tab stops — 0.3-0.5mm uncut sections at 2-3 locations that hold the slug until manual removal. Small slugs can drop into the work tank. Sequence operations as: all rough cuts, return for tab removal, then all skims. Ensure start holes are 0.5-1mm larger than the wire guide for reliable auto-threading. Include wire tension verification after each re-thread.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-wire-edm
**Operations:** wire_edm_2axis

## Related
- [[esprit-cam-tips-esp-056|Wire EDM Threading and Start Hole Optimization]]
- [[gibbscam-cam-tips-gc-068|Glue stop technique uses adhesive to hold slugs for unattended operation]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[camworks-cam-tips-cw-077|Wire Threading Strategy — Automatic Re-Threading for Multi-Opening Parts]]
