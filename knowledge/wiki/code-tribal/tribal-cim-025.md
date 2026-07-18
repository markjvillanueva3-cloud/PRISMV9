---
name: tribal-cim-025
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["coolant", "mql", "flood", "through-spindle"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-025.md
promoted_at: 2026-06-09T22:31:16.087Z
---

# Coolant Strategy Selection by Operation Type

Match coolant strategy to operation: flood coolant for roughing (chip evacuation), air blast for graphite (no coolant — dust extraction only), MQL for finishing hardened steel (thermal stability without thermal shock), through-spindle coolant for deep drilling (>5×D). Cimatron's tool definition includes coolant type — set it per tool and the post processor outputs the correct M-codes automatically.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:cimatron-docs
**Operations:** roughing, finishing, drilling

## Related
- [[controller-knowledge-tips-ctrl-009|Fanuc through-spindle coolant M-codes vary by OEM]]
- [[controller-knowledge-tips-ctrl-057|Fanuc coolant M-codes including through-spindle]]
- [[fusion360-cam-tips-ext-f360-186|MQL Configuration in Fusion Post Processor]]
- [[fusion360-cam-tips-ext-f360-187|Coolant Strategy Selection by Operation Type]]
- [[fusion360-cam-tips-ext-f360-190|Coolant Transition Management Between Operations]]
