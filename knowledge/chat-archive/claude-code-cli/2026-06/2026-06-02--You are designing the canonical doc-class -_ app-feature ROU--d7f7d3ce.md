---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "You are designing the canonical doc-class -> app-feature ROUTING + DISPOSITION t"
date: "2026-06-02"
first_ts: "2026-06-02T15:47:06.562Z"
last_ts: "2026-06-02T15:54:09.205Z"
cwd: "H:\\prism-slot-hotel"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_f960c2d6-25d/agent-ace2b2455df117011.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# You are designing the canonical doc-class -> app-feature ROUTING + DISPOSITION t

> **claude-code-cli** | 2026-06-02 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_f960c2d6-25d/agent-ace2b2455df117011.jsonl`

## Transcript

### User | 2026-06-02T15:47:06.562Z

You are designing the canonical doc-class -> app-feature ROUTING + DISPOSITION table for PRISM's JM-Die document population campaign. The hard requirement from the operator is "every document must be accounted for" — so the table must cover 100% of doc classes with NO gap, and every class must resolve to either (a) a target app feature + the engine that consumes it, or (b) an explicit, named "accounted-but-not-feature-consumed" disposition (e.g. raw-CAD-viewer-only, duplicate, unsupported-format). Silent drops are forbidden.


PRISM JM-Die document corpus (already built by slot:charlie, all under H:/prism/state/shared/databases/):
- jm-file-inventory.jsonl  (113 MB, 554,999 lines). Per-line schema: {"path","bucket","customer","material","machine_class","source"}.
  bucket enum: program | cad | print | scan | setup | doc | other
  source enum seen: part_library  (and jm_die_category for the 22 JM DIE/ category folders)
  customer: a customer_key string or null ; material: string or null ; machine_class: mill|lathe|wedm|null
- jm-customers.jsonl (473 records: customer_key, aliases, files_total, files_by_bucket{program,cad,print,scan,setup,doc,other}, materials_seen, machine_classes_seen, source_folders, has_docustrata_record)
- jm-vendors.jsonl   (12 records — OWNED BY slot:charlie, do NOT duplicate; vendor engines already exist)
- jm-corpus-summary.json: total_files_inventoried=554999, categorized_files=264570, docustrata_manifest_docs=111745, customer_count=473, vendor_count=12, part_library_folders=473, jm_die_category_folders=22
DocuStrata: 111,745 docs indexed in a manifest.json + .index/ (NEVER re-OCR; search the manifest). These are transactional/business docs (quotes, invoices, POs, packing slips, scanned business paperwork).

PRISM app/ERP surface that needs JM data (the population targets):
- CRM customers (CustomerManagementEngine) -> prism_business:customer_*  [SEED BRIDGE ALREADY SHIPPED: customer_seed_jm_corpus, 470 seeded]
- Parts / items (part geometry
... [+2011 chars truncated]

### Assistant | 2026-06-02T15:47:23.136Z

I'll design this routing table. Let me first verify the actual corpus structure and check for the real PRISM engine names so the table maps to reality, not guesses.

### Assistant | 2026-06-02T15:47:25.452Z

[tool_use: Bash]

### Assistant | 2026-06-02T15:47:26.596Z

[tool_use: Bash]

### User | 2026-06-02T15:47:49.757Z

[tool_result] {"path":"H:/PRISM/JM DIE/_PART LIBRARY/AAAMECONINGPIN/R910/part.json","bucket":"other","customer":"AAAMECONINGPIN","material":null,"machine_class":null,"source":"part_library"}
{"path":"H:/PRISM/JM DIE/_PART LIBRARY/AAAMECONINGPIN/R910/R910__Scanned Document - 11_5_2020 7_44 AM (2).pdf","bucket":"scan","customer":"AAAMECONINGPIN","material":null,"machine_class":null,"source":"part_library"}
{"path
... [+1555 chars truncated]

### User | 2026-06-02T15:47:52.123Z

[tool_result] jm-corpus-summary.json
jm-customers.jsonl
jm-file-inventory.jsonl
jm-vendors.jsonl
---DOCUSTRATA---
total 112157
drwxr-xr-x 1 wompu 197611        0 May 29 10:35 .
drwxr-xr-x 1 wompu 197611        0 Jun  2 10:36 ..
drwxr-xr-x 1 wompu 197611        0 May 31 12:34 .index
drwxr-xr-x 1 wompu 197611        0 May  8 08:50 _Imported_ 1012024
drwxr-xr-x 1 wompu 197611        0 May  8 08:50 _Imported_ 10320
... [+922 chars truncated]

### Assistant | 2026-06-02T15:47:55.664Z

Let me verify the bucket distribution and the real engine names so the table maps to actual PRISM assets.

### Assistant | 2026-06-02T15:47:58.170Z

[tool_use: Bash]

### User | 2026-06-02T15:48:39.504Z

[tool_result] === BUCKET COUNTS (full inventory) ===
 166191 program
 111682 doc
  85338 scan
  42084 prints
  34409 scans
  32390 other
  30417 notes
  21531 sales_orders
  12994 cad
  12763 closed_orders
   2294 packing_slips
   1358 unclassified
    971 quotes
    178 laser_sheets
    117 shipping
     93 tax_financial
     65 quote
     52 accounting
     35 imported
     16 setup
      7 print
      5 invo
... [+333 chars truncated]

### Assistant | 2026-06-02T15:48:47.579Z

The actual bucket enum is much richer than the prompt's 7-value enum. The real inventory has ~26 distinct bucket values across 4 sources. This changes the design substantially — the table must cover all real values, not just the 7 nominal ones. Let me confirm the bucket-by-source cross-tab and the customer/material null rates so disposition predicates are deterministic.

### Assistant | 2026-06-02T15:48:47.700Z

[tool_use: Bash]

### User | 2026-06-02T15:49:11.302Z

[tool_result] === source x bucket (top combos) ===
 139233 jm_die_category|program
 111668 |doc
  85021 |scan
  42084 |prints
  34409 |scans
  31522 |other
  30417 |notes
  26952 |program
  21531 |sales_orders
  12763 |closed_orders
   6428 jm_die_category|cad
   6364 |cad
   2294 |packing_slips
   1358 |unclassified
    971 |quotes
    848 jm_die_category|other
    249 part_library|scan
    202 part_library|ca
... [+407 chars truncated]

### Assistant | 2026-06-02T15:49:15.692Z

My awk parse on the multi-field split was imperfect (many rows show empty source because the field order/delimiter varies), but I have enough signal. The key finding: the real `bucket` enum is far richer than the prompt's nominal 7. Let me quickly confirm the full set of distinct bucket values and their source attribution cleanly with a proper JSON parse, then I have everything needed.

### Assistant | 2026-06-02T15:49:19.240Z

[tool_use: Bash]

### User | 2026-06-02T15:50:21.344Z

[tool_result] TOTAL 554999
custNull 407208 matNull 554104 mcNull 407910
  140215 jm_die_category|program
  111658 docustrata_manifest|doc
   85009 part_library|scan
   42084 docustrata_organized|prints
   34409 docustrata_organized|scans
   31023 part_library|other
   30417 docustrata_organized|notes
   25976 part_library|program
   21531 docustrata_organized|sales_orders
   12763 docustrata_organized|closed_or
... [+814 chars truncated]

### Assistant | 2026-06-02T15:50:27.867Z

Now I have ground truth. Total is exactly 554,999 across 31 distinct (source|bucket) tuples and 4 sources. The prompt's "7-bucket" model is the nominal `part_library` schema; the `docustrata_organized` and `docustrata_manifest` sources use their own richer bucket vocab, and `jm_die_category` reuses program/cad. The spec must cover all 31 tuples. Let me check real engine names quickly to ground the consuming-engine column.

### Assistant | 2026-06-02T15:50:30.384Z

[tool_use: Bash]

### User | 2026-06-02T15:51:56.567Z

[tool_result] mcp-server/src/tools/dispatchers/businessDispatcher.ts
mcp-server/src/__tests__/CustomerManagementEngine.jm-corpus-seed.test.ts
---engines---
AdvancedPostProcessorEngine.ts
AnisotropicMaterialModelEngine.ts
BatchCAMMaterialBridgeEngines.ts
BlueprintCorpusHarvestEngine.ts
BlueprintCoverageAuditEngine.ts
BlueprintExtractionRAGEngine.ts
BlueprintLoRABridgeEngine.ts
BlueprintOCRAdapter.ts
BlueprintOCR
... [+649 chars truncated]

### Assistant | 2026-06-02T15:52:00.450Z

Task #76 is exactly this work. Let me claim it and check the seed bridge + a couple more engine names to ground the table.

### Assistant | 2026-06-02T15:52:01.164Z

[tool_use: TaskUpdate]

### Assistant | 2026-06-02T15:52:05.528Z

[tool_use: Bash]

### User | 2026-06-02T15:52:14.110Z

[tool_result] Updated task #76 owner

### User | 2026-06-02T15:52:42.463Z

[tool_result] ActualCostEngine.ts-1.archive.2026-05-27.corrupted
ArchiveCrawlerEngine.ts
ArchiveToPartsCatalogIngesterEngine.ts
CADArchiveJoinAugmenterEngine.ts
CNCProgramAssemblerEngine.ts
HyperMillSetupSheetBridge.ts
ItemMasterEngine.ts
JMDieArchiveBackAnnotationEngine.ts
JobTravelerEngine.ts
LatheFullArchiveTrainingEngine.ts
LatheProgramLibraryEngine.ts
PPAGIProgramLibraryAuditorEngine.ts
SetupSheetEngine.ts
... [+1458 chars truncated]

### Assistant | 2026-06-02T15:54:09.205Z

I now have real engine names grounded. I have everything needed: the true 31-tuple distribution, the 4 sources, null rates (customer null on all docustrata; material 99.8% null; machine_class null on all docustrata + most part_library), and concrete engine names. Let me write the spec.

Here is the spec.

---

# PRISM JM-DIE DOCUMENT ROUTING + DISPOSITION SPEC

Source of truth for `scripts/build-jm-document-ledger.mjs`. Built against the live corpus (verified 2026-06-02): `H:/prism/state/shared/databases/jm-file-inventory.jsonl` = **554,999 lines exactly**. Every line MUST land in exactly one disposition. Zero silent drops.

## CRITICAL CORRECTION TO THE BRIEF
The brief's "7-bucket enum" (`program|cad|print|scan|setup|doc|other`) is ONLY the `part_library` vocabulary. The live corpus has **4 sources** and **31 distinct (source, bucket) tuples** — the DocuStrata sources carry their own richer bucket vocab. The script MUST key routing on the `(source, bucket)` PAIR, not `bucket` alone, or it will mis-route 60%+ of the corpus. Verified ground truth (JSON-parsed, sums to 554,999):

```
SOURCE                 BUCKET            COUNT
jm_die_category        program          140215
docustrata_manifest    doc              111658
part_library           scan              85009
docustrata_organized   prints            42084
docustrata_organized   scans             34409
part_library           other            31023
docustrata_organized   notes            30417
part_library           program          25976
docustrata_organized   sales_orders     21531
docustrata_organized   closed_orders    12763
jm_die_category        cad                7285
part_library           cad                5709
docustrata_organized   packing_slips      2294
docustrata_organized   unclassified       1358
jm_die_category        other              1354
docustrata_organized   quotes              971
jm_die_category        scan                329
docustrata_organized   laser_sheets        178
docustrata_or
... [+14387 chars truncated]
