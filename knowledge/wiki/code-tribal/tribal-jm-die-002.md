---
name: tribal-jm-die-002
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "e12xx", "4-pass", "e1221", "e1222", "e1223", "e1224", "punch", "die", "tool-steel"]
confidence: 94
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-002.md
promoted_at: 2026-05-26T16:07:21.196Z
---

# JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224

For standard punch and die profiles in tool steel (D2, A2, S7) at 0.5-2.0" thickness, JM Die uses the E12xx standard 4-pass sequence: E1221 (rough, ~0.004" overcut), E1222 (first skim, ~0.002" stock), E1223 (second skim, ~0.0015" stock), E1224 (final skim, <0.001" stock). This achieves Ra 16-20 µin reliably on the Mitsubishi FA-20S. The E1221 roughing pass runs at ~2.0 in/min on 1" D2 steel. Corresponding H-register offsets: H1=0.0085-0.010", H2=0.0064-0.0073", H3=0.0058-0.0059", H4=0.0053-0.0054". This is the workhorse sequence for 60% of JM Die production.

**Category:** machining
**Confidence:** 94
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]]
- [[wedm-knowledge-tips-jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]]
- [[wedm-knowledge-tips-jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]]
- [[wedm-knowledge-tips-jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]]
- [[wedm-knowledge-tips-jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]]
