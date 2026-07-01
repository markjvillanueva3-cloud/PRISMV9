---
name: reference-whiskey-kienzle-vision-route-u-w6-2026-06-26
description: U-W6-VISION -- lathe tribal vision-route + auto-discovery shipped; 2 P1 bug-findings (filter contamination + config-error-permanent-skip). Continues the Kienzle /goal (slot:whiskey).
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.257Z
aliases: reference_whiskey_kienzle_vision_route_u_w6_2026_06_26
---


# U-W6-VISION: lathe tribal vision-route + auto-discovery (slot:whiskey, 2026-06-26)

Continues [[reference_whiskey_kienzle_session_2026_06_26]] (the Kienzle /goal). Closes the G3-tribal blocker: image-heavy lathe PDFs (tool catalogs, Siemens cycle docs) that `pypdf` reads as <200 chars were dead-ended in `scripts/lathe-tribal-ollama-ingest.mjs` (marked `no-text` skipped, no vision route).

## Shipped (commit `[KIENZLE-LATHE-WIZARD]/U-W6-VISION`)
- **Auto-discovery** `scripts/lib/lathe-tribal-corpus-discover.mjs` (11/11 tests): globs the 6 verified lathe roots, filters by lathe-keyword whitelist. Corpus **12 hard-coded -> 48** lathe PDFs, rot-proof ("all means all"). The ingest seed is UNIONED with discovery (deduped).
- **Vision fallback** in the ingest: when pypdf text <200 chars -> PyMuPDF (fitz) raster (`Matrix(2,2)`) -> base64 PNG -> local vision model (`qwen2.5vl:7b`, Blackwell-resident) via **curl** (node fetch is broken for localhost Ollama on this host) -> transcription -> the SAME `extractTips()` step ($0-Claude). Flags `--vision`/`--no-vision`/`--vision-model`/`--vision-pages`/`--no-discover`/`--list`. Reused `extractTips` unchanged (R8 -- transcription is just a front-end).
- **LIVE-VALIDATED (R15):** image-heavy Sumitomo AC6020 catalog -> `via=pdf-vision`, **+15 real tips** (grade selection AC6020M/AC6135M, straight from the catalog cutting-data). schwanog grooving (text path) +15. corpus 49->71 this session.
- Un-skipped 8 stale `no-text` records so the drain re-processes them via vision.

## 2 P1 bug-findings (2-arm per-file scrutiny; arm A FAIL->fix->PASS)
1. **Filter contamination (R8/R13 -- never dilute a domain corpus).** Bare substring `"thread"` pulled `Helical Interpolation for Thread MILLING...pdf` (a MILL doc) into the LATHE tribal corpus. FIX: a `MILL_EXCLUDE` veto (`milling`/`end mill`/`endmill`/`face mill`) checked BEFORE the lathe-keyword test (drops mill docs even if they match `thread`), + word-boundary match for `"boring"` (kills the `neigh**boring**` false-positive) while keeping genuine turning threading/boring catalogs (carmex-threading, criterion-boring). Live proof: corpus 49->48 drops exactly the Thread-Milling doc. Lesson: an inclusion substring filter on a shared term (`thread`/`boring`) silently pulls the adjacent domain's docs -- add an explicit exclude-veto for the sibling domain + word-boundary the short/common tokens.
2. **Config error -> silent PERMANENT skip.** Ollama returns HTTP 200 + `{"error":"model ... not found"}` for a model-not-found; `curl -s` exits 0, so `transcribePage`/`extractTips` returned `""` -> the source was `markSkipped` (no-text) -> permanently burned from the resumable cursor even after the operator pulls the model. FIX: both functions now parse the body and THROW on a `body.error` field -> propagates as `retriable:true` (NEVER markSkipped). Lesson: a DETERMINISTIC-but-operator-fixable error (bad model id, missing dep) must be distinguished from a genuine no-data outcome -- only the latter earns an irreversible skip-marker; an HTTP-200 error body is the trap (exit 0 hides it).
- P2 (also fixed): terse-but-real pypdf text (40-199 chars) was force-routed to vision and discarded if vision also came up short -> now `via="pdf-short"` extracts the real text (SHORT_TEXT_FLOOR=40).

## Next (G3 continues + the remaining gates)
- **Drain the remaining lathe PDFs via the vision route toward 500.** ARMED 2026-06-26: scheduled task **"PRISM Lathe Tribal Drain"** (every 17min, `--all --limit 1 --vision-pages 2`, 8min ExecutionTimeLimit) -- the $0-Claude compounding mechanism (no existing drain task ran the lathe ingest; the others run `drain-resources-tribal.mjs`). CONSTRAINT (reconfirmed): `--limit 1` ONLY -- `--limit 3` times out / reaps; one image-PDF via vision yields ~15 tips in ~3-4min. Do NOT babysit the drain in Claude (R5/R14) -- the task compounds it.
- **G1 keystone still open:** STEP B-rep -> `CADSolidInput` (flip `full_geometry_loop_closed`). Mapped path: new `StepToCADSolidEngine` wiring `occt-import-js` (in `StepImportEngine.ts`) -> `TurningCADImportEngine.importSolid()`; `STEPGeometryParserEngine` is entity-count-only (NOT a source). See [[reference_whiskey_rungc_step_brep_gap_2026_06_26]].
- **G4:** global rename to "Kienzle Academy" already DONE (quebec U-Q-REBRAND); verify the lathe-wizard page in-name + FE/BE tsc.

Related: [[reference_whiskey_kienzle_session_2026_06_26]] · [[reference_whiskey_kienzle_closed_loop_u_w2_2026_06_26]] · [[node-fetch-localhost-ollama-broken-use-curl]] · [[feedback_all_means_all]]
