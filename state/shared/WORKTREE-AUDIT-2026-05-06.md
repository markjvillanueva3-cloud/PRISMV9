# WORKTREE AUDIT — 2026-05-06

**Method:** 10 parallel sub-agents, READ-ONLY, classified each of 45 active git worktrees by ahead/behind main, uncommitted state, last-14d activity, and merged-status.

**Classification rules:**
- **KEEP** — ahead>0 AND active <14d AND not merged
- **MERGE** — ahead>0 AND clean AND idle >7d AND not merged (ready to land)
- **PRUNE** — ahead=0 AND already-merged (safe to delete)
- **INVESTIGATE** — contradictions (e.g. 1 ahead + 116 destructive deletions)

---

## SUMMARY (45 total)

| Verdict | Count | Action |
|---|---|---|
| KEEP | 17 | Active dev — leave alone |
| MERGE | 4 | Land into main this week |
| PRUNE | 10 | Safe to `git worktree remove` |
| INVESTIGATE | 14 | Needs human decision before action |

---

## KEEP (17) — active development, do not touch

| Worktree | Branch | Ahead | Last commit | 14d activity |
|---|---|---:|---|---:|
| `H:/PRISM` (main) | cad-fusion-live-ms0 | 838 | 2026-05-06 | 808 |
| `H:/prism-cam-exhaust-ms0` | work/cam-exhaust-ms0 | 824 | 2026-05-06 | 794 |
| `H:/prism-ppgh05` | work/ppgh05 | 796 | 2026-05-06 | 766 |
| `H:/prism-lathe-pro-v3-bookkeeping` | work/lathe-pro-v3-bookkeeping | 791 | 2026-05-05 | 761 |
| `H:/prism-cam-spcfai-ms0` | work/cam-spcfai-ms0 | 759 | 2026-05-05 | 729 |
| `H:/prism-cam-engine-fixes` | work/cam-engine-fixes | 709 | 2026-05-04 | 679 |
| `H:/prism-ppg-advancedpost` | work/ppg-advancedpost | 682 | 2026-05-02 | 652 |
| `H:/prism-intel-p8` | work/engine-wire-cad-ms0 | 675 | 2026-05-02 | 645 |
| `H:/prism-cad-sw-fidx` | work/cad-fidx-solidworks | 652 | 2026-05-05 | 622 |
| `H:/prism-engine-wire-ms0` | work/engine-wire-ms0 | 613 | 2026-04-30 | 583 |
| `H:/prism-hypermill-ms1` | work/cam-hypermill-ms1 | 601 | 2026-04-30 | 571 |
| `H:/prism-fusion-ms1` | work/cam-fusion-ms1 | 598 | 2026-04-30 | 568 |
| `H:/prism-tsc-cleanup` | work/tsc-cleanup-ms0 | 590 | 2026-04-30 | 560 |
| `H:/prism-lathe-prod-ready` | work/lathe-prod-ready-ms0 | 335 | 2026-05-03 | 305 |
| `H:/prism-iooms0` | work/intel-ollama-obsidian-ms0 | 102 | 2026-05-06 | 102 |
| `H:/prism-lathe-pro-v3` | work/lathe-pro-v3-ms2 | 1 | 2026-05-05 | 1 |
| `.claude/worktrees/agent-ac117174afd81e7bb` | (locked) | 43 | 2026-05-04 | — |

---

## MERGE (4) — clean & idle, ready to fast-forward into main

| Worktree | Branch | Ahead | Idle | Notes |
|---|---|---:|---:|---|
| `H:/prism-cam-ms1-93a0` | work/cad-fidx-fus-93a0 | 626 | 5d | Mastercam CAD COMPLETE 8/8 milestone-tagged HEAD |
| `.claude/worktrees/data-loss-fix` | worktree-data-loss-fix | 1 | 9d | Single safety hook (hard-block automated deletion on H:) |
| `.claude/worktrees/guard-wire-ms0` | worktree-guard-wire-ms0 | 1 | 6d | Surfaces 7 unwired guard engines via prism_guard |
| `.claude/worktrees/omega-loader-ms0` | worktree-omega-loader-ms0 | 1 | 6d | Externalises omega tier ladder to JSON |

**Suggested order:** small ones first (data-loss-fix, guard-wire-ms0, omega-loader-ms0) → cam-ms1-93a0 last (large, needs anti-regression sweep).

---

## PRUNE (10) — dead/abandoned, safe to remove

All share same stale HEAD `a4488b69e` from 2026-04-17 (PageRankEngine commit), zero ahead of main, no salvageable work. PID 34500 reused across multiple locks → original processes long-dead.

