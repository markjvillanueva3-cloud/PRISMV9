---
id: "wedm-mcam-004"
title: "Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO"
source: "mastercam:makino_duo_ver6_metric_tech_file"
confidence: 94
category: "machining"
tags: ["wire-edm", "makino", "duo", "both-away-precision", "high-speed", "surface-finish", "die-work", "e-pack", "5-pass"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.584Z
---

# Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO

Makino DUO tech tables define six cutting methods per wire/material combo. For die and tooling work requiring Ra < 3µm: always choose Both Away Precision. This method approaches the final dimension from both sides (rough cut leaves +offset, each skim cuts from the outside in alternating directions), eliminating the directional recast bias of single-direction methods. Measured results from Mastercam X8 DUO-Ver6-METRIC tech file: 0.20mm BS wire, steel, 10mm thick — Both Away Precision achieves Ra 2~2.5µm in 5 passes (rough 1036 + 4 skims E1535–E1538). The final offset is 0.107mm (approximately wire radius + 0.007mm spark gap). High Speed method achieves only Ra 18~20µm in 1 pass and is unsuitable for precision die work.

**Category:** machining
**Confidence:** 94
**Source:** mastercam:makino_duo_ver6_metric_tech_file
**Operations:** wire_edm

## Related
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[surfcam-cam-tips-sc2-056|4-Axis Wire EDM Taper Cutting with Independent UV]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]]
