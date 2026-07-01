---
name: tribal-ctrl-058
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "safety", "DCS", "STO", "SLS"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-058.md
promoted_at: 2026-06-09T22:31:16.145Z
---

# Fanuc Dual Check Safety (DCS) system

Fanuc Dual Check Safety (DCS) provides SIL 2 / PLd safety monitoring built into the CNC — no external safety hardware needed. Features: Safe Torque Off (STO) — removes torque from motors without cutting main power, faster restart than E-stop. Safe Limited Speed (SLS) — monitors axis/spindle speed, triggers alarm if exceeded. Safe Speed Monitor (SSM) — confirms safe speed before allowing guard door opening. Safe Position Monitor — monitors axis positions against defined safe zones. Architecture: dual-channel redundant monitoring of I/O signals, servo motors, and spindle motors. Emergency stop is monitored redundantly across both channels. Available on all current Fanuc controllers (0i-MF Plus, 31i-B5 Plus, 0i-TF Plus). Eliminates need for external safety PLCs in many applications, reducing wiring and cost.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-064|Fanuc turning vs milling controller G-code conflicts]]
- [[controller-knowledge-tips-ctrl-072|Safety Integrated: SOS, SLS, SS1, SSM Functions]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
