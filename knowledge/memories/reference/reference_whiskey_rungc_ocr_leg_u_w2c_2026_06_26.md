---
name: reference-whiskey-rungc-ocr-leg-u-w2c-2026-06-26
description: "U-W2C Rung C-CAD geometry leg SHIPPED (real part DRAWING -> vision OCR -> turning pipeline -> scored vs empirical cloud); build verified, live vision validation GPU-blocked by peer contention (resumable drain); plus the FE/BE orphan-page reality (slot:whiskey)"
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.261Z
aliases: reference_whiskey_rungc_ocr_leg_u_w2c_2026_06_26
---


# Rung C-CAD geometry leg shipped (U-W2C) + GPU-contention + FE/BE orphan reality (slot:whiskey, 2026-06-26)

Continues [[reference_whiskey_kienzle_session_2026_06_26]] + [[reference_whiskey_rungc_step_brep_gap_2026_06_26]]. The keystone Rung C-CAD geometry leg (the missing leg of the lathe closed loop) is now BUILT via the OCR/PDF path (the STEP B-rep path still needs the Python cad-engine bridge).

## Shipped: U-W2C (commit aee90250e3, `[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2C-RUNGC-OCR`)
- **`scripts/lib/lathe-band-score.mjs`** -- pure scoring core: `sfmFromMetric` (m/min*3.280839895), `iprFromMmRev` (mm/rev / 25.4), `classifyOpBand` (op_type -> rough|finish|drill|specialty), `bandMembership` (loose p05-p95 + tight p25-p75), `scoreProgram`. No I/O, no engine imports. Specialty ops (threading/parting/grooving) EXCLUDED from band scoring (specialized feed regimes -- thread lead = pitch, part_off slow; R12 honest).
- **`scripts/lib/lathe-band-score.test.mjs`** -- 16 reference-value tests (happy + 4 failure + 2 adversarial NaN/Inf). 16/16 PASS.
- **`scripts/lathe-rungc-ocr-loop.mjs`** -- driver, run via tsx (imports the .ts engines). Chain (ALL real production engines, R15 test-through-the-path): PDF -> PyMuPDF(fitz) raster page0 -> `blueprintVisionOCREngine.analyzeBlueprint({image:{type:"file",path},blueprint_type:"turning"})` -> `turningPrintIntakeEngine.convertBlueprint({blueprint})` -> `turningPrintToProgramEngine.runPipeline(turning_input)` -> `scoreProgram(operations, RungA bands)` -> pair to .MIN via `parsePartNumber`. Resumable + reap-safe (`--all --limit 1`).

## Verified contract chain (R8, shape-by-shape against engine source)
- `BlueprintVisionOCREngine` singleton export = **`blueprintVisionOCREngine`** (capital OCR). `analyzeBlueprint(BlueprintVisionInput):Promise<BlueprintVisionResult>`. `ImageSource = {type:"file",path}|{type:"base64",data,media_type?}|{type:"url",url}`.
- `turningPrintIntakeEngine.convertBlueprint(TurningIntakeInput{blueprint,optimization_target?})` -> `{success,turning_input,features,ambiguities}`. `success = features.length>0`. Input `blueprint` accepts `BlueprintVisionResult` directly (engine header says so).
- `turningPrintToProgramEngine.runPipeline(TurningInput):TurningProgramResult` is **SYNC** (not async). `operations:TurningPlannedOp[]`, each `{operation_type, cutting_params:{cutting_speed_m_min, feed_mm_rev}}`.
- Rung A bands: `state/shared/dashboards/lathe-jmdie-param-accuracy.json` -> `.op_parameter_reference[rough|finish|drill|rapid].{sfm,feed_ipr}.{p05,p25,p50,p75,p95}` (per-OP-type only, NOT per-material -- a future enhancement).

## $0-Claude vision on this host (the curl-injection pattern -- REUSE IT)
node fetch is broken for localhost Ollama on this host even at 127.0.0.1 ([[node-fetch-localhost-ollama-broken-use-curl]]), and `OllamaClientEngine.generate` uses fetch. SO: the `llmEngine` singleton's vision transport is **dependency-injectable** -- `(llmEngine).deps.ollamaVisionGenerate` (private TS, settable at runtime under tsx; LLMEngine.ts:480). The driver injects a curl-based generator + nulls `llmEngine.config.api_key` => guaranteed Ollama-only, $0-Claude. This is the clean way to run ANY vision-OCR TS engine on this host from a script. Vision models pulled: qwen2.5vl:7b (engine default), qwen3-vl:32b/8b, llama3.2-vision:11b, moondream:1.8b.

