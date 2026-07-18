---
name: tribal-mc-172
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "micro-machining", "runout", "compensation", "small-tool", "tir"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-172.md
promoted_at: 2026-06-09T22:31:16.437Z
---

# Small tool compensation in Mastercam must account for tool runout exceeding 10% of feature size

In micro machining with tools under 1 mm diameter, spindle runout (TIR) becomes a significant fraction of the cutting engagement. If runout is 5 µm and the tool diameter is 0.5 mm, that represents 1% of diameter but can be 10–20% of the radial depth of cut. In Mastercam, compensate by: (1) reducing the programmed step-over by the measured runout value (if runout is 5 µm, reduce step-over from 0.05 mm to 0.045 mm); (2) increasing the stock-to-leave on semi-finish passes to absorb runout variation, then using a spring pass for final dimension; (3) using the tool's actual measured diameter (not nominal) in the tool definition. Always measure micro tools with a laser tool setter (not a touch probe) for sub-micron accuracy. Runout above 10 µm is unacceptable for tools under 0.5 mm — use shrink-fit or precision collet holders rated for <3 µm TIR.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** finishing, micro

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[mastercam-cam-tips-mc-173|High RPM strategy for micro tools balances surface speed against tool resonance]]
- [[mastercam-cam-tips-mc-174|Feature size limits in micro machining are constrained by tool deflection, not geometry]]
- [[mastercam-cam-tips-mc-175|Spring passes in micro finishing remove deflection-induced oversize material]]
- [[mastercam-cam-tips-mc-176|Scaling micro toolpath output verifies dimensional accuracy before committing machine time]]
