---
name: tribal-ctrl-119
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "emag", "siemens-variant", "inverted-spindle", "vertical-lathe", "pick-up"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-119.md
promoted_at: 2026-06-09T22:31:16.160Z
---

# EMAG inverted vertical lathe programming with Siemens 840D

EMAG vertical lathes (VL/VT series) use an inverted spindle design where the spindle picks up the workpiece from below, acting as both loader and machining spindle. This fundamentally changes programming: every program must include an auto-loading sequence using the workholding chuck — the spindle descends to a spring-loaded pick-up station, grabs the blank (gimbaled plate compensates for misalignment), then retracts to the machining position. Tool turrets and ways are positioned above, outside the chip/coolant zone. EMAG uses Siemens 840D sl on turning/grinding models and Fanuc on some VT models. When upgrading from older Schubert CC15 controls to Siemens, EMAG transfers all programs and parameters without data loss. For the VT 2/VT 4 shaft machines, 4-axis programming enables precision shaft machining. Z-axis direction is inverted compared to horizontal lathes — verify your coordinate system orientation.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-120|EMAG modular machine line and Siemens cycle integration]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-186|PP Table Word Address Customization for Controller-Specific Output]]
