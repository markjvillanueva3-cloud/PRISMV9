---
session: claude-6a8a0fc5
topic: xray-work
slot: xray
written_at: 2026-06-23T00:40:13.865Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-6a8a0fc5
status: active
---

# HANDOFF: claude-6a8a0fc5
Updated: 2026-06-23T00:40:13.865Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-6a8a0fc5

## STATE
SHIPPED iter1-9 2026-06-22 (slot:xray) P1.5 region routing: built+validated+harness-wired+cron-UNBLOCKED. iter1 region-classifier-lib 0a41c90a4c. iter2 region-glue-lib. iter3 region-classify.mjs. iter4 live E2E 28-vs-0. iter5 validate-perfect-parts --region-route e9e338adfd (05850 0.4286). iter6 full-page-0=fundamental-limit. iter7 step3b scoped. iter8 buildRegionRoutedFused+.fused hybrid. iter9 hybrid summary recompute (AL correctness). KEY: region routing=dense-page RESCUE not universal lift. All units real tests+per-file scrutiny PASS+by-pathspec. Memories: reference_xray_p15_{region_lib,glue_lib,live_validation}. Only un-wired consumer=training cron, now FULLY unblocked+safe opt-in; the wire is the next clean unit.

## RESUME
Continue xray /loop (iter 9/20 done). P1.5 region-routing: built+validated+harness-wired; step-3b FULLY UNBLOCKED (buildRegionRoutedFused now returns a hybrid fused with region dims + full-page non-dim labels + a RECOMPUTED summary.n_hallucination_candidates over the union -> correct active-learning routing). NEXT = the actual STEP-3b CRON WIRE: in blueprint-ocr-training-loop.mjs add (1) parseArgs regionRoute: has('--region-route'); (2) in the per-page loop (~line 348) an else-if branch: if opts.regionRoute, const rr = await extractWithRegionRouting({pngPath:png, models, assumeUnits:'in', forceUnits: pageForceUnit(opts.forceUnits, printUnit), ensembleOpts:{ollamaUrl:OLLAMA_URL, maxTimeSec:opts.maxTimeSec}}); if (!rr.fused || rr.fused.dimensions==null) continue-equiv; then buildTrainsetRow({part,image}, rr.fused, calibration) + classifyActiveLearning({fused: rr.fused, trainsetRow}) -- rr.fused is now drop-free + AL-correct. Opt-in default-off = the running cron is unchanged. Handle the printUnit anchor: region branch forces units (like the validate-harness wire) so it does NOT do per-page unit detection (mirror that). Verify by RUNNING --region-route --limit on a FRESH --out-dir (R8: read the cron's per-page loop + buildTrainsetRow consumption first -- already mapped: it reads res.fused, n_models, summary). THEN: heavy multi-part comparison OR pivot to P2.7/P2.10.

## CONTEXT

