---
name: tribal-jm-die-005
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "mitsubishi", "fa-20s", "m800", "startup", "m-code", "m78", "m80", "m82", "m84", "m20"]
confidence: 93
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-005.md
promoted_at: 2026-05-26T16:07:21.203Z
---

# JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20

JM Die programs follow the standard Mitsubishi FA startup M-code sequence: M78 (fill tank), M80 (water circulation on), M82 (wire drive on), M84 (power supply on), then M20 (thread wire through start hole). After M20, move to first approach point (G0), then engage M90 (adaptive control) before the first cut (G1). Do NOT skip M78 — even though the tank may already be full from the previous job, M78 confirms fill level and opens the correct valves. Skipping M78 on the FA-20S can cause improper flushing nozzle engagement.

**Category:** setup
**Confidence:** 93
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]]
- [[wedm-knowledge-tips-wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]]
- [[wedm-knowledge-tips-jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]]
