---
name: reference-whiskey-kienzle-session-2026-06-26
description: "Definitive distillation of the Kienzle/Lathe-Wizard /goal session (slot:whiskey, 5e7ecda3) -- 15 commits, verified-true state, honest gaps, operational findings, exact next steps"
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.257Z
aliases: reference_whiskey_kienzle_session_2026_06_26
---


# Kienzle / Lathe-Wizard /goal -- session distillation (slot:whiskey, 2026-06-26)

Operator /goal: assess print->CNC-program-for-lathes wizard, build an exhaustive closed-loop test over ALL JM lathe data, max lathe tribal, build BE/FE, rename Lathe Wizard -> **Kienzle**. Plan: `state/shared/specs/KIENZLE-LATHE-WIZARD-MASTER-PLAN-2026-06-26.md`.

## Shipped (15 commits, all `[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-...`)
- **U-W0 master plan** + corrected stale `lathe/CLAUDE.md` (threadingPipelineDispatcher).
- **U-W2 closed-loop driver** `scripts/lathe-closed-loop-full.mjs` (Rung A + Rung B + dashboard).
- **U-W3A corpus-all**: Rung A `--all-roots` covers ALL **34,993 .MIN** (was 16,558 CNC-LATHE-only).
- **U-W3B** `scripts/lib/harness-last-json.mjs` (7/7) -- multi-line JSON parse lib.
- **U-W3C overspeed safety**: `state/shared/dashboards/lathe-overspeed-risk.json` = **545 programs** (G96 w/o G50 cap) by customer.
- **U-W3-PARTKEY** `scripts/lib/lathe-part-number.mjs` (8/8) -- Rung C join key.
- **U-W3D rung-C pairing**: 8042 parts / 26357 programs = **75.3% comparable**.
- **U-W0B** decisions resolved.
- **U-W6 / U-W6C tribal ingest** `scripts/lathe-tribal-ollama-ingest.mjs` (resumable, $0-Claude, curl+pypdf+qwen2.5-coder:32b). **23 real tips** extracted; skip-cursor advances past image PDFs.
- **U-W6B** wiki lesson (node-fetch/curl).

## VERIFIED-TRUE (surveys were stale -- R12 corrections)
- `threadingPipelineDispatcher.ts` EXISTS + wired.
- **U-W4** (4 Okuma engines: okuma_step_parse/macro_convert/manual_tips_extract/transcript_mine) = **ALREADY WIRED** (turningDispatcher:50-53,286-289). DO NOT rebuild.
- **U-W5** (`LatheLoRASafetyEvaluatorEngine`, 6 `lathe_lora_safety_*` actions) = **ALREADY WIRED** (turningDispatcher:355-360,1401+). DO NOT rebuild.
- 251 lathe engines are REAL (the MEMORY.md "STUB" line = doc-migration, not code).

## Honest gaps (R12 -- do not over-claim)
- **`full_geometry_loop_closed=false`**: the closed loop scores PARAMETERS, not real geometry. Rung B "96.3% feed in-band" is on a SYNTHETIC 60-input grid, NOT real-program accuracy (historical real-program ~41.6%). The gap is exactly why Rung C matters.
- **Rung C-CAD blocked**: `STEPGeometryParserEngine` is entity-COUNT-only, NOT a B-rep extractor -- it does NOT feed `TurningCADImportEngine.importSolid(CADSolidInput)`. Need the Python `cad-engine/` B-rep bridge for STEP, OR the OCR/PDF path (`BlueprintVisionOCREngine->TurningPrintIntakeEngine`) for the (few, electrode) PDF prints. See [[reference_whiskey_rungc_step_brep_gap_2026_06_26]].
- **Tribal 23 << 500 target**: most of the 12 lathe PDFs are IMAGE-HEAVY (catalogs, Siemens cycle docs) -> pypdf no-text -> need the **vision route** (llama3.2-vision:11b). Plus videos + 6 MIT courses + the broader ~80-PDF corpus. Multi-session.

## Operational findings (host-specific, reuse these)
- **node `fetch` is BROKEN for localhost Ollama on this host** -- even literal 127.0.0.1 fails (not just the known localhost->IPv6 issue). **Use curl subprocess** for all Ollama calls. [[node-fetch-localhost-ollama-broken-use-curl]] wiki.
- **Drain cadence: `--all --limit 1` ONLY** -- longer runs (--limit 3/7/11, foreground or bg) get reaped (exit 255) or time out (>5min on the GPU-contended 32b). The cron must use --limit 1 per fire.
- **Lane guard**: whiskey commits on the shared tree need `PRISM_GIT_ADD_LANE_DISABLE=1` + `[MAIN-FORCE]`.

## Next (fresh budget / cron)
1. Cron drains tribal `--limit 1` per fire (skip-cursor advances).
2. Build the vision route in the ingest tool (image catalogs -> llama3.2-vision -> tips) toward 500.
3. U-W7: 3 FE/BE lathe API gaps (QUEBEC-FE-BE-WIRING-MAP-2026-06-25, cross-lane quebec/india, VERIFY first).
4. U-W8: Kienzle rename (brand=Kienzle resolved; 10 surfaces REBRAND-SURFACE-2026-06-25, quebec-lane). D2 app-id needs an operator-owned reverse-DNS.
5. Rung C: wire the Python B-rep bridge OR the OCR/PDF path; flip full_geometry_loop_closed.

Decisions: D1 brand=**Kienzle**, D3 ground-truth=**.MIN** (both resolved); D2 app-id = operator-only (owned reverse-DNS), non-blocking.

Related: [[reference_whiskey_kienzle_closed_loop_u_w2_2026_06_26]] · [[reference_whiskey_rungc_step_brep_gap_2026_06_26]] · [[node-fetch-localhost-ollama-broken-use-curl]] · [[feedback_check_units_first]]
