---
name: tribal-sc2-060
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "auto-threading", "broken-wire", "recovery", "start-hole"]
confidence: 87
source: "web:surfcam-wire-edm-threading"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-060.md
promoted_at: 2026-06-09T22:31:16.674Z
---

# Automatic Wire Threading with Broken-Wire Recovery

SURFCAM programs automatic wire threading (AWT) sequences at each start hole and after wire breaks. The AWT sequence includes: wire cut, upper guide retract, wire feed through start hole, lower guide close, tension apply, test cut. For reliable AWT, start holes should be 0.3-0.5mm larger than the wire diameter and reamed (not just drilled) for consistent roundness. Program a broken-wire recovery strategy that retracts 5mm from the break point and re-threads.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:surfcam-wire-edm-threading
**Operations:** wire_edm

## Related
- [[esprit-cam-tips-esp-159|Wire EDM Multi-Pass Threading for Broken Wire Recovery]]
- [[mastercam-cam-tips-mc-122|Automatic wire threading sequences enable unattended wire EDM operation]]
- [[bobcad-cam-tips-bc-155|BobCAD Wire EDM No-Core Cutting Strategy]]
- [[bobcad-cam-tips-bc-160|BobCAD Wire EDM Automatic Wire Threading Point Optimization]]
- [[camworks-cam-tips-cw-162|Wire EDM Auto-Threading and Recovery — Unattended Operation]]
