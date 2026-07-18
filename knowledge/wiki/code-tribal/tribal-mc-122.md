---
name: tribal-mc-122
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "auto-threading", "AWT", "lights-out", "start-hole"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-122.md
promoted_at: 2026-06-09T22:31:16.425Z
---

# Automatic wire threading sequences enable unattended wire EDM operation

Program automatic wire threading (AWT) sequences in Mastercam Wire to enable lights-out operation. Each cut segment begins with the wire threading through a pre-drilled start hole, and the AWT system feeds the wire through the guides, flushes it through the hole, and re-threads automatically. Key settings: thread hole diameter must be at least 1.5× wire diameter (typically 0.3 mm hole for 0.25 mm wire), threading speed should be reduced to 50% for deep start holes (>50 mm), and a short test cut after threading verifies the wire is properly seated. For multi-opening dies, program all slugs in sequence with AWT between each — this enables overnight cutting of complex die plates with 20+ openings.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** wire_edm, automation

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[bobcad-cam-tips-bc-160|BobCAD Wire EDM Automatic Wire Threading Point Optimization]]
