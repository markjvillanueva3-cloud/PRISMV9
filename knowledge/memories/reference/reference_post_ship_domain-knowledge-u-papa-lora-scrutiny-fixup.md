---
name: reference_post_ship_domain-knowledge-u-papa-lora-scrutiny-fixup
description: Auto-distilled learnings from shipping DOMAIN-KNOWLEDGE/U-PAPA-LORA-SCRUTINY-FIXUP (commit 2ff58c298). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.838Z
aliases: reference_post_ship_domain-knowledge-u-papa-lora-scrutiny-fixup
---


# DOMAIN-KNOWLEDGE/U-PAPA-LORA-SCRUTINY-FIXUP

[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-SCRUTINY-FIXUP (slot:papa): 3-of-3 arm-C P1 -- strip C0/C1/DEL control bytes in cleanText + synthInstruction so pdftotext binary noise from a broken-encoding PDF can never poison a LoRA row (GIGO; latent, script is rerunnable over larger batches). +4 control-byte/spawn-throw tests (converter 15/15) + title-prefix regression-lock (reclassifier 18/18, arm-B P2).

**Shipped:** 2026-06-24T21:12:04-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[domain-knowledge-u-papa-lora-scrutiny-fixup]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._