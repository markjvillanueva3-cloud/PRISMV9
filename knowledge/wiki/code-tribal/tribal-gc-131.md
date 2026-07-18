---
name: tribal-gc-131
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "volumill", "rest-machining", "updated-stock", "multi-tool"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-131.md
promoted_at: 2026-06-09T22:31:16.346Z
---

# VoluMill stock-aware rest machining in GibbsCAM uses updated stock for smaller tools

After VoluMill roughing with a large tool, create a second VoluMill operation with a smaller tool and enable 'Use Updated Stock'. GibbsCAM passes the remaining stock model (including all pockets, steps, and undercuts left by the first tool) to VoluMill's algorithm. The smaller tool only machines where material actually remains, eliminating air cuts. This two-stage VoluMill approach (e.g., 20mm rough → 10mm rest-rough) can reduce total cycle time by 15-25% compared to single-tool VoluMill while ensuring all internal radii are fully cleaned out.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[camworks-cam-tips-cw-026|Rest from VoluMill — Chain Multiple Tool Sizes for Complete Roughing]]
- [[gibbscam-cam-tips-gc-010|Island avoidance with rest machining cleans up material around bosses]]
- [[gibbscam-cam-tips-gc-018|Rest machining with IPW tracks remaining stock for targeted cleanup]]
- [[gibbscam-cam-tips-gc-021|VoluMill maintains constant engagement angle for maximum feed rates]]
- [[gibbscam-cam-tips-gc-022|VoluMill minimum toolpath radius controls feed rate potential in corners]]
