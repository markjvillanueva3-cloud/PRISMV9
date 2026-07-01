---
name: tribal-ctrl-095
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "okuma", "thermal", "TAS", "warm-up", "accuracy"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-095.md
promoted_at: 2026-06-09T22:31:16.154Z
---

# Okuma OSP Thermo-Friendly Concept — skip warm-up cycles

Okuma's Thermo-Friendly Concept combines machine design (symmetric thermal growth paths) with TAS (Thermal Active Stabilizer) software: TAS-S for spindle and TAS-C for structure. The system compensates for thermal deformation in real-time, eliminating the need for traditional machine warm-up cycles. Dimensional stability is maintained even during 8+ hour unattended runs with varying ambient temperatures. This means: (1) No need for warm-up programs at shift start; (2) First part accuracy equals tenth-part accuracy; (3) Weekend restart doesn't require settling time. Verify TAS is enabled in OSP parameters — some shops accidentally disable it.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-030|Okuma Thermo-Friendly Concept for thermal stability]]
- [[controller-knowledge-tips-ctrl-088|Haas G187 accuracy/speed control for HSM]]
- [[controller-knowledge-tips-ctrl-096|Okuma Collision Avoidance System (CAS) — real-time 3D protection]]
- [[controller-knowledge-tips-ctrl-097|Okuma Super-NURBS for high-speed curved surface machining]]
- [[controller-knowledge-tips-ctrl-098|Okuma Machining Navi for automatic chatter suppression]]
