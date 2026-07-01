# lathe session 5e7ecda3 (2026-06-26, 35.8MB, spine 234KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- U‑W0‑MASTER‑PLAN (KIENZLE‑LATHE‑WIZARD‑MASTER‑PLAN‑2026‑06‑26.md)  
- U‑W2‑CLOSED‑LOOP‑DRIVER – scripts/lathe‑closed‑loop‑full.mjs, full‑corpus driver, ~14 s runtime  
- U‑W3A‑CORPUS‑ALL – scans 34,993 .MIN  
- U‑W3B‑DRIVER‑TEST – lastJson helper 7/7 node tests  
- U‑W3C‑OVERSPEED‑SAFETY – 545 overspeed programs (lathe‑overspeed‑risk.json)  
- U‑W3‑PARTKEY – 8,042 parts with ≥2 revisions  
- U‑W6 – tribal ingest (/pdf‑learn, /video‑learn, /lathe‑learn), resumable; extracted 23 tips  
- U‑W2C (aee90250e3) – Rung C CAD geometry driver (P1/P2 fixes d8c5c13cb7)  
- U‑W2K (680145c933) – boring overhang fix, false flags 40→20  
- U‑W2L (0da80516aa) – flat 40 mm stickout replaced; collision false flags 0  
- U‑W2N (ef88365089) – parting blade width helper added; all collision failures eliminated  
- U‑W2M (2f3ef5448d) – instrumentation for residual collision types  
- HANDOFF‑claude-5e7ecda3-whiskey-work.md  

**DECISIONS**  
- Brand string “Kienzle”; app bundle ID tools.prism.app until reverse‑DNS supplied.  
- Ground‑truth dataset .MIN (Okuma JM).  
- Rung C CAD geometry leg blocked; need Python B‑rep bridge for TurningCADImportEngine.  
- Use OCR path: BlueprintVisionOCREngine → TurningPrintIntakeEngine instead of STEP parsing.  
- Dedup guard satisfied by TurningPrintIntakeEngine.  
- Hold builds in RED zone; /compact before new session.  
- Do not start boring‑bar‑selection feature this turn.  
- Proceed with parting blade width fix (U‑W2N); defer collision‑zone logic to next session.  
- Defer GPU‑gated live vision drain + tribal until GPU available.  

**OPERATOR DIRECTIVES**  
- Commit units in order U‑W2 → U‑W3 … → U‑W8; use `[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-ID` (slot:whiskey).  
- Run reference‑value tests ≥3 happy, ≥2 failures, ≥2 adversarial.  
- Tick loop state after each commit (`loop-state.mjs`); audit‑close‑out‑candidates every ~3rd fire.  
- Stop only on genuine spiral or all units completed.  
- Type `/compact` to reset context; handoff preserved.  

**FINDINGS/BUGS**  
- `node-fetch` fails against localhost Ollama → switched to curl (IPv6 issue documented).  
- `STEPGeometryParserEngine` outputs only entity counts, not B‑rep geometry → cannot feed TurningCADImportEngine.  
- 545 overspeed programs identified (G96‑CSS without G50 cap).  
- Rung C CAD path dead‑end; OCR route required.  
- U‑W4 & U‑W5 already wired – survey claims stale.  
- GPU‑blocked live vision validation (Rung C) pending fleet GPU.  
- Boring overhang pre‑check too conservative → 40/60 unsafe flagged; fixed in U‑W2K.  
- Collision‑zone failure pending (U‑W7).  
- Groove/part stickout default flat 40 mm caused collision failures for all groove & small‑part ops.  
- Parting blade width default hardcoded 3 mm produced false positives; now computed.  
- Residual 20 deep‑bore flags genuine (thin boring bar over‑deflects at high L/D).  

**DOMAIN SPECIFICS**  
- Engines: TurningPrintIntakeEngine, BlueprintVisionOCREngine, LatheTurningFeatureRecognizerEngine, TurningCADImportEngine, STEPGeometryParserEngine, turningDispatcher.ts, LatheLoRASafetyEvaluatorEngine, lathe-gcode-lint-guard.mjs, threadingPipelineDispatcher.ts, ThreadingPipelineEngine.ts.  
- Metrics: PRISM feed in‑band 96.3 % (synthetic grid); full corpus 34,993 .MIN + 114,653 .nc; overspeed count 545; UNSAFE 40→20; envelope 96.3/100.  
- Paths: state/shared/specs/KIENZLE-LATHE-WIZARD-MASTER-PLAN-2026-06-26.md, scripts/lathe-closed-loop-full.mjs, scripts/lathe-rungc-ocr-loop.mjs, HANDOFF‑claude-5e7ecda3-whiskey-work.md.  

**TOOLS USED**  
- PRISM helpers: `.claude/helpers/chat-slots.mjs`, `.claude/helpers/loop-state.mjs`, `audit-close-out-candidates.mjs`.  
- Build scripts: `scripts/lathe-closed-loop-full.mjs`, `scripts/lib/crossroad-auto-decide.mjs`.  
- Extraction: `/pdf-learn` (Ollama‑driven), curl for Ollama calls.  
- Cron: durable overnight cron `dcdc0189` (30 min).  
- Dispatchers: turningDispatcher, safety evaluator dispatcher.  

**OPEN THREADS**  
1. Rung C CAD geometry leg – need Python B‑rep bridge to feed TurningCADImportEngine.  
2. Vision‑route tribal ingestion – process image‑heavy PDFs/videos/MIT courses to reach 500 tips.  
3. FE/BE gaps (U‑W7) – collision‑zone logic pending.  
4. Kienzle rename (U‑W8) – operator‑only, reverse‑DNS required.  
5. Session reset – `/compact` needed; cron will resume on fresh budget.  
6. GPU‑gated live vision drain + tribal – pending GPU availability.  
7. Boring‑bar‑selection feature – select stiffer bar / recommend steady rest for deep bores.
