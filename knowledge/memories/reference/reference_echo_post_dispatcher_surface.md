---
name: reference_echo_post_dispatcher_surface
description: Post-processor dispatcher action surface — camDispatcher ~155 + productDispatcher 24 ppg (slot echo)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.094Z
aliases: reference_echo_post_dispatcher_surface
---


Post-processor lives behind two dispatchers:

- **`camDispatcher.ts`** (~21k lines, ~155 post/pp/ppg/dialect cases): `lathe_postgen_*` (9) · `lathe_masterpost_*` (23) · `master_post_*` (17) · `pp_*` (10) · `pp_ai_*` (~30) · `pp_kb_*` (12) · `pp_capability_*` (5) · `pp_unify_*` (4) · `ppg_*` (~50) · `post_*` (~80) · `multi_cam_post_*` (5) · `cam_post_*` (4) · `cam_fusion_lathe_post_*` (7) · `wedm_dialect_*` (3) · `wedm_post_{mitsubishi,sodick,makino,agie,fanuc}_generate` (5, stub) · `lathe_selfaware_*` (6).
- **`productDispatcher.ts`** (lines 134–184): 24 `ppg_*` actions (validate/translate/templates/generate/controllers/compare/syntax/batch/history/get/library_*/version_*/prove_out/validate_limits/validation_report/benchmark_report/optimization_report/setup_sheet_auto/cycle_time*/feature_select/check_tier/list_features).

Prefer `prism_cam:<action>` over reimplementing. `cam_post_emit_safety_gate` is the pre-emit gate (echo wired iter13). See [[reference_echo_stub_wired_dark_engines]].
