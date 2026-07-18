---
name: tribal-ctrl-014
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["siemens", "shopmill", "conversational", "programming-mode"]
confidence: 85
source: "controller:siemens_shopmill_guide"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-014.md
promoted_at: 2026-06-09T22:31:16.135Z
---

# Siemens ShopMill conversational vs G-code programming

SINUMERIK 840D sl supports dual programming modes: ShopMill (graphical/conversational) and G-code (DIN/ISO). ShopMill programs can be converted to G-code but NOT vice versa. For production, use G-code from CAM. For prototypes and simple parts, ShopMill is faster — it auto-generates safe approach/retract moves and handles tool changes. Mixed-mode programs (ShopMill cycles within G-code) work but are not recommended.

**Category:** programming
**Confidence:** 85
**Source:** controller:siemens_shopmill_guide

## Related
- [[controller-knowledge-tips-ctrl-070|ShopMill/ShopTurn Conversational Programming]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-011|Siemens CYCLE832 high-speed machining settings]]
- [[controller-knowledge-tips-ctrl-012|Siemens TRAORI for 5-axis transformation]]
