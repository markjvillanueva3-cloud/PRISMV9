---
name: reference_charlie_quoting_test_discovery_glob
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.057Z
aliases: reference_charlie_quoting_test_discovery_glob
---


QUOTING-SYNERGY-MS0 iter32 (commit `211ab8e1f3`, R12). The `quoting-pipeline-verify.mjs` discovery regex `/^quoting-.+\.test\.mjs$/` silently excluded `install-quoting-pipeline-cron.test.mjs` (prefix didn't match) — 18 tests ran 0×, operator saw "263/263 PASS" and assumed full coverage.

**Fix:** explicit alternation `/^(quoting-|install-quoting-).+\.test\.mjs$/`. **Lesson:** anchored-prefix globs need explicit alternation enumeration; assume silent exclusion until proven otherwise. Any time you ship a new `<prefix>-quoting-*.test.mjs`, extend the discovery glob. Sister: [[reference_charlie_quoting_pipeline_verify]].
