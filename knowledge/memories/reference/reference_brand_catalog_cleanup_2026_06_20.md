---
name: reference_brand_catalog_cleanup_2026_06_20
description: Fusion brand tool-library cleanup -- type-aware plausibility gate dropped ~3824 source mis-parse presets (endmill-oversize 2038->0); slot:romeo 2026-06-20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_brand_catalog_cleanup_2026_06_20
---


**BRAND-CATALOG-CLEANUP (slot:romeo, 2026-06-20)** — operator-approved follow-up to U-FUSION-LIB-ASSESSMENT.

Two commits on `cad-fusion-live-ms0`: `5c99eb8855` (cleanup) + `a3a9dfa082` (3-of-3 P2 hardening). 3-of-3 scrutiny PASS (all arms live-verified the drops are genuine mis-parses, no real tools lost).

**The bug:** the brand tool catalogs (19 `PRISM_<brand>.tools` in Fusion `Local/`) carried ~3,824 physically-impossible presets from source mis-parses. Root cause: `scripts/lib/brand-tool-catalog.mjs` `isPlausibleGeometry` was **type-BLIND** — its category ceilings (`indexable_mill` ≤320mm, sized for real face mills) admitted mistyped end mills. E.g. ISCAR `M ECS-A1.00X06-2T` `cutting_diameter_mm:102.67` on a `shank_diameter_mm:5.99` (17× ratio — impossible); MA Ford `MA-6.0000-3F` 152.4mm with a 1625mm OAL.

**The fix (type-aware):** new exported `isEndmillOversizeDia(category, typeStr, dia)` — an end-mill-TYPE tool (flat/ball/bull; `FACE_MILL_RE` spares face/shell) with Dc > `ENDMILL_DIA_MAX_MM` (80mm) → `geometry_plausible:false` (emitter drops it from all 4 CAM lanes). Separately, a plausible Dc with an impossibly tiny shank (Dc/shank > `SHANK_RATIO_MAX`=8) → null the shank, KEEP the record (diameter usable; Fusion emitter falls back `SFDM = shank ?? Dc`). The two failure modes are distinct: **bad-diameter** drops, **bad-shank** repairs-in-place.

**Why not a blanket ratio drop:** the `Dc≫shank` ratio alone is ambiguous — some violations are a bad *shank* on a tool whose *diameter* is correct (ACCU-0.3750 = real 9.5mm 3/8" EM with a mis-parsed 0.8mm shank). Dropping on raw ratio would discard real tools. The type+threshold split is the safe discriminator.

**Legacy lib:** `PRISM_JM_Milling.tools` (15,994 vendor extract mislabeled JM_) is a SEPARATE pipeline (`extract-jm-milling-tools-fusion.mjs`, no shared gate) — cleaned via the new reusable `scripts/clean-fusion-tools-misparse.mjs` (applies the same 80mm/8× policy directly to any emitted `.tools`; 15994→14160).

**Result (live-verified):** endmill-oversize **2038 → 0** across all 49 libs; 61,391 → 57,567 presets; JM real cribs + material-group CSVs untouched (parity still 0 failures). Reusable assets: `assess-fusion-tool-libraries.mjs`, `enumerate-brand-tool-misparse.mjs`, `clean-fusion-tools-misparse.mjs` (49 tests total).

**Still open (categorization, operator decision):** rename `PRISM_JM_Milling`→`PRISM_BRAND_Milling` (mislabel); the okuma/haas/hurco/roku named-machine cribs are holder-less clones of VMC/LTH. Report: `state/shared/jm-fusion-tools/FUSION-TOOL-LIBRARY-ASSESSMENT-2026-06-20.md`.

Sibling: [[reference_jm_fusion_matgroup_libraries_2026_06_01]] · [[reference_brand_cam_tool_libraries_2026_06_19]].
