---
name: tribal-ctrl-071
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "tool-management", "magazine", "multi-spindle", "tool-life", "sister-tool"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-071.md
promoted_at: 2026-06-09T22:31:16.148Z
---

# SINUMERIK Tool Management System

SINUMERIK 840D sl and ONE feature a comprehensive tool management system stored in the NCK TO (Tool Offset) area. Key commands: T<number> prepares tool (moves magazine to position); M6 executes tool change; D<number> selects cutting edge offset (D1 default, supports multiple edges per tool). Tool data system variables: $TC_DP1-$TC_DP25 (geometry: type, length, radius, wear); $TC_TP1-$TC_TP11 (tool properties: name, type, status, monitoring). Magazine commands: POSM (position magazine), POSMT (position multitool to specific location), MVTOOL (move tool between locations). Multitool support for gang-type and turret machines via $TC_MTP and $TC_MTPP data. Tool monitoring features: tool life ($TC_TP8 remaining time), piece count ($TC_TP9), wear limits with automatic sister tool switchover. SETMS(n) selects master spindle for multi-spindle machines. The 828D has simplified tool management without full magazine management functions. Critical for post-processors: DMG MORI machines typically use T=<number> (flat tool numbering) or T<magazine>.<location> syntax depending on configuration. Always verify the tool call convention with the specific machine's PLC program.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