```bash
# Run in any order — none has unmerged work:
git worktree remove .claude/worktrees/stabilize-cba638c3
git worktree remove .claude/worktrees/agent-a34d706a924b92968 --force
git worktree remove .claude/worktrees/agent-a721b9d5fda5dc493 --force
git worktree remove .claude/worktrees/agent-a934d757403454ad1 --force
git worktree remove .claude/worktrees/agent-abf1e9c6a81eb16e4 --force
git worktree remove .claude/worktrees/agent-ac94f64a2cf22d997 --force
git worktree remove .claude/worktrees/agent-acd8533e --force
git worktree remove .claude/worktrees/agent-ad1c002a --force
git worktree remove .claude/worktrees/agent-adca235f --force
git worktree remove .claude/worktrees/agent-af038f883efa0b9cd --force
```

(Each is locked — `--force` required. Verify lockfile says no longer-active PID first: `cat .git/worktrees/agent-<id>/locked`.)

---

## INVESTIGATE (14) — destructive uncommitted state, do NOT auto-merge

These all have **commits ahead of main** but also **massive uncommitted deletions** (engines, schemas, state). Looks like aborted rebase/sync drift.

| Worktree | Ahead | Issue |
|---|---:|---|
| `H:/prism-cad-complete` | 26 | 3811 staged deletions, idle 14d (aborted rebase?) |
| `H:/prism-cam-exhaust` | 158 | 30 staged deletions, idle 12d |
| `H:/prism-claudemd-enforcement` | 468 | 20+ deletions of WEDM tests + StabilityLobeDiagram on a doc-edit branch (scope mismatch) |
| `H:/prism-file-claim-fix` | 482 | 20+ destructive deletions |
| `H:/prism-forge-archive` | 6 | behind=0 yet not-merged contradiction (diverged archive snapshot) |
| `H:/prism-iooms1` | 612 | Self-declared MS-CLOSE — needs decision: merge milestone or hold |
| `H:/prism-knowledge-wiki` | 493 | Mass deletions across engines/algorithms/state |
| `H:/prism-mill-worktree` | 63 | 20+ uncommitted modifications, idle 12d |
| `H:/prism-session-efficiency` | 78 | 20+ deletions of state/handoffs |
| `H:/prism-xproc-neural` | n/a | Branch never received initial commit; 13,119 files staged |
| `.claude/worktrees/psau-sav2` | 52 | 28 deletions, divergent (52 ahead / 496 behind) |
| `.claude/worktrees/u-fus-api01` | 1 | 116 deletions of canonical docs/milestones |
| `.claude/worktrees/u-fus-api02` | 500 | 77 deletions of live engines (ChainFailureRecovery, MillPatternMiner, SurfaceFinishPredictor) |
| `.claude/worktrees/agent-abd2bcee` | 0 | 111 deletions (digests, milestones, hyperMILL catalog) — locked agent abandoned mid-purge |

### Recommended INVESTIGATE order (highest risk first)

1. **`H:/prism-xproc-neural`** — branch is broken (HEAD unreachable). Either `git checkout -b work/xproc-neural-recovered` from main, cherry-pick whatever tree state exists, OR delete entirely. Currently consumes disk, can't be rebased.
2. **`u-fus-api02`** (500 ahead with 77 engine-file deletions) — large divergent fork. Need to know whether the 77 deletions are intentional (refactor) or sync drift before merging the 500 commits.
3. **`prism-cad-complete`** (3811 staged deletions) — almost certainly an aborted rebase. `git -C H:/prism-cad-complete rebase --abort` may recover. Verify the 26 ahead-commits aren't already in main via cherry-pick equivalence.
4. **`prism-iooms1`** — branch self-declares "MS-CLOSE". Decide: merge into main (612 commits) or formally retire.
5. The remaining 10 are similar destructive-drift patterns — for each: `git stash` the deletions (or commit them as a `[CLEANUP]` commit on a side-branch), then evaluate whether the ahead-commits are landable.

---

## Disk reclaimed if PRUNE+MERGE executed

- **PRUNE 10 worktrees** → frees ~2-4 GB (each agent worktree has full mcp-server/ checkout)
- **MERGE 4 worktrees** → frees ~1 GB after `worktree remove` post-merge
- **Total potential cleanup:** ~3-5 GB + 14 fewer entries in `git worktree list`

## Caveats

1. The audit was against `main`, not `origin/main`. If main has unpushed local commits, "behind main" counts may be inflated.
2. `branch --contains HEAD` was used as the merged-status proxy. For divergent merges (squash/rebase landing), this may report not-merged when the content is actually in main. Use `git cherry main <branch>` for content-equivalence checks before pruning anything in INVESTIGATE.
3. The 11 locked `agent-*` worktrees share PID 34500 across multiple locks. That PID is not currently a Claude process. Worktree locks are lazy — `--force` on `git worktree remove` is safe.
4. KEEP recommendations include worktrees that are 14d idle but have >500 ahead-commits and uncommitted WIP. Those are "active in spirit" — confirm with the chat that owns the lane before any cleanup.

---

**Audit timestamp:** 2026-05-06T16:30Z
**Auditor:** claude-e7271397 (10-agent parallel sweep)
