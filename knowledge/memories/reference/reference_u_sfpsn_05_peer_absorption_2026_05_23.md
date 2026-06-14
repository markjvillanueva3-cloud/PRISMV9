---
name: reference-u-sfpsn-05-peer-absorption-2026-05-23
description: U-SFPSN-05 close-out commit `c469efd4bc` absorbed 101 peer files during shared-tree lock-contention window; U-05 work itself is clean across two separate commits
aliases: [u-sfpsn-05-peer-absorption, U Sfpsn 05 PEER Absorption, reference-u-sfpsn-05-peer-absorption-2026-05-23]
metadata:
  type: reference
---

# U-SFPSN-05 close-out — peer absorption disclosure (2026-05-23, slot:juliett)

## What shipped clean (U-SFPSN-05 actual work)

**Commit `669d0cddec`** — `[MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-05 (slot:juliett): GilbertMRRModel shim — bit-equivalent across 100 fixtures` — **3 files / +347 / −9, CLEAN, no peer absorption.** This is the shim itself:

- `mcp-server/src/algorithms/GilbertMRRModel.ts` — added `GilbertOptimalSpeedResult` interface + `static calculateOptimalSpeed()` method (+66 lines, verbatim formula relocation)
- `mcp-server/src/engines/UltimateSpeedFeedEngine.ts` — added GilbertMRRModel import + refactored inline `gilbertOptimalSpeed()` to `export function gilbertOptimalSpeed()` delegating to the static method (+25/−9)
- `mcp-server/src/__tests__/GilbertShimEquivalence.test.ts` — NEW 11-test bit-equivalence file (1e-12 across 100 fixtures + 5 clamp-boundary tests), all 11/11 passing

Per-file scrutiny: code-analyzer PASS 9/10 + reviewer PASS, both with only P2 deferrables (no P0/P1).

## What got absorbed (NOT mine)

**Commit `c469efd4bc`** — `[MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-05-CLOSE (slot:juliett): envelope status flip + deferred-list RESOLVED — 4-surface close-out` — **103 files, of which only 2 are mine**:

- `mcp-server/data/milestones/SF-PSN-WIRE-MS0.json` (mine — status flip + realized_note)
- `state/shared/CLOSE-OUT-DEFERRED.md` (mine — RESOLVED line)
- 4 peer shopDispatcher files: `shopDispatcher.test.ts`, `index.ts`, `shopActionSchemas.ts`, `shopDispatcher.ts` (NOT mine — appears to be another peer's in-flight shop dispatcher work)
- 97 peer wedm-training-corpus JSONs: `state/shared/wedm-training-corpus/*-phase-a1.json` (NOT mine — slot:charlie's WEDM-PHASE-A training data sweep, sibling of `c1f7ba2aaa`)

## Root cause

Shared-tree git index race during the lock-contention retry window. My `git add <my-2-paths>` ran AFTER waiting for `index.lock` to clear, but the index had peer-staged-then-not-committed content from the prior peer's interrupted commit cycle. Pathspec `git add` only adds the named paths but does NOT unstage pre-existing entries in the index. The subsequent `git commit` (no pathspec) committed everything staged.

## Fix applied

**None — disclosure only**, per shared-tree no-history-rewrite discipline ([[feedback_no_git_stash_shared_tree]], [[reference_iter4_gilbert_clean_attribution_2026_05_20]]). The 101 absorbed files are correctly authored under their original work units (slot:charlie WEDM-PHASE-A + the unidentified shop dispatcher peer); the commit BANNER is misleading but the file content is correct. Reverting on shared tree would risk losing peer work.

## Lessons (carried doctrine)

1. **Always `git status` and `git diff --cached --name-only` BEFORE every `git commit` on shared tree.** Pathspec `git add` is necessary but not sufficient — the staging area may already contain pre-existing entries from interrupted peers.
2. **Prefer `git commit -o <path1> <path2>` (pathspec-only) over `git add <paths> && git commit`** when on a contention-heavy shared tree. This guarantees ONLY the named paths land in the commit.
3. **Session 3-of-3 must be dispatched on SPECIFIC commit SHAs filtered to your own paths**, not on the whole session diff — the absorbed peer changes will overwhelm the reviewers.

## Cross-refs

- Sibling absorption: `fef972036f` (KILO-P2P-RECONCILE-MS0/U-KP2P-01 in prior session, same root cause)
- Sibling absorption: `18cc9e3f1a` + `8c96ebb8b4` (U-SFPSN-02B 3-way split, slot:mike + slot:whiskey)
- Memory: [[reference_iter4_gilbert_clean_attribution_2026_05_20]] (the pattern that beat peer-absorption when applied)
- Feedback: [[feedback_commit_prefix_main_on_shared_tree]]
- Feedback: [[feedback_no_git_stash_shared_tree]]

## Actual U-SFPSN-05 verification

Verified via filtered `git show c469efd4bc -- <my-2-paths>`:
- SF-PSN-WIRE-MS0.json: 6 +/− (status flip + realized_note + realized_commit + completed_at/_by)
- CLOSE-OUT-DEFERRED.md: 2 +/− (RESOLVED line replacement)

Mathematical correctness of U-SFPSN-05's actual deliverable (the shim) is INDEPENDENT of the close-out commit's attribution — `669d0cddec` is clean and contains all 3 deliverable files at the 11/11 bit-equivalence gate.
