# quoting session 5e7ecda3 (2026-06-26, 35.8MB, spine 234KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U‑W0‑MASTER‑PLAN` – plan file `state/shared/specs/KIENZLE‑LATHE‑WIZARD‑MASTER‑PLAN‑2026‑06‑26.md`.  
- `U‑W2‑CLOSED‑LOOP‑DRIVER` – `scripts/lathe‑closed-loop-full.mjs`; runs Rung A over 34,993 `.MIN`, Rung B roundtrip, Rung C OCR→print→compare; single dashboard.  
- `U‑W3A‑CORPUS‑ALL` – scans all 34,993 JM lathe programs (JM DIE/OKUMA + CNC LATHE).  
- `U‑W3B‑DRIVER‑TEST` – moved `lastJson` helper to shared lib; 7/7 node tests pass.  
- `U‑W3C‑OVERSPEED‑SAFETY` – outputs `lathe‑overspeed‑risk.json`; 545 G96‑CSS programs lack G50 cap.  
- `U‑W3‑PARTKEY` – part‑number join key; 75.3 % (26,357/34,993) have ≥2 revisions.  
- `U‑W6` – tribal ingest `/pdf‑learn`: resumable, skips image‑heavy PDFs, uses curl to Ollama; extracted 23 real tips from Okuma OSP manual + catalog.  
- 15 R14 cleanup commits (orphans auto‑reaped).  
- `U‑W2C` – Rung C CAD geometry leg (PDF→OCR→pipeline vs cloud).  
- `U‑W2C‑FIX` – resolved false‑positive “full_geometry_loop_closed” P1.  
- `U‑W2D` – safety/efficiency scorer (collision, overspeed, overpower, cycle time, MRR).  
- `U‑W2E` – unified dashboard for Rung C + safety.  
- `U‑W2F` – dashboard shows real Rung A data: 34 993 .MIN, SFM p50 182.2, G50‑cap 98.3 %.  
- `U‑W2G/H/I` – wired safety/efficiency to Rung B harness + dashboard.  
- `U‑W2K` (`680145c933`) – fixed boring‑bar overhang false positives (40→20 violations).  
- `U‑W2L` (`0da80516aa`) – replaced flat 40 mm stickout with real reach; collision FP 20→10.  
- `U‑W2M` (`2f3ef5448d`) – records `collision_fail_types`; confirms genuine part_off flags.  
- `U‑W2N` (`ef88365089`) – added `requiredPartingBladeMm` helper; collision FP 10→0.

**DECISIONS**  
- Brand string → “Kienzle”.  
- Ground‑truth dataset → `.MIN`.  
- App bundle ID stays `tools.prism.app` until operator supplies reverse‑DNS.  
- Rung C‑CAD geometry leg blocked: `STEPGeometryParserEngine` emits only entity counts; needs Python B‑rep bridge.  
- “96.3 % in‑band” = synthetic‑grid agreement, real‑program accuracy ≈41.6 %.  
- Hold for reset when token zone >65 % (RED); no new build until `/compact`.  
- After GPU freed, prioritize boring‑bar overhang fix (`U‑W2K`).  
- Defer collision‑check softening to fresh budget; safety gate requires physics‑reviewer.  
- Stop only on genuine spiral or all units built.

**OPERATOR DIRECTIVES**  
- Name change to Kienzle already applied.  
- No operator input until `/compact` issued after ~800 k tokens.  
- AUTONOMOUS OVERNIGHT BUILD (slot:whiskey, session 5e7ecda3):  
  1. Read handoff & spec.  
  2. Build dependency‑ordered units U‑W2 → U‑W8.  
  3. Run `duplicationGuardEngine` before new asset.  
  4. Commit each unit `[MAIN‑FORCE] [KIENZLE‑LATHE‑WIZARD]/U‑ID`.  
  5. Tick `loop-state.mjs` with `<unit>` note.  
  6. Every ~3rd run `audit-close-out-candidates.mjs`.  
- Defaults: brand='Kienzle', appId unchanged, ground-truth='.MIN'.  
- Route mechanical text to Ollama (curl); reserve Claude for physics/safety/synthesis.  
- Stop only on genuine spiral or all units done.

**FINDINGS/BUGS**  
- `STEPGeometryParserEngine` cannot provide B‑rep → Rung C‑CAD dead end.  
- Node’s `fetch` fails on localhost Ollama; use curl instead.  
- 10 PDF prints: 2 real tips, 8 image-heavy → skipped for vision route.  
- GPU blocked by peer slot (`qwen2.5-coder:32b`) delaying live vision & tribal max‑out.  
- False positives in boring‑bar deflection (used part_length×1.2); fixed with `boringBarOverhangMm`.  
- Collision check “warning” incorrectly allowed SAFE; now vetoes any `passed:false`.  
- Real generator defect: 40/60 UNSAFE on Rung B due to boring‑bar & collision issues.  
- Groove/part stickout default 40 mm → FP 20→10.  
- Parting blade width default 3 mm → FP 10→0; corrected by spec.  
- Residual 20 collision failures are genuine deep‑bore deflection flags.

**DOMAIN SPECIFICS**  
- Engines/dispatchers: `TurningPrintIntakeEngine`, `BlueprintVisionOCREngine`, `LatheTurningFeatureRecognizerEngine`, `TurningCADImportEngine`, `LatheLoRASafetyEvaluatorEngine`, `turningDispatcher`, `TurningPrintToProgramEngine`.  
- Metrics: feed p50 = 0.003 IPR, SFM p50 ≈ 182.2, G96‑cap compliance = 98.3 %, overspeed‑risk count = 545, 75.3 % programs ≥2 revisions, real-program accuracy ≈41.6 %.  
- Paths: `state/shared/specs/KIENZLE‑LATHE‑WIZARD‑MASTER‑PLAN‑2026‑06‑26.md`, `scripts/lathe‑closed-loop-full.mjs`, `scripts/lathe-rungc-ocr-loop.mjs`.  
- Architecture: Rung A (empirical bands over all .MIN), Rung B (PRISM generator vs cloud + safety scoring), Rung C (geometry leg via OCR).

**TOOLS USED**  
- PRISM core: `/checkin`, `chat‑slots`, `loop-state.mjs`, `audit-close-out-candidates.mjs`.  
- Duplicate guard: `duplicationGuardEngine`.  
- OCR & PDF ingestion: `BlueprintVisionOCREngine`, `pdf-learn` (Ollama via curl).  
- Dispatchers: `turningDispatcher`, `LatheLoRASafetyEvaluatorEngine`.  
- Testing: node tests for shared lib (`lastJson`).  
- Vision: Ollama (curl‑based generator); llama3.2‑vision pending.  
- Hooks: `self-compact.mjs`, `fleet-reaper`, `reaper-storm-breaker`.  
- Physics review: `physics-reviewer`.

**OPEN THREADS**  
- Rung C‑CAD geometry leg still pending; requires Python B‑rep bridge.  
- Vision route for image-heavy PDFs (llama3.2‑vision) to hit 500‑tip target.  
- Cross‑lane units U‑W7 (FE/BE API gaps) & U‑W8 (Kienzle rename) await fresh budget after `/compact`.  
- Cron `dcdc0189` armed; needs operator `/compact` once session ~800 k tokens.  
- GPU‑blocked live vision drain + tribal pending; resume when free.  
- Parting blade width scaling feature (fresh budget, physics review).  
- Boring‑bar selection improvement for deep bores – future work.
