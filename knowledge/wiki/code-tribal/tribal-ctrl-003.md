---
name: tribal-ctrl-003
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["fanuc", "work-offsets", "g54.1", "pallet", "tombstone"]
confidence: 95
source: "controller:fanuc_operator_manual"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-003.md
promoted_at: 2026-05-26T16:07:20.104Z
---

# Fanuc extended work offsets G54.1 P1-P300

Beyond the standard G54-G59 (6 offsets), Fanuc controllers support G54.1 P1 through P300 for 300 additional work offsets. Essential for pallet systems and tombstone setups. On 0i-MF the default is 48 additional offsets (P1-P48); on 31i-B5 up to 300. Set parameter #1220 to enable the full range. Call with: G54.1 P25; (selects additional offset 25).

**Category:** programming
**Confidence:** 95
**Source:** controller:fanuc_operator_manual

## Related
- [[controller-knowledge-tips-ctrl-055|Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]]
- [[controller-knowledge-tips-ctrl-002|Fanuc Nano Smoothing vs AI Contour Control]]
