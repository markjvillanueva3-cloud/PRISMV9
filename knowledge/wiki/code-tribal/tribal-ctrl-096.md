---
name: tribal-ctrl-096
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "okuma", "CAS", "collision-avoidance", "safety", "3D-model"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-096.md
promoted_at: 2026-06-09T22:31:16.155Z
---

# Okuma Collision Avoidance System (CAS) — real-time 3D protection

Okuma CAS creates a real-time 3D virtual machine running milliseconds ahead of actual motion. It detects pending collisions and stops the machine before impact. CAS works in ALL modes: auto, MDI, manual jog, and handwheel. Setup requirements: accurate 3D models of tooling, holders, fixtures, and workpiece blank must be defined in the control. GOTCHA: CAS only protects against what it knows — if fixture or workpiece models are incomplete, collisions with undefined geometry will NOT be caught. Update the workpiece model as material is removed (or use a conservative bounding box). CAS adds minimal processing overhead (<2% cycle time increase).

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-083|TNC 640 Dynamic Collision Monitoring (DCM)]]
- [[controller-knowledge-tips-ctrl-058|Fanuc Dual Check Safety (DCS) system]]
- [[controller-knowledge-tips-ctrl-064|Fanuc turning vs milling controller G-code conflicts]]
- [[controller-knowledge-tips-ctrl-072|Safety Integrated: SOS, SLS, SS1, SSM Functions]]
- [[controller-knowledge-tips-ctrl-095|Okuma OSP Thermo-Friendly Concept — skip warm-up cycles]]
