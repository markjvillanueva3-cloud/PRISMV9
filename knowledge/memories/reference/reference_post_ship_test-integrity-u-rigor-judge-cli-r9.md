---
name: reference_post_ship_test-integrity-u-rigor-judge-cli-r9
description: Auto-distilled learnings from shipping TEST-INTEGRITY/U-RIGOR-JUDGE-CLI-R9 (commit 1a0177736). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.071Z
aliases: reference_post_ship_test-integrity-u-rigor-judge-cli-r9
---


# TEST-INTEGRITY/U-RIGOR-JUDGE-CLI-R9

[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-CLI-R9 (slot:alpha): R9 coverage for the AI judge fallback ladder -- make callJudge callers-injectable (backward-compatible, default=real ollama/hermes) + 8 hermetic tests pinning ollama->hermes order, first-non-empty-wins, ollama-throw-falls-through, both-fail-throws (R12 never fabricate), hermesFirst, default-model, and the hermes-model-routing fix 02641a95ca (opts.model->ollama only, never hermes). Core 18/18 regression clean.

**Shipped:** 2026-06-24T10:22:03-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[test-integrity-u-rigor-judge-cli-r9]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._