---
id: "ctrl-044"
title: "EMAG VL/VT machines with Siemens 840D integration"
source: "controller:emag_vl_manual"
confidence: 80
category: "programming"
tags: ["emag", "siemens-based", "pick-up-lathe", "power-skiving", "gauging"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.187Z
---

# EMAG VL/VT machines with Siemens 840D integration

EMAG vertical pick-up lathes use Siemens SINUMERIK 840D sl with EMAG's proprietary HMI overlay. The pick-up spindle automatically loads/unloads workpieces from the conveyor — no robot needed. G-code is standard Siemens dialect. Key EMAG-specific features: integrated measuring probe cycles for in-process gauging, power skiving cycles for gear production (EMAG-specific, uses Siemens synchronized actions under the hood).

**Category:** programming
**Confidence:** 80
**Source:** controller:emag_vl_manual

## Related
- [[controller-knowledge-tips-ctrl-119|EMAG inverted vertical lathe programming with Siemens 840D]]
- [[controller-knowledge-tips-ctrl-120|EMAG modular machine line and Siemens cycle integration]]
- [[controller-knowledge-tips-ctrl-045|Heller 5-axis HF controller features]]
- [[controller-knowledge-tips-ctrl-048|Traub TX8i-s V8 swiss lathe programming]]
- [[edgecam-cam-tips-ec-198|Power Skiving Programming for Internal Gears]]
