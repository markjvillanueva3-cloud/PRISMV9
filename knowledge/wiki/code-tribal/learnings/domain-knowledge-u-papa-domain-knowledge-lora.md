# DOMAIN-KNOWLEDGE/U-PAPA-DOMAIN-KNOWLEDGE-LORA — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-KNOWLEDGE-LORA (slot:papa): inject rescued domain knowledge into ACTUAL LoRA training (operator-authorized cross-galaxy unit). domain-corpus-to-lora-dataset.mjs turns real pdftotext text from the 65 Ollama-rescued PDFs -> 102 domain-tagged Alpaca pairs (post-proc 57/mill 32/lathe 6/sf 4/wedm 2/tooling 1), GIGO-safe + advisory-weighted. Registered as domain-knowledge-lora; assemble-fleet-lora-corpus folds all 102 into the 6019-row fleet corpus the GPU fine-tune consumes (0 dup/invalid). 11/11 converter tests + reclassifier 17/17 (extractSpecSignal title-prefix fix). Closes pointer->payload: getDomainCorpus indexes the sources, this trains on them.

**Commit:** `ddfb66eabb7a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:02:15-05:00
**Tags:** domain-knowledge, u-papa-domain-knowledge-lora, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-KNOWLEDGE-LORA (slot:papa): inject rescued domain knowledge into ACTUAL LoRA training (operator-authorized cross-galaxy unit). domain-corpus-to-lora-dataset.mjs turns real pdftotext text from the 65 Ollama-rescued PDFs -> 102 domain-tagged Alpaca pairs (post-proc 57/mill 32/lathe 6/sf 4/wedm 2/tooling 1), GIGO-safe + advisory-weighted. Registered as domain-knowledge-lora; assemble-fleet-lora-corpus folds all 102 into the 6019-row fleet corpus the GPU fine-tune consumes (0 dup/invalid). 11/11 converter tests + reclassifier 17/17 (extractSpecSignal title-prefix fix). Closes pointer->payload: getDomainCorpus indexes the sources, this trains on them.

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-KNOWLEDGE-LORA (slot:papa): inject rescued domain knowledge into ACTUAL LoRA training (operator-authorized cross-galaxy unit). domain-corpus-to-lora-dataset.mjs turns real pdftotext text from the 65 Ollama-rescued PDFs -> 102 domain-tagged Alpaca pairs (post-proc 57/mill 32/lathe 6/sf 4/wedm 2/tooling 1), GIGO-safe + advisory-weighted. Registered as domain-knowledge-lora; assemble-fleet-lora-corpus folds all 102 into the 6019-row fleet corpus the GPU fine-tune consumes (0 dup/invalid). 11/11 converter tests + reclassifier 17/17 (extractSpecSignal title-prefix fix). Closes pointer->payload: getDomainCorpus indexes the sources, this trains on them.
```

## Files touched (5)
- scripts/build-fleet-training-corpus-inventory.mjs |  11 +++++++++++
- scripts/domain-corpus-to-lora-dataset.mjs         | 180 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/domain-corpus-to-lora-dataset.test.mjs    | 121 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/reclassify-domain-feeders-ollama.mjs      |   2 +-
- 4 files changed, 313 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ddfb66eabb7a`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._