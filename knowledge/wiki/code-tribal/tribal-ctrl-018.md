---
name: tribal-ctrl-018
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["heidenhain", "tnc640", "klartext", "conversational", "programming"]
confidence: 92
source: "controller:heidenhain_klartext_guide"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-018.md
promoted_at: 2026-05-26T16:07:20.122Z
---

# Heidenhain TNC 640 conversational programming (Klartext)

The TNC 640 uses Heidenhain's unique Klartext (plain text) programming language — NOT standard G-code. Commands are descriptive: L X+100 Y+50 F500 (linear move), CC X+0 Y+0 (circle center), C X+50 Y+0 DR+ (clockwise arc). While it supports ISO G-code mode (G0, G1, etc.), Klartext is more powerful for manual programming. CAM post-processors for Hermle and Kern typically output Klartext, not ISO.

**Category:** programming
**Confidence:** 92
**Source:** controller:heidenhain_klartext_guide

## Related
- [[controller-knowledge-tips-ctrl-019|Heidenhain TCPM (tool center point management) for 5-axis]]
- [[controller-knowledge-tips-ctrl-086|Heidenhain Klartext vs ISO programming — when to use which]]
- [[controller-knowledge-tips-ctrl-070|ShopMill/ShopTurn Conversational Programming]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-020|Heidenhain Dynamic Efficiency for adaptive feed]]
