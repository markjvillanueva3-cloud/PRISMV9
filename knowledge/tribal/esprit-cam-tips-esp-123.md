---
id: "esp-123"
title: "ESPRIT Edge Digital Twin Streaming for Remote Monitoring"
source: "web:esprit-docs"
confidence: 0.78
category: "simulation"
tags: ["esprit-edge", "digital-twin", "mtconnect", "remote-monitoring", "opc-ua"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.552Z
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
