---
name: tribal-jm-die-011
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "h13", "hot-work", "tool-steel", "hot-heading", "extrusion", "thermal-shock", "delayed-crack"]
confidence: 87
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-011.md
promoted_at: 2026-06-09T22:31:16.785Z
---

# JM Die H13 hot work steel — reduce power 20% for large dies to prevent cracking

H13 hot work tool steel (0.4%C, 5%Cr, 1.3%Mo, 1%V) at 44-52 HRC is used at JM Die for hot heading dies and aluminum extrusion tooling. H13's lower carbon content and lower hardness make it more sensitive to thermal shock than the cold work steels. For wire EDM on FA-20S: reduce E1221 power to 80%, increase OFF time 20%, and consider using the E952 ACU (Adaptive Control Unit) mode for large cavities. H13 is also prone to delayed cracking — inspect parts 24-48 hours after wire EDM, not immediately. For H13 thicker than 3", consider stress relief (1050°F for 2 hours) before wire EDM.

**Category:** machining
**Confidence:** 87
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]]
- [[wedm-knowledge-tips-jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]]
- [[wedm-knowledge-tips-jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]]
- [[wedm-knowledge-tips-jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
