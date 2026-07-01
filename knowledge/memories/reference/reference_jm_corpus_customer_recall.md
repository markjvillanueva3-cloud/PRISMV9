---
name: reference_jm_corpus_customer_recall
description: 394 JM customers' real settled-price history is in the vault at knowledge/jm-corpus/customers/ -- recall before quoting a known customer
metadata:
  type: reference
  node_type: memory
---

**JM customer settled-price recall corpus (slot:charlie).** The real $355M Orders-Closed actuals are now per-customer Obsidian notes at `knowledge/jm-corpus/customers/<slug>.md` (394 customers, 1250 parts, $26,004,128 settled, confidence >= 0.6). **When quoting a part for a known customer, recall their note** (`jm_corpus_customer_<slug>`) for the real settled-price history -- ADVISORY recall, apply the live margin floor + calibration, NEVER a bare quote. Index: `knowledge/jm-corpus/INDEX.md`. Regenerate: `node scripts/jm-corpus-to-vault.mjs`. See [[reference_charlie_docustrata_corpus_price_map_2026_06_13]].
