---
name: tribal-ctrl-064
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "turning-vs-milling", "G-code-conflicts", "safety", "programming"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-064.md
promoted_at: 2026-06-09T22:31:16.146Z
---

# Fanuc turning vs milling controller G-code conflicts

Several G-codes have DIFFERENT meanings on Fanuc turning (0i-TF) vs milling (0i-MF) controllers — a critical source of programming errors. G73: Milling = high-speed peck drilling; Turning = pattern repeating cycle. G74: Milling = LH tapping; Turning = face peck drilling/grooving. G75: Not standard on milling; Turning = OD/ID grooving cycle. G76: Milling = fine boring; Turning = multi-pass threading cycle. G90: Milling = absolute positioning mode; Turning = single-pass turning cycle (absolute/incremental is handled differently). G92: Milling = work coordinate preset; Turning = threading cycle. G94: Milling = feed per minute mode; Turning = facing cycle. When switching between mill and lathe programming, always verify G-code meaning against the specific control type. Mill-turn machines with both turret and milling spindle use path-specific G-code interpretation.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-058|Fanuc Dual Check Safety (DCS) system]]
- [[controller-knowledge-tips-ctrl-059|Fanuc system variables for alarms and program control]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
