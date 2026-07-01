---
name: tribal-sc-065
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "hsm", "rest-finishing", "stock-model", "multi-tool"]
confidence: 91
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-065.md
promoted_at: 2026-05-26T16:07:20.422Z
---

# HSM Rest Finishing — Reference Both Roughing and Semi-Finish Tools

In HSM Rest Finishing, reference all previous tools (roughing and semi-finish) in the rest material calculation, not just the immediately preceding tool. SolidCAM builds a composite stock model from all referenced operations. Missing a reference causes the rest finishing pass to re-machine already-finished areas, wasting 20-40% cycle time and risking surface quality degradation from double-cutting. Always verify the rest material display (blue shading) before generating the toolpath.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:solidcam-docs
**Operations:** finishing, rest_machining

## Related
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-066|HSM Pencil Tracing — Clean Internal Fillets in One Pass]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-173-2|Steep-Shallow Automatic Assignment]]
- [[solidcam-cam-tips-sc-174-2|Pencil Tracing for Corner Cleanup]]
