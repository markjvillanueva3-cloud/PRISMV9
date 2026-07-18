---
name: tribal-ctrl-026
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["mazak", "mazatrol", "smooth", "conversational", "eia-iso"]
confidence: 88
source: "controller:mazak_programming_guide"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-026.md
promoted_at: 2026-06-09T22:31:16.138Z
---

# Mazak MAZATROL Smooth conversational vs EIA/ISO

MAZATROL SmoothAi/X/G support dual programming: MAZATROL conversational and EIA/ISO G-code. MAZATROL programs are proprietary binary — cannot be edited outside the control. For CAM work, always use EIA/ISO mode. Key difference from Fanuc: Mazak's G-code dialect uses G43.4 for RTCP but stores kinematic data differently. Post-processors must use Mazak-specific format, not generic Fanuc.

**Category:** programming
**Confidence:** 88
**Source:** controller:mazak_programming_guide

## Related
- [[controller-knowledge-tips-ctrl-092|MAZATROL conversational vs EIA/ISO — interoperability]]
- [[controller-knowledge-tips-ctrl-027|Mazak SmoothAi AI-powered machining features]]
- [[controller-knowledge-tips-ctrl-028|Mazak turning center C-axis and milling M-codes]]
- [[controller-knowledge-tips-ctrl-093|MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing]]
- [[controller-knowledge-tips-ctrl-094|MAZATROL M-code and G-code documentation is buried — search tips]]
