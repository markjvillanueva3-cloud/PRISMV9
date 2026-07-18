---
name: reference_catalog_cutting_param_extractor_2026_06_24
description: "Phase-B per-tool cutting-param extractor for the 287 tooling vendor catalogs (papa, 2026-06-24) — reads the SFM/feed tables printed IN the catalogs, not ISO-aggregate guesses."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.506Z
aliases: reference_catalog_cutting_param_extractor_2026_06_24
---


PDF-TRIBAL-HERMES/U-CATALOG-CUTTING-PARAMS (slot:papa, 2026-06-24, committed slot/papa). Built per operator directive "build tribal knowledge for each tool — parameter and SFM specs relative to material type, toolpath type and coatings; don't skip over anything."

**The gap it closes:** the ~28 per-vendor extractors (`extract-accupro.py` etc.) pull tool GEOMETRY only (dia/flute/OAL/order#); `enrich-catalog-cutting-data.mjs` (Phase A) then attaches GENERIC ISO-aggregate cutting data (confidence 0.4-0.5). NEITHER reads the SFM/feed RECOMMENDATION tables printed IN the 287 catalog PDFs (8.3 GB, `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/`, recursive). This extractor does — Phase B.

**Files (all `scripts/`):** `catalog-cutting-page-extract.py` (fitz front-end, selects speed/feed pages deterministically) · `extract-catalog-cutting-params.mjs` (Ollama-first qwen2.5-coder:32b structured extraction, $0 Claude; 24-test `.test.mjs`) · `install-catalog-cutting-params-task.ps1` (durable scheduled task).

**Output:** `mcp-server/data/catalog-cutting-params/<slug>.json` — `records[]` (per series×ISO: vc/sfm, fz/fn, coating, tool_type, operation, source_page, confidence) + `manufacturerSpeedFeed[]` (compatible with oscar's `ManufacturerSpeedFeed {series,isoGroup,vc_min/max,fz_min/max}` → `ToolCatalogEngine`/SFC). Plus per-tool tribal tips → `state/shared/pdf-tribal-tips/catalog-cutting-tips.jsonl` → existing tribal-embed pipeline (feeds RAG/GNN/LoRA + tribal-by-domain inject). `advisoryOnly:true, must_human_verify:true`.

**Design wins:** recursive over all 287; page-WINDOWED resume (`PRISM_CATALOG_PAGE_WINDOW=30`/run, nothing skipped, survives reaper/30-min-task cutoff); merge-accumulate per catalog; durable scheduled task `PRISM Catalog Cutting Params` (every 35 min, indefinite) so the reaper (which kills in-session node/python at exit 255) can't stop it.

**3 real bugs found+fixed during the live proof (R12):**
1. vendor mislabel — `GC_2023-2024` = **Tungaloy** General Catalog (grades T9215/AH62xx; slogan "we ADD"), NOT Sandvik; greedy `gc_20→sandvik` rule.
2. feed-type confusion — LLM conflated fz (milling, mm/tooth ≤~0.5) with fn (turning, mm/rev); impossible 4 mm/tooth from reading an ap/depth column. Fix: `feed_type` per tool_type, magnitude caps (FZ 1.5, FN 3.0 mm), MSF includes per-tooth only.
3. ISO label variance — `"ISO M"` parsed null (the S in I-S-O); material names not mapped. Fix: `normalizeIso` (strip "ISO" token, map material names → P/M/K/N/S/H, reject ambiguous like "SM").

**PROVEN live:** Tungaloy GC milling → 14 records, valid ISO, fz 0.002-0.02 mm/tooth (milling) / fn 0.2-1.5 mm/rev (turning). Status: `node scripts/extract-catalog-cutting-params.mjs --status` (287 total). Also re-armed zulu's general resources drain (its one-shot 14h window expired 12:44 today; 4218 PDFs remaining). Related: [[reference_catalog_extraction_pipeline_gap_2026_05_31]] (prior pipeline was design-only). Cutting-data is oscar's SFC domain — coordinate ingest of the JSON store into ToolCatalogEngine.
