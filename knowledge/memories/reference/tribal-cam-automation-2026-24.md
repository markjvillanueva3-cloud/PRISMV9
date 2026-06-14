---
type: tribal-consolidation
topic: cam_automation
iso_week: 2026-24
cluster_size: 3
cluster_size_synthesized: 3
aggregate_confidence: 91.7
tags: ["hyperMILL", "cutting-profile", "operation:profiling", "macro", "18-operations", "material-specific", "automation", "operation:tapping"]
materials: []
operations: ["profiling", "tapping", "reaming", "milling", "adaptive_milling", "drilling", "turning", "slotting"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: cam_automation — 2026-24

_3 tips clustered on 'cam_automation' with mean confidence 91.7/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (3)

### 1. hyperMILL MacroTech: 18 cut types with per-material cutting data lookup

- **id:** `TK-DL-hm-macro-001` · **confidence:** 95/100 · **usage:** 0
- **source:** document:hyperMILL-MacroTech-vtEditorConditionVariables.xml
- **tags:** hyperMILL, macro, cutting-profile, 18-operations, material-specific, automation

hyperMILL Advanced Cutting Profile defines 18 operation types each with material-specific parameters: helicalPlunge, rampPlunge, fullcut, standardRoughCut, optimizedSideCut (trochoidal/peel milling), optimizedFaceCut (high-feed milling), 2d…

### 2. hyperMILL Macro DB schema: Machine_Group × Material_Group → Job chain for automation

- **id:** `TK-DL-hm-macro-002` · **confidence:** 90/100 · **usage:** 0
- **source:** document:hyperMILL-MacroTech-MacroDB-sqlite.sql
- **tags:** hyperMILL, macro-database, job-automation, feature-detection, machine-group, material-group

hyperMILL Macro Database (SQLite/MariaDB/SQL Server) drives job automation via relational chain: MacroType→Macro→Job→Job_Parameter. Each Macro has Machine_Group and Material_Group filters, priority ranking, and feature-based selection. Each…

### 3. hyperMILL cutting profile lookup requires compound Material × Purpose key

- **id:** `TK-DL-hm-macro-004` · **confidence:** 90/100 · **usage:** 0
- **source:** document:hyperMILL-MacroTech-vtEditorConditionVariables.xml
- **tags:** hyperMILL, cutting-profile, compound-key, material-lookup, feed-rates, coolant-selection

hyperMILL CuttingProfile technology data uses compound key lookup: CuttingProfile.FieldValue(Joblist.Material, UserVariable.UserPurpos, 'fieldName'). Basic profile fields: SpindleSpeed, Feedrate, FeedrateZ, ReducedFeedrate, CuttingSpeed, Fe…

## Common Threads

Top tags across the cluster: `hyperMILL`, `cutting-profile`, `operation:profiling`, `macro`, `18-operations`, `material-specific`, `automation`, `operation:tapping`.

## Sources Cited

- document:hyperMILL-MacroTech-vtEditorConditionVariables.xml (2)
- document:hyperMILL-MacroTech-MacroDB-sqlite.sql (1)

## Citations

- [[TK-DL-hm-macro-001]]
- [[TK-DL-hm-macro-002]]
- [[TK-DL-hm-macro-004]]

