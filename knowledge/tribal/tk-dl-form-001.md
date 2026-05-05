---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-form-001
title: Spring back in bending: increases with Y/E ratio and R/t
category: physics
domain: document_learned
knowledge_type: tip
confidence: 82
source: document:mit2008-deforming@spring-back
created_at: 2026-03-03
usage_count: 0
tags: ["bending", "spring-back", "sheet-metal", "forming", "compensation", "material:P", "material:Steel", "material:S", "material:Titanium"]
material_groups: ["P", "S"]
operation_types: []
content_hash: 6046a6e0c0b64bbacff0e5acd67dc5f129f7b4ce869abc4a125e8edd845626c0
mirror_ts: 2026-05-05T13:36:03.779Z
mirror_engine: TribalVaultPopulatorEngine
---

# Spring back in bending: increases with Y/E ratio and R/t

**Category:** `physics` · **Domain:** `document_learned`

**Confidence:** `82` · **Source:** `document:mit2008-deforming@spring-back`

## Tip

After bending, elastic recovery causes the part to spring back. The relationship is Ri/Rf = 1 - 3(Y/E)(Ri/t) + 4(Y/E)³(Ri/t)³ where Y=yield stress, E=Young's modulus, t=thickness, Ri=initial bend radius, Rf=final radius. Titanium (high Y/E ~0.01) springs back much more than steel (Y/E ~0.002). Compensate by over-bending. Thinner sheets and larger radii also increase spring back. Critical for bent-then-machined brackets and fixtures.

## Applies to

- Material groups: `P`, `S`

## Related tips

- [[ctrl-005|Fanuc high-speed peck drilling G73 vs G83]] _(material:2+tag:4)_
- [[teb-016|Adaptive Roughing Maintains Constant Tool Engagement Angle]] _(material:2+tag:4)_
- [[wnc-155|Waveform Roughing — Constant Engagement Angle for Maximum MRR]] _(material:2+tag:4)_
- [[cw-121|Titanium Machining — Controlled Engagement with Through-Tool Coolant]] _(material:2+tag:4)_
- [[cw-132|VoluMill for Titanium — High Axial, Low Radial Strategy]] _(material:2+tag:4)_

## Tags

#bending #spring-back #sheet-metal #forming #compensation #material-p #material-steel #material-s #material-titanium
