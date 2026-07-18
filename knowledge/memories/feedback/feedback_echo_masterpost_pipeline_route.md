---
name: feedback_echo_masterpost_pipeline_route
description: "Emit NC through the PostProcessorPipelineEngine 7-phase, never string-concatenate G-code (slot echo standing rule)"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.423Z
aliases: feedback_echo_masterpost_pipeline_route
---


**Rule:** all NC emission routes through `PostProcessorPipelineEngine` (7-phase / 38-stage) or `MasterPostProcessorUnifiedAGIEngine` — never ad-hoc string concatenation of G-code.

The 7 phases: P0 defaults · P1 physics (Kienzle/Taylor/Tlusty/deflection/Ra/power/torque) · P2 block-by-block (engagement/force/thermal/wear) · P3 motion-opt · P4 stochastic CI95 · P5 safety+tribal · P6 output.

**Why:** P1 (physics) and P5 (safety+tribal) are non-negotiable — skipping them ships unvalidated feeds/speeds and uncited NC with no safety gate. String-concat bypasses the whole quality scorecard + provenance chain. **How to apply:** call `prism_cam:master_post_generate` / `pp_generate` / `post_process`; run `cam_post_emit_safety_gate` pre-emit. See [[feedback_echo_no_inline_post_constants]], [[reference_echo_masterpost_engine_surface]].
