---
name: reference_charlie_obsidian_jm_corpus_2026_06_14
description: Built the JM-documents -> Obsidian vault per-customer settled-price recall corpus (RAG for quoting); 394 customer notes from the $355M actuals, data-quality gated
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.510Z
aliases: reference_charlie_obsidian_jm_corpus_2026_06_14
---


**Obsidian + JM documents -- research + recall-corpus build (slot:charlie, 2026-06-14).** Operator: "utilize obsidian vault for the documents, do research on how we can use obsidian with the jm documents."

## Research answer
The JM corpus lived in flat JSONL silos (`jm-{customers,vendors,file-inventory}.jsonl` + `orders-closed-actuals.jsonl`), NOT in the Obsidian vault as queryable recall notes (the existing `jm-shop-knowledge-to-vault.mjs` makes only ONE aggregate shop-profile note). Obsidian gives the JM docs three things flat JSONL can't: (1) **semantic recall for quoting** (RAG -- recall a customer's real settled-price history when quoting a new part), (2) **backlink knowledge graph** (customer<->part<->material<->vendor<->price), (3) **compounding 2nd-brain**.

## Build -- `scripts/jm-corpus-to-vault.mjs` + `scripts/lib/jm-corpus-vault-lib.mjs` (11 tests)
Per-customer recall notes from the $355M actuals -> `knowledge/jm-corpus/customers/<slug>.md` (394 notes) + `INDEX.md` + memory pointer `reference_jm_corpus_customer_recall.md`. Each note: recallable frontmatter, settled-price stats, parts table (honest cap), prominent "ADVISORY recall, NOT a quote -- apply margin floor + calibration" caveat. Live: 394 customers, 1,250 parts, **$26.0M** settled.

## Two data-reality findings (R12)
1. **The file-inventory DB joins to the actuals at only ~27%** (garbled folder-derived `customer_key` vs clean actual customer names) -> recall built from the ACTUALS, not the file-inventory.
2. **The actuals carry extraction POISON that MUST be gated** or recall causes catastrophic over-quotes: $130.6M "BIRMINGHAM" ($26M/part), $0.002 sub-dollar, year-4611 dates, form-label "customers" (ADDRESS $1.06M, SHIPTO, "THIS DRAWING IS THE PROPERTY OF..."). Gates: confidence>=0.6, high-outlier>$2M reject, sub-dollar<$1 reject, form-label reject (exact + word-boundary phrase regex), out-of-window-date null (1990-2031). CONSERVATIVE customer handling (no fuzzy merge -- soul refuse); only non-customer rejection. Idempotent prune. All exclusions tracked + reported. Gated ~$255M of poison out of the raw $281M.

## Scrutiny lesson (R12, load-bearing)
Per-file scrutiny reviewer B (read the ACTUAL generated notes) caught 4 recall-poisoning defects the first pass + reviewer A missed: weak exact-match form-label denylist (ADDRESS leaked $1.06M), no sub-dollar floor, no date sanity, no re-run prune. **For a data-emitting build, a reviewer MUST read the real output, not just the code.** All 4 fixed, re-reviewed PASS.

## Future (queued)
Per-part + per-vendor notes; wire customer recall into `InstantQuoteEngine` (per-customer prior); stricter Orders-Closed extractor to lift the join + cut the 27% noise (xray dependency). Wiki: [[obsidian-with-jm-documents]]. See [[reference_charlie_docustrata_corpus_price_map_2026_06_13]].
