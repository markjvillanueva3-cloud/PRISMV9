---
name: tribal-sc2-203
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["probing", "wcs-alignment", "datum", "renishaw", "in-process"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-203.md
promoted_at: 2026-06-09T22:31:16.704Z
---

# SURFCAM In-Process Probing for WCS Alignment

SURFCAM supports in-process probing cycles that measure part features and update work coordinate systems (WCS) before machining. Program a probing sequence at the start of each setup: probe 3 points on a datum face for Z, probe 2 points on an edge for X-axis alignment, and probe 1 point for Y reference. The post processor outputs the probe moves and the macro calls for the specific probe system (Renishaw, Blum, Heidenhain). Set probe approach feed to 500-1000 mm/min and the measurement feed to 50-100 mm/min for repeatable results.

**Category:** setup
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** probing

## Related
- [[mastercam-cam-tips-mc-108|Part probing with Renishaw Productivity+ sets WCS from measured features]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[controller-knowledge-tips-ctrl-050|Universal probing compatibility across controllers]]
- [[controller-knowledge-tips-ctrl-091|Haas probing setup requirements and WIPS integration]]
- [[edgecam-cam-tips-ec-109|Setup Probing for Automatic Work Offset]]
