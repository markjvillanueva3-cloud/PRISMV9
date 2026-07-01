---
name: tribal-ctrl-070
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "ShopMill", "ShopTurn", "conversational", "programming", "shop-floor"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-070.md
promoted_at: 2026-06-09T22:31:16.148Z
---

# ShopMill/ShopTurn Conversational Programming

ShopMill (milling) and ShopTurn (turning) are Siemens' built-in conversational programming interfaces within SINUMERIK Operate, enabling shop-floor part programming without G-code knowledge. Programs are created by selecting operations from graphical menus and filling in parameter forms with animated tool tips and dynamic graphics. Key features: (1) Full cycle library including drilling, pocketing, contouring, thread milling, and pattern operations; (2) Inline simulation with 3D workpiece visualization before running; (3) Mix-and-match capability to combine conversational blocks with G-code blocks in the same program; (4) Contour calculator for direct geometry definition with automatic intersection calculation; (5) Technology database for automatic feed/speed recommendations; (6) Position patterns (linear, grid, circular) with ability to hide selected positions. ShopMill/ShopTurn programs are stored as standard .MPF files and are fully editable in G-code mode. Available on all SINUMERIK platforms (828D, 840D sl, ONE). Particularly valuable for one-off parts, prototype work, and simple production jobs where CAM programming overhead is not justified. Training tip: SinuTrain PC software provides identical ShopMill/ShopTurn interface for offline training.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-074|Compile Cycles and OEM Custom Cycle Development]]
- [[controller-knowledge-tips-ctrl-075|SINUMERIK Unique G-Codes Beyond ISO Standard]]
- [[controller-knowledge-tips-ctrl-014|Siemens ShopMill conversational vs G-code programming]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
