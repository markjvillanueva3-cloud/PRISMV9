---
name: reference_docustrata_index_misses_jmd_folders_2026_06_12
description: "CRITICAL data-reality: the Docustrata .index (73,506 recs) does NOT cover the 35,231 JMD quote/order/sales PDFs at all -- they are un-indexed + un-OCR'd raw on disk; the index covers Untitled Folder/My Notebook/JMD Scans only (slot:charlie 2026-06-12)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.555Z
aliases: reference_docustrata_index_misses_jmd_folders_2026_06_12
---


# The Docustrata index does NOT cover the JMD quote/order folders (2026-06-12, slot:charlie)

Operator challenge (fired twice): *"you went through every single document and order from the docustrata folder?"* The honest answer is **NO -- and nothing ever did.** Verified this session:

## What the `.index` actually covers (NOT the quote/order docs)
`H:/PRISM/Docustrata/.index/documents-classified-v3.jsonl` = 73,506 records. Verified `disk_path` top-level distribution under `Docustrata/`:
- `Untitled Folder` = 32,155
- `My Notebook` = 30,418 (Evernote notes)
- `JMD Scans` = 9,312
- `Unfiled` = 1,380 · `_Imported_*` ~40 · root ~206

**Records whose disk_path is inside a JMD Quotes/Orders Closed/Sales Orders folder: `0` (zero).** The quote/order corpus is entirely outside the index.

`inferred_role` (v1) is also useless for doc-type: SCAN_GENERIC=36,184 · NOTE=30,594 · UNKNOWN=6,685 · SALES_ORDER=**2**. v2 adds SCAN_BUSINESS=12,501 but still no doc-type granularity. So a work-set filter on `inferred_role in {QUOTE,SALES_ORDER,CLOSED_ORDER,INVOICE}` returns **2 docs** out of 73,506.

## What's actually on disk (the real corpus the operator means)
`find Docustrata/<folder> -iname '*.pdf'`:
- `JMD Quotes` = **955** PDFs
- `JMD Orders Closed` = **12,761** PDFs
- `JMD Sales Orders` = **21,515** PDFs
- `JMD Packing Slips` = **1,149** PDFs

= **35,231 quote/order PDFs**, none indexed, none OCR'd. The folder NAME is the ground-truth document role (confidence 1.0) -- far more reliable than the broken classifier.

## Consequence for the closed loop + the run-all pipeline
The "data ceiling" (~10 curated pairs) was never a data-absence problem -- it's that the 35K real quote/order documents were never processed. `extract-docustrata-outcomes.mjs` (the parser) defaults to the index (`documents-text-extracted-v3.jsonl`, zero text) so it finds nothing.

**Fix (this session, U-QP-DOCUSTRATA-RUN-ALL):** `scripts/docustrata-run-all-documents.mjs` gains a `--from-folders` work-set source that globs the JMD folders directly, assigns role by folder name, then routes each PDF cheap-first (pypdf text-layer -> vision OCR fallback) -> merge -> `extract-docustrata-outcomes.mjs` -> pairs -> coverage report. The classified-index source stays for the Unfiled/scan set.

**Open follow-up:** the extractor's role->bucket pairing (QUOTE=predicted vs INVOICE=actual) has no INVOICE folder; the actuals live in CLOSED_ORDER. Verify/extend `extract-docustrata-outcomes.mjs` so QUOTE pairs against CLOSED_ORDER (the completed-job final price) before claiming pairs. Generating the TEXT is the unlock this session delivers; the role-bucket pairing semantics are the next leg.

## What the documents ACTUALLY contain (quantified, 120-doc stratified sample, 2026-06-12)
Ran `pdf-text-layer-extract.py` over 40 docs/folder. **100% born-digital (120/120 had a usable text layer) -- the entire 35K corpus extracts via pypdf in MINUTES, no GPU OCR needed.** Signal prevalence:

| folder | n | textOK | $ amounts | customer | part | quote-ref | total/price-kw |
|--------|---|--------|-----------|----------|------|-----------|----------------|
| JMD Quotes | 40 | 40 | 0 | 3 | 17 | 8 | 1 |
| JMD Sales Orders | 40 | 40 | 0 | 40 | 40 | 2 | 1 |
| JMD Orders Closed | 40 | 40 | **14** | 20 | 29 | 8 | **25** |

**The folders are NOT priced quote/invoice docs:**
- **JMD Quotes** = engineering DRAWINGS (the part prints sent to be quoted). Part dims/tolerances, sparse customer, ZERO $ -> print-to-quote geometry training, not price pairs.
- **JMD Sales Orders** = order travelers: customer 40/40 + part 40/40, but ZERO $ -> rich customer/part/PO/qty history, price-poor.
- **JMD Orders Closed** = the ACTUAL-PRICE source: **14/40 (~35%) carry $ amounts, 25/40 (62%) have price/total keywords**, + quote-refs ("per your quote 10/25/17"). ~12,761 closed orders x ~35% ~= **~4,400 docs with real dollar figures** (vs the 10 curated pairs the loop trains on today).

## Honest answer to "can we utilize data from other sources to train the model further?"
**YES, substantially -- but routed to the right axes, NOT as naive 35K price-pairs:**
1. **Customer/part history** (HIGH yield): ~21,515 Sales Orders give customer+part+PO+qty -> repeat-job priors, customer frequency, part recognition.
2. **Actual prices** (MEDIUM yield): ~4,400 Orders Closed carry $ -> a real ACTUAL-cost signal, ~440x the current 10 curated pairs.
3. **Print-to-quote geometry** (HIGH yield): 955 Quotes + the drawings embedded in Sales Orders -> blueprint->quote training (charlie + delta/blueprint-vision).
The PRICE-PAIR ceiling was never data-absence -- the dollar data is in Orders Closed (and the accounting system / "Report from J.M. Tool & Die.pdf", hotel's domain), not the Quotes folder.

## Build delivered (U-QP-DOCUSTRATA-RUN-ALL) + the next leg
`scripts/docustrata-run-all-documents.mjs --from-folders` RUNS all 35,231 docs through [glob -> route(textLayer/ocr) -> pypdf/vision -> merge -> extractor -> coverage]. Proven end-to-end on real docs. **Next leg (scoped follow-up):** `extract-docustrata-outcomes.mjs` regexes are tuned for "QUOTE TOTAL: $" which these docs lack; retarget it to mine Orders Closed for $ + quote-ref linkage, and emit customer/part/PO/qty records from Sales Orders for the customer-history axis. The TEXT is now available (the blocker this unit removed); the field-mining per doc-type is the next unit.

Lesson (global CLAUDE.md): never assume what a data file CONTAINS from its name -- `documents-classified-v3.jsonl` sounds like it covers the documents (it covers a different set), and "JMD Quotes" sounds like priced quotes (they're drawings). Enumerate + read the actual contents. -> [[feedback_never_assume_data_file_contents]]
