---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-macro-001
title: hyperMILL MacroTech: 18 cut types with per-material cutting data lookup
category: cam_automation
domain: document_learned
knowledge_type: tip
confidence: 95
source: document:hyperMILL-MacroTech-vtEditorConditionVariables.xml
created_at: 2026-03-06
usage_count: 0
tags: ["hyperMILL", "macro", "cutting-profile", "18-operations", "material-specific", "automation", "operation:profiling", "operation:tapping", "operation:reaming", "operation:milling", "operation:adaptive_milling"]
material_groups: []
operation_types: ["profiling", "tapping", "reaming", "milling", "adaptive_milling"]
content_hash: c35a040232695949576f66007ecaaacac3efac58997304102bc93afc68df9e5f
mirror_ts: 2026-05-05T13:36:00.846Z
mirror_engine: TribalVaultPopulatorEngine
---

# hyperMILL MacroTech: 18 cut types with per-material cutting data lookup

**Category:** `cam_automation` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hyperMILL-MacroTech-vtEditorConditionVariables.xml`

## Tip

hyperMILL Advanced Cutting Profile defines 18 operation types each with material-specific parameters: helicalPlunge, rampPlunge, fullcut, standardRoughCut, optimizedSideCut (trochoidal/peel milling), optimizedFaceCut (high-feed milling), 2dSideSemiFinishing, 2dSideFinishing, 2dFaceSemiFinishing, 2dFaceFinishing, 3dSemiFinishing, 3dFinishing, plungeMilling, simpleDrilling, drillingWithChipBreak, drillingWithPecking, centering, reaming, tapping. Each type stores: n (RPM), Vc, f, fz, fzFullcut, fzPlunge, fzMax, fr (feed/rev), ae (radial DOC), ap (axial DOC), fAxial, plungeAngle, coolants, maxDrDepth, peckDepth, minInfdDepth, reduceVal, retractVal, priority. Data accessed via: AdvancedCuttingProfile.FieldValue(Material, TypeOfCut, fieldName).

## Applies to

- Operation types: `profiling`, `tapping`, `reaming`, `milling`, `adaptive_milling`

## Related tips

- [[tk-dl-hm-029|VT collision check only works for hole machining, not milling]] _(op:3+tag:3)_
- [[tk-dl-hm-macro-004|hyperMILL cutting profile lookup requires compound Material × Purpose key]] _(category+op:1+tag:3)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(op:3+tag:3)_
- [[ctrl-020|Heidenhain Dynamic Efficiency for adaptive feed]] _(op:3+tag:3)_
- [[gc-114|Composite machining requires compression routers and dust extraction setup]] _(op:2+tag:3)_

## Tags

#hypermill #macro #cutting-profile #18-operations #material-specific #automation #operation-profiling #operation-tapping #operation-reaming #operation-milling #operation-adaptive_milling
