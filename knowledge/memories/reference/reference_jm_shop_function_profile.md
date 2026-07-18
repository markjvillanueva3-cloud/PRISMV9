---
name: reference_jm_shop_function_profile
description: How JM Die actually functions -- machine utilization, work-kind mix, machine x kind cross-tab, busiest customers -- distilled from the 38,251-file classified corpus (files.jsonl). Auto-generated bridge; the vault's learned model of the test shop.
metadata:
  type: reference
---

# JM Die -- shop-function profile (learned from the document corpus)

> Auto-distilled by `scripts/jm-shop-knowledge-to-vault.mjs` from
> `mcp-server/data/jm-die-database/tables/files.jsonl` (38,251 classified
> files). This is the vault's *learned model of how the shop runs* -- recall it before
> reasoning about JM machines, work mix, or customers. Re-run to refresh.

## Machine utilization (what the shop runs most)
- **lathe** -- 19,803 files (51.8%)
- **okuma** -- 6,092 files (15.9%)
- **wire_edm** -- 4,000 files (10.5%)
- **matthew** -- 2,320 files (6.1%)
- **jm_die_general** -- 2,172 files (5.7%)
- **mill_mixed** -- 1,820 files (4.8%)
- **roku_roku** -- 1,102 files (2.9%)
- **mill_haas** -- 533 files (1.4%)
- **other** -- 396 files (1.0%)
- **okuma_multus** -- 13 files (0.0%)

**Read:** JM is a **lathe-dominant** shop; Okuma and Wire EDM are the next pillars.
PRISM speed/feed, post-processor, and CAM defaults for JM should bias to these.

## Work-kind mix
- **g_code** -- 20,081 (52.5%)
- **cam_project** -- 15,544 (40.6%)
- **pure_cad** -- 2,304 (6.0%)
- **pdf** -- 235 (0.6%)
- **data** -- 87 (0.2%)

**Read:** the corpus is overwhelmingly **G-code programs + CAM projects** -- JM is a
production-programming shop, not a CAD-authoring shop. CAD is the minority.

## Machine x kind (where each kind of work happens)
- lathe x g_code: 16,571
- wire_edm x cam_project: 3,970
- lathe x cam_project: 3,218
- okuma x g_code: 2,985
- jm_die_general x cam_project: 1,898
- mill_mixed x cam_project: 1,743
- matthew x cam_project: 1,698
- okuma x pure_cad: 1,574
- okuma x cam_project: 1,418
- roku_roku x cam_project: 1,000
- mill_haas x cam_project: 488
- matthew x g_code: 384
- matthew x pure_cad: 197
- other x pure_cad: 190
- jm_die_general x pure_cad: 173
- other x cam_project: 111
- roku_roku x pure_cad: 91
- okuma x data: 83
- jm_die_general x pdf: 80
- other x pdf: 58
- mill_mixed x pure_cad: 56
- matthew x pdf: 41
- other x g_code: 37
- okuma x pdf: 32

## Busiest customers (folder-derived, noise-filtered)
- OMG -- 4,072
- FONTANA -- 1,226
- JM Die Company -- 1,193
- ITW -- 1,035
- OPTIMAS -- 1,028
- ATF -- 988
- BELVIDERE -- 789
- HOLO-KROME -- 544
- ELECTRODE -- 486
- HPFS -- 476
- VALLEY -- 463
- AIR -- 417
- TCR -- 410
- TOMEK - PROGRAMS -- 403
- GRANDEUR -- 384

> **R12 caveat:** the `customer` field is folder-derived and noisy -- 1,328
> distinct tokens after filtering tooling/CAM/training folders. The **canonical** customer
> list (118) lives in `mcp-server/src/data/jm-die-profile.ts`; treat the above as a
> volume signal, not a clean customer roster.

## Customer x machine (who runs where -- top pairs)
- OMG -> lathe: 3,945
- JM Die Company -> okuma: 1,193
- FONTANA -> lathe: 1,044
- ITW -> lathe: 997
- OPTIMAS -> lathe: 792
- BELVIDERE -> lathe: 789
- ATF -> lathe: 751
- ELECTRODE -> lathe: 486
- HPFS -> lathe: 476
- HOLO-KROME -> lathe: 441
- AIR -> lathe: 417
- TOMEK - PROGRAMS -> wire_edm: 403
- TCR -> lathe: 398
- VALLEY -> lathe: 398
- GRANDEUR FASTENER UPDATE 10.22.2022 -> lathe: 317

## Business / order-flow (how work ENTERS the shop)
- **NOTE** -- 26,572 (23.8%)
- **SALES_ORDER** -- 21,543 (19.3%)
- **SCAN_GENERIC** -- 20,349 (18.2%)
- **CLOSED_ORDER** -- 12,773 (11.4%)
- **SCAN_BUSINESS** -- 12,501 (11.2%)
- **PRINT** -- 7,616 (6.8%)
- **UNKNOWN** -- 6,627 (5.9%)
- **PACKING_SLIP** -- 2,309 (2.1%)
- **QUOTE** -- 972 (0.9%)
- **LASER_SHEET** -- 178 (0.2%)
- **SHIPPING** -- 117 (0.1%)
- **TAX_FINANCIAL** -- 93 (0.1%)
- **ACCOUNTING** -- 52 (0.0%)
- **IMPORTED_BATCH** -- 38 (0.0%)

**Read:** 111,745 business documents spanning 2014-04-15 -> 2026-02-23. The
SALES_ORDER + CLOSED_ORDER + QUOTE + PACKING_SLIP volume is the real order pipeline; PRINT docs
are the incoming part geometry. PRISM quoting / scheduling / ERP features should model JM as an
active job-shop with this order cadence.

## How PRISM features + the frontend should use this
- **Speed/feed + CAM defaults:** weight toward lathe + Okuma + Wire EDM (the shop's real mix).
- **Frontend/UI:** surface lathe/Okuma/WEDM workflows first; CAD authoring is secondary for JM.
- **Quoting / scheduling:** the work mix (G-code + CAM) reflects a re-run / production shop.

## Provenance
- records parsed: 38,251 (parse errors: 0)
- source: `mcp-server/data/jm-die-database/tables/files.jsonl`
- regenerate: `node scripts/jm-shop-knowledge-to-vault.mjs`
