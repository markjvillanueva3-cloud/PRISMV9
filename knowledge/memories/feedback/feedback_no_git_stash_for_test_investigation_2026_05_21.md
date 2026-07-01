---
name: feedback-no-git-stash-for-test-investigation-2026-05-21
description: Investigating a test failure with `git stash` in H:/prism CLOBBERS WIP — use `git diff` or copy-to-temp instead
aliases: feedback_no_git_stash_for_test_investigation_2026_05_21
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.436Z
---


# git stash for test investigation in shared H:/prism tree LOST 1077+ lines of P0-U04 work

2026-05-21, slot charlie. Concrete reproduction of [[feedback_no_git_stash_shared_tree]]'s failure mode.

**What happened.** Mid-build on INFRA-AGI-ROUTER-MS2/P0-U04 (WireEDMAGIOrchestrator DomainAGIIntent adapter, ~1077 lines of unstaged engine + test edits), I ran `vitest run` and saw ONE pre-existing failing test (`includes strategy in recommendation` at line 675 — fail-mode existed before my changes). To verify the failure wasn't caused by my edits, I ran `git stash` to revert to HEAD, re-ran the test (still failed), then `git stash pop` — which ABORTED because a peer's auto-regen-state files (consolidation-counter.json, tribal-embed-index.json, etc.) had touched the working tree during the test run.

The stash itself only captured peer WIP (HEAD was `4fac984675 [ZULU-HERMES-GAPS]` by slot:bravo, and the stash labeled itself with that subject). When I inspected `git stash show stash@{0} --name-only`, my 2 P0-U04 files were NOT listed. The peer commit `9dee8736ad [CLEANUP-MS0]/U-ENGINE-FOSSIL-2: absorb 265 not-yet-graphed untracked engines + paired tests` had likely overwritten WireEDMAGIOrchestrator.ts mid-session, treating my uncommitted edits as "untracked-engine-fossil" to absorb. My work is GONE — not in stash, not in any branch, not in reflog.

**Why:** Use:
- `git stash` is GLOBAL across the worktree. It stashes EVERYTHING dirty — including peers' WIP that landed during the multi-second test runs.
- The shared `H:/prism` tree has 11,000+ dirty files at steady state from auto-regen state. `git stash` succeeds but captures noise, not the file you care about.
- Peer slot:bravo's commit that absorbed 265 untracked engines treated my uncommitted P0-U04 edits as fossilization candidates (because they were UNCOMMITTED, hence "untracked from peer's view").

**How to apply:**
1. To investigate "is this test failure caused by my changes?" — DO NOT use `git stash`. Use:
   - `git diff -- <specific-file>` to see your changes
   - Copy your file aside: `cp engine.ts /tmp/engine.ts.mine; git checkout HEAD -- engine.ts; vitest; mv /tmp/engine.ts.mine engine.ts`
   - Or just READ the failing test + commit context: if the assertion is `to be 'balanced_optimization'` and your changes don't touch that strategy logic, the failure is pre-existing.
2. To survive peer auto-absorbs: COMMIT WIP frequently. After every Edit on a critical file, `git add -- <file> && git commit -m "[MAIN] [SCOPE]/UNIT-WIP: checkpoint"` even if not the final commit. Squash later. The 30s of commit overhead saves you from re-doing 1077 lines.
3. If you ALREADY ran `git stash` and lost work: check `git reflog --all` for blob refs; check `git fsck --unreachable` for dangling blobs from the lost diff. Both unlikely to find unstaged work, but worth trying.

**Lessons compounded:**
- The peer commit class "absorb 265 not-yet-graphed untracked engines" is an existential hazard for any chat editing those engines uncommitted. If you're touching a file that's listed in a `CLEANUP-MS0/U-ENGINE-FOSSIL-*` envelope, COMMIT BEFORE EDITING.
- "It's just a test failure check, I'll stash for a second" is the textbook trap. Don't.

Related: [[feedback_no_git_stash_shared_tree]] (parent rule) · [[reference_infra_agi_router_ms2_p0_u03_2026_05_20]] (P0-U03 successfully shipped with mid-build commits) · [[feedback_conflict_fork_rule]].
