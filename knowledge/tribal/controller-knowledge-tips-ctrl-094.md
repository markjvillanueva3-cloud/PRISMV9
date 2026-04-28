---
id: "ctrl-094"
title: "MAZATROL M-code and G-code documentation is buried — search tips"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "mazak", "M-codes", "documentation", "reference"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.226Z
---

# MAZATROL M-code and G-code documentation is buried — search tips

Mazak typically buries their G/M-code reference tables deep in the middle of programming manuals, NOT in the table of contents or index. You must search through the manual to find them. Key Mazak-specific M-codes: M20-M29 for robot integration, M11 for spindle tool unclamp (NOT table unclamp like Fanuc). MAZATROL G-codes are Fanuc-compatible for standard codes (G00-G04, G17-G19, G28, G40-G43, G54-G59, G80-G89) but machine-specific M-codes are heavily customized. Always request the specific machine's M-code list from the dealer at purchase time.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-057|Fanuc coolant M-codes including through-spindle]]
- [[controller-knowledge-tips-ctrl-092|MAZATROL conversational vs EIA/ISO — interoperability]]
- [[controller-knowledge-tips-ctrl-093|MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
