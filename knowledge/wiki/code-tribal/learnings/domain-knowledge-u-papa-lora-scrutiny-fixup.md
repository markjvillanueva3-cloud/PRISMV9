# DOMAIN-KNOWLEDGE/U-PAPA-LORA-SCRUTINY-FIXUP — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-SCRUTINY-FIXUP (slot:papa): 3-of-3 arm-C P1 -- strip C0/C1/DEL control bytes in cleanText + synthInstruction so pdftotext binary noise from a broken-encoding PDF can never poison a LoRA row (GIGO; latent, script is rerunnable over larger batches). +4 control-byte/spawn-throw tests (converter 15/15) + title-prefix regression-lock (reclassifier 18/18, arm-B P2).

**Commit:** `2ff58c298fcc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:12:04-05:00
**Tags:** domain-knowledge, u-papa-lora-scrutiny-fixup, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-SCRUTINY-FIXUP (slot:papa): 3-of-3 arm-C P1 -- strip C0/C1/DEL control bytes in cleanText + synthInstruction so pdftotext binary noise from a broken-encoding PDF can never poison a LoRA row (GIGO; latent, script is rerunnable over larger batches). +4 control-byte/spawn-throw tests (converter 15/15) + title-prefix regression-lock (reclassifier 18/18, arm-B P2).

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-SCRUTINY-FIXUP (slot:papa): 3-of-3 arm-C P1 -- strip C0/C1/DEL control bytes in cleanText + synthInstruction so pdftotext binary noise from a broken-encoding PDF can never poison a LoRA row (GIGO; latent, script is rerunnable over larger batches). +4 control-byte/spawn-throw tests (converter 15/15) + title-prefix regression-lock (reclassifier 18/18, arm-B P2).
```

## Files touched (4)
- scripts/domain-corpus-to-lora-dataset.mjs         |  6 +++++-
- scripts/domain-corpus-to-lora-dataset.test.mjs    | 30 ++++++++++++++++++++++++++++++
- scripts/reclassify-domain-feeders-ollama.test.mjs |  7 +++++++
- 3 files changed, 42 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2ff58c298fcc`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._