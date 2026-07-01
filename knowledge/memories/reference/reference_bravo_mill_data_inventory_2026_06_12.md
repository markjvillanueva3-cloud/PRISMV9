---
name: reference-bravo-mill-data-inventory-2026-06-12
description: Mill data surface is RICH (185 .ts files) but was undocumented; the knowledge-layer was the real gap. Canonical inventory now at wiki [[mill-data-contents-inventory]].
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.486Z
aliases: reference_bravo_mill_data_inventory_2026_06_12
---


**Finding (slot:bravo, 2026-06-12, operator "drastically expand mill knowledge, dig don't assume"):** the mill galaxy was reported "rich/done" but its **185 `.ts` data files + dozens of `.json` extracts** under `mcp-server/src/data/` had never been documented. An 8-agent grounded DIG proved the data is abundant and the **knowledge layer (wiki/tribal/memory) was the actual gap** — every recon "gap" (holders, inserts, alarms, tool-on-hand) had rich underlying data nobody had surfaced.

**Grounded counts (verified 2026-06-12):**
- **Tool catalogs:** ~60K+ records across ~30 vendors. Only some carry grade/coating: `mitsubishi` (82-grade sub-catalog w/ coating_type+application), `helical` (6007, coating+application), `ingersoll` (3169, material+coating), `sumitomo` (7616, grade), `sandvik-2018-rotating` (10686, grade+materialApplication — actually Kennametal), `horn` (grades array). STUBS (empty): `sandvik-master-extracted.json`, `korloy-tools-extracted.json`, `kennametal-turning.json`.
- **Tool-holders:** 6 catalogs, 2322 lines — shrink-fit/collet/hydraulic + HSK-A63/BT40/CAT40/50, runout + balance(G2.5) specs. Zero wiki coverage before now.
- **ALARMS:** `controller-alarm-database.json` = **2588 alarms** (FANUC 300 incl 31i, OKUMA 267, HAAS 179, HURCO 157 + WinMax — all 5 JM controller families) + `alarm-fix-procedures.json` (93454 lines). Schema: alarm_code→name→causes→fix_procedure_id.
- **Cited tips:** `tribal-tips/milling-pdf-cited-tips.ts` = **326 cited tips** (almost all status:draft — candidate-grade).
- **Physics:** `constants.ts` has CANONICAL_KIENZLE/TAYLOR/MILLING_SPEEDS/TOOL_MODULUS/_RAW_MATERIAL_DB(15 mats); NO Johnson-Cook, NO SLD table.

**Deliverables (this session):** canonical [[mill-data-contents-inventory]] (the doc the new [[feedback_never_assume_data_file_contents]] doctrine requires) + 4 grounded wiki pages: [[mill-toolholder-selection]] · [[mill-insert-grade-coating-selection]] · [[jm-machine-alarm-quick-reference]] · [[mill-tooling-corpus-index]]. **Backlog (data exists, no doc yet):** chip-thinning feed-comp, spindle thermal/heat-partition, titanium milling, thread-mill/probing/order-of-ops surfacing, SLD shop procedure (pure gap), Tier-A PDF extraction (13 PDFs, 0 done). Refresh: re-run the `mill-data-dig` workflow.
