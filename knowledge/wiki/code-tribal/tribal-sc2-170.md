---
name: tribal-sc2-170
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "adaptive-control", "spark-gap", "technology-tables", "closed-loop"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-170.md
promoted_at: 2026-06-09T22:31:16.697Z
---

# SURFCAM Wire EDM Closed-Loop Adaptive Control Integration

Modern wire EDM machines use closed-loop adaptive control to adjust power, feed, and flushing in real-time based on spark gap voltage. SURFCAM's technology tables define the baseline parameters, but the machine's adaptive control modifies them dynamically. When creating SURFCAM technology tables, set parameters 5-10% conservative of the machine's maximum capability to give the adaptive system headroom for adjustment. Overly aggressive baseline settings leave no room for the control to increase power when encountering thicker cross-sections.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-156|BobCAD Wire EDM Multi-Pass Technology Table Management]]
- [[wedm-knowledge-tips-wedm-jmd-003|Adaptive control M90 only on rough pass — disable M91 for skims]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
