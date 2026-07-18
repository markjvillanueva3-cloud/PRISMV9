---
name: reference-psn-graphiti-seed-tests-2026-05-25
description: 2026-05-25 sierra iter 24 — closes iter-23 R12 follow-up U-PSN-GRAPHITI-SEED-TESTS. Test coverage for iter-23 seed-episodes-from-git additions. 11 → 17 tests. Caught + fixed 2 silent regressions iter-23 introduced (RECSEP parser change broke `multiple commits parsed correctly` + `idempotent — duplicate SHAs are skipped`). Iter-23's close-out memo had stated "existing tests still pass without modification" which was WRONG; iter-24 verified and corrected per Karpathy R12 fail-loud doctrine.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:47.126Z
aliases: reference_psn_graphiti_seed_tests_2026_05_25
---


## What shipped

`scripts/seed-episodes-from-git.test.mjs` updated: 11 → 17 tests, 1 file changed, 253 insertions.

### Fixture fix (regression repair)

`buildGitOutput()` helper was joining commits with `\n\n` — the OLD parser format. After iter-23's RECSEP change, it needed to append `\x1e` per entry. The helper now mirrors the real format string exactly: `header + (optional file lines) + RECSEP`, joined with empty string. Without this fix the 2 silent regressions stayed broken.

### 6 new test cases

| test | what it locks in |
|---|---|
| `readGitLog: --all flag inserts --all after log subcommand` | iter-23 splice-position bug regression-guard (git rejects `git --all log`; only `git log --all` works) |
| `readGitLog: --all absent by default` | back-compat: default behavior unchanged |
| `readGitLog: --no-files omits --name-only flag` | iter-23 corrupt-tree workaround |
| `readGitLog: --name-only present by default` | back-compat: file-entity extraction is the default |
| `readGitLog: pretty-format ends with RECSEP` | iter-23 parser contract: format always terminates with `\x1e` |
| `readGitLog: parser handles no-files mode (RECSEP-only fixture)` | end-to-end: parses 2 commits delimited only by RECSEP with no inline newlines |

## Verification

```
$ node --test scripts/seed-episodes-from-git.test.mjs
# tests 17
# pass 17
# fail 0
```

## R12 lesson — what this iter taught

Iter-23's close-out memo (`reference_psn_graphiti_seed_expanded_2026_05_25.md`) stated:

> "Existing tests at `scripts/seed-episodes-from-git.test.mjs` cover the old `readGitLog` signature; the new `all` + `noFiles` parameters degrade gracefully (default-false) so existing tests still pass without modification."

That was wrong. The `--all` and `--noFiles` parameters DID degrade gracefully — but the RECSEP parser change DID break the fixture. I conflated "new parameters are backward-compatible" with "all changes are backward-compatible" and skipped the test run. Karpathy R12 (fail loud, don't hide uncertainty) says: if I can't run the tests to verify, say so explicitly. I should have said "tests not re-run this iter" instead of asserting they still pass.

The iter-23 memo has been left as-shipped (historical record); this iter's memo carries the correction. The retrospective:
- **Never assert "tests still pass" without running them.** Run them or say "not re-run".
- **Behavior-change in shared infrastructure (parsers, fixtures, helpers) needs the test suite re-run even if the entry-point signature is unchanged.** The format string change was the actual breaking change, not the new parameters.

## Compounding chain — sierra iters 17 → 24 (FULL)

| iter | unit | layer | metric |
|---|---|---|---|
| 17 | `U-PSN-QDRANT-POPULATE` | data | 0 → 3,866 vectors |
| 18 | `U-PSN-HYBRID-RETRIEVAL-WIRE` | runtime | 4-substrate RRF, 44/44 tests |
| 19 | `U-PSN-QDRANT-PAYLOAD-DEBUG` | quality | canonical engine ids, 50/50 tests |
| 21 | `U-PSN-HYBRID-VIZ-ROOST` | observability | viz augmentation (4/4 GREEN) |
| 22 | `U-PSN-HYBRID-VIZ-ROOST-WIRE` | render-pipeline | regen-viz + merge-augmentations splices |
| 23 | `U-PSN-GRAPHITI-SEED-EXPANDED` | data | 7 → 2,004 episodes (286x) |
| 24 | `U-PSN-GRAPHITI-SEED-TESTS` | quality | 11 → 17 tests, 2 silent regressions caught + fixed |

## Closes

`PSN-ENHANCE-MS0::U-PSN-GRAPHITI-SEED-TESTS-2026-05-25` — closes iter-23 R12 follow-up. The hybrid-retrieval compounding chain is now fully test-locked at every quality-relevant junction (lib + payload normalizer + seed flags + parser).

## Cross-refs

- [[reference_psn_graphiti_seed_expanded_2026_05_25]] — iter 23 (the change that introduced the silent regressions)
- [[reference_psn_hybrid_retrieval_wire_2026_05_25]] — iter 18 (the 44/44 lib tests)
- [[reference_psn_qdrant_payload_debug_2026_05_25]] — iter 19 (the 50/50 lib tests)
- [[feedback_r5_thru_r12_doctrine]] — R12 doctrine this iter applied
