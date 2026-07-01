---
name: reference-charlie-orders-closed-355m-2026-06-12
description: "Full JM Orders-Closed corpus ran through the doc pipeline -> 6,718 real actuals = $355M settled-price ground truth. The doc-pipeline arc + how to re-run."
type: reference
slot: charlie
galaxy: quoting
source: prism-memory
synced: 2026-06-27T20:30:46.510Z
aliases: reference_charlie_orders_closed_355m_2026_06_12
---


**The "run all documents through it" deliverable — actual-price side (2026-06-12, slot charlie, YOLO).**

Operator: *"build everything we need so we can run all documents and pdfs through it."* Corpus = ~344,325 PDFs (JMD folders under `H:/PRISM/Docustrata/`). Ran the **entire JMD Orders Closed folder (12,761 PDFs)** through the doc pipeline:

**Result:** 12,593 text-extracted (98.7%, born-digital pypdf, no GPU) -> **6,718 standalone actuals = $355,028,170.89** of real settled-price ground truth (53% yield, 98% high-confidence). Output: `state/shared/quoting/orders-closed-actuals.jsonl` (2.2 MB, the `actuals[]` array). This is JM Die's complete actual-price history, keyed by customer (4,367) / part (3,007 real) / order# (2,398) / date (6,606) for downstream PRISM-prediction-vs-actual matching.

**The doc-pipeline arc shipped this session (all on cad-fusion-live-ms0 trunk via [MAIN-FORCE]):**
1. `U-QP-CLOSEDORDER-ROUTING-FIX` -- CLOSED_ORDER is an ACTUAL source (was mis-filed as a quote -> ~0 pairs).
2. `U-QP-DOCTYPE-FIELD-MINING` -- Orders Closed are PURCHASE ORDERS ($ as per-line Amount/Unit Cost + Order Number, NOT INVOICE TOTAL). `mineOrderTotal`/`mineOrderNumber`.
3. `U-QP-EMIT-STANDALONE-ACTUALS` -- emit actuals with no document-quote (the OODA loop matches them vs PRISM's prediction) instead of discarding.
4. `U-QP-PART-MINER` + `U-QP-PART-PHONE-GUARD` -- PO-aware part extraction; reject letterhead phone numbers (815-397-8848 was polluting part_id at scale).

Pure core: `scripts/lib/docustrata-outcome-extract-lib.mjs` (28 tests). Orchestrator: `scripts/docustrata-run-all-documents.mjs`.

**How to re-run (any folder):**
```
NODE_OPTIONS="--max-old-space-size=16384" node scripts/docustrata-run-all-documents.mjs \
  --from-folders --routes textLayer --folder-roles CLOSED_ORDER \
  --checkpoint <ck> --merged-out <mg> --extracted-out <out> --report <rpt>
```
**The heap flag is REQUIRED** -- the Stage-5 merge OOMs at default heap on 12K+ records (durable orchestrator heap-guard + streaming-merge still QUEUED, U-QP-RUN-ALL scale guards). Resumable: re-run reuses the checkpoint text.

**Known follow-ons (R12):** (a) durable heap-guard/streaming-merge in the orchestrator; (b) orchestrator report's "pairs extracted: 73907" counts pretty-print JSON LINES not records (real pairs=0, value is the 6,718 actuals) -- a reporting bug; (c) the QUOTE side is still open (Quotes folder = drawings, ~8/374 carry $) -- actuals feed the OODA loop vs PRISM predictions, not document-pairs; (d) **U-QP-TRAINCYCLE-FEED** wires these 6,718 actuals into the train-cycle (the value-closing unit, touches the calibration/provenance core -- never soften PLACEHOLDER_MARKERS); (e) Sales Orders (21,515) + Quotes (955) folders not yet run.

Full plan: `state/shared/specs/RUN-ALL-DOCS-PIPELINE-PLAN-2026-06-12.md`. Related: [[reference_docustrata_index_misses_jmd_folders_2026_06_12]], [[reference_charlie_closed_loop_test_2026_06_12]].
