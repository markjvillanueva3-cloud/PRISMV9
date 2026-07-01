---
name: tribal-ctrl-105
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "haas", "G12", "G13", "circular-pocket", "conversational"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-105.md
promoted_at: 2026-06-09T22:31:16.157Z
---

# Haas G12/G13 circular pocket milling — CW/CCW without CAM

G12 (clockwise) and G13 (counterclockwise) are Haas-specific G-codes for circular pocket milling directly in the control without CAM. Parameters: I (first radius/stepover), J (second radius for taper), K (depth per pass), L (number of passes), D (cutter comp register), Q (start position offset). These are perfect for O-ring grooves, circular bosses, and simple round pockets. GOTCHA: the tool must be positioned at the pocket center before calling G12/G13 — the cycle machines outward from center. Combine with G12/G13 for roughing then a final spring pass at full depth for finishing.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-089|Haas G150 general pocket milling — mini-CAM in G-code]]
- [[controller-knowledge-tips-ctrl-070|ShopMill/ShopTurn Conversational Programming]]
- [[controller-knowledge-tips-ctrl-088|Haas G187 accuracy/speed control for HSM]]
- [[controller-knowledge-tips-ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]]
- [[controller-knowledge-tips-ctrl-091|Haas probing setup requirements and WIPS integration]]
