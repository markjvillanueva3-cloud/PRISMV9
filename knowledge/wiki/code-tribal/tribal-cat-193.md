---
name: tribal-cat-193
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "mold", "runner", "gate", "injection-mold"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-193.md
promoted_at: 2026-06-09T22:31:16.076Z
---

# Runner and Gate Machining with Specialized CATIA Operations

Machine injection mold runners and gates in CATIA using a combination of Surface Machining (for curved runner channels) and Prismatic Machining (for flat-bottom runners). For full-round runners, use a ball-nose end mill with the diameter matching the runner radius — machine in two passes (one for each half of the round channel) with the tool axis tilted 15° to avoid zero-speed center cutting. For sub-gates and pin gates, use micro-milling operations with 0.5-2mm ball-nose tools. Define the runner system as a separate geometric body and assign it its own machining domain to isolate it from the main cavity machining sequence.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:dassault-forum
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-283|Mold runner and gate machining uses 2D contour with depth ramp to prevent tool breakage in hardened steel]]
- [[topsolid-cam-tips-ts-120|Runner System Machining with Specialized Strategies]]
- [[cimatron-cam-tips-cim-031|Runner and Gate Machining for Injection Molds]]
- [[tebis-cam-tips-teb-012|Gate and Runner Machining Uses Dedicated NCJob Templates]]
- [[catia-cam-tips-cat-046|Core Roughing for Tall Thin Features Requires Outside-In Strategy]]
