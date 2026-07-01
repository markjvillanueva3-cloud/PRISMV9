---
name: reference-delta-cad-dispatcher-surface
description: "CAD dispatcher action surface: cadDispatcher 564, cadAutomationDispatcher 367, cadDrawingKnowledgeDispatcher 11, cadRegressionDispatcher 37. Route prism_cad:* before reimplementing geometry ops."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.540Z
aliases: reference_delta_cad_dispatcher_surface
---


# CAD dispatcher surface (delta — route before reimplement)

| Dispatcher | Actions | Key actions |
|---|---|---|
| `cadDispatcher` (`prism_cad`) | 564 | geometry_create, mesh_generate, feature_recognize, sketch_solve, assembly_analyze |
| `cadAutomationDispatcher` | 367 | open, create_sketch, extrude_feature, assembly_create, export_step |
| `cadDrawingKnowledgeDispatcher` | 11 | gdt_select, symbol_interpret, tolerance_apply |
| `cadRegressionDispatcher` | 37 | test_run, checkpoint, classify, triage |

Soul escalation: route-before-grep. Hit `prism_session:master_index_query keyword="cad"` before grepping engines (digest files return 10-50K tokens raw). See [[reference_cad_domain_map_for_delta_2026_05_27]] §3.
