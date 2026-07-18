# speed-feed session 5e7ecda3 (2026-06-26, 35.8MB, spine 234KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U‑W0‑MASTER‑PLAN` – bounded 4‑gate plan (KIENZLE‑LATHE‑WIZARD‑MASTER‑PLAN‑2026‑06‑26.md).  
- `U‑W2‑CLOSED‑LOOP‑DRIVER` – `scripts/lathe-closed-loop-full.mjs`; runs Rung A over 34,993 `.MIN`, Rung B roundtrip, Rung C OCR→print.  
- `U‑W3A‑CORPUS‑ALL` – full JM lathe corpus processed (JM DIE/OKUMA).  
- `U‑W3B‑DRIVER‑TEST` – extracted `lastJson` lib; 7/7 node tests.  
- `U‑W3C‑OVERSPEED‑SAFETY` – `lathe-overspeed-risk.json`; 545 overspeed‑risk programs.  
- `U‑W3‑PARTKEY & U‑W3D‑RUNG‑C SCHEALED` – part‑number join key; 75.3 % pairing scaffold for Rung C.  
- `U‑W6‑TRIBAL‑INGEST` – resumable `$0` Claude Ollama pipeline; 23 tips extracted (`/pdf-learn`).  
- `aee90250e3` – U‑W2C: Rung C CAD geometry driver (PDF→vision OCR→pipeline→score).  
- `d8c5c13cb7` – P1/P2 fixes for U‑W2C.  
- `15cc0716d3` – U‑W2D safety/cost/efficiency scorer (collision, overspeed, overpower, cycle time, MRR).  
- `17dd0e22e7` – U‑W2E fold Rung C + safety into unified dashboard.  
- `645f752a0e` – U‑W2F dashboard shows real Rung A: 34,993 `.MIN`, SFM p50 182.2, G50 cap 98.3 %.  
- `abe0d625ad` – U‑W2D‑C‑FIX resolve “SAFE on failed collision”.  
- `e9206fb1cf` – U‑W2G safety/efficiency wiring into Rung B roundtrip harness.  
- `54c888e8ff` – updated memory with exact archetype targets for boring‑bar & collision failures.  
- `680145c933` – U‑W2K: fix boring‑bar overhang pre‑check (depth‑aware, reduces false positives).  
- `0da80516aa` – U‑W2L: groove/part collision stickout default replaced with real reach.  
- `2f3ef5448d` – U‑W2M: collision‑fail instrumentation added; pinning residual failures to `part_off`.  
- `ef88365089` – U‑W2N: parting blade width computed from bar geometry; reduces false flags.

**DECISIONS**  
- Brand string “Kienzle”; ground truth `.MIN`; app bundle ID stays `tools.prism.app` until reverse‑DNS supplied.  
- Rung C CAD geometry leg blocked – STEPGeometryParser only returns counts; need Python B‑rep bridge (STEP→CAD faces/edges).  
- Dedup guard: `TurningPrintIntakeEngine` already provides print→`TurningInput`; no new engine required.  
- GPU‑blocked live vision drain deferred until fleet GPU frees (`qwen2.5‑coder:32b` saturated).  
- Boring‑bar overhang pre‑check over‑pessimistic fixed; collision‑veto‑fails remain unresolved.  
- U‑W7 FE/BE orphan pages & U‑W8 rename not required now (cross‑lane/operator‑only).

**OPERATOR DIRECTIVES**  
- Set brand to “Kienzle”; keep appId unchanged until reverse‑DNS supplied; ground truth `.MIN`.  
- Run yolo‑mode overnight build with unit sequence: `U‑W2 → U‑W3 → … → U‑W8`; rename platform to Kienzle in `U‑W8`.  
- Route mechanical text to Ollama; reserve Claude for physics/safety/synthesis.  
- Stop only on genuine spiral or all units completed (then loop‑state end + 3‑of‑3 scrutiny).  
- Do NOT re‑run `/checkin` after handoff.

**FINDINGS/BUGS**  
- Rung C via STEP dead end; `STEPGeometryParser` returns only counts, no B‑rep geometry.  
- Node‑fetch fails on localhost Ollama; curl must be used instead (wiki entry added).  
- 96.3 % in‑band figure from synthetic grid tests; real‑program accuracy ~41.6 %.  
- U‑W4 (Okuma engines) & U‑W5 (LoRA safety engine) unwired claims stale; they are wired.  
- Tribal drain stalls on image‑heavy PDFs; added `skipped` markers to advance cursor.  
- GPU contention blocks live vision OCR; `full_geometry_loop_closed` stays FALSE until GPU frees.  
- Boring‑bar pre‑check over‑estimated unsupported length → 40/60 UNSAFE false positives; fixed with depth‑aware overhang.  
- Collision‑veto‑fails (20) persist; collision logic still needs review/fix.

**DOMAIN SPECIFICS**  
- Engines/Actions: `TurningPrintIntakeEngine`, `BlueprintVisionOCREngine`, `LatheTurningFeatureRecognizerEngine`, `TurningCADImportEngine`, `turningDispatcher`, `LatheLoRASafetyEvaluatorEngine`, `LatheCollisionZoneEngine`.  
- Metrics: feed p50, SFM p50 182.2, G96‑cap compliance 98.3 %, overspeed‑risk count 545, false‑flag counts reduced (e.g., from 40 to 20).  
- Unique paths: `scripts/lathe-closed-loop-full.mjs`; `state/shared/specs/KIENZLE-LATHE-WIZARD-MASTER-PLAN-2026-06-26.md`; `HANDOFF-claude-5e7ecda3-whiskey-work.md`.

**TOOLS USED**  
- PRISM helpers: `/checkin-whiskey` wrapper, `chat-slots.mjs`, `system-viz-query.mjs`.  
- Ollama offload: `scripts/lib/ollama-verified-offload.mjs`; node fetch workaround (curl).  
- Node scripts: `lathe-closed-loop-full.mjs`, `audit-close-out-candidates.mjs`, `lathe-band-score.mjs`, `lathe-rungc-ocr-loop.mjs`.  
- PDF ingestion skill `/pdf-learn` (vision+text pipeline).  
- Dedup guard engine `duplicationGuardEngine`; loop control via `H:/prism/.claude/helpers/loop-state.mjs`.

**OPEN THREADS**  
- Rung C CAD geometry leg: need Python B‑rep bridge to convert STEP to CAD faces/edges.  
- GPU‑probe live drain: run when fleet GPU frees to complete Rung C geometry validation (`full_geometry_loop_closed`).  
- Collision‑veto‑fails resolution: investigate and fix collision logic; 20 failures remain.  
- Tribal corpus expansion to 500 tips: process remaining image‑heavy PDFs, videos, MIT courses; requires fresh budget.  
- U‑W7 FE/BE orphan pages & U‑W8 rename: cross‑lane/operator‑only, deferred until brand decision finalized.  
- Context reset: session ~800 K tokens; native auto‑compact will trigger soon; `/compact` must be issued manually to resume on fresh budget.  
- Boring‑bar‑selection feature: requires fresh budget for stiffer bar/steady rest recommendation.
