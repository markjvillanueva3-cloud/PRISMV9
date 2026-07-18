---
name: reference_kilo_cam_fusion_enumerator_2026_05_29
description: "Fusion 360 live CAM parameter enumerator + ingest — the grounded Phase-2 catalog-fill pipeline (operator chose Fusion-first); add-in dumps live API params, ingest merges to catalog, never fabricates ranges"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.633Z
aliases: reference_kilo_cam_fusion_enumerator_2026_05_29
---


Phase 2 of the CAM feature-catalog buildout. After proving local sources can't ground exhaustive fill ([[reference_kilo_cam_catalog_grounded_source_feasibility_2026_05_29]]), the operator chose **build the Fusion enumeration add-in** (Fusion-first per CLAUDE-BRIEF CAM tier). Unit U-CAM-CAT-PHASE2-FUSION-ENUM (slot:kilo claude-1981bb83, 2026-05-29).

**The grounded pipeline (live API is the only complete source for Fusion params):**
- `scripts/cam-enumerators/fusion-cam-param-enumerator.py` — Fusion 360 *Script* (adsk.cam). Walks `cam.setups[].allOperations[].parameters[]`; per `CAMParameter` dumps name/title/valueType/value/expression/unit + enum choices when the API exposes them. **Fail-loud** top-level (clear dialog if no CAM product / 0 ops), **fail-soft** per-param (one bad `.value` never aborts the dump → recorded with `error`). Output JSON → `scripts/cam-enumerators/_raw/` (home-dir fallback). I CANNOT run it (executes inside Fusion) — wrote it defensively against the adsk.cam API.
- `scripts/ingest-fusion-cam-enum.mjs` — dump → `mcp-server/data/cam-functions/fusion360/_live-enum.json` (the engine glob-walks + de-dups, so it only ADDS coverage). Pure fns: `normalizeFusionStrategy` (camelCase→snake op-id), `parseUnit` (trailing token off expression), `normalizeParam`, `mergeFusionEnum` (de-dup by (op,param); a later grounded dump upgrades a prior `unverified`). Runs via `node` at the operator's step, so its catalog write never trips the Write-tool ingestion-cache guard.
- `scripts/ingest-fusion-cam-enum.test.mjs` — 10/10 node:test, incl. the load-bearing invariant: **no param ever carries a fabricated min/max**.
- `scripts/cam-enumerators/README-fusion-enumerator.md` — operator runbook (install Script in Fusion → run against `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` → `node scripts/ingest-fusion-cam-enum.mjs <dump>` → re-audit).

**Grounding guarantee (the one hard CAM never):** `default` only ever = live API value; min/max NEVER invented — Fusion's API doesn't expose ranges, so numeric params ship with `rangeSource:"not-exposed-by-fusion-api"` and no bounds (honest, not fabricated → no unsafe G-code); inaccessible value → `unverified:true`.

**E2E proven (guarded smoke with cleanup):** synthetic dump → ingest → audit rose Fusion 27/497 → 28/500 (+1 op/+3 params), then synthetic `_live-enum.json` deleted → baseline 27/497 restored (zero fake data ships). **Caught + fixed a real bug:** my payload's string `module:"live-enum"` field collided with the audit/engine `section??module??json` container-unwrap (string isn't an object → walker bailed → operations[] never walked). Renamed to `module_id`. The E2E smoke is what surfaced it — a unit-test-only build would have shipped a silently-non-ingesting pipeline (R12).

**Status:** ⏭ awaiting operator running the Script in their live Fusion seat. Next: Mastercam C-Hook enumerator once Fusion coverage proven on real dumps. Plan: `H:/.claude/plans/rippling-inventing-hopper.md` §Phase 2. See [[reference_kilo_cam_catalog_query_2026_05_29]] · [[reference_kilo_cam_catalog_grounded_source_feasibility_2026_05_29]].
