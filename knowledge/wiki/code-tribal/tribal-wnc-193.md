---
name: tribal-wnc-193
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["digital-twin", "oee", "dashboard", "production", "visibility"]
confidence: 85
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-193.md
promoted_at: 2026-06-09T22:31:16.829Z
---

# Digital Twin OEE Dashboard — Production Visibility from CAM Data

Build an OEE (Overall Equipment Effectiveness) dashboard combining WorkNC CAM data with machine monitoring: Availability = actual running / planned running (target > 90%), Performance = actual cycle time / WorkNC predicted cycle time (target > 95%), Quality = first-pass accept / total parts (target > 99%). OEE = A × P × Q. Typical mold shop OEE is 40-55%; world-class is 85%+. The dashboard identifies the dominant loss: low Availability → reduce setup time, low Performance → optimize WorkNC programs, low Quality → improve process control. Use WorkNC's cycle time estimates as the Performance denominator for consistent measurement across machines.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:worknc-docs
**Operations:** general

## Related
- [[edgecam-cam-tips-ec-209|Digital Twin Process Monitoring Dashboard]]
- [[bobcad-cam-tips-bc-213|BobCAD Digital Twin Integration via NC Code Feedback Loop]]
- [[bobcad-cam-tips-bc-214|BobCAD Process Digital Twin for Predictive Tool Management]]
- [[bobcad-cam-tips-bc-215|Thermal Compensation Feedback from Digital Twin to BobCAD]]
- [[bobcad-cam-tips-bc-216|BobCAD Stock Model Export for Digital Twin Initialization]]
