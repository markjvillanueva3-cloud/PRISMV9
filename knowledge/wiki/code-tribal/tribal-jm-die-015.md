---
name: tribal-jm-die-015
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "mitsubishi", "fa-20s", "m800", "shutdown", "m-code", "m21", "m85", "m83", "m81", "m79", "m02", "m30"]
confidence: 92
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-015.md
promoted_at: 2026-05-26T16:07:21.215Z
---

# JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02

JM Die programs follow the standard Mitsubishi FA shutdown M-code sequence: M21 (cut wire at lower guide), M85 (power supply off), M83 (wire drive off), M81 (water circulation off), M79 (drain tank — optional for short jobs), then M02 or M30 (program end). The M21 wire cut command positions the wire end above the lower guide for easy re-threading. Never skip M85 before M83 — cutting wire drive with power still active can damage the wire feeder. For multi-start hole programs, omit M79 drain until after all profiles are complete. The neural analysis engine flags 'AP007: No program end M02/M30' as a major anti-pattern.

**Category:** setup
**Confidence:** 92
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]]
- [[wedm-knowledge-tips-jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]]
- [[wedm-knowledge-tips-wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]]
