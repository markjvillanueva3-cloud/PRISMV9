---
name: tribal-ctrl-072
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "safety", "SOS", "SLS", "SS1", "SSM", "Safety-Integrated", "PROFIsafe"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-072.md
promoted_at: 2026-06-09T22:31:16.148Z
---

# Safety Integrated: SOS, SLS, SS1, SSM Functions

SINUMERIK Safety Integrated provides certified (SIL 2 / PL d) safety functions through the SINAMICS drive system, communicated via PROFIsafe protocol. Key functions: SOS (Safe Operating Stop) - drive remains energized and in closed-loop control but monitors for zero velocity, preventing unintentional movement during loading/unloading without losing position reference. SS1 (Safe Stop 1) - controlled deceleration followed by STO (Safe Torque Off), time-monitored and acceleration-controlled. SLS (Safely-Limited Speed) - monitors that axis speed does not exceed configurable limits, essential for setup mode and door-open machining at reduced speed. SSM (Safe Speed Monitor) - provides a safety-rated binary signal when drive operates below a threshold, used for interlocking (e.g., door release only when spindle stopped). SLP (Safely-Limited Position) - monitors axis position within a configurable window. SDI (Safe Direction) - restricts axis to one direction of motion. All functions are configured in SINAMICS drive parameters and activated via safety PLC (F-PLC). SINUMERIK ONE uses integrated SIMATIC S7-1500F safety PLC. 840D sl uses external SIMATIC safety PLC. 828D has integrated safety with simpler configuration. These functions are mandatory for CE-marked machines and are tested during annual machine safety validation.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-058|Fanuc Dual Check Safety (DCS) system]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-064|Fanuc turning vs milling controller G-code conflicts]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
