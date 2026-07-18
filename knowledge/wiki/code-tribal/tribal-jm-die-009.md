---
name: tribal-jm-die-009
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "s7", "shock-resistant", "tool-steel", "punch", "thermal-shock", "micro-crack", "haz"]
confidence: 89
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-009.md
promoted_at: 2026-06-09T22:31:16.784Z
---

# JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking

S7 shock-resistant tool steel (0.5%C, 3.25%Cr, 1.4%Mo) is used at JM Die for punches that see impact loading (cold heading, stamping). S7 at 54-58 HRC is more susceptible to thermal shock than D2/A2, leading to subsurface micro-cracks if wire EDM power is too aggressive. On the FA-20S: reduce E1221 power to 85% (vs 100% default), increase OFF time 15%, and use a 4th skim pass even for Ra 20 µin specs. Inspect first article S7 parts with dye penetrant (PT) if micro-cracking is a concern. Signs of excessive HAZ on S7: visible temper colors at cut edge, or surface roughness variation along the cut.

**Category:** machining
**Confidence:** 89
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]]
- [[wedm-knowledge-tips-jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]]
- [[wedm-knowledge-tips-jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]]
- [[wedm-knowledge-tips-jm-die-011|JM Die H13 hot work steel — reduce power 20% for large dies to prevent cracking]]
- [[wedm-knowledge-tips-jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]]
