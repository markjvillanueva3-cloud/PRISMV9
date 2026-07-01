---
name: tribal-gc-068
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "wire-edm", "glue-stop", "unattended", "slug-management"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-068.md
promoted_at: 2026-06-09T22:31:16.329Z
---

# Glue stop technique uses adhesive to hold slugs for unattended operation

For lights-out wire EDM operation, GibbsCAM supports the glue stop technique where the wire pauses near the end of a profile cut, a glue dispenser bonds the slug to the workpiece, then cutting completes. Program a dwell at the glue stop position (typically 2-3mm before profile closure) with an M-code to activate the glue dispenser. After dispensing, program a short dwell (3-5 seconds) for adhesive curing before resuming the cut. This allows cutting multiple profiles sequentially without operator intervention for slug management.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-069|Automatic wire threading enables multi-opening unattended production]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[edgecam-cam-tips-ec-052|Wire EDM Threading and Slug Management]]
- [[esprit-cam-tips-esp-157|Wire EDM Glue Stop Strategy for Slug Retention]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
