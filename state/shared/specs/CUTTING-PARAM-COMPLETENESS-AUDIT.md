# Cutting-Parameter Completeness Audit (Phase C)

> **Owner:** slot juliett (database-expansion) · **Date:** 2026-05-30 · **Status:** Phase C of 3 (audit → populate-from-existing+gaps → PDF parsing)
> **Trigger:** operator — "extract machining/calculator data (SFM, feed rate, cutting params, limits) from Charlie's new catalogs + check existing database for completeness so calculations are truly accurate."
> **Verdict:** Charlie's catalogs are cutting-data-EMPTY skeletons. Real cutting data exists elsewhere (moderately strong) with specific, enumerable gaps. This spec is the canonical driver for Phases A + B.

---

## 1. Charlie's new catalogs — status: EMPTY OF CUTTING DATA, ORPHANED

`mcp-server/data/catalog-extractions/` — 8 vendor JSONs (iscar, kennametal, mitsubishi, sandvik, seco, tungaloy, walter, zeni), ~250 tools total. Extracted 2026-05-24 from the monolith JS catalog (`PRISM_MAJOR_MANUFACTURERS_CATALOG.js`) via `ingest-monolith-catalog-js.mjs`.

- **`cutting_data: []` is EMPTY BY DESIGN** on every record (file notes: *"Phase B-1..B-5 (PDF camelot) will populate per-ISO tables"*).
- Records carry only: `vendor, catalog_number, name, type, substrate, grade, material_groups (ISO P/M/K/N/S/H), geometry (mostly null), application_scenarios`.
- **ORPHANED** — only `CatalogExtractionEngine.ts` (producer) + `CatalogExtractionResult.ts` (schema) reference `catalog-extractions`/`monolith-extracted`. **No speed/feed loader or calculator consumes them.**
- `data/extracted-knowledge/catalogs/catalog-extraction-1776034069822.json` — PDF extraction of Sandvik GC 2023/2024 + Korloy + SGS (~2,700 pages) on 2026-04-12 → **0 structured records** (Camelot table parser failed; raw_tables only).
- `data/catalogs/airfoil-profiles.json` — 207 NACA airfoils, NOT machining data (irrelevant).

**Conclusion:** nothing to extract from Charlie's catalogs for SFM/feed today. Their VALUE is a vendor/tool taxonomy skeleton that Phase A can *populate* by cross-referencing existing speed-feed data, and Phase B can *fill authoritatively* from the source PDFs.

---

## 2. Authoritative existing cutting-data sources (the calculator's real inputs)

| Store | Location | Coverage | Cutting params? |
|---|---|---|---|
| `UltimateSpeedFeedEngine.CUTTING_PARAMS` | `src/engines/` | 28 combos (6 ISO × ops × cut-type) | **STRONG** — [conservative,balanced,aggressive] tuples: Vc, fz, ap, ae% + coolant |
| `manufacturer-speed-feed-data.ts` | `src/data/` | ~200 series (Seco, Kennametal, Sandvik, OSG, Helical) | **STRONG** — vc_min/max + fz_min/max per ISO; **NO ap/ae** |
| `osg-speed-feed-data.ts`, `guhring-iscar-speed-feed-data.ts`, `helical-speed-feed-data.ts` | `src/data/` | ~150 series | **STRONG** — vc/fz per ISO |
| `hypermill-speed-feed-catalog.ts` (`HYPERMILL_MAT_TECHS`) | `src/data/` | 18 combos (16MnCr5, AlZnMg, VA) | **STRONG** — diameter-dependent Vc + fz + drilling feed |
| `widia-2022-turning-catalog.ts` + `tungaloy-turning-catalog.ts` → `turning-vendor-catalog-loader.ts` | `src/data/` | ~4,095 turning inserts + cutting_data | **STRONG (turning)** — ap/feed/Vc ranges per grade/ISO |
| `physics/constants.ts` (`CANONICAL_KIENZLE`, `CANONICAL_TAYLOR`) | `src/physics/` | 6 ISO groups | **BASELINE** — kc1.1+mc, Taylor C+n |
| `physics/constants.ts` (`CANONICAL_MATERIAL_DB`) | `src/physics/` | ~15 named materials | physics props + Taylor; **no per-ISO Vc/fz ranges** |
| `hypermill-materials-catalog.ts` | `src/data/` | 2,544 materials | machinability MULTIPLIERS only (no baseline Vc/fz) |
| 41K-tool catalogs (`*-tool-catalog.ts`, `*-tools-extracted.json`) | `src/data/` | 41,192 tools | **GEOMETRY ONLY** |
| `prism-reference-db/{materials,process,tools}.json` | `data/` | 1,980 + 1,141 + 956 | enrichment; minimal SFM |
| **empty `*-tools.json` stubs** (`emuge-tools.json`=`[]`, etc.) | `src/data/` | 0 | EMPTY — loader-target stubs; turning loader does NOT read them (consumer TBD — see §4 open item) |

**Lookup priority (for the calculator):** UltimateSpeedFeedEngine.CUTTING_PARAMS (baseline) → HYPERMILL_MAT_TECHS → manufacturer/osg/guhring/helical speed-feed → turning catalog cutting_data → physics constants (force/tool-life).

---

## 3. Canonical cutting-parameter record schema (the populate target)

A complete, calculator-ready record (3-tuple ranges = [conservative, balanced, aggressive]):

```jsonc
{
  "material": "AISI 1045", "iso_group": "P", "hardness_hb": 170, "hardness_hrc": null,
  "operation": "milling", "cut_type": "roughing",
  "tool_type": "end_mill", "tool_material": "carbide", "coating": "AlTiN",
  "tool_diameter_mm": 12, "flutes": 4,
  "cutting_params": {
    "conservative": {"vc_mpm": 90,  "fz_mm": 0.08, "ap_mm": 3,  "ae_pct": 25, "coolant": "flood"},
    "balanced":     {"vc_mpm": 140, "fz_mm": 0.13, "ap_mm": 8,  "ae_pct": 40, "coolant": "flood"},
    "aggressive":   {"vc_mpm": 185, "fz_mm": 0.18, "ap_mm": 15, "ae_pct": 65, "coolant": "flood"}
  },
  "kc1_1": 1800, "mc": 0.25, "taylor_C": 350, "taylor_n": 0.25,
  "source": "vendor_pdf|measured|physics_model|lookup", "source_citation": "...", "confidence": 0.95
}
```

---

## 4. GAP MATRIX (prioritized — what blocks "truly accurate" calculations)

| Pri | Gap | Current state | Fix (phase) |
|---|---|---|---|
| **P0** | Depth-of-cut (ap/ae) for vendor tools | only 28 hardcoded combos; manufacturer speed-feed files have Vc/fz but NO ap/ae | build ap/ae lookup by tool-type×ISO from turning cutting_data + PDFs (A+B) |
| **P0** | Tool-material × coating Vc multipliers | ISO-group only; ignores carbide/HSS/cermet/ceramic/CBN + TiAlN/AlCrN/DLC (5–40% variance) | multiplier table tool_material×coating → Vc factor (A) |
| **P1** | Hardness sub-banding within ISO | single `hardnessSpeedFactor`; no HB/HRC band → Vc lookup | hardness-band tables (P 150/250/350 HB; H HRC 42–60) (A/B) |
| **P1** | Coolant conditional adjustment | coolant baked per combo; no systematic multiplier | coolant→Vc/fz multiplier table (A) |
| **P1→RESOLVED** | Empty `*-tools.json` stubs consumer | `catalogLoader.ts:loadCatalog()` reads from `dist/data/*.json` (NOT src/data). Those are generated at BUILD time by `scripts/build-catalog-json.mjs` from the real `*-tool-catalog.ts` arrays (to keep 25MB out of the bundle). The src/data `[]` files are build-time PLACEHOLDERS, not the live data. **Not a silent-degradation bug provided the build runs.** Residual: verify `dist/data/*-tools.json` is populated post-build (Phase A build-verify). |
| **P2** | HSM/adaptive/trochoidal overrides | strategy field unused | HSM profile (+Vc,−fz,−ap/ae) (A) |
| **P2** | Material-specific within ISO (1018 vs 4140) | collapses to ISO group | per-named-material Vc/fz (B) |
| **P3** | Reaming/boring/thread-mill | sparse | specialist vendor data (B) |
| **P3** | Blind vs through hole feed adjust | field exists, unused | −15% fz blind holes (A) |

---

## 5. Phase plans (operator approved: all three in sequence)

- **Phase C (THIS doc) — DONE.** Audit + canonical schema + gap matrix + source inventory. Durable driver.
- **Phase A — populate-from-existing + close gaps (NEXT).** No PDF parsing. (1) Cross-reference Charlie's 250 tool skeletons against existing speed-feed sources by vendor+grade+ISO → populate `cutting_data` where a confident match exists (loud-flag unmatched). (2) Build the missing lookup tables: ap/ae by tool-type×ISO, coating/tool-material Vc multipliers, hardness bands, coolant multipliers. (3) **VERIFY + fix the empty-stub consumer** (P1). Emit a re-runnable audit/coverage script. Keep separate + cross-referenced; nothing overwritten without provenance. Checkpoint.
- **Phase B — parse source vendor PDFs.** Use lima's pypdf page-by-page extractor (canonical, [[feedback_use_lima_pypdf_page_extractor]]) on Sandvik GC 2023/2024 + Korloy + Seco + SGS to extract authoritative per-ISO Vc/fz/ap tables that Camelot failed on. Highest authority; fills P0/P2/P3. Checkpoint.

## 6. Open verification carried into Phase A
- **RESOLVED:** the empty `*-tools.json` stubs are read by `catalogLoader.ts` from `dist/data/` (build-generated), not src/data — build-time placeholder pattern, not a live bug. **Residual build-verify:** after `npm run build`, confirm `dist/data/*-tools.json` are populated (non-empty) — i.e. `scripts/build-catalog-json.mjs` actually emits the `*-tool-catalog.ts` arrays. If dist files are empty, the calculator IS missing vendor tools.
- **Existing engine to wire, not duplicate (graph hit):** `PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE` / `prism-intelligent-cutting-par...` / `prism-cam-cutting-param-bridge` exist — Phase A must check `duplicationGuardEngine` + wire into these rather than creating a new cutting-param engine.
- **Accuracy validation gate (Phase A):** any populated/recommended param set must pass the spindle-power-headroom gate (installed HP − 20%) per [[feedback_foxtrot_spindle_power_headroom]], and shop-floor safety tier (Ω≥0.95, S(x)≥0.98).

## 7. Consumers
Calculator engines (`UltimateSpeedFeedEngine`, turning via `vendorTurningCatalogExtractorEngine`), oscar (speed-feed-calculator domain owner), foxtrot (mill), whiskey (lathe), kilo (CAM). Charlie owns the frontend/quoting that surfaces these recommendations.

## 8. Phase B execution findings + CORRECTED VERDICT (2026-05-30, slot juliett, /loop iter 1)

> **R12 honesty correction:** Phase B was attempted and two of this audit's own §4 gap claims were found OVERSTATED. The correction layer the audit said was "missing" largely **exists, is cited, and is physically sound**. This section supersedes the §4 verdict where they conflict. The audit trail (§4 as-written) is preserved deliberately — do not silently rewrite it.

### 8.1 Phase B (parse vendor PDFs) — **BLOCKED: source PDFs not on this machine**
Exhaustive search of **all of H:** (`find /h -iname "*.pdf" \( sandvik|korloy|seco|sgs|coroguide|turning-catalog|GC_* \)`) returned **zero** vendor cutting-data PDFs. The audit's referenced prior extraction `data/extracted-knowledge/catalogs/catalog-extraction-1776034069822.json` **no longer exists** (the `extracted-knowledge/catalogs/` directory is absent). Only machine-handbook PDFs (wire-EDM: Mitsubishi/Sodick/Reliable-EDM) are on disk — not cutting-grade tables.
**Consequence:** Phase B as specified cannot run here. To proceed, the Sandvik GC 2023/2024 + Korloy + Seco + SGS source PDFs must be staged onto H: first (operator action), then `extract-jm-die-corpus-page-by-page.py` (lima) → table-parse → re-run `enrich-catalog-cutting-data.mjs` (auto-picks up populated `material_groups`).

### 8.2 §4 gap-matrix corrections (verified against current code)
| §4 row | As-written claim | **Verified reality** | Evidence |
|---|---|---|---|
| **P0 coating × tool-material Vc multipliers** | "ISO-group only; ignores carbide/HSS/cermet/ceramic/CBN + TiAlN/AlCrN/DLC" | **EXISTS + cited.** `COATING_MULTIPLIERS` (uncoated 1.0 → TiN 1.3 → TiAlN 1.5 → AlTiN 1.6 → CVD_Al₂O₃ 1.8 → Tiger·tec Gold 2.0 → CBN 2.5 → diamond 3.0) + per-tool-material `WEAR_COEFFICIENTS` (hss/carbide/cermet/ceramic/cbn/pcd). Cited to Walter Tiger·tec Gold + Sandvik/Kennametal coating studies. | `ExtendedTaylorModel.ts:145-161`; `UltimateSpeedFeedEngine.ts:1155-1162` |
| **P1 coolant conditional multiplier** | "coolant baked per combo; no systematic multiplier" | **EXISTS.** `COOLANT_MULTIPLIERS` dry 0.70 / mist 0.85 / MQL 0.95 / flood 1.00 / cryogenic 1.25. | `ExtendedTaylorModel.ts:166-172` |
| **P1 hardness sub-banding** | "single hardnessSpeedFactor; no HB/HRC band" | **PARTIAL→mostly-addressed.** ISO **sub-group** kc1+HB table (P1.1…P2.6, each with `hardness_hb`) + `hardnessSpeedFactor(HB, refHB)` linear correction (clamped 0.3–2.0). | `UltimateSpeedFeedEngine.ts:632-641, 2536-2550`; `ExtendedTaylorModel.ts:354-359` |

### 8.3 The ONE genuine, precise accuracy gap (the real "truly accurate" lever)
The correction **data + math are present and accurate**, but they are wired as an **opt-in tool-LIFE surface** (`extendedTaylorToolLifeFullExtended()`, `inline_compat:false`), **NOT** into the **default Vc RECOMMENDATION** path. The default recommend (STEP 17) computes:
```
vc = baseParams.vc[i] × stratMod.vc_factor × hardnessSpeedFactor(HB, refHB)   // UltimateSpeedFeedEngine.ts:2536/2543/2550
```
→ **coating and coolant multipliers do NOT influence the recommended cutting speed.** A TiAlN-coated tool in flood coolant receives the *same recommended Vc* as an uncoated tool running dry; only the tool-life *estimate* differs. This is the precise, verifiable inaccuracy the operator's "truly accurate calculations" concern points at.

**Scoped follow-on (already named, accuracy now PRE-VERIFIED here): `U-SFPSN-02D-ACTIVATE`** — flip the full-extended correction layer to the default recommend path. *Why deferred (not built in this loop iter):* it changes recommended Vc for ~every material/op combo → forces a 3-of-3-scrutinied re-baseline of `UltimateSpeedFeedEngine.test.ts` + `.variability.test.ts` (88 anti-regression fixtures + 22.4K/33.1K-LOC). That is a dedicated SFC-owner (oscar) unit with its own test budget — NOT a duplicate-table build (duplicationGuard would block a parallel multiplier store; juliett soul refuses "a parallel store when the answer is a migration of the existing one"). The coating/coolant/hardness values are verified sound above, so activation is now a wiring+rebaseline task, not a research task.

### 8.4 Final completeness verdict for the operator's question
*"Does everything have all available data so we generate truly accurate results?"*
- **Catalog extraction (Charlie's):** complete — the catalogs are cutting-data-empty geometry skeletons; Phase A enriched the 17 tools that had a confident existing-source match, loud-flagged 233 (no fabrication). Nothing further to extract until §8.1 PDFs are staged.
- **Existing calculator DB:** **more complete than this audit first claimed** — baseline Vc/fz, per-ISO sub-group kc1+HB, coating/coolant/hardness corrections, Taylor + Johnson-Cook, flank-wear all present & cited.
- **The two real limits:** (1) **coating/coolant corrections aren't applied to recommended Vc** → `U-SFPSN-02D-ACTIVATE` (scoped, pre-verified, oscar-owned); (2) **per-grade PDF refinement unavailable** → no source PDFs on H: (§8.1, operator must stage them).

_Cross-ref: [[reference_oscar_sfc_domain_map_2026_05_27]] · [[reference_cam_corpus_locations]] · [[reference_prism_reference_db_2026_05_30]] · [[feedback_use_lima_pypdf_page_extractor]] · [[feedback_think_ahead_extract_adjacent_databases]]._
