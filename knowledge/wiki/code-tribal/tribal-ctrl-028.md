---
name: tribal-ctrl-028
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["mazak", "turning", "c-axis", "milling", "integrex", "live-tool"]
confidence: 90
source: "controller:mazak_mill_turn"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-028.md
promoted_at: 2026-05-26T16:07:20.135Z
---

# Mazak turning center C-axis and milling M-codes

Mazak INTEGREX and QT series with milling: M200 (C-axis clamp), M201 (C-axis unclamp), M33 (live tool spindle CW), M34 (live tool CCW), M35 (live tool stop). G12.1/G13.1 for polar coordinate interpolation (mill features on a turning center). Y-axis milling uses standard G17/G18/G19 plane selection. Always unclamp C-axis (M201) before indexing, clamp (M200) before cutting.

**Category:** programming
**Confidence:** 90
**Source:** controller:mazak_mill_turn

## Related
- [[sprutcam-cam-tips-spr-052|Live Tool Milling on Lathes]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
- [[camworks-cam-tips-cw-072|Y-Axis Operations — Off-Centerline Milling for Complex Mill-Turn Parts]]
- [[bobcad-cam-tips-bc-169|BobCAD Swiss-Type Cross-Drilling and Cross-Milling]]
- [[edgecam-cam-tips-ec-045|C-Axis Milling for Flats and Hexes on Turned Parts]]
