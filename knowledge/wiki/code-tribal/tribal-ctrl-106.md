---
name: tribal-ctrl-106
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "citizen", "swiss-lathe", "LFV", "chip-breaking", "vibration-cutting"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-106.md
promoted_at: 2026-06-09T22:31:16.157Z
---

# Citizen LFV low-frequency vibration cutting G-code control

Citizen's LFV (Low Frequency Vibration) technology is a game-changer for swiss lathe chip control. It vibrates servo axes in sync with spindle rotation, creating intermittent 'air-cutting' gaps that break chips into small pieces. Programming is simple: insert two G-code lines (LFV ON/OFF) into existing NC programs. Three LFV modes available: Mode 1 for OD/ID turning and grooving, Mode 2 for micro-drilling at high surface speeds, Mode 3 for vibration-free thread cutting. LFV reduces tool wear, heat generation, and power consumption. It transforms machining of stringy materials (stainless, copper, plastics) that normally wrap around the guide bushing. Adjust vibration frequency and amplitude via simple variable changes in one program line.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[esprit-cam-tips-esp-137|Swiss-Type Low-Frequency Vibration Cutting for Chip Breaking]]
- [[controller-knowledge-tips-ctrl-107|Citizen detachable guide bushing and programming impact]]
- [[controller-knowledge-tips-ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]]
- [[controller-knowledge-tips-ctrl-116|Tsugami opposed gang tool swiss lathe with Fanuc 32i-B]]
- [[controller-knowledge-tips-ctrl-037|Citizen Cincom Swiss lathe guide bushing programming]]
