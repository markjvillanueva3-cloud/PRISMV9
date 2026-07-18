---
name: tribal-ctrl-086
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "heidenhain", "Klartext", "ISO", "programming-language"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-086.md
promoted_at: 2026-06-09T22:31:16.152Z
---

# Heidenhain Klartext vs ISO programming — when to use which

TNC 640 supports both Klartext (conversational) and DIN/ISO G-code. Klartext is preferred for shop-floor programming: plain-text syntax (L X+50 Y+30 R0 F500 M3), built-in cycle calls, and FK free-contour programming for incomplete drawings. ISO mode is needed when importing CAM-posted code. CRITICAL: Do not mix Klartext and ISO blocks in the same program — use separate programs and call ISO programs as subprograms from Klartext via CALL PGM. Klartext programs use .H extension, ISO programs use .I extension. Post processors must output to the correct format.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-081|TNC 640 TCPM vs M128 for 5-axis tool orientation]]
- [[controller-knowledge-tips-ctrl-082|TNC 640 Cycle 32 TOLERANCE for HSM optimization]]
- [[controller-knowledge-tips-ctrl-083|TNC 640 Dynamic Collision Monitoring (DCM)]]
- [[controller-knowledge-tips-ctrl-084|TNC 640 KinematicsOpt for rotary axis calibration]]
