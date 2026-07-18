---
name: feedback-whiskey-okuma-first-corpus
description: JM Die's lathe fleet is 100% Okuma OSP (7× LTH machines). Okuma dialect is the richest tribal precedent — default to it.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.453Z
aliases: feedback_whiskey_okuma_first_corpus
---


JM Die's entire lathe fleet is **100% Okuma** (LTH-01..07: GENOS L200E/L300/L400II, LB 3000EX, Crown L1060, LNC8, Multus B250II — all OSP controllers). The Okuma OSP dialect therefore has the richest tribal/post precedent in the lathe corpus.

**Why:** test-shop reality drives the corpus. Okuma OSP differs from Fanuc (G-code variants, IGF/Advanced One-Touch, special-G codes, macro syntax) — assuming Fanuc defaults mis-programs every JM Die job.

**How to apply:** default lathe work to Okuma OSP unless told otherwise; use `OkumaB250LatheMasterPostEngine`, `OkumaOSPParserEngine`, `OkumaDialectKnowledgeEngine`, and the `okuma_*` tribal miners. CSS/G50/G76 conventions apply per [[reference_jm_die_is_okuma_heavy_implications_2026_05_27]].
