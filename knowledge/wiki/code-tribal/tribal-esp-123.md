---
name: tribal-esp-123
category: code-tribal
subdomain: simulation
domain: tribal-knowledge
tags: ["esprit-edge", "digital-twin", "mtconnect", "remote-monitoring", "opc-ua"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-123.md
promoted_at: 2026-06-09T22:31:16.241Z
---

# ESPRIT Edge Digital Twin Streaming for Remote Monitoring

ESPRIT Edge connects to machine tool controllers (Fanuc, Siemens, Heidenhain via MTConnect/OPC-UA) to stream real-time axis positions, spindle load, and feed overrides back to the ESPRIT digital twin. Enable under Edge → Machine Connections → Add Controller. The digital twin overlays actual vs. programmed positions, highlighting deviations > 0.01mm. Programmers can monitor job progress remotely and receive alerts when spindle load exceeds the threshold set during simulation.

**Category:** simulation
**Confidence:** 0.78
**Source:** web:esprit-docs

## Related
- [[edgecam-cam-tips-ec-206|Digital Twin Bi-Directional Data Flow Setup]]
- [[topsolid-cam-tips-ts-191|TopSolid Digital Twin — Virtual Machine Replicating Physical State]]
- [[camworks-cam-tips-cw-184|Digital Twin of CNC Process — Real-Time Model Synchronization]]
- [[edgecam-cam-tips-ec-207|Digital Twin Tool Life Feedback Loop]]
- [[esprit-cam-tips-esp-202|Digital Twin Synchronization for Program Validation]]
