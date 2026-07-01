---
name: tribal-ctrl-039
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["mitsubishi", "m800", "m80", "sss", "high-speed", "look-ahead"]
confidence: 85
source: "controller:mitsubishi_m800_guide"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-039.md
promoted_at: 2026-06-09T22:31:16.141Z
---

# Mitsubishi M800/M80 high-speed SSS control

Mitsubishi M800/M80 series includes SSS (Super Smooth Surface) control with 540-block look-ahead and automatic spline interpolation. Enable with G05 P10000 (high-speed mode ON) / G05 P0 (OFF). The M850W (MHI machines) adds OMR-FF (Optimum Machine Response - Feed Forward) for even smoother 5-axis motion. Mitsubishi's programming is Fanuc-compatible for basic G-codes but uses proprietary cycles for probing and 5-axis.

**Category:** programming
**Confidence:** 85
**Source:** controller:mitsubishi_m800_guide

## Related
- [[wedm-knowledge-tips-jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]]
- [[wedm-knowledge-tips-jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]]
- [[mastercam-cam-tips-mc-249|High-speed machine mode enables arc transitions and feed optimization for HSM-capable CNC controls]]
- [[wedm-knowledge-tips-wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]]
- [[wedm-knowledge-tips-wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]]
