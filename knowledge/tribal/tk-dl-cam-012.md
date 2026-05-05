---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cam-012
title: ISO machining follows UV curves for natural surface flow
category: strategy
domain: document_learned
knowledge_type: tip
confidence: 85
source: document:hypermill-cam-strategies@iso
created_at: 2026-03-03
usage_count: 0
tags: ["iso-machining", "uv-curves", "surface-flow", "parametric", "appearance"]
material_groups: []
operation_types: []
content_hash: 9caca18c2e6111695b1ff1f60cbd7dcf4c46e40c74f0a5b920b1c4c3154ac2d8
mirror_ts: 2026-05-05T13:36:03.213Z
mirror_engine: TribalVaultPopulatorEngine
---

# ISO machining follows UV curves for natural surface flow

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:hypermill-cam-strategies@iso`

## Tip

ISO machining generates toolpaths that follow the ISO parametric curves (U and V) of CAD surfaces. The paths align with the natural surface flow, producing more uniform tool marks. UV curves of contiguous surfaces are automatically aligned so the tool doesn't retract between surfaces. Best for: turbine blades, mold surfaces, any geometry where surface appearance matters.

## Related tips

- [[tk-dl-deep-hole-001|Deep hole drilling: L/D thresholds (5D peck, 7D parabolic, 10D custom, 20D gun drill)]] _(category)_
- [[tk-dl-chip-thin-001|Chip thinning: <50% radial engagement needs 2-4x feed increase, 5-flute +30% MRR]] _(category)_
- [[tk-dl-solidcam-001|iMachining engagement control: 10-80° arc, optimal 40°, spike detection at corners]] _(category)_
- [[tk-dl-cam-001|Constant Z for steep (30-90°), 3D Constant Step Over for shallow areas]] _(category)_
- [[tk-dl-cam-004|5-axis hierarchy: 3+2 fixed > auto-indexing > simultaneous]] _(category)_

## Tags

#iso-machining #uv-curves #surface-flow #parametric #appearance
