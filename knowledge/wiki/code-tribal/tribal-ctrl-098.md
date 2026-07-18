---
name: tribal-ctrl-098
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "okuma", "machining-navi", "chatter", "vibration", "spindle-speed"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-098.md
promoted_at: 2026-06-09T22:31:16.155Z
---

# Okuma Machining Navi for automatic chatter suppression

Machining Navi uses built-in sensors and the OSP control to detect chatter vibration in real-time and recommend or automatically select optimal spindle speeds to avoid resonance. Two modes: M-Navi L-g (lathe, auto-adjust) and M-Navi M-g (mill, guidance display showing stability lobes). On milling machines, it displays a stability lobe diagram and highlights current speed vs optimal speed. The operator can accept the recommendation with one button press. Critical for: deep pocket milling, slender tool extensions, thin-wall machining. Does NOT replace proper toolholding/setup but adds a safety net against harmonic chatter.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-031|Okuma OSP Super-NURBS for smooth 5-axis]]
- [[controller-knowledge-tips-ctrl-095|Okuma OSP Thermo-Friendly Concept — skip warm-up cycles]]
- [[controller-knowledge-tips-ctrl-096|Okuma Collision Avoidance System (CAS) — real-time 3D protection]]
- [[controller-knowledge-tips-ctrl-097|Okuma Super-NURBS for high-speed curved surface machining]]
- [[cimatron-cam-tips-cim-107|Stochastic Chatter Probability Mapping]]
