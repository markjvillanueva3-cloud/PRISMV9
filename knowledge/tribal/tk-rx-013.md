---
schema_version: 1.0.0
kind: tribal_tip
id: TK-RX-013
title: Scallop height formula: h = ae²/(8R) for ball nose, verify with actual stepover measurement
category: surface_finish
domain: document_learned
knowledge_type: rule
confidence: 92
source: document:Fusion360-Skill-Roadmap@scallop-height-math
created_at: 2026-03-06
usage_count: 0
tags: ["scallop", "ball-nose", "stepover", "Ra", "formula", "finishing", "cusp-height", "operation:finishing", "tool:ball_endmill"]
material_groups: []
operation_types: ["finishing", "3d-milling"]
content_hash: ce7250d47551b79ebcb8c3bdaa1f4af6a1ecf70c73ffdeca464acf2d825f26b2
mirror_ts: 2026-05-05T13:36:01.071Z
mirror_engine: TribalVaultPopulatorEngine
---

# Scallop height formula: h = ae²/(8R) for ball nose, verify with actual stepover measurement

**Category:** `surface_finish` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:Fusion360-Skill-Roadmap@scallop-height-math`

## Tip

Theoretical scallop height for ball nose finishing: h = ae²/(8×R) where ae = stepover (mm), R = ball radius (mm). Examples: R=5mm (10mm ball), ae=0.3mm → h = 0.09/(40) = 0.00225mm = 2.25µm. R=5mm, ae=0.5mm → h = 0.25/40 = 0.00625mm = 6.25µm. R=5mm, ae=1.0mm → h = 1.0/40 = 0.025mm = 25µm. For a target Ra, scallop height h ≈ 4×Ra (approximate). So for Ra 0.8µm → h ≈ 3.2µm → ae ≈ 0.36mm with 10mm ball. IMPORTANT: this formula assumes flat surface perpendicular to tool axis. On inclined surfaces, effective radius changes: R_eff = R/cos(θ) where θ = surface tilt. On concave surfaces, R_eff decreases (worse scallop). Always verify first article.

## Applies to

- Operation types: `finishing`, `3d-milling`

## Related tips

- [[pm-018|Stepover Calculation for Target Cusp Height]] _(category+op:1+tag:4)_
- [[tk-rx-009|Steep/shallow boundary angle: use 45° default, overlap ±5° to prevent witness lines]] _(category+op:2+tag:2)_
- [[tk-rx-004|Surface finish Ra targets by manufacturing quality level]] _(category+op:1+tag:3)_
- [[esp-097|Scallop Height Control for Predictable Surface Finish]] _(category+tag:5)_
- [[tk-dl-hm-006|Equidistant Finishing for best HSM surface quality]] _(category+op:1+tag:3)_

## Tags

#scallop #ball-nose #stepover #ra #formula #finishing #cusp-height #operation-finishing #tool-ball_endmill
