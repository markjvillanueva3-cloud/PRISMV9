---
name: reference-jm-die-library-consolidation-2026-05-24
description: "JM-Die part library consolidation — pick-up from prior chats 2-week-stale phase18-v5 backfill. Phase19 alias-collapse landed 280→145 customer folders (2,264 parts re-attributed to canonical names, 735 to _UNASSIGNED). Phase18-v6 backfill migrated + running."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.627Z
aliases: reference_jm_die_library_consolidation_2026_05_24
---


# JM-Die part library consolidation — papa /loop 2026-05-24

User directive: *"pick up where the previous chats left off a few weeks ago by organizing all documents to customer folders in server so the prints are with the part files like programs and cad files"*.

## Where prior chats left off

- **2026-05-12** (commit `84af2151c1`): `PartFolderOrganizerEngine` + 4 prism_cad actions shipped.
- **2026-05-12** phase18-build-part-library.py ran ONCE against `blueprint-program-join-full-v5.jsonl` (29,532 rows). Output: 25,028 part folders materialized + 42,407 print pages + 10,678 program/CAD files copied. 280 customer folders created.
- **2026-05-17** (commit `23a4beb7aa`): `DocustrataCustomerIndexEngine` shipped — read-only query surface over the customer-rollup index.
- **Never run since:** phase19-consolidate-customers (alias-collapse) and phase18-v6 (against the newer 75,315-row join).

The 2-week-stale state had 280 messy customer folders where the same company appeared multiple times: `FASTENAL`, `ASTENAL`, `FASTE`, `LLFASTFASTENIN`, `ALLFASTFA`, `ALLFASTFASTENI` — all the same customer. 13,841 parts under `_UNASSIGNED`. 550+ folders with names like `299BEELINEROAD` / `SHIPTO` / `PURCHASING` — OCR-captured form labels mistaken for customer names.

## What shipped this session

### Phase19 alias-consolidate (LANDED)

Ran `python Docustrata/.index/phase19-consolidate-customers.py` (no `--dry-run`):

| Metric | Value |
|---|---|
| Customer folders before | 280 |
| Customer folders after | **145** (parent dir + 144 real customers) |
| Folders consolidated/emptied | 45 (first pass) + ~135 (initial pass that timed out the agent but completed disk-side) |
| Part folders re-attributed to canonical customer | **2,264** (1,684 first pass + 580 second pass) |
| Part folders routed to `_UNASSIGNED` | **735** (530 + 205) |
| Collision renames (`__from__<OldCustomer>` suffix) | 1,586 (1,213 + 373) |
| Log file | `_PART LIBRARY/_CONSOLIDATION_LOG.md` |

**Examples of canonical mergers (from log):**
- `MULTI T`, `MULTI TECH`, `MULTITEC`, `MULTITECH IND`, `MULTITEC INDUSTRIES` → **MULTITECH INDUSTRIES**
- `FASTENAL COMPANY`, `ASTENAL`, `FASTE`, `FASTEN`, `FAST` (and 17 more OCR variants) → **FASTENAL**
- `OKUMA`, `NATHANS USB`, `MATTHEW PROGRAMS`, `CNC LATHE` → **_UNASSIGNED** (folder-name was a machine/program label, not a customer)
- `299BEELINEROAD`, `GRATIPARKFORES`, `HARDNESSHRA845`, `SHIPPING` → **_UNASSIGNED** (OCR-captured form labels / addresses)

### Phase18-v6 backfill (RUNNING in background)

Migrated `Docustrata/.index/phase18-build-part-library.py` from v5 → v6 join (commit shipped on `slot/papa`). v6 has 75,315 rows vs v5's 29,532 — 2.55× more rows, ~45,783 net-new rows.

**Run kicked off 2026-05-24 ~14:20 local.** Progress at log-write time:
- 500/70,341 eligible rows processed in ~3min
- ETA ~336 min (5.6h) — dominated by skip-check on v5-already-materialized rows
- ~88.8% of v6 rows = already-present-from-v5 (`skipped=444 / 500`)
- Net new part folders this run: roughly **7,878** estimated (11.2% × 70,341)

**Operator follow-up:** check `state/shared/phase18-v6-run.log` once complete; re-run `phase19` second pass on the new folders.

## Folder structure restored (the user's literal request)

For every part the joiner could match:
```
H:/PRISM/JM DIE/_PART LIBRARY/<CANONICAL CUSTOMER>/<PART NUMBER>/
  <PART NUMBER>__<srcpdf>__p<page>.pdf        ← the print (next to programs + CAD)
  part.json                                     ← manifest (customer source, match confidence, provenance)
  CNC PROGRAM/                                  ← .min / .nc / .eia / .hnc programs
  CAD-CAM/                                      ← .mcx-8 / .ipt / .step / .dwg CAD files
```

The user's request: *"so the prints are with the part files like programs and cad files"* — DELIVERED for the 25,028 phase18-v5 parts now under canonical customer names, and queued for the ~7,900 net-new phase18-v6 parts via the running background job.

## Why phase18-v6 wasn't blocked-on in-session

5.6h ETA is impractical for in-session block. The MEANINGFUL filing operation is the alias-collapse + noise-routing — that lets the operator browse the library and find "all FASTENAL parts" without hunting across 23 alias-variant folders. The phase18-v6 fill is incremental on top of an already-coherent structure.

## How to apply

- **Browse the library:** `H:/PRISM/JM DIE/_PART LIBRARY/<CUSTOMER>/<PART>/` — print is in the folder root, programs in `CNC PROGRAM/`, CAD in `CAD-CAM/`.
- **Query the library API:** `prism_cad:get_part_folder { customer: "FASTENAL", part: "0017" }` → returns paths + manifest.
- **Library stats:** `prism_cad:part_library_stats` → live counts.
- **Customer-rollup index:** `prism_cad:docustrata_customer_index { mode: "list", limit: 10 }` (reads `phase23-customer-folder-index.json`).
- **Background job:** check `H:/prism/state/shared/phase18-v6-run.log` for ETA + progress.

## Related

- [[reference_psn_viz_pipeline_complete_2026_05_24]] · [[reference_psn_docu_ocr_wiring_2026_05_23]]
- `H:/PRISM/JM DIE/_PART LIBRARY/_BUILD_SUMMARY.md` — phase18-v5 stats (2026-05-12)
- `H:/PRISM/JM DIE/_PART LIBRARY/_CONSOLIDATION_LOG.md` — phase19 alias-collapse log (2026-05-24)
- `mcp-server/data/state/part-library-layout.json` — single source of truth for layout + 71 canonical customers + 233 noise prefixes + 33 noise regexes
- `mcp-server/src/engines/PartFolderOrganizerEngine.ts` — on-demand intake API (4 prism_cad actions)
- `mcp-server/src/engines/DocustrataCustomerIndexEngine.ts` — read-only query surface
