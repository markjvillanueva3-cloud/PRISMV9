---
name: tribal-wedm-jmd-001
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "h175", "offset", "mastercam", "mitsubishi", "fa-10s", "trim", "die-work"]
confidence: 97
source: "jm_die_programs"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-jmd-001.md
promoted_at: 2026-05-26T16:07:21.225Z
---

# H175 master offset: global trim variable for JM Die Mitsubishi FA-10S

JM Die uses a shop-standard H175 variable as a global master trim offset applied to ALL wire compensation H-registers. The header pattern is: 'H175 = 0.0000' followed by 'H1 = 0.0085 + H175', 'H2 = 0.0064 + H175', etc. This means the operator can adjust ALL pass offsets simultaneously by setting a single value at the machine control — for example, H175 = -0.0002 trims 0.0002 in off every pass without editing individual H values. This is critical for die work where a ±0.0001" adjustment at the machine must propagate to all 4 skim passes. Do NOT hardcode H1=0.0085 without the H175 addend — the operator has no way to trim the part at the machine. Programs without this pattern lock the operator out of fine-tuning.

**Category:** programming
**Confidence:** 97
**Source:** jm_die_programs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]]
- [[wedm-knowledge-tips-wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]]
