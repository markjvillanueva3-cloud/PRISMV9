---
name: tribal-mc-093
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["mastercam", "proximity-alert", "near-miss", "clearance", "thermal-expansion", "safety"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-093.md
promoted_at: 2026-06-09T22:31:16.418Z
---

# Collision detection proximity alerts catch near-misses before they become crashes

Configure Proximity Alert distance in Mastercam Verify/Machine Simulation to 1-3 mm. This flags any moment where the tool, holder, or machine component passes within the proximity zone of any other component — even if no actual collision occurs. Near-misses with < 2 mm clearance are dangerous because thermal expansion, tool runout, or fixture deflection can close that gap during actual machining. Log all proximity events and increase clearance in the toolpath linking or tool axis control.

**Category:** quality
**Confidence:** 85
**Source:** web:community
**Operations:** verification

## Related
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
- [[mastercam-cam-tips-mc-187|Computer compensation calculates all tool offsets in Mastercam with no G41/G42 output]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[catia-cam-tips-cat-053|Collision Detection Clearance Margins for Safety]]
