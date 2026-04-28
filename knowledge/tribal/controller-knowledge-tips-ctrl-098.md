---
id: "ctrl-098"
title: "Okuma Machining Navi for automatic chatter suppression"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "okuma", "machining-navi", "chatter", "vibration", "spindle-speed"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.230Z
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
