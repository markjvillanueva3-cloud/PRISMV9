---
name: tribal-ctrl-048
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["traub", "index-traub", "swiss-lathe", "v8", "siemens-based"]
confidence: 80
source: "controller:traub_tx8i_manual"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-048.md
promoted_at: 2026-06-09T22:31:16.143Z
---

# Traub TX8i-s V8 swiss lathe programming

Traub (now INDEX-Traub) swiss lathes use the TX8i-s V8 controller (SINUMERIK-based). Programming combines Siemens G-code with Traub-specific cycles for swiss lathe operations: CYCLE_PART_OFF (cutoff with synchronization), CYCLE_BACKWORK (sub-spindle back-working), and guidebushing compensation. The V8 interface includes a graphical setup screen with 3D simulation of bar stock and turret positions.

**Category:** programming
**Confidence:** 80
**Source:** controller:traub_tx8i_manual

## Related
- [[controller-knowledge-tips-ctrl-121|Index/Traub virtual machine for collision-free multi-spindle setup]]
- [[controller-knowledge-tips-ctrl-037|Citizen Cincom Swiss lathe guide bushing programming]]
- [[controller-knowledge-tips-ctrl-038|Swiss lathe synchronization between spindles]]
- [[controller-knowledge-tips-ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]]
- [[controller-knowledge-tips-ctrl-107|Citizen detachable guide bushing and programming impact]]