## R12 HONEST: live vision validation is GPU-BLOCKED (infra, NOT a code defect)
The build is verified (16/16 lib tests; tsx imports resolve; dep-injection works; fitz raster works -- pages detected; cursor + dashboard work; intake/pipeline callable). But the LIVE end-to-end run threw "No vision AI provider available" because the GPU is saturated by a PEER fleet slot: `qwen2.5-coder:32b` (54.7GB) resident + in active use; even `moondream:1.8b` times out at 45-90s via direct curl. Verified by direct curl, so NOT my code. `full_geometry_loop_closed` stays FALSE until a print actually scores. Do NOT evict a peer's working model (multi-chat courtesy). The driver is resumable/reap-safe by design -> a fire when the GPU frees (fleet idle overnight) completes it. **FIX applied (R16, scrutiny P2):** only `scored`+`missing` are TERMINAL in the cursor; transient vision/intake/pipeline failures stay RETRIABLE (same doctrine as the tribal-ingest sibling) -- so the GPU-blocked drain actually re-tries instead of marking the print done-failed.

## FE/BE orphan reality (U-W7 is mostly MOOT now -- R12)
Per `state/shared/specs/QUEBEC-FE-BE-WIRING-MAP-2026-06-25.md`: the 3 whiskey-owned LF1/LF2 lathe items (`SwissPage` `/api/v1/swiss/*`, `LathePrintToProgram` `/api/dispatch/cam`, `LathePrintToProgramPage` `/api/prism`) ALL target **ORPHAN pages** not routed in `App.tsx` -- "ZERO user impact until registered in the router (a product decision)". Building backend routes for orphan pages = generating != delivering. Defer until the pages are routed (operator/quebec product decision). U-W8 rename is quebec-lane + appId is operator-only (owned reverse-DNS, D2) + SVG wordmark glyphs need Claude Design judgment + "Kienzle" vs "Kienzle Academy" is operator-only branding -> not a clean whiskey-autonomous unit during an active fleet run.

## Per-file 2-arm scrutiny: PASS/PASS (0 P0/P1; 2 P2 addressed)
code-analyzer PASS + reviewer PASS. P2 fixes applied: (1) transient failures retriable; (2) abs-path simplified to `join(REPO, rel)`. Remaining P2 (intentional): `--limit` requires `--all` (sibling-convention parity).

## Next (fresh budget / GPU free)
1. **Drain Rung C-CAD live**: probe GPU (`curl /api/ps` + a 45s vision liveness ping); if a vision model responds, `npx tsx scripts/lathe-rungc-ocr-loop.mjs --all --limit 1` per fire -> flips full_geometry_loop_closed once a print scores.
2. **Tribal max-out** (also Ollama/GPU-bound): `scripts/lathe-tribal-ollama-ingest.mjs --all --limit 1` + vision route for image-heavy catalogs.
3. **GPU-FREE deepening of the closed loop** (high-value, on-goal: operator wanted cost/efficiency/collision factored in): extend scoring with per-MATERIAL bands (mine material from .MIN headers) + a safety/efficiency dimension off the pipeline's `physics` (power vs machine limit, MRR, cycle_time) + a per-program real-.MIN comparison (parse a real .MIN's ops -> regenerate -> compare to its OWN params, the rigorous real-program accuracy the synthetic-grid Rung B lacks).
4. STEP B-rep leg (2,307 JM STEP) via Python cad-engine bridge.
5. U-W8 rename -> coordinate with quebec; appId stays until operator gives owned reverse-DNS.

Related: [[reference_whiskey_kienzle_session_2026_06_26]] · [[reference_whiskey_rungc_step_brep_gap_2026_06_26]] · [[node-fetch-localhost-ollama-broken-use-curl]] · [[reference_whiskey_kienzle_closed_loop_u_w2_2026_06_26]] · [[feedback_verify_actual_contract_not_proxy]]
