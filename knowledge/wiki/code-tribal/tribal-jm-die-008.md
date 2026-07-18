---
name: tribal-jm-die-008
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "a2", "tool-steel", "punch", "die-shoe", "feed-rate", "rust", "oxidation"]
confidence: 90
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-008.md
promoted_at: 2026-05-26T16:07:21.206Z
---

# JM Die A2 tool steel — slightly faster than D2, same offset cascade

A2 tool steel (1.0%C, 5%Cr, 1%Mo) cuts 10-15% faster than D2 on wire EDM due to lower chromium content reducing electrical resistance. At JM Die, A2 is used for larger punches and die shoes where toughness matters more than wear resistance. Use the same E12xx sequences and H-register offsets as D2, but feed rate can be increased — E1221 runs at ~2.3 in/min on 1" A2 vs 2.0 in/min on D2. The HAZ on A2 is slightly smaller, but still run 3+ skim passes. A2 is more prone to rust in the dielectric tank — run finish skims within 24 hours of roughing to avoid surface oxidation between passes.

**Category:** machining
**Confidence:** 90
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]]
- [[wedm-knowledge-tips-jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]]
- [[wedm-knowledge-tips-jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]]
- [[wedm-knowledge-tips-jm-die-011|JM Die H13 hot work steel — reduce power 20% for large dies to prevent cracking]]
- [[wedm-knowledge-tips-jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]]
