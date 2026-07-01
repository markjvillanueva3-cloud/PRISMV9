# BRANCH AUDIT — 2026-05-06

**Method:** Live `git branch` + `git worktree list` cross-reference. Read-only.

## Top-line counts

- **Total local branches:** 56
- **Branches in worktrees:** 45 (covered by `WORKTREE-AUDIT-2026-05-06.md`)
- **Orphan branches** (no worktree): **11** (this document)
- **Protected:** 2 (`main`, `master`)

## The 11 orphan branches

| Branch | Ahead of main | Behind main | Merged | Last activity | Disposition |
|---|---:|---:|---|---|---|
| `work/ussh-sci` | **0** | 54 | **YES** | 3w ago | **PRUNE** — already merged, safe `git branch -D` |
| `archive-2026-02-01` | 1 | 496 | no | 10w ago | **TAG + PRUNE** — `git tag archive/v9.0-snapshot-2026-02-01` then delete |
| `work/ai-aware-harden` | 22 | 115 | no | 3w ago | **CHERRY-PICK** — MS-P2.5-SAFETY/U-P2.5-SAFE-06 WEDMControllerDialectVerifier; tightly scoped, low risk |
| `claude/interesting-shamir` | 22 | 496 | no | 3mo ago | **CHERRY-PICK or PRUNE** — R2-MS0-T2 benchmark wiring (20 calc adapters); verify via `git cherry main interesting-shamir` whether already in main |
| `work/wedm-consolidated` | 44 | 113 | no | 2w ago | **CHERRY-PICK** — WEDM-CONSOLIDATION feedback+workpiece+generic-incrementals; verify WEDM regression |
| `work/lathe-master` | 62 | 115 | no | 2w ago | **INVESTIGATE** — LATHE-PRO-MS10/U-LPE01-08 cost optimization + batch economics; likely superseded by `lathe-pro-v3-bookkeeping`; cherry-pick LPE01-08 if not already there |
| `claude/fervent-bohr` | 201 | 496 | no | 2mo ago | **TAG-AND-PRUNE if abandoned** — read commit log; titles are "Merge origin/master — resolve conflicts"; likely abandoned |
| `claude/affectionate-perlman` | 270 | 496 | no | 2mo ago | **TAG-AND-PRUNE if abandoned** — last title "chore: roadmap docs, audit logs, daemon state updates"; likely abandoned |
| `work/intel-p8-schema` | 616 | 496 | no | **5d ago** | **OVERLAP RISK** — recent activity. Check overlap with `prism-intel-p8` worktree (work/engine-wire-cad-ms0, 675 ahead). Likely the same work series; cherry-pick distinct commits to merge-staging or fold into prism-iooms0 lane |
| `claude/zen-dirac` | **1318** | 496 | no | 6w ago | **USER DECISION REQUIRED** — academy curriculum (28 courses); 1318 commits is too large to cherry-pick blindly. Options: (a) treat as separate ACADEMY-MS0 milestone, (b) tag-and-retire as `legacy/academy-2026-03-26-snapshot`, (c) selective cherry-pick of `[ACADEMY]`-tagged commits |

## Combined plan (45 worktree branches + 11 orphans = 56 → ~33 final)

After WORKTREE-CONSOLIDATE-MS0 completes:
- 31 worktrees pruned/merged (per WORKTREE-AUDIT)
- 1 orphan PRUNE (ussh-sci already merged)
- 1 orphan TAG-AND-PRUNE (archive-2026-02-01)
- 4 orphan CHERRY-PICK (ai-aware-harden, wedm-consolidated, lathe-master, intel-p8-schema)
- 2 orphan TAG-AND-PRUNE (claude/fervent-bohr, claude/affectionate-perlman) — pending commit-log read
- 1 orphan CHERRY-PICK or PRUNE (interesting-shamir) — pending cherry-equivalence check
- 1 orphan ESCALATE (zen-dirac, 1318 commits academy)

**Final branch count:** ~33 (main + master + ~31 active worktree branches)
**Final orphan-branch count:** 0-2 (only zen-dirac may persist if user decides on snapshot path)

## Notes

- This audit is folded into milestone `WORKTREE-CONSOLIDATE-MS0` as Phase **P4-5-ORPHAN-BRANCHES** (4 units: U-ORPH-PRUNE, U-ORPH-TAG, U-ORPH-INVESTIGATE-HIGH, U-ORPH-INVESTIGATE-CLAUDE).
- Cherry-picks against orphan branches do NOT need a source worktree (use `git cherry-pick <sha>` directly with the branch in remote/refs only).
- `work/ussh-sci` confirmed safe to delete via `git branch --merged main` test.
- `work/lathe-master` overlap risk — verify against `prism-lathe-pro-v3-bookkeeping` (791 ahead in worktree) before cherry-picking; LPE01-08 may already exist there.
- `work/intel-p8-schema` is the highest-risk orphan: 5d activity + 616 commits + name overlap with active `prism-intel-p8` worktree. Read commit log carefully to distinguish.

## Verification commands

```bash
# Verify ussh-sci merged (should print 'work/ussh-sci')
git branch --merged main | grep ussh-sci

# Compare lathe-master vs lathe-pro-v3-bookkeeping for LPE commits
git log work/lathe-master --oneline | grep LPE
git log work/lathe-pro-v3-bookkeeping --oneline | grep LPE
# If LPE shows in both, lathe-master is redundant

# Cherry-equivalence check (does main already contain these commits?)
git cherry main claude/interesting-shamir
# '+' = not in main; '-' = already in main via different SHA

# Check for [ACADEMY] tag in zen-dirac before deciding scope
git log claude/zen-dirac --oneline | grep -E '\[ACADEMY\]|academy' | head -20
```

---

**Audit timestamp:** 2026-05-06T18:15Z
**Auditor:** claude-e7271397 (organization-verification pass)
**Source-of-truth for branch count drift:** Re-run `git branch | wc -l` and `git worktree list | wc -l` after each phase boundary
