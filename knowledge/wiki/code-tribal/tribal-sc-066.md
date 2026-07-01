---
name: tribal-sc-066
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "hsm", "pencil-tracing", "fillets", "rest-finishing"]
confidence: 88
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-066.md
promoted_at: 2026-06-09T22:31:16.586Z
---

# HSM Pencil Tracing — Clean Internal Fillets in One Pass

HSM Pencil Tracing automatically detects and machines internal fillet radii left by larger previous tools. Set the pencil trace step-over to 50-70% of the finishing tool diameter for a single cleanup pass, or 30-40% for two overlapping passes that ensure no material remains. Use Parallel Pencil mode for wider fillets where the standard pencil pass cannot cover the entire transition zone — it generates offset passes on both sides of the pencil line.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** finishing, rest_machining

## Related
- [[solidcam-cam-tips-sc-173-2|Steep-Shallow Automatic Assignment]]
- [[solidcam-cam-tips-sc-065|HSM Rest Finishing — Reference Both Roughing and Semi-Finish Tools]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
