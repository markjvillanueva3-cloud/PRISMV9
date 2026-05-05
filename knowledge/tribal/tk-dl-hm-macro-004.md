---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-macro-004
title: hyperMILL cutting profile lookup requires compound Material × Purpose key
category: cam_automation
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:hyperMILL-MacroTech-vtEditorConditionVariables.xml
created_at: 2026-03-06
usage_count: 0
tags: ["hyperMILL", "cutting-profile", "compound-key", "material-lookup", "feed-rates", "coolant-selection", "operation:slotting", "operation:profiling"]
material_groups: []
operation_types: ["slotting", "profiling"]
content_hash: 83e596bcfcdf83491c3384168a988f4a0b1a674b5c5d80cf231d6b177bab57e3
mirror_ts: 2026-05-05T13:36:01.482Z
mirror_engine: TribalVaultPopulatorEngine
---

# hyperMILL cutting profile lookup requires compound Material × Purpose key

**Category:** `cam_automation` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hyperMILL-MacroTech-vtEditorConditionVariables.xml`

## Tip

hyperMILL CuttingProfile technology data uses compound key lookup: CuttingProfile.FieldValue(Joblist.Material, UserVariable.UserPurpos, 'fieldName'). Basic profile fields: SpindleSpeed, Feedrate, FeedrateZ, ReducedFeedrate, CuttingSpeed, FeedratePerEdge, DrillingFeedrate, Coolants, CuttingWidth, CuttingLength, PlungeAngle, MaxRedFeedrateAngle, RetractFeedrate. Advanced profiles add CuttingClass dimension with separate fz values: fz (standard), fzFullcut (slotting), fzPlunge (axial entry), fzMax (maximum limit). Missing Material or Purpose key returns no data — always validate both are set before macro execution. CuttingProfile also has Material and CuttingMaterial properties for cross-referencing workpiece vs tool substrate.

## Applies to

- Operation types: `slotting`, `profiling`

## Related tips

- [[tk-dl-hm-macro-001|hyperMILL MacroTech: 18 cut types with per-material cutting data lookup]] _(category+op:1+tag:3)_
- [[tk-dl-chip-thin-001|Chip thinning: <50% radial engagement needs 2-4x feed increase, 5-flute +30% MRR]] _(op:2+tag:2)_
- [[gc-030|VoluMill contour ramping entry avoids plunge overload at cut start]] _(op:2+tag:2)_
- [[gc-007|Slot milling with plunge roughing prevents full-width engagement overload]] _(op:2+tag:2)_
- [[gc-162|GibbsCAM custom tool shapes for form tools and special profiles]] _(op:2+tag:2)_

## Tags

#hypermill #cutting-profile #compound-key #material-lookup #feed-rates #coolant-selection #operation-slotting #operation-profiling
