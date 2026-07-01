# cam session 5e7ecda3 (2026-06-26, 35.8MB, spine 234KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-W0-MASTER-PLAN` – 4‑gate plan, doctrine fix (`KIENZLE-LATHE-WIZARD-MASTER-PLAN-2026-06-26.md`).  
- `U-W2-CLOSED-LOOP-DRIVER` – `scripts/lathe-closed-loop-full.mjs`; Rung A (34 993 `.MIN`), B roundtrip, C OCR→Print→compare.  
- `U-W3A-CORPUS-ALL` – full JM corpus scan (34 993 `.MIN`).  
- `U-W3B-DRIVER-TEST` – JSON parser (`lastJson`) 7/7 passes.  
- `U-W3C-OVERSPEED-SAFETY` – 545 G96‑CSS overspeed programs (no G50 cap).  
- `U-W3-PARTKEY` – part‑number join key, 75.3 % pairing coverage.  
- `U-W3D-RUNG-C-SCHEMATIC` – STEP→CAD wiring diagram.  
- `U-W6` – tribal ingest resumable; extracted 23 real tips, skipped image‑heavy PDFs.  
- `aee90250e3` – U‑W2C CAD geometry leg (PDF→OCR pipeline).  
- `d8c5c13cb7` – P1/P2 fixes for Rung C (false‑success, cosmetic nulls).  
- `15cc0716d3` – U‑W2D safety/cost/machining‑efficiency scorer.  
- `17dd0e22e7` – U‑W2E unified dashboard (Rung C + safety/efficiency).  
- `645f752a0e` – U‑W2F dashboard shows real Rung A metrics, nulls fixed.  
- `abe0d625ad` – U‑W2D‑ARMC‑FIX: collision‑veto‑fails P1 corrected.  
- `e9206fb1cf` – U‑W2G wired safety/efficiency into Rung B harness.  
- `680145c933` – U‑W2K boring‑bar deflection pre‑check fixed (min(boreDepth, partLength)).  
- `3d69981067` – spec progress log updated.  
- `U-W2L (0da80516aa)` – groove/part stickout default replaced; collision false flags 0.  
- `U-W2M (2f3ef5448d)` – instrumentation of `collision_fail_types`; residual 10 part_off confirmed genuine.  
- `U-W2N (ef88365089)` – spec for required parting blade width; collision false flags 0.

**DECISIONS**  
- Brand string = **“Kienzle”** (operator‑specified).  
- Ground‑truth data set = `.MIN`.  
- App bundle ID stays `tools.prism.app` until operator supplies reverse‑DNS.  
- Rung C geometry leg blocked – STEPGeometryParser emits only entity counts; Python B‑rep bridge required, skip for now.  
- U‑W4 (Okuma engines) & U‑W5 (LatheLoRASafetyEvaluatorEngine) already wired → no rebuild needed.  
- Defer GPU‑blocked live vision drain until fleet GPU frees; no new GPU work now.  
- Proceed with boring‑bar deflection fix (U‑W2K) after safety validation; collision overhang fix deferred to fresh budget.  
- Skip orphan FE/BE pages and Quebec rename (operator gating).  
- Enforce “never‑soften” doctrine: any failed collision check → unsafe, regardless of severity label.  
- Do not launch boring‑bar‑selection until fresh budget.  
- Trigger native auto‑compact (~95 %) or manual `/compact` to reset context.

**OPERATOR DIRECTIVES**  
- Build comprehensive closed‑loop test with all JM die prints, CAD/CAM/G‑code programs; include full collision avoidance, cost and machining efficiency.  
- Generate Kienzle/Lathe‑Wizard backend & frontend design; rename brand to “Kienzle.”  
- Run autonomously via engineered loops/crons in yolo mode.  
- Type `/compact` (or wait for auto‑compact) before resuming on fresh budget.

**FINDINGS/BUGS**  
- Rung C dead‑end: STEPGeometryParser cannot feed TurningCADImportEngine; needs B‑rep bridge.  
- Node-fetch to localhost Ollama fails; curl works → all Ollama calls must use curl.  
- Tribal drain failed on image‑heavy PDFs; now marked `skipped`.  
- 545 overspeed‑risk programs identified (G96‑CSS without G50 cap).  
- “96.3 % in‑band” is synthetic grid agreement, not real‑program accuracy (~41.6 %).  
- Live vision GPU contention blocks Rung C completion.  
- Boring‑bar deflection pre‑check over‑estimates overhang (part_length×1.2) → false unsafe flags on blind bores (40/60 UNSAFE).  
- Collision‑veto‑fails P1: safety scorer incorrectly marked SAFE when collision check failed with “warning.”  
- Dashboard null metrics due to missing Rung A data; fixed.  
- Closed‑loop test reduced unsafe flags 40→20; collision false positives dropped to 0.  
- Residual 30 flags genuine: 20 deep‑bore deflection, 10 part_off (blade‑width limits).  
- Overhang logic now uses `boreDepth` instead of `partLength`; stickout default 40 mm replaced with real geometry.

**DOMAIN SPECIFICS**  
- Engines/dispatchers: TurningPrintIntakeEngine, BlueprintVisionOCREngine, TurningInput, LatheTurningFeatureRecognizerEngine, turningDispatcher, LatheLoRASafetyEvaluatorEngine, TurningPrintToProgramEngine, TurningCADImportEngine, STEPGeometryParserEngine, Okuma engines, Collision engine.  
- Actions: `runPipeline`, `compare‑vs‑.MIN`, safety scoring dispatcher, collision checker, boring‑bar deflection calculation, overhang calculation (`min(boreDepth, partLength)`), stickout helper, blade‑width spec, collision ratio limits (6×/8×).  
- Metrics: feed p50 = 0.003 IPR, SFM p50 = 178, G96‑cap compliance = 97.4 %, overspeed risk count = 545, unsafe flag count (40→20), envelope score 96.3/100.

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `loop-state.mjs`, `audit-close-out-candidates.mjs`, `duplicationGuardEngine`.  
- Build scripts: `scripts/lathe-closed-loop-full.mjs`, `pdf-learn`, `video-learn`, `lathe-learn`.  
- External tooling: Ollama (text extraction), curl (Ollama API), Node.js (`undici`).  
- LLM/Ollama: qwen2.5‑vl (vision).  
- Node scripts: `node H:/prism/.claude/helpers/loop-state.mjs`, `node H:/prism/scripts/audit-close-out-candidates.mjs`.

**OPEN THREADS**  
- Rung C geometry leg – need Python B‑rep bridge for STEP→CAD→TurningInput.  
- Tribal corpus still <500 tips; remaining image‑heavy PDFs require vision route (llama3.2‑vision) and videos/MIT courses.  
- U‑W7 FE/BE gaps (Quebec‑FE‑BE‑WIRING‑MAP) pending cross‑lane.  
- U‑W8 rename appId (operator‑only).  
- GPU‑blocked live vision drain + tribal (GPU busy) – pending fleet GPU availability.  
- Collision overhang issue still to be addressed in fresh budget.  
- Boring‑bar‑selection feature requires fresh budget.  
- Further physics‑reviewer validation of deflection model may be required before full deployment.
