---
title: Using the Obsidian vault with the JM documents (research + the recall-corpus build)
type: architecture
domain: quoting
slot: charlie
created: 2026-06-14
tags: [obsidian, vault, jm-documents, quoting, recall, rag, closed-loop]
---

# Using the Obsidian vault with the JM documents

Operator research directive (2026-06-14): *"utilize obsidian vault for the documents, do research on how we can use obsidian with the jm documents."* This entry is the research answer + the first build.

## The research question
PRISM's Obsidian vault (`knowledge/`) is the persistent 2nd-brain — markdown notes with frontmatter, `[[wikilinks]]`, semantic search (`prism_memory:semantic_search`), a backlink graph, and auto-injection hooks (memory-inject, master-index, wiki-precheck). The JM documents are the shop's real corpus. How do the two combine?

## Current state (search-first enumeration)
| Asset | What | Where |
|---|---|---|
| `jm-die-full-corpus-ingest.mjs` | walks the full JM corpus + Docustrata -> 3 JSONL DBs | `state/shared/databases/jm-{customers(473),vendors(12),file-inventory(554,999)}.jsonl` |
| `jm-shop-knowledge-to-vault.mjs` | distills `files.jsonl` into ONE aggregate shop-profile note | `knowledge/memories/reference/reference_jm_shop_function_profile.md` |
| `orders-closed-actuals.jsonl` | the $355M / 6,718 real settled-price actuals (Orders-Closed POs) | `state/shared/quoting/` |
| obsidian-memory-sync | syncs PRISM *memories* -> vault | (memories only, NOT the JM corpus) |

**The gap:** the JM document corpus lives in flat JSONL *silos*. The vault holds PRISM's reasoning brain + ONE aggregate shop-profile, but NOT the JM documents as **per-customer / per-part queryable recall notes**. Flat JSONL has no semantic search and no backlink graph; the vault does.

## What Obsidian gives the JM documents (the three capabilities)
1. **Semantic recall for quoting (RAG).** When quoting a NEW part for a known customer, semantically recall that customer's real settled-price history -- "what have we settled for OMG / part 413-7?" -- as ADVISORY context, then apply the live margin floor + calibration. This is the RAG layer the quoting closed-loop lacked.
2. **Backlink knowledge graph.** customer <-> part <-> material <-> vendor <-> price, navigable in the Obsidian graph + the `/system-viz` graph, so the quoting AI traverses relationships instead of scanning rows.
3. **Compounding 2nd-brain.** Each new quote/outcome links back to the customer note, building institutional memory the whole fleet (and the frontend) recalls.

## Two data-reality findings (R12, gating the design)
- **The file-inventory DB does NOT cleanly join to the actuals (~27%).** `jm-customers.jsonl` `customer_key` is garbled folder-derived text (`AAAMECONINGPIN`); the actuals carry clean extracted customer names + a `join_key`. So per-customer recall is built from the **actuals** (the quoting-critical real-price dimension), not the file-inventory.
- **The actuals carry extraction noise that MUST be gated or recall is poisoned.** Live: a $130.6M "BIRMINGHAM" settled price (5 parts -> $26M/part, non-physical), $0.002 sub-dollar prices, year-4611 dates, and form-label "customers" (`ADDRESS` $1.06M, `SHIPTO`, `THIS DRAWING IS THE PROPERTY OF...`). A recall note saying "we settled at $26M/part" would cause a catastrophic over-quote -- so the bridge applies data-quality gates (see below).

## The build -- `jm-corpus-to-vault.mjs` (U-QP-JM-CORPUS-VAULT)
Per-customer Obsidian recall notes from the $355M actuals, with a pure core (`scripts/lib/jm-corpus-vault-lib.mjs`, 11 tests):
- **Output:** `knowledge/jm-corpus/customers/<slug>.md` (one per customer) + `INDEX.md` + a memory-recallable pointer `knowledge/memories/reference/reference_jm_corpus_customer_recall.md`.
- **Each note:** frontmatter (name/description/type/tags + node_type `jm-corpus-customer`) so memory-inject + master-index surface it; recall body with settled-price stats (median/range/total), a parts table (honest "newest N of M" cap), and the prominent caveat **"ADVISORY recall, NOT a quote -- apply the live margin floor + calibration."**
- **Data-quality gates (R12, all tracked + reported):** confidence floor (>=0.6), high-outlier reject (>$2M = parse error), sub-dollar reject (<$1), form-label/boilerplate reject (exact + word-boundary phrase regex), out-of-window date null (1990-2031, keeps the price row). CONSERVATIVE customer handling -- no fuzzy name merge (charlie soul refuse); only non-customer *rejection*.
- **Idempotent:** prune step removes orphan notes from a prior run so a re-run converges to the live dataset.
- **Live:** 394 customers, 1,250 parts, **$26.0M** plausible settled-price recall (after gating the ~$255M of extraction poison); excluded counts surfaced (outlier 12, sub-dollar 20, form-label 426, low-conf 1282, nulled-dates 154).

## Future directions (queued, not built)
- Per-PART notes for the highest-volume parts (finer recall granularity).
- Per-VENDOR cost notes (from `jm-vendors.jsonl`) for the inbound cost basis.
- Wire the customer recall into `InstantQuoteEngine` (recall the customer note before predicting FMV -> per-customer prior).
- Re-extract the Orders-Closed corpus with a stricter customer/price/date extractor to lift the join + cut the 27% noise (xray/blueprint-vision dependency).

Memory: [[reference_jm_corpus_customer_recall]] - [[reference_charlie_docustrata_corpus_price_map_2026_06_13]] - [[reference_charlie_closedloop_full_corpus_validated_2026_06_13]].
