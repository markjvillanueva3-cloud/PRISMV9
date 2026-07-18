---
name: tribal-wedm-jmd-008
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["wire-edm", "defense", "ammo", "cannelure", "e12xx", "e1281", "rough-feed", "thread", "closely-spaced"]
confidence: 92
source: "jm_die_programs"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-jmd-008.md
promoted_at: 2026-05-26T16:07:21.250Z
---

# Defense/ammo tooling: use E12xx heavy 5-pass with F0.06 rough feed for thread form integrity

JM Die's programs for defense and ammunition tooling (Choctaw Defense cannelure, Fiocchi .38-caliber dies, dated 2016) consistently use the E12xx heavy 5-pass family (E1281-E1285) with a very slow rough feed of F0.06 ipm (1.52 mm/min) — half the standard F0.12 rough feed. The 5 H-register offsets are: H1=0.00995, H2=0.00725, H3=0.00585, H4=0.00535, H5=0.0052 (all + H175). The slow rough pass is mandatory because the thread/cannelure profile has closely-spaced features (~0.033" pitch) where debris from one groove can short the discharge into the adjacent groove. At normal F0.12 rough speed, secondary discharge destroys thread root geometry. For any WEDM work with features spaced closer than 3× the wire diameter, reduce rough feed to F0.06 and increase to standard speed only after Pass 2 clears the initial recast.

**Category:** speeds_feeds
**Confidence:** 92
**Source:** jm_die_programs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-jmd-007|Cannelure/thread WEDM: alternate G2/G3 arcs with G1 flanks for thread form]]
- [[wedm-knowledge-tips-jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]]
- [[wedm-knowledge-tips-wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
