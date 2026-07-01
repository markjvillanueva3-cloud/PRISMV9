---
name: tribal-esp-161
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "micro-machining", "fine-wire", "mems", "micro-edm"]
confidence: 0
source: "web:esprit-forum"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-161.md
promoted_at: 2026-06-09T22:31:16.250Z
---

# Wire EDM Micro-Machining for Small Features

For micro-EDM wire cutting (features < 1mm) in ESPRIT, select fine wire (0.05-0.10mm brass or tungsten) and enable micro-EDM technology tables. Reduce pulse energy to 0.1-1.0 microjoules and increase wire tension to prevent wire vibration. ESPRIT adjusts the minimum corner radius to wire diameter + 0.02mm and warns if programmed features are below this limit. For micro-gears, medical stents, and MEMS components, program reduced skim offsets (0.002-0.005mm per pass) and increase the number of skim passes to 6-8 for sub-micron surface finish. Water resistivity should be 5-10 MΩ·cm for micro-EDM.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:esprit-forum
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
