---
name: tribal-ctrl-092
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "mazak", "MAZATROL", "conversational", "EIA-ISO", "M11-gotcha"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-092.md
promoted_at: 2026-06-09T22:31:16.154Z
---

# MAZATROL conversational vs EIA/ISO — interoperability

MAZATROL supports both conversational and EIA/ISO (G-code) programming. Key interoperability: a G-code program can call a MAZATROL conversational program as a subroutine, enabling mixed-mode workflows. Use conversational for simple prismatic features, probing, and tool measurement; use EIA/ISO for CAM-posted complex toolpaths. GOTCHA: M11 on Mazak means 'Spindle Tool Unclamp' — on most Fanuc machines it means 'Table Unclamp (4th axis)'. This is a critical safety difference when transferring programs. G53.5 (MAZATROL coordinate system) avoids work offset conflicts in conversational programs.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-026|Mazak MAZATROL Smooth conversational vs EIA/ISO]]
- [[controller-knowledge-tips-ctrl-070|ShopMill/ShopTurn Conversational Programming]]
- [[controller-knowledge-tips-ctrl-089|Haas G150 general pocket milling — mini-CAM in G-code]]
- [[controller-knowledge-tips-ctrl-093|MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing]]
- [[controller-knowledge-tips-ctrl-094|MAZATROL M-code and G-code documentation is buried — search tips]]
