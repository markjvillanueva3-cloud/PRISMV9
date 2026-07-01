---
name: reference_post_ship_cad-learning-ai-u-bpa-consumer-state-isolate
description: Auto-distilled learnings from shipping CAD-LEARNING-AI/U-BPA-CONSUMER-STATE-ISOLATE (commit 80b36e535). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.798Z
aliases: reference_post_ship_cad-learning-ai-u-bpa-consumer-state-isolate
---


# CAD-LEARNING-AI/U-BPA-CONSUMER-STATE-ISOLATE

[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-CONSUMER-STATE-ISOLATE (slot:india): give the offline blueprint-accuracy consumer its OWN state file so the xray drift-guard hook stops clobbering its lastProcessedOffset. The hook accepts only schemaVersion:1 and resets any v2 file it finds, which wiped the consumer offset on every blueprint PostToolUse and forced a full-ledger re-process (non-idempotent, inflated daily-ledger counts + duplicate xproc action lists). Consumer now writes blueprint-accuracy-consumer-state.json (new CONSUMER_STATE_FILENAME const); xray hook untouched. 43/43 tests (+3 R9: distinct-filenames invariant + root-cause migrate oracle + v2 round-trip). LIVE: 145 events processed offset 0->508483, immediate re-run processed 0 = idempotent.

**Shipped:** 2026-06-24T23:57:19-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[cad-learning-ai-u-bpa-consumer-state-isolate]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._