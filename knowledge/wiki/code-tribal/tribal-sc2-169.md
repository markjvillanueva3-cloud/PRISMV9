---
name: tribal-sc2-169
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "glue-stop", "die-work", "slug-hold", "precision"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-169.md
promoted_at: 2026-06-09T22:31:16.696Z
---

# SURFCAM Wire EDM Glue Stop Feature for Precision Die Work

SURFCAM's glue stop feature pauses the wire EDM cut at a specified point, allowing the operator to apply cyanoacrylate adhesive to hold the slug in place before completing the cut. This prevents slug movement that would cause wire breakage or part damage in precision die work. Program the glue stop 5-10mm before the cut completion point. The post outputs an M00 (program stop) with a message prompt. After gluing, the machine resumes cutting through the remaining material and the adhesive joint.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:surfcam-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[edgecam-cam-tips-ec-053|Wire EDM Corner Strategy for Precision Dies]]
- [[esprit-cam-tips-esp-055|Wire EDM Corner Strategy Selection for Precision]]
- [[esprit-cam-tips-esp-157|Wire EDM Glue Stop Strategy for Slug Retention]]
