---
name: reference-delta-cad-gen-loop-fixes-2026-06-26
description: The text->CAD overnight gen loop was producing 0 STEP; root-caused to a cadquery export-API bug in the codegen prompt + GPU contention. 3 fixes shipped. Also the overnight-autonomous CAD machinery.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.541Z
aliases: reference_delta_cad_gen_loop_fixes_2026_06_26
---


**DELTA CAD-gen overnight loop — fixes + machinery (slot:delta, 2026-06-26, /yolo /goal).**

Built the autonomous overnight CAD-completion machinery + fixed the text->CAD gen loop that was producing **0 validated STEP**.

### THE bug (R12, diagnosed not assumed) — `903a1ba142`/`d2bd9bb717`
`scripts/cad-text-to-cadquery.mjs` (Ollama text->CAD lane, qwen2.5-coder:32b -> CadQuery -> STEP) generated valid CadQuery but the model used **`result.exportStep(path)`** — which **does NOT exist on a cadquery 2.8 `Workplane`** (`AttributeError: 'Workplane' object has no attribute 'exportStep'`). So every gen staged code but executed to 0 STEP.
- **cadquery 2.8.0 IS installed** in `H:/Tools/python/python.exe` (build123d is NOT; `pythonCadAvailable()` correctly falls through build123d->cadquery). Python is **3.14.5** — `pip install cadquery` on a fresh env may 255 (wheel/reaper); but it's already present.
- **Fix:** added an EXACT export-API hard rule to `buildPrompt` — cadquery: `from cadquery import exporters; exporters.export(result, OUTPUT_STEP)`; build123d: `export_step(result, OUTPUT_STEP)`. VERIFIED `executed:true` + real `model.step` produced.
- **Lesson:** when an LLM generates code against a versioned library API, the codegen PROMPT must pin the EXACT current-version method (export/IO calls especially) — a plausible-but-wrong method name silently produces no artifact. Compounds with india's cad-text learn-loop cron `adc3b7c2`.

### GPU contention (the real throughput limit) — `903a1ba142`
At scale the gen loop hit exit-4 "ollama call failed" on ~17/24 — **GPU contention**: the gen `/api/generate` call had NO `keep_alive` -> qwen fell back to Ollama's 5-min idle default -> evicted by the fleet's other resident models (NN-retrain/SFC-train/gpt-oss:120b) between calls -> cold-reload -> timeout. **Fix:** `keep_alive:'15m'` (env `PRISM_OLLAMA_GEN_KEEP_ALIVE`) — the OCR runner's proven `PRISM_OLLAMA_VISION_KEEP_ALIVE=15m` approach. **Lesson:** any batched Ollama caller on a contended multi-model GPU must set keep_alive or pay cold-reload timeouts.

### TEST RESULT (R15 VALIDATE on live data) — `3da7ad52bd` + `1810025dc6`
`scripts/cad-gen-validate.mjs` + `cad-gen-validate-check.py` = trunk-side STEP validity checker (re-import via cadquery, confirm >=1 manifold solid). Complements (not dups, R8) the slot-only deep `cad-analyze-step.mjs`; wired into the overnight runner (auto-validates after each gen drain). **LIVE: 36/36 staged STEPs VALID (rate 1.0, avgFaces 5.6)** with sensible geometry (cube=6, cube+hole=7, cylinder=3, bushing tube=4) -> the export-fixed gen produces 100%-geometrically-valid CAD on trunk. The deeper dim-by-dim-vs-spec accuracy test (T2 full / T3 print regen) still lands with `U-MERGE-SLOT-DELTA`.

### Loop resilience (R16) — `d2bd9bb717`
`scripts/cad-gen-overnight-loop.mjs` (net-new $0 resumable CAD-gen loop): transient exit-4 errors now **RETRY** next run (`shouldCursor` — not cursored), only successes + permanent usage-errors are cursored; `classifyGen` recognizes `executed:true`/`stepPath` as a real staged STEP. `cad-gen-worklist-expand.mjs` (`1b686be4a6`) = deterministic parametric spec generator (12 archetypes x inch sweeps, 24->63 quality specs; dim-only OCR rows REJECTED as low-fidelity).

### Overnight-autonomous machinery
- **Scheduled task `PRISM CAD Gen Loop`** (`721f695758`, `run-cad-gen-loop-overnight.ps1`) — reaper-immune $0 gen drainer, every 30m x 11h. **REAPER LESSON (R12):** a bare `run_in_background` node drain FAILS exit 255 = fleet-reaper kill (transient-shell ancestry -> classified orphan). Overnight $0 loops MUST run via Task Scheduler (ancestry -> always-alive service), NOT a detached/background process. Mirrors `run-ocr-training-loop-overnight.ps1`.
- Continuation cron `4d82ef66` (hourly 22-06, build/reasoning ticks) · reconcile cron `4efdf85a` (08:23). (gen-drain cron `f5c06b63` DELETED — replaced by the scheduled task.) Fanout-gate `strict`->`warn` (settings.json:115) enables parallel hermes bursts.

### KNOWN gaps
- dim-VALIDATION (`cad-analyze-step.mjs`) is slot-delta-only -> `analysisExit 1` on trunk; gen+STEP work, validation post-merge.
- Phase-C capability engines (sketch-subtractive composing [[reference_delta_proven_step_emitter]]'s BooleanKernelEngine+GeometryEngine.boolean) are MERGE-GATED — building them in the slot worktree deepens the 410-commit `U-MERGE-SLOT-DELTA` debt (R13 dependency order: consolidate via merge first).

Related: [[reference_delta_cad_completion_roadmap_2026_06_26]] · [[reference_cad_text_learn_loop_2026_06_24]] · [[feedback_use_lima_pypdf_page_extractor]]
