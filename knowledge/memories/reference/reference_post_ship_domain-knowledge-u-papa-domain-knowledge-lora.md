---
name: reference_post_ship_domain-knowledge-u-papa-domain-knowledge-lora
description: Auto-distilled learnings from shipping DOMAIN-KNOWLEDGE/U-PAPA-DOMAIN-KNOWLEDGE-LORA (commit ddfb66eab). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.838Z
aliases: reference_post_ship_domain-knowledge-u-papa-domain-knowledge-lora
---


# DOMAIN-KNOWLEDGE/U-PAPA-DOMAIN-KNOWLEDGE-LORA

[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-KNOWLEDGE-LORA (slot:papa): inject rescued domain knowledge into ACTUAL LoRA training (operator-authorized cross-galaxy unit). domain-corpus-to-lora-dataset.mjs turns real pdftotext text from the 65 Ollama-rescued PDFs -> 102 domain-tagged Alpaca pairs (post-proc 57/mill 32/lathe 6/sf 4/wedm 2/tooling 1), GIGO-safe + advisory-weighted. Registered as domain-knowledge-lora; assemble-fleet-lora-corpus folds all 102 into the 6019-row fleet corpus the GPU fine-tune consumes (0 dup/invalid). 11/11 converter tests + reclassifier 17/17 (extractSpecSignal title-prefix fix). Closes pointer->payload: getDomainCorpus indexes the sources, this trains on them.

**Shipped:** 2026-06-24T21:02:15-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[domain-knowledge-u-papa-domain-knowledge-lora]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._