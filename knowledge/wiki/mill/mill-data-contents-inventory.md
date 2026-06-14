---
title: Mill Data-Contents Inventory
type: reference
domain: mill
tags: [mill, data-inventory, catalogs, alarms, tooling, holders, speed-feed, never-assume]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-foundations, mill-tooling-corpus-index, mill-toolholder-selection, mill-insert-grade-coating-selection, jm-machine-alarm-quick-reference, mill-source-atlas, mill-resource-atlas]
---

# Mill Data-Contents Inventory

> **Why this file exists (operator directive 2026-06-12, [[feedback_never_assume_data_file_contents]]):** NEVER assume what a mill data file/folder contains — this page DOCUMENTS the actual contents (real counts, schema, a sample, coverage) so a chat can trust "documented" instead of re-digging or, worse, *assuming*. A topic is "covered" only when a file's real content covering it is read + cited; everything else is an OPEN gap. This was built because the mill galaxy was reported "rich/done" from the mere *presence* of these files — but their contents were never documented, hiding the real gaps (holder selection, insert grades, machine alarms, tool-on-hand ROI) under abundant-but-unsurfaced data.
>
> **Provenance:** compiled 2026-06-12 from an 8-agent grounded DIG (`mill-data-dig` workflow — read the real files) + direct verification this session. **✓** = count verified directly this session; **◇** = DIG-agent grep-grounded (2026-06-12). Counts rot — re-dig (`/system-viz find` or re-run the DIG) before trusting an old number. The mill data surface is **185 `.ts` files + dozens of `.json` extracts** ✓ under `mcp-server/src/data/`.

---

## §1 — Cutting-tool + insert catalogs (`mcp-server/src/data/`)

~60K+ real tool records across ~30 vendor catalogs. **Most are GEOMETRY-ONLY** (diameter, flute count/length, OAL, corner radius) — only the marked ones carry insert **grade**, **coating**, or **substrate/material**.

| File | Records | Carries grade/coating/material? |
|------|--------:|---------------------------------|
| `osg-tools-extracted.json` | 11,550 ◇ | `material` (substrate); no coating/grade |
| `sandvik-2018-rotating-catalog.ts` | 10,686 ◇ | **`grade` + `materialApplication`** (hdr: actually Kennametal Master 2018) |
| `sumitomo-tool-catalog.ts` | 7,616 ◇ | **`grade`** (e.g. ACT100) |
| `helical-tool-catalog.ts` | 6,007 ◇ | **`coating` + `application`** (best per-tool coating coverage) |
| `iscar-tools-extracted.json` | 5,449 ◇ | `insert_designation` cross-ref; no grade text |
| `guhring-tool-catalog.ts` / `-tools-extracted.json` | 3,421 ◇ | geometry only |
| `ingersoll-tool-catalog.ts` | 3,169 ◇ (2,117 bodies + 1,052 inserts) | **`material` + `coating`** on tools, `application` on inserts |
| `accupro-tools-extracted.json` | 3,015 ◇ | geometry only |
| `mitsubishi-tool-catalog.ts` | 1,513 ◇ | **82-entry grade sub-catalog** (`coating_type` + `application`) |
| `korloy-rotating-extracted.json` | 1,385 ◇ | geometry only |
| `seco-tool-catalog.ts` | 1,224 ◇ | geometry only (Jabro solid end mills) |
| `kennametal-holemaking-extracted.json` | ~682 ◇ | geometry only |
| `kennametal-milling-extracted.json` | ~280 ◇ | geometry only |
| `korloy-turning-extracted.json` | 313 ◇ · `dormer-pramet-tool-catalog.ts` 310 ◇ · `ma-ford-tools-extracted.json` 292 ◇ · `horn-tool-catalog.ts` 198 ◇ (**`grades` array**) | mixed |
| Also present: `niagara`, `sgs`, `osg-tool-catalog.ts`, `indexable`, `global-cnc`, `additional`, `ampc`, `emuge`, `sandvik-2022` (1,424 ◇ — WIDIA/Hanita), `hsm-advisor-tools.json` | — | read before use |

**STUBS (empty `[]` — exist but contain NO data, do NOT cite as coverage):** `sandvik-master-extracted.json` (0) ◇ · `korloy-tools-extracted.json` (0) ◇ · `kennametal-turning.json` (0) ◇.

➜ Detailed vendor table + the tool-on-hand selection use: [[mill-tooling-corpus-index]]. Grade/coating selection doctrine: [[mill-insert-grade-coating-selection]].

## §2 — Tool-holders (`mcp-server/src/data/`)

2,322 lines across 6 catalogs ✓. Rich holder data; was **zero** wiki coverage before 2026-06-12.

| File | Lines |
|------|------:|
| `tungaloy-holder-catalog.ts` | 522 ✓ |
| `haimer-holder-catalog.ts` (+`-extracted.json`) | 508 ✓ |
| `seco-toolholders-catalog.ts` | 502 ✓ |
| `big-daishowa-holders.ts` | 458 ✓ |
| `regofix-holder-catalog.ts` | 292 ✓ |
| `guhring-holder-catalog.ts` | 40 ✓ |
| also: `kennametal-tooling-systems-catalog.ts`, `tooling-systems-extracted.json` | — |

**Type/spec coverage across the catalogs** (grep counts ✓): shrink-fit ×548, ER/collet ×468, **runout spec ×466**, balance/**G2.5 ×238/345**, HSK-A63 ×318, HSK-A (all) ×218, BT40 ×161, BT30 ×108, HSK-A100 ×90, Weldon ×76, CAT40 ×69, HSK-A125 ×63, BT50 ×62, CAT50 ×51, hydraulic ×49, side-lock ×29, HSK-E ×23, ER16/25. ➜ Selection doctrine: [[mill-toolholder-selection]].

## §3 — Speed/feed datasets (`mcp-server/src/data/`)

Empirical feeds/speeds (material × tool × Vc/fz/DOC). Files present ✓: `manufacturer-speed-feed-data.ts`, `new-manufacturer-speed-feed-data.ts`, `helical-speed-feed-data.ts`, `guhring-iscar-speed-feed-data.ts`, `osg-speed-feed-data.ts`, `hypermill-speed-feed-catalog.ts`. Record counts + schema: ➜ [[mill-tooling-corpus-index]] §speed-feed.

## §4 — Controllers + ALARM databases (`mcp-server/src/data/`)

**The single highest-ROI surface that was invisible to the knowledge layer.** ✓ verified directly this session:

- **`controller-alarm-database.json`** — `totalAlarms: 2588` ✓ (v2.0.0). Per-record schema: `alarm_id, controller_family, controller_models[], alarm_code, alarm_name, category, severity, message_text, description, causes[], fix_procedure_id`. **byController** ✓: FANUC 300 (models incl. `0i-F/30i-B/31i-B`), HEIDENHAIN 315, MAZAK 271, OKUMA 267, SIEMENS 205, MITSUBISHI 205, HAAS 179, DMG_MORI 159, HURCO 157, DOOSAN 156, BROTHER 143, FAGOR 113, UNKNOWN 118.
- **`alarm-fix-procedures.json`** — 93,454 lines ✓ — the fix procedures keyed by `fix_procedure_id`.
- `controller-knowledge-tips.ts` (1,347 lines ✓), `controller-knowledge.json`, `hurco-winmax-knowledge.ts`.
- Okuma corpus: `okuma-dialect-knowledge.ts`, `okuma-osp-advanced-knowledge.ts`, `okuma-osp-extracted-tips.ts`, `okuma-macro-patterns.ts`, `okuma-program-examples.ts`, `okuma-osp-program-examples.ts`.

**All 5 JM Die controller families ARE covered** (FANUC incl. 31i → Roku-Roku; HAAS → VF-2/OM-2; OKUMA/OSP → M460V; HURCO/WinMax → VM30i). ➜ Per-machine alarm map with real codes→causes→fixes: [[jm-machine-alarm-quick-reference]].

## §5 — JM Die shop + mill program corpus (`mcp-server/src/data/`)

Files ✓ (from enumeration): `jm-die-profile.ts` (the 5 VMC fleet specs), `jm-die-archive-index.ts`, `jmdie-mill-program-index.ts`, `jmdie-milling-macros.ts`, `jmdie-proven-mill-programs.ts`, `user-proven-cutting-data.ts` (machine-validated RPM/feed/stepdown/stepover per tool), `mill-resources-index.ts`, `jm-die-employees.ts`. The 5 VMCs (from foxtrot awareness, verify vs `jm-die-profile.ts`): VMC-01 Hurco VM30i WinMAX · VMC-02 Okuma M460V-5AX OSP-P300 · VMC-03 Haas VF-2 · VMC-04 Haas OM-2 · VMC-05 Roku-Roku Fanuc-31i. ➜ Counts + tool-on-hand→proven-program use: [[mill-tooling-corpus-index]] §JM.

## §6 — hyperMILL CAM corpus (`mcp-server/src/data/`)

Files ✓: `hypermill-automation-center.ts`, `hypermill-cam-tips-ext.ts`, `hypermill-cutting-tech.json`, `hypermill-extracted-tips.ts`, `hypermill-formula-registry.ts`, `hypermill-iso-fits.json`, `hypermill-materials-catalog.ts`, `hypermill-post-configs.json`, `hypermill-speed-feed-catalog.ts`, `hypermill-tool-schema-notes.ts`, `hypermill-tools.json`. Plus **163 `knowledge/tribal/hypermill-cam-tips-ext-hm-*.md`** ◇ + `hypermill-extracted-tips-hm-*.md` (CAM strategy tips, MAXX/barrel-cutter/trochoidal/5-axis).

## §7 — Physics, materials, cited tips

- **`mcp-server/src/physics/constants.ts`** (1,082 lines ◇) — canonical store. Mill tables: `CANONICAL_KIENZLE` (P/M/K/N/S/H kc1.1+mc, Sandvik 2024/ISO 3685), `CANONICAL_TAYLOR` + `_EXTENDED_TAYLOR_EXPONENTS`, `CANONICAL_MILLING_SPEEDS`, `WORKPIECE_ELASTIC_MODULUS_GPA`, `MACHINABILITY_FACTOR_BY_ISO`, `CANONICAL_TOOL_MODULUS` (7 tool mats), `_RAW_MATERIAL_DB` (15 materials w/ k_thermal+cp+melting), utility fns `kienzleForce/taylorLife/toolDeflection/mrr/predictedRa`. **Confirmed ABSENT** ◇: Johnson-Cook constants, SLD/stability-lobe table, chip-thinning-factor table. (NEVER inline these — import.)
- **`mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts`** — **326 cited tips** ◇ (`id, operation, headline, body, sourceId, vendor, evidenceLevel, confidence, materialScope, status, tags`). Operation mix: face ~60, HEM/adaptive ~30, workholding ~25, toolholder ~20, order-of-ops 12, drilling 9, thread 7, probing 7, five-axis 5, ball-end 5, insert-grade 5, titanium 4, chip-thinning 3, thermal 3, coolant 4. **Almost all `status:"draft"`** ◇ (only 2 climb tips `validated`) — these are candidate-grade, not doctrine.
- `mcp-server/src/registries/MaterialRegistry.ts` ◇ = a loader (ISO subdirs P/M/K/N/S/H/X); flat `materials.ts` does NOT exist.

## §8 — Existing knowledge layer (what IS already covered — dedup before authoring)

**Solidly covered** (cite, don't duplicate): `knowledge/wiki/mill/{mill-foundations, mill-applied-practice, mill-advanced-techniques, mill-source-atlas, mill-resource-atlas}.md` (Kienzle/MRR/entering-angle/deflection STRUCTURE, Ra/Rz, SPC, HEM/trochoidal/adaptive/high-feed, chatter tuning-fork, BUE, recutting) + `knowledge/wiki/code-tribal/canonical/{operation-ordering-sequencing-roughing-finishing-datums, tooling-selection-geometry-coating-stickout, coolant-chip-evacuation-strategy-flood-mql-tap-air-recutting, part-setup-probing-edge-find-wcs-tool-offsets, workholding-practices-locating-clamping-distortion-repeatability, workholding-soft-jaw-cycle}.md` + `code-tribal/{machining-tactics-climb-vs-conventional-milling, tooling-endmill-flute-helix-corner}.md` + `code-tribal/milling/milling-pdf-corpus.md` (24-PDF manifest, 0 extracted). ◇
**Owner-gated (PARTIAL):** `knowledge/wiki/mill/_staging/deep-domain-research-2026-06-09.md` — numeric kc1.1/RCTF/deflection/SLD values, must be source-verified before promotion.

## §9 — Expansion status (AUTHORED vs PLANNED — honest, R12)

**AUTHORED 2026-06-12 (slot:bravo):**
1. **Tool-holder selection** — §2 → [[mill-toolholder-selection]] (decision) + [[mill-toolholder-connection-style-reference]] (deep ratings + interactions + calc-feed).
2. **Insert grade + coating selection** — §1 grade/coating catalogs → [[mill-insert-grade-coating-selection]].
3. **Machine stack (spindle / ways-guides / table / frame)** — §4/§5 + `jm-die-profile.ts` fleet → [[mill-machine-stack-reference]].
4. **Cutting-tool (tooling) + work-holding** — §1 catalogs + `workholding-catalog.ts` (ViseSpec/ZeroPoint/Tombstone/SoftJaw) → [[mill-cutting-tool-reference]] + [[mill-workholding-reference]].
5. **Per-machine alarm quick-reference** — §4 (2,588 alarms + 2,588 fixes, all 5 JM controller families) → [[jm-machine-alarm-quick-reference]].
6. **Tool-on-hand → best-toolpath + ROI corpus index** — §2 proven-cutting GOLD (30,812-line) + §1/§3/§5 → [[mill-tooling-corpus-index]].
7. **Thermal / heat-management** — `constants.ts` `_RAW_MATERIAL_DB` k/η + cited tips → [[mill-thermal-heat-management]].
8. **Chip thinning** (radial RCTF + axial lead-angle, cited formulas) → [[mill-chip-thinning]]. (Surfaced a physics-direction bug in `feedback_foxtrot_chip_thinning_mandatory` — see [[reference_bravo_chip_thinning_direction_2026_06_12]].)
9. **Surface finish + tool wear** (Ra=fz²/32r, cusp=stepover²/8r, Taylor C/n, wear modes) → [[mill-surface-finish-tool-wear]].
10. **Cutting forces / Kienzle** (kc1.1 per ISO cited, 3 components, force→power/deflection/torque/workholding) → [[mill-cutting-forces]].
11. **5-axis & kinematics** (configs, RTCP/TRAORI, singularity gate, 3+2 vs simultaneous) → [[mill-5axis-kinematics]].
12. **Print → operation plan** (GD&T callout → machining decision, datum-first, probe→G54) → [[mill-print-to-operation-plan]].

> **15 grounded wiki pages = every operator-named knowledge topic covered** (machines/spindles/controllers/alarms · kinematics · cutting forces/g-forces · thermo/heat · fixturing/work-holding · holders · tooling/inserts/materials · chip-thinning · finish/wear · toolpaths/ROI · print-reading). Each cites real source files; each stack page maps ratings → the calc it feeds.

13. **Hard-materials playbook** (Ti / superalloy / hardened-steel synthesis) → [[mill-hard-materials-playbook]].

**PLANNED (next phase — partial-data physics + the integration payoff):**
14b. **SLD shop-procedure · Tier-A PDF extraction (13 PDFs, 0 done)** — owner-gated/different-task; operation-ordering already canonical (link).
14. **WIRE the documented ratings into the calc engines** (SpeedFeedOrchestrator triad) — the "better calculations" payoff; needs the scrutiny tier recovered.
9. **WIRE the ratings into the calc engines** — holder `runout_um`→chip-load/tool-life; gauge-length→`toolDeflection()`; `clamping_force_kn`→workholding hold-down gate; material `k`→tool-life; proven-cutting→speed/feed seed. (The "better calculations" payoff — bigger leverage than more docs.)
6. **Spindle thermal compensation / heat-partition doctrine** — 3 cited tips (USPTO patent + Makino V33i) + `_RAW_MATERIAL_DB` thermal props; no page.
7. **Titanium / high-temp-alloy milling rules** — 4 cited tips; no page.
8. **Thread milling · probing · order-of-ops surfacing** — 7+7+12 cited tips not yet in a leaf.
9. **Stability lobe diagram (SLD) shop procedure** — PURE gap: no constants, no tips, no page (staging has Altintas-Budak theory, owner-gated).
10. **Mill-PDF Tier-A extraction** — `milling-pdf-corpus.md` lists 13 Tier-A PDFs; **0 extracted**.

## Source data (refresh)
Re-dig with the `mill-data-dig` workflow or `node scripts/system-viz-query.mjs find <noun>`. Tool-holder/insert/alarm/tooling-corpus detail lives in the four sibling pages cross-linked above. This index is the map; they are the territory.
