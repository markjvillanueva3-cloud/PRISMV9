---
name: reference_brand_catalog_app_search_wire_2026_06_19
description: "Wired the 72,406-tool brand catalog into the app's /tool/search (slot:romeo 2026-06-19). Additive registry-shard emit — no route/registry/FE edit. Durability via tracked source + untracked-by-convention shards. geometry_plausible gate caught by 3-of-3."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_brand_catalog_app_search_wire_2026_06_19
---


**BRAND-CATALOG-APP-WIRING** (slot:romeo, 2026-06-19). Work order: reorient romeo + build the catalog→search wire (the one open thread from `BRAND-CATALOG-APP-WIRING-2026-06-19.md`). Commits `bab5a1d45d` (wire) + `36d17ae7a5` (P1 gate) + `3696c4deb8` (P2 count) on `cad-fusion-live-ms0`.

## The wire (purely additive — no route/registry/FE edit)
The web app's "Search tool catalog (75K+ tools)" field → `POST /api/v1/data/tool/search` → `toolRegistry.search()` (`mcp-server/src/routes/data.ts:60`) served only the existing extracted/curated tools, NOT the 72,406-tool brand catalog (which existed only as gitignored CAM lane files + a metadata-only index). Key insight: **`ToolRegistry.load()` auto-ingests every `.json` under `DATA_DIR/tools` (= `H:/prism/data/tools`) into the `CuttingTool` schema.** So emitting the corpus there as `CuttingTool`-schema JSON makes the EXISTING route + EXISTING frontend serve it — zero route/registry/FE edit.

- `scripts/lib/brand-catalog-to-cuttingtool.mjs` — pure `toCuttingTool(rec)` mapper. Populates exactly the fields `ToolRegistry.buildIndexes()`+`search()` read: type/manufacturer/vendor/category/coating/cutting_diameter_mm(+geometry.diameter)/flute_count. Ids namespaced `BC::<slug>::<id>` (collision-proof vs existing lowercase ids).
- `scripts/emit-brand-catalog-registry-json.mjs` — `loadBrandCatalog().records` → map → 26 per-brand shards into `data/tools/`. Idempotent (`clearPriorShards` prefix-scoped to `brand-catalog__*`).
- Wired into `scripts/cam-tool-library-cron.mjs` (regenerates with the CAM lanes).
- LIVE: real `ToolRegistry` serves **86,373** tools (incl. all 72,406 brand); Sandvik 4,118; `BC::SANDVIK::W4N1M03003RAT` @ Ø3mm.

## Durability is by REGENERATION, not git-tracking (the spec's "tracked store" was a false premise)
`data/tools/*.json` is **untracked by repo convention** — the existing 14 tool files there are ALSO untracked. The brand SOURCE corpus (`mcp-server/src/data/*.json`, 63 files) IS git-tracked, so the shards regenerate on any clone via the emitter/cron — same pattern as the existing tool corpus. So do NOT force-commit 30MB of regenerable shards; commit the code+source, regenerate the output. (The original spec assumed a "tracked store" must exist; the repo's actual convention is generate-from-tracked-source.)

## Lesson — the 3-of-3 caught a real shipped-data defect (geometry_plausible gate)
Arm A (P1): the mapper ignored the loader's per-record `geometry_plausible` flag → **821 bogus diameters** (e.g. thread-code `YG1-380.0` parsed as a 380mm "drill") leaked into the searchable diameter index. The SIBLING emitter `scripts/emit-brand-tool-libraries.mjs` already filters these (R7/R8 inconsistency). Fix: when `geometry_plausible === false`, drop the diameter (top-level + geometry) but KEEP the catalog entry (searchable by name/type) — the catalog use case differs from the CAM-lane (which drops the whole record). Always check whether a sibling that consumes the SAME corpus already has a data-quality filter you're missing. → [[feedback_audit_consumers_when_moving_logic_into_engine]]

## Reorientation context (romeo 6/09–6/19)
67 commits, two arcs: TOOL-LIBRARIES (brand catalog → CAM seats, 72K tools, 7 lanes, COMPLETE) + WIRING-triage (harness + unwired audit; core wiring now DRY, 7 vendor bridges WIRE-EXEMPT). The 6/16 one-shot mine ([[reference_romeo_oneshot_mine_2026_06_16]]) digested all 201 romeo sessions. This wire was the single genuinely-open backend thread.
