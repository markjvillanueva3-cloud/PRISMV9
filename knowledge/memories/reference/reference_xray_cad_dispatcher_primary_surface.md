---
name: reference_xray_cad_dispatcher_primary_surface
description: cadDispatcher is blueprint-vision's primary ~40-action surface — route here before reimplementing
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.270Z
aliases: reference_xray_cad_dispatcher_primary_surface
---


slot:xray's primary dispatcher surface is `mcp-server/src/tools/dispatchers/cadDispatcher.ts` (~40 blueprint-vision actions, verified 2026-05-29). Route here BEFORE writing any extraction logic:

- Extraction: `cad_pdf_blueprint_extract`, `cad_pdf_pattern_rescue_extract`, `cad_live_blueprint_ocr`, `blueprint_rag_extract/explain/compare_to_baseline`.
- GD&T/tol: `cad_gdt_callout_parse`, `cad_gdt_parse_enhanced`, `cad_gdt_fcf_parse_enhanced`, `cad_fcf_validate`, `cad_tolerance_apply/it_grade/fit_analyze/stackup/encode/augment/stats`.
- Parse: `cad_step_parse_file/string`, `cad_dxf_geom_parse`, `cad_dxf_parse_polygons`, `cad_dxf_geom_validate_wedm`, `cad_svg_parse_polygons`, `cad_fcstd_parse(_buffer)`, `cad_f3d_parse(_f3z)`, `cad_f3d_timeline`, `cad_stl_analyze`.
- Recog/gen: `feature_recognize`, `blueprint_to_all_cads(_validate/_capabilities)`, `blueprint_coverage_*`, `blueprint_lora_*`.

Other surfaces: `businessDispatcher` (`blueprint_to_quote`, `blueprint_resolve_material`), `qualityDispatcher` (`blueprint_extract`, `blueprint_inspection_plan`, `blueprint_setup_sheet`, `blueprint_compare_revisions`, `blueprint_dxf_dimensions`), `camDispatcher` (`print_to_program_*`), `sessionDispatcher`/`resourceExtractionDispatcher` (`ocr_*`). See galaxy CLAUDE.md.
