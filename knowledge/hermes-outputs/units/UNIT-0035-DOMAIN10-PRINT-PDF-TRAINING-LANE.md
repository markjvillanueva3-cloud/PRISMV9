# UNIT-0035 — Print/PDF Training Lane Completion

**Unit ID**: 0035
**Domain**: CAD Modeling & Engineering (Domain 10)
**Title**: Print/PDF Training Lane Completion (classify the ambiguous residue)
**Status**: In Progress (vec2d lane shipped 2026-07-02, slot:delta)
**Priority**: P0
**Estimated Effort**: 4-6 hours

## Gap verdict (delta-cad agent, 2026-07-02 — `work/UNIT-0035-gap.md`)
**EXTEND** — OCR engine + ambiguous classifier + DXF reader all already exist. The 26,973 ambiguous PDFs are already routed to the live OCR worklist on this branch. Net-new = the vec2d lane (DXF reader unwired to training) + a tif branch + denominator reconciliation. ROI 7/10.

## Progress
- ✅ **2026-07-02 — vec2d DXF training lane SHIPPED** (design workflow → 14 defects folded → built + 26 tests + live-validated). Wires the validated `Drawing2DExtractionEngine.parseDxfContent` (previously unwired to any training lane) into a resumable `scripts/vec2d-to-training.mjs` → ledger → `scripts/build-cad-vec2d-dataset.mjs` producer → Alpaca `{instruction,input,output}` pairs, registered as advisory source `cad-vec2d-training` (auditor + inventory + night-chain Stages 7+8). [[reference_delta_vec2d_lane_2026_07_02]]
  - **HONEST LIVE FINDING (R12, gates the value claim):** on the real JM corpus, MOST DXF DIMENSION entities are **associative** — group-42 = `-1` sentinel, real value in def-points (codes 13/14) the reader does not resolve. The lane FILTERS non-physical dims (value ≤ 0, counted as `sentinelDims`) so it never trains on `-1` noise, and correctly extracts real exact dims where group-42 IS resolved (proven live: a 6-dim inch pair 1.5/2/3.37/3.9999/0.08 in + angular). 200-file sample: 1 dimensioned + 89 no-dims + 62 sentinel dims dropped + 110 dwg fail-loud → 3 unique pairs. So the lane delivers: real-dim pairs where present + units-discipline doctrine + coverage observability + mm-anomaly surfacing (7/90 JM DXF claim mm) — NOT the high-volume exact-dim signal originally assumed.
- ⏭ **Queued follow-up (engine enhancement, unlocks the majority):** resolve associative-dim values from def-points (codes 13/14 linear distance; 10/15 radial) in `parseDxfContent` + dist rebuild + engine-test — raises real-dim yield from the minority to most of the 9,280 readable DXF. Separate unit (engine change to a shared file, own scrutiny).
- ⏭ **Also remaining (per gap):** tif → png raster branch (124 files); denominator reconciliation (~233K unclassified pdf vs the 111,745 juliett-classified); the ambiguous-bucket precision harness. `.dwg` (247) is fail-loud (no ODA SDK — ask-before-library).

## Description

Close the print training lane so **every** print in the H drive feeds the closed-loop decipher/train pipeline. The part-decipher lane already covers deterministic prints; this unit resolves the **26,973 ambiguous-bucket** documents (of 344,688 pdf) plus the **9,527 vec2d** and **124 tif** classes that currently have NO training lane. Goal-critical: "prints" is one of the three named asset classes and is the largest by volume.

## Acceptance Criteria

- [ ] Ambiguous-bucket count reconciled against a fresh enumeration (cite the worklist file)
- [ ] A classifier routes each ambiguous doc into {print | non-print-doc | multi-print-split | unreadable} with a confidence, appended to the decipher worklist
- [ ] vec2d (DXF/DWG/SVG) parser extracts geometry primitives → training pairs (real file sample proven, not mocked)
- [ ] tif raster prints routed through the existing OCR lane (lima pypdf / xray blueprint-ocr) — no new OCR engine (dedup)
- [ ] Real-data validation: ≥100 real ambiguous docs classified with a measured precision on a hand-checked sample
- [ ] Wired to `prism_cad` (decipher/classify action) or the night-chain harness in the same commit
- [ ] 3-of-3 scrutiny passed on real data; no stubs

## Dependencies

- UNIT-0034 (census)
- Existing: part-decipher stage, `scripts/blueprint-ocr-training-loop.mjs` (xray), lima pypdf extractor
- **GOTCHA**: multi-page prints — the title block (unit system) is on ONE page; pages 2+ lose it. Per-page OCR must carry forward the title-block units [[reference_xray_trainloop_multipage_units]]

## Deliverables

- Ambiguous-print classifier (reuse existing OCR/decipher; add routing only)
- vec2d geometry extractor
- Worklist expansion + night-chain wiring
- Validation report (precision on hand-checked sample)

## Autonomous Execution Notes

Gap-analyze FIRST (delta-cad agent) — much of this may already exist in xray's blueprint-ocr / lima pypdf lanes; the unit is likely ROUTING + a vec2d reader, not net-new OCR. Never re-extract prints already in the decipher worklist. Units are INCH at JM — resolve from the title block per print.
