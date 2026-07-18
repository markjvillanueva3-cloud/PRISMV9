---
name: reference_post_ship_hermes-dynamic-workflow-ms0-u-hwp-emit
description: Auto-distilled learnings from shipping HERMES-DYNAMIC-WORKFLOW-MS0/U-HWP-EMIT (commit 1bb66a182). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.886Z
aliases: reference_post_ship_hermes-dynamic-workflow-ms0-u-hwp-emit
---


# HERMES-DYNAMIC-WORKFLOW-MS0/U-HWP-EMIT

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-DYNAMIC-WORKFLOW-MS0]/U-HWP-EMIT (slot:bravo): the second half of 'behave like the coder' — emitWorkflowScript() turns a plan into a RUNNABLE PRISM Workflow harness skeleton (the article's 'Claude writes that harness for you'). Per-pattern codegen: fan-out→parallel(barrier)+opus synth, adversarial-verify→separate-verifier parallel, tournament→code-owned pairwise bracket, loop-until-done→dry-round stop (not fixed count), generate-and-filter→parallel gen+filter, classify-and-act→cheap classifier+route; prepends a read-only quarantine reader when untrusted (step 13); meta block + token-budget/goal/loop comments. CLI --emit. Emitted harness is node --check-valid IN the Workflow async context (top-level await+return are legal there — the test wraps the body in an async fn, the faithful execution model). +6 tests (43 total green). TOOLBELT doc-reflect.

**Shipped:** 2026-06-04T12:40:25-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[hermes-dynamic-workflow-ms0-u-hwp-emit]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._