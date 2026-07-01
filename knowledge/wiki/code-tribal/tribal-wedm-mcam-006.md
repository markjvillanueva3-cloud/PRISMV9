---
name: tribal-wedm-mcam-006
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "tech-library", "power-settings", "mastercam", "mitsubishi", "makino", "register"]
confidence: 90
source: "mastercam_wire_tutorial:page13,page45"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-mcam-006.md
promoted_at: 2026-05-26T16:07:21.321Z
---

# TECH library contains machine-specific power sequences up to 24 passes

Mastercam Wire uses TECH libraries (.TECH files) that contain manufacturer-calibrated power settings, feed rates, wire offsets, and register values for specific wire EDM machines. A TECH library can define up to 24 passes for a single material/thickness combination. Example sequences: Rough & 2 Skim(s), Rough & 3 Skim(s), Rough & 4 Skim(s). When loading a TECH library, Mastercam populates all electrical parameters (A, B, C registers), feed rates, and compensation values. Manufacturer-provided TECH libraries (Mitsubishi, Makino, Fanuc) are optimized for that machine's power supply. Always use TECH libraries for production — never manually enter power settings unless you're a Wire EDM specialist.

**Category:** programming
**Confidence:** 90
**Source:** mastercam_wire_tutorial:page13,page45
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]]
