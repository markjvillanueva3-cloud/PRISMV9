---
name: tribal-jm-die-014
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "m90", "m91", "adaptive-servo", "asc", "mitsubishi", "fa-20s", "feed-rate"]
confidence: 91
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-014.md
promoted_at: 2026-05-26T16:07:21.212Z
---

# JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim

The Mitsubishi FA-20S M90 command activates adaptive servo control (ASC), which dynamically adjusts feed rate based on spark gap stability. JM Die standard practice: M90 ON for rough cut (E1221 or E1281), first skim (E1222), and second skim (E1223). M90 OFF (M91) for final skim passes (E1224, E1225) where consistent feed rate produces better Ra. The ASC is essential for variable-thickness parts where material removal rate changes — without M90, the rough cut may undercut in thin sections or wire-break in thick sections. For uniform thickness parts, M90 is less critical but still recommended for rough and first skim.

**Category:** machining
**Confidence:** 91
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-jmd-003|Adaptive control M90 only on rough pass — disable M91 for skims]]
- [[wedm-knowledge-tips-jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]]
- [[wedm-knowledge-tips-jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]]
