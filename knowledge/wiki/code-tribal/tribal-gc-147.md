---
name: tribal-gc-147
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "swiss", "gang-slide", "tool-layout", "rapid-traverse"]
confidence: 84
source: "web:gibbscam-forum"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-147.md
promoted_at: 2026-06-09T22:31:16.350Z
---

# Swiss gang slide tool layout optimization reduces rapid traverse time

GibbsCAM Swiss programming allows defining the physical gang slide tool layout — the X and Z positions of each tool on the gang plate. Optimize the layout so consecutive operations use adjacent tools, minimizing rapid traverse distance between tools. The Z offset between tools should account for the physical tool spacing on the gang plate (typically 20-30 mm between stations). For high-production parts (>10,000 pieces), even 0.3 seconds saved per tool change multiplied across all tools and all parts yields hours of machine time. GibbsCAM calculates the total rapid time in the cycle time estimate, letting you compare different tool layouts numerically.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:gibbscam-forum

## Related
- [[gibbscam-cam-tips-gc-052|Gang tooling layout minimizes tool change time on Swiss machines]]
- [[gibbscam-cam-tips-gc-145|Guide bushing clearance in GibbsCAM Swiss mode affects surface finish and roundness]]
- [[gibbscam-cam-tips-gc-146|Swiss-type sub-spindle backworking in GibbsCAM handles second-operation features]]
- [[gibbscam-cam-tips-gc-148|Swiss-type overlap machining runs main and sub-spindle operations simultaneously]]
- [[gibbscam-cam-tips-gc-149|Swiss-type low-pressure coolant nozzle positioning affects chip evacuation in deep bores]]
