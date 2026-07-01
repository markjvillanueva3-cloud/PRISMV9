---
name: feedback_rtk_git_commit_routes_to_main_tree
description: From a slot worktree, `rtk git commit` is reported by slot-commit-enforce as running in the main tree (H:/prism) and gets BLOCKED; `command git commit` bypasses rtk and commits correctly to slot/<name>.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.442Z
aliases: feedback_rtk_git_commit_routes_to_main_tree
---


# `rtk git commit` from a slot worktree trips slot-commit-enforce — use `command git commit`

**Observed (2026-05-28, slot:oscar, worktree H:/prism-slot-oscar on slot/oscar):** plain `git` (via `command git ...` or in a verification line) reported the correct context — `pwd` = `/h/prism-slot-oscar`, `git rev-parse --abbrev-ref HEAD` = `slot/oscar`, and my 7 files staged in the worktree index. But `rtk git commit -m '...'` was blocked by the `slot-commit-enforce` hook reporting `commit cwd: H:/prism` / `current branch: cad-fusion-live-ms0` (the MAIN tree). Four consecutive `rtk git commit` attempts blocked identically. Switching to **`command git commit`** (rtk bypass) from the *same* cwd committed cleanly to slot/oscar (`ef50e6815a`).

**Why:** the only variable between the blocked and the working commit was the `rtk` wrapper. rtk evidently normalizes git's effective directory to the repo common-dir / primary worktree (`H:/prism`), so a commit issued through it lands on the main tree's branch (`cad-fusion-live-ms0`) — which `slot-commit-enforce` correctly rejects (it's the H8 peer-absorption tree). Read-only rtk git (`status`, `log`, `diff`, `add`) appear unaffected — the `git add` through rtk staged into the worktree index fine; only the *commit* mis-routed. (Root cause is inferred from the observed cwd flip, not from reading rtk internals — verify if it matters.)

**How to apply:** in a slot worktree, commit with **`command git commit`** (raw, rtk-bypassed). Keep using `rtk` for `status`/`log`/`diff`/`add` (token savings, no mis-route). The CLAUDE.md RTK section already documents `command <cmd>` as the bypass — this names the specific failure it prevents. Do NOT use `[BOOTSTRAP-SLOT-ENFORCE]` or `PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1` to force it through — those defeat the lane guard; `command git commit` is the clean fix. See [[feedback_commit_to_slot_worktree]] · [[feedback_conflict_fork_rule]].
