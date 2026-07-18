---
name: reference_charlie_quoting_test_count_drift
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.513Z
aliases: reference_charlie_quoting_test_count_drift
---


QUOTING-SYNERGY-MS0 iter28-32 (commit `211ab8e1f3`). Commit messages iter28-31 all claimed 281 tests; the actual count was 263 (a prose addition error that compounded across 4 commits). iter32 surfaced it via R12 fail-loud rather than letting it keep compounding.

**Rule:** any running-total claim across multiple commits must be reverify-able from the live test runner — never trust a prose count. Run `node scripts/quoting-pipeline-verify.mjs --json` (see [[reference_charlie_quoting_pipeline_verify]]) to get the real number before writing it in a commit message or handoff.
