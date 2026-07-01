---
name: tribal-wedm-jmd-002
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "m78", "tank-fill", "mitsubishi", "fa-10s", "awt", "m-code"]
confidence: 98
source: "jm_die_programs"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-jmd-002.md
promoted_at: 2026-05-26T16:07:21.227Z
---

# Always use double M78 M78 for tank fill on Mitsubishi FA-10S

On the Mitsubishi FA-10S at JM Die, the Fill Tank command M78 is ALWAYS issued twice in succession (M78 M78) before every cut restart. This is not a typo — a single M78 starts the pump but the FA-10S requires a second M78 to confirm and hold the fill state during re-threading. The double command appears in every production program analyzed (ITW SHAKEPROOF, NOZE TEST, CHOCTAW DEFENSE cannelure) — 100% consistency. Writing only a single M78 causes intermittent 'insufficient fluid' alarms during AWT (Automatic Wire Threading) because the machine checks tank level mid-thread. Always write 'M78 M78' as a unit.

**Category:** programming
**Confidence:** 98
**Source:** jm_die_programs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]]
- [[wedm-knowledge-tips-wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]]
- [[wedm-knowledge-tips-wedm-jmd-003|Adaptive control M90 only on rough pass — disable M91 for skims]]
- [[wedm-knowledge-tips-wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
