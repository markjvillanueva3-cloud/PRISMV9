---
name: feedback_blueprint_bind_every_callout_to_feature
description: "Blueprint reading fails most at dimension→FEATURE BINDING, not OCR. Extract EVERY diameter/radius/chamfer callout and bind each to the axial zone its leader points to; a turned part can carry multiple diameters; radius != chamfer. Capture operator corrections into the closed loop."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.400Z
aliases: feedback_blueprint_bind_every_callout_to_feature
---


**Lesson (2026-06-18, slot:delta — live Fusion draw test of C-033626 R01):** The alignment-pin model was wrong not because OCR misread a number, but because the reader **collapsed two diameter callouts into one**. The print had body Ø.5000/.4995 **and** a separate Ø.4990/.4985 on the bottom .12" (plus R.030 bottom radius, NOT a chamfer). All values were legible; the failure was **dimension→feature BINDING** — tying each callout to the geometry/zone its leader line points to.

**Rules for print reading (apply fleet-wide, xray + delta):**
1. **Extract EVERY callout, then bind each to a feature/zone** via its leader + extension lines — never assume one diameter per turned part. A pin/post/shaft is a multi-diameter revolve until proven single.
2. **radius ≠ chamfer.** "R.030" is a fillet arc; ".030×45°" is a chamfer. Parse the callout TYPE, don't default to chamfer.
3. **Tolerance pairs are one feature** (.5000/.4995 = nominal .49975 ±). Two *different* pairs at two axial positions = two zones.
4. **Build the axial profile and check consistency** — list (diameter, axial-position) for every callout; if two diameters exist, the profile steps. Don't average/collapse.
5. **Capture every operator correction** into `state/shared/blueprint-accuracy-events.jsonl` as `{type:"operator_correction", payload:{extracted_wrong, operator_truth, failure_mode}}` → consumed by `blueprint-ocr-training-loop.mjs` (the gold-label closed loop). The operator's fix IS the training label.
6. **Strongest auto-catch = render-back round-trip:** after building the 3D model, re-project it to the drawing's views and overlay-diff vs the original print BEFORE showing the operator. A constant-dia pin vs a stepped print would diff loudly. Strengthen the existing CAD-fidelity<0.85 flag into per-view overlay comparison.

Stores/harness: `blueprint-accuracy-events.jsonl` · `scripts/blueprint-ocr-training-loop.mjs` · `scripts/lib/ollama-vision-extract-lib.mjs` · `scripts/build-cad-ground-truth-dataset.mjs`. → [[feedback_draw_set_cad_units_to_print]] · [[reference_delta_cad_drawing_port_18362]] · xray [[feedback_xray_multi_print_split_before_ocr]]
