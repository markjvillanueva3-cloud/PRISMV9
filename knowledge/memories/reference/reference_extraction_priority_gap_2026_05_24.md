---
name: extraction-priority-gap-2026-05-24
description: 727 of 876 (83%) extraction-priority modules from extracted_modules/EXTRACTION_PRIORITY_LIST.json are still missing from mcp-server/src/. Full audit at state/shared/EXTRACTION-PRIORITY-GAP-AUDIT.json. Massive remaining extraction surface.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.572Z
aliases: reference_extraction_priority_gap_2026_05_24
---


# Extraction priority gap — 727/876 modules still missing (golf 2026-05-24)

## What it is

`extracted_modules/EXTRACTION_PRIORITY_LIST.json` (the legacy monolith-extraction prioritized list) names **876 priority modules** across 6 categories. A grep-audit against `mcp-server/src/{engines,algorithms,tools/dispatchers,registries,physics}/` (lowercased substring match on the `PRISM_*` module names with prefix/underscores stripped) shows **727 (83%)** have NO presence in the live PRISM tree.

## The gap by category

| category | total in priority | genuinely missing | % missing |
|----------|-------------------|-------------------|-----------|
| AI_ML_ENGINES | 94 | ~71 | ~76% |
| PHYSICS_ENGINES | 54 | 37 | 69% |
| GEOMETRY_ENGINES | 85 | 74 | 87% |
| DATABASES | 127 | 117 | 92% |
| SYSTEM | 79 | 70 | 89% |
| OTHER | 437 | 358 | 82% |
| **TOTAL** | **876** | **727** | **83%** |

## Top high-leverage candidates (operator pick list)

Per category, the highest-leverage missing modules (named in the priority list — operators should drill into the source dirs to assess actual extraction effort):

- **AI_ML**: PRISM_UNIFIED_LEARNING_ENGINE · PRISM_RNN_ADVANCED · PRISM_SWARM_ALGORITHMS · PRISM_TOOLPATH_OPTIMIZATION · PRISM_CALCULATOR_LEARNING_ENGINE
- **PHYSICS**: PRISM_MATERIAL_ALIASES · PRISM_WAVELET_CHATTER · PRISM_MATERIAL_SIMULATION_ENGINE · PRISM_PINN_CUTTING · PRISM_CAM_CUTTING_PARAM_BRIDGE
- **GEOMETRY**: PRISM_COMPUTATIONAL_GEOMETRY · PRISM_EMBEDDED_MACHINE_GEOMETRY · PRISM_POINT_CLOUD_PROCESSING · PRISM_COMPLETE_CAD_CAM_ENGINE · PRISM_BEZIER_MIT
- **DATABASES**: PRISM_STOCK_POSITIONS_DATABASE · PRISM_ROUGHING_MACHINE_CONFIGS_V2 · PRISM_TOOL_GENERATOR · PRISM_TOOL_HOLDER_INTERFACES_COMPLETE · PRISM_EMBEDDED_PARTS_DATABASE
- **SYSTEM**: PRISM_LAYER5_EVENTS · PRISM_CRITICAL_ALGORITHM_INTEGRATION · PRISM_STATE_SYNC · PRISM_UI_INTEGRATION_ENGINE · PRISM_NCSIMUL_INTEGRATION
- **OTHER**: PRISM_CLIPPER2_ENGINE · PRISM_LIMITS_CHECKER · PRISM_HEALTH_VALIDATOR · PRISM_CSP_ENHANCED_ENGINE · PRISM_HYPERMILL_PYTHON_API_ENGINE

Full per-category gap list (all 727) in `state/shared/EXTRACTION-PRIORITY-GAP-AUDIT.json`.

## Method caveat (Karpathy R12)

The audit uses a lowercased-substring match (e.g., `PRISM_RNN_ADVANCED` → looks for `rnnadvanced` in the file listing). False negatives possible if:
- The current engine has been renamed (e.g., `PRISM_ROUGHING_MACHINE_CONFIGS_V2` → `MachineConfigsV2Engine.ts`)
- The module was absorbed into a larger engine (e.g., `PRISM_MATERIAL_ALIASES` → folded into `MaterialDatabase`)
- The module was deemed redundant + skipped intentionally

Operators consulting this audit MUST verify by searching for synonyms or feature equivalents before classifying a module as "missing → ship".

## Linked

- [[feedback_psn_definition]] — PSN leg #7 (Engines) gap
- [[reference_extracted_dirs_psn_synergy_2026_05_24]] — the parent ship that made the source dirs PSN-visible
- `state/shared/EXTRACTION-PRIORITY-GAP-AUDIT.json` — full data + per-category gap lists
- `extracted_modules/EXTRACTION_PRIORITY_LIST.json` — source priority inventory (951 modules, 19 extracted, 932 nominally remaining)
- `extracted_modules/MONOLITH_MODULE_INVENTORY.json` — 96KB full inventory by category
