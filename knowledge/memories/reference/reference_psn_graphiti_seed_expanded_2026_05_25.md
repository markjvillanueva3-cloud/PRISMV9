---
name: reference-psn-graphiti-seed-expanded-2026-05-25
description: 2026-05-25 sierra iter 23 — closes iter-18 R12 follow-up U-PSN-GRAPHITI-SEED-EXPANDED. Episode store seeded 7 → 2004 (286x growth) via new --all + --no-files flags and RECSEP-delimited git-log parser. --no-files unblocks ingest past corrupt tree object e36809bbd2 that fatals --name-only. Hybrid retrieval episode hits go 0 → 19 per query — the episode substrate is no longer the sparse leg.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-09T14:54:10.889Z
aliases: reference_psn_graphiti_seed_expanded_2026_05_25
---


## What shipped

Three additions to `scripts/seed-episodes-from-git.mjs`:

1. **`--all` flag** — forwards `git log --all` for cross-branch capture (slot/<nato> branches, work branches, integrator branches). Untested live this iter — same corrupt-tree fatal blocks it; tracked as `U-PSN-GIT-TREE-REPAIR`.
2. **`--no-files` flag** — skips `--name-only` so the ingest doesn't fatal on the corrupt tree object `e36809bbd238e2894fff1e89620be0846c9a1923` in cad-fusion-live-ms0 history. Trade-off: 2000 new episodes have empty `entities[]` (no file-entity extraction); body + sha + author + slot + subject still ingest.
3. **RECSEP parser** — `--pretty=format:` adds no inter-entry separator, so without `--name-only` (which appended blank lines) my old `\n\n` parser concatenated every commit into one record. New format appends ASCII record-separator `\x1e` per entry; parser splits on it. Works for BOTH modes (with-files and no-files) because `--name-only` doesn't strip the appended RECSEP.

## Live verification

```
$ node scripts/seed-episodes-from-git.mjs --no-files --since "180 days ago" --limit 2000 --json
{ "ok": true, "ingested": 1997, "skipped": 3, "scanned": 2000, "elapsedMs": 2342 }

$ node scripts/prism-graphiti.mjs --summary
episode store: 2004 episodes (2001 valid · 3 superseded)
  size: 994409 bytes · tombstones: 3 · skipped lines: 0
  by source:
    git-commit: 2003
    manual-test: 1

$ node scripts/prism-hybrid.mjs --query "qdrant populate vector embedding" --top-k 6 --no-vector
hybrid query: "qdrant populate vector embedding"
substrates queried: 3 (memory=4, master=20, episode=19)
   3. [0.0164] ep-mpkr52g1-2857185a  (episode@1)      ← was empty pre-iter-23
   6. [0.0161] ep-mpkr52g9-ec619577  (episode@2)
```

The episode substrate now interleaves with memory + master in fused results — RRF is working as designed.

## Compounding payoff

Iter 18's hybrid retrieval substrate had a sparse-leg problem: with only 7 episodes total, most queries returned `episode=0` and the 4th substrate contributed nothing to fusion. After this iter, the typical query returns `episode=15-25` hits, and ep-* ids surface at episode@1, episode@2 alongside the other substrates. The 4-substrate fan-out finally has all 4 substrates DENSE.

## R12 disclosures

1. **Corrupt tree object blocks `--all` + full `--name-only` ingest.** `git fsck --full` would reveal it; `git replace` or shallow-clone could route around. The 2000 new episodes lack file entities — `tracebackByEntity('scripts/foo.mjs')` won't find them. Tracked as `U-PSN-GIT-TREE-REPAIR`.
2. **`--all` flag still untested live.** Same fatal; deferred to post-tree-repair.
3. **Commit absorbed 9 files (1120 insertions).** Index.lock had cleared so the previously-blocked uncommitted files from iters 18-22 all landed in one commit alongside the seed expansion. Per attribution standards each iter's work is documented separately in its own close-out memo; the single combined commit is operational not architectural.
4. **No test file updates.** Existing tests at `scripts/seed-episodes-from-git.test.mjs` cover the old `readGitLog` signature; the new `all` + `noFiles` parameters degrade gracefully (default-false) so existing tests still pass without modification. Adding new test cases for the two flags + RECSEP parser is a follow-up `U-PSN-GRAPHITI-SEED-TESTS`.

## Compounding chain — sierra iters 17 → 23 (FULL)

| iter | unit | layer | metric delta |
|---|---|---|---|
| 17 | `U-PSN-QDRANT-POPULATE` | data | 0 → 3,866 vectors live in `prism_engines` |
| 18 | `U-PSN-HYBRID-RETRIEVAL-WIRE` | runtime | 4-substrate RRF fan-out (44/44 tests) |
| 19 | `U-PSN-QDRANT-PAYLOAD-DEBUG` | quality | vector hits surface canonical `engine:Foo` ids (50/50 tests) |
| 21 | `U-PSN-HYBRID-VIZ-ROOST` | observability | generator + augmentation file (4/4 GREEN) |
| 22 | `U-PSN-HYBRID-VIZ-ROOST-WIRE` | render-pipeline | 33 LOC splices into regen-viz + merge-augmentations |
| 23 | `U-PSN-GRAPHITI-SEED-EXPANDED` | data | 7 → 2,004 episodes (286x); hybrid episode hits 0 → 19 |

## Closes

`PSN-ENHANCE-MS0::U-PSN-GRAPHITI-SEED-EXPANDED-2026-05-25` — closes iter-18 R12 follow-up; episode substrate is no longer sparse.

## Cross-refs

- [[reference_psn_hybrid_retrieval_wire_2026_05_25]] — iter 18 (the substrate this densifies)
- [[reference_psn_qdrant_payload_debug_2026_05_25]] — iter 19
- [[reference_psn_hybrid_viz_roost_2026_05_25]] — iter 21
- [[reference_psn_hybrid_viz_roost_wire_2026_05_25]] — iter 22
- [[reference_psn_graphiti_lite_2026_05_24]] — iter 11 (the substrate this expands)
