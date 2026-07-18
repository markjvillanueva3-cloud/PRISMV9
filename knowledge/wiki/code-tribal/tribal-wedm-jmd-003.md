---
name: tribal-wedm-jmd-003
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "adaptive-control", "m90", "m91", "mitsubishi", "fa-10s", "rough", "skim"]
confidence: 95
source: "jm_die_programs"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-jmd-003.md
promoted_at: 2026-05-26T16:07:21.229Z
---

# Adaptive control M90 only on rough pass — disable M91 for skims

On the Mitsubishi FA-10S at JM Die, Adaptive Control (M90 = on, M91 = off) is used ONLY during the rough cut (Pass 1). The program structure observed in all production programs: M91 (disable AC) is called at program start before threading, M90 (enable AC) is called immediately after the Pass 1 E-code, and subsequent skim passes run without any M90/M91 call — meaning they inherit M91 (off) state. Adaptive control during skimming introduces servo hunting because the low power skim discharge looks like a near-short to the AC algorithm. Running skims with AC on degrades Ra by 10-15% and causes dimensional scatter. Always structure programs: M91 → thread → M90 with E-code Pass 1 → (skims run without M90).

**Category:** programming
**Confidence:** 95
**Source:** jm_die_programs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]]
- [[wedm-knowledge-tips-wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]]
- [[wedm-knowledge-tips-wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]]
- [[wedm-knowledge-tips-wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
