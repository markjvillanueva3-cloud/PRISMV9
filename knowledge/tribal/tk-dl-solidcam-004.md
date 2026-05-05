---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-solidcam-004
title: Round insert chip thinning: effective entering angle κ_eff = arccos(1-2ap/iC), keep ap ≤ 25% of insert diameter
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:SolidCAM-Chip-Thickness-Math+Sandvik-Technical-Guide
created_at: 2026-03-06
usage_count: 0
tags: ["round-insert", "RCMT", "entering-angle", "chip-thinning", "depth-of-cut", "face-milling", "tool:indexable_insert"]
material_groups: []
operation_types: []
content_hash: b2d8febdddfa241692e1a12f4619ef815512ee1b9e8f9617f0896e04626dba35
mirror_ts: 2026-05-05T13:36:01.499Z
mirror_engine: TribalVaultPopulatorEngine
---

# Round insert chip thinning: effective entering angle κ_eff = arccos(1-2ap/iC), keep ap ≤ 25% of insert diameter

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:SolidCAM-Chip-Thickness-Math+Sandvik-Technical-Guide`

## Tip

Round inserts (RCMT/RCHT) have a depth-dependent entering angle. Formula: κ_eff = arccos(1 - 2×ap/iC) where iC = insert diameter. At shallow cuts: κ_eff is small → very thin chips → need higher feed. At ap = 25% of iC: κ_eff ≈ 60° (good balance). Above 60°: chip thinning benefit diminishes. At ap = 50% of iC: κ_eff = 90° (same as square insert). Maximum chip thickness: h_max = fz × sin(κ_eff). Recommendation: keep ap ≤ 0.25×iC for chip thinning benefit. Round inserts distribute cutting forces radially — excellent for interrupted cuts and hard materials.

## Related tips

- [[tk-dl-hm-010|Only round inserts for turning High Performance Mode]] _(category+tag:2)_
- [[tk-dl-cnc-008|45° face mill gives ~40% more MRR than 90° with balanced forces]] _(category+tag:2)_
- [[tk-dl-hm-macro-003|hyperMILL tool property namespace: 60+ properties for macro condition logic]] _(category+tag:1)_
- [[sc-005|iMachining Tool Life — Full Flute Engagement]] _(category+tag:1)_
- [[esp-095|Tool Tracking and Life Management]] _(category+tag:1)_

## Tags

#round-insert #rcmt #entering-angle #chip-thinning #depth-of-cut #face-milling #tool-indexable_insert
