---
type: "chat-session"
source: "claude-code-cli"
session_id: "edb9b434-2b53-4db2-95d7-2eb3665655ad"
title: "You are doing a SAFETY / REVERSIBILITY / DATA-LOSS scrutiny pass (loop 2) on the"
date: "2026-05-12"
first_ts: "2026-05-12T16:08:06.518Z"
last_ts: "2026-05-12T16:09:03.630Z"
cwd: "H:\\prism"
messages: 4
user_msgs: 2
assistant_msgs: 2
raw_file: "H:/.claude/projects/H--prism/edb9b434-2b53-4db2-95d7-2eb3665655ad/subagents/agent-a366df30cddf50a52.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# You are doing a SAFETY / REVERSIBILITY / DATA-LOSS scrutiny pass (loop 2) on the

> **claude-code-cli** | 2026-05-12 | 4 msgs (2 user / 2 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/edb9b434-2b53-4db2-95d7-2eb3665655ad/subagents/agent-a366df30cddf50a52.jsonl`

## Transcript

### User | 2026-05-12T16:08:06.518Z

You are doing a SAFETY / REVERSIBILITY / DATA-LOSS scrutiny pass (loop 2) on the git-tree remediation roadmap at `H:/prism/state/shared/specs/GIT-TREE-REMEDIATION-MS0-ROADMAP.md` (v3). It's been through 2 prior scrutiny rounds — structural issues are gone. This is the FINAL polish pass on safety only.

Background: `H:/prism` has bifurcated git trunks; `.git` ~43GB; push REJECTED (>100MB blobs in history incl. `system-graph.json`); the plan's Phase 3 is an irreversible `git filter-repo` history rewrite + force-push behind a fleet-quiesce window with an env-gated freeze hook (`PRISM_GIT_FREEZE_OPERATOR=1`, added to `bash-bundle.mjs` SUB_HOOKS); 40 worktrees get `git reset --hard` in Phase 4. ~8 concurrent Claude chats run against this repo. PRISM rules: NEVER delete (only `mv …archive-<date>` / tag-then-delete / `_disabled_by:`); NEVER `git stash` in the shared tree (`git stash create` without a `refs/stash` push is the safe exception); NEVER share H:/prism content publicly; reversibility is mandatory. PLANNING ONLY — nothing will be executed.

Scrutinize:
1. Is the irreversibility line (U-GC-13 force-push) adequately fenced? Is `U-GC-EMERGENCY-RESTORE` (the pre-written rollback script) sufficient — does the `git push --mirror` restore + ls-remote-match assertion actually cover every failure mode? What about a chat that pulled the bad state mid-window?
2. The freeze hook (`git-maintenance-freeze.mjs`): env-gated, self-expiring, fail-open, in a bundle. Any way it (a) bricks the fleet, (b) fails silently inactive, (c) locks out the operator, (d) doesn't get cleanly removed in U-GC-14? Is the "bundle-load failure → whole Bash matcher no-ops → freeze AND commit-ownership-guard AND worktree-route all off" risk (F34) handled?
3. The 40-worktree `reset --hard` loop in U-GC-14: WIP loss vectors. Is the `git stash create` snapshot + `U-GC-29a` continuous dirty-sweep + the branch-tip-snapshot slip-check enough? Worktree branches not on origin? Stale `index.lock`s? The `.git/inf
... [+935 chars truncated]

### Assistant | 2026-05-12T16:08:09.579Z

[tool_use: Read]

### User | 2026-05-12T16:08:12.907Z

[tool_result] 1	# GIT-TREE-REMEDIATION-MS0 — Roadmap (canonical, evolving)
2	
3	> **v3** · 2026-05-12 · folds in **SCRUTINY-2** (3-agent pass on v2: Correctness 74→88, Safety 58→74, Completeness 68→81 — issues found were polish + one real omission, not structural; convergence near). Supersedes v2 (commit `4051469bc`) and v1 (`…ROADMAP-2026-05-12.md`), both kept for history. Generator: `/rgs6`, domain-adapted (g
... [+48476 chars truncated]

### Assistant | 2026-05-12T16:09:03.630Z

Safety scrutiny pass on v3. The structural rounds did their job; this is genuinely polish. Findings below.

## SAFETY FINDINGS

1. **[SHOULD-FIX] — U-GC-EMERGENCY-RESTORE / ROLLBACK PLAN P3: `push --mirror` from a `--single-branch` mirror would DELETE refs on origin.** U-GC-09 takes a *full* `git clone --mirror` backup (good) — but U-GC-11 also makes a `--single-branch` `/tmp/prism-rewrite` mirror, and if anyone reaches for *that* as the `<backup.git>` arg to `git-emergency-restore.mjs`, `push --mirror` deletes every origin ref not in it. Add to U-GC-EMERGENCY-RESTORE acceptance: *"the script asserts `<backup.git>` is the U-GC-09 full `--mirror` clone (refs count ≥ live origin refs count) and REFUSES a single-branch mirror; the ls-remote-match assertion is post-push, so a wrong arg has already done damage — the pre-check is the real guard."* Also: `push --mirror` will *delete* `origin/archive/cad-fusion-live-ms0-pre-rename-<date>` and any branches created after the backup — note this is acceptable *only* during the P3 window before U-GC-17, and the emergency-restore is P3-scoped, not a general-purpose tool (state that in the script header).

2. **[SHOULD-FIX] — "a chat that pulled the bad state mid-window" residual is acknowledged but not actioned.** The plan correctly says the freeze hook blocks `pull|fetch` and doesn't block working-tree edits, so the residual = a chat that pulled *just before* freeze-on, then kept editing on top of rewritten-away history. U-GC-14's slip-check catches new *commits* (branch-tip diff) but not uncommitted post-pull WIP on a chat that's now diverged. Add to U-GC-14: *"before any worktree `reset --hard`, the `git stash create` snapshot already covers this — but ALSO: any worktree whose `@{upstream}` SHA is not an ancestor of the OLD pre-rewrite tip (i.e. it pulled mid-window) gets its diff archived to `wip-archive/` AND a line on `AGENT_CHAT.md` naming the chat, before reset."* This is the one data-loss vector the current text labels "
... [+6037 chars truncated]
