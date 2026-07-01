---
name: blueprint-vision-galaxy
type: architecture
domain: blueprint-vision
audience: [xray, delta, kilo, charlie, india, foxtrot, whiskey, mike]
authored_by: xray
authored_on: 2026-05-29
related:
  - open-source-vision-options-for-blueprint-ocr
  - blueprint-vision-multi-print-discipline
  - blueprint-vision-extraction-confidence
  - print-to-program-pipeline-canonical
  - domain-blueprint
---

# Blueprint-Vision Galaxy (slot:xray)

**Why this exists:** slot:xray owns PRISM's vision/extraction pipeline — turning unstructured inputs (blueprints, PDFs, raster scans, native CAD files) into structured PRISM data (features, tolerances, GD&T callouts, geometry, materials). It closes the dedicated-extraction-slot gap that was previously fragmented across delta/cad, kilo/cam, and charlie/quoting. Galaxy dir: `mcp-server/src/engines/blueprint-vision/` (CLAUDE/MEMORY/PATHS/TOOLBELT.md).

**Where to use it:** any time a print, PDF, or native CAD file must become structured data for a downstream consumer (quote, program, inspection plan).

## The pipeline (canonical order)

1. **Source-SHA dedup** vs `state/shared/blueprint-accuracy-events.jsonl` — never re-extract the same source.
2. **Multi-print split** (if container) — `scripts/extract-jm-die-corpus-page-by-page.py`, one result per print ([[blueprint-vision-multi-print-discipline]]).
3. **Per-print extraction** — raster→`prism_cad:cad_pdf_blueprint_extract`; vector/native→`cad_dxf_geom_parse` / `cad_step_parse_file` / `cad_fcstd_parse` / `cad_f3d_parse` / `cad_stl_analyze`.
4. **Low-confidence rescue** — `cad_pdf_pattern_rescue_extract` or vision-LLM (`scripts/lib/ollama-vision-extract-lib.mjs`).
5. **GD&T + tolerance** — `cad_gdt_callout_parse` + `cad_fcf_validate` (datum-tie), `cad_tolerance_*`. Normalize to mm.
6. **Confidence + cross-check** — per-field `confidence: 0..1`; geometry-volume-vs-file-size guard against silent-empty parse ([[blueprint-vision-extraction-confidence]]).
7. **Emit + ledger** — `blueprint_to_quote` (charlie) / `print_to_program_full` (kilo) + ledger entry.

## Verified asset surface (2026-05-29)

~30 real engines (OCR, PDF-blueprint, GD&T/tolerance, per-format parsers, orchestration) — primary OCR is `BlueprintVisionOCREngine`. **Primary dispatcher: `cadDispatcher.ts`** (~40 actions). Full verified inventory in the galaxy `CLAUDE.md` / `MEMORY.md`. **Caveat:** the original alpha seed named 21 engines that do not exist — always verify a name on disk before referencing it ([[feedback_xray_verify_engine_name_before_reference]] in the memory vault).

## PSN edges

Produces input for: delta/cad (features), kilo/cam (`print_to_program_*`), charlie/quoting (`blueprint_to_quote`), india/ai-training (extraction outcomes → GNN/LoRA). Consumes infra from: lima/pdf-corpus (pypdf), victor/dormant-data (`extracted/`).

## Standing gaps

No native reader for SAT, OBJ, FBX, X_T (Parasolid) — forge or vendor SDK required. Mixed-unit handling weak in some legacy parsers.
