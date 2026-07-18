---
name: tribal-wedm-jmd-007
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "cannelure", "thread", "arc", "g2", "g3", "defense", "ammo", "die-steel", "fastener"]
confidence: 91
source: "jm_die_programs"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-jmd-007.md
promoted_at: 2026-05-26T16:07:21.247Z
---

# Cannelure/thread WEDM: alternate G2/G3 arcs with G1 flanks for thread form

JM Die uses Wire EDM to cut cannelure grooves and thread profiles in hardened die steels — a specialty technique for ammo/fastener tooling (Choctaw Defense, Fiocchi). The pattern: the thread form is approximated as alternating short G2 (CW arc) and G3 (CCW arc) segments for the thread radius, with G1 linear segments for the thread flanks. For a 30 TPI cannelure at ~0.0333" pitch: G1 flank approach → G2 X... I-.00206 J.00218 (CW arc, ~0.003" radius) → G1 X... (next flank) → G3 X... I0. J.003 (CCW arc back) → repeat. The pass 1 uses G2 for one arc direction, pass 2 reverses to G3 — this alternation prevents residual material on one flank. Key insight: the arc radius (~0.003") is sized to the wire diameter (0.010") plus desired root radius. For defense/aerospace customers this technique eliminates hand-finishing of thread roots.

**Category:** machining
**Confidence:** 91
**Source:** jm_die_programs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-jmd-008|Defense/ammo tooling: use E12xx heavy 5-pass with F0.06 rough feed for thread form integrity]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-kb-020|UV taper only on G1 lines — G2/G3 arcs are straight]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
