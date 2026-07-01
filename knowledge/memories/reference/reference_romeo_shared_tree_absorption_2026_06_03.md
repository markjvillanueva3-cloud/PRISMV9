---
name: reference_romeo_shared_tree_absorption_2026_06_03
description: "slot:romeo commit 155902c absorbed 10 of sierra's pre-staged files on the shared tree — auto-unstage hook failed; acquire the commit-lane before shared-tree commits"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.148Z
aliases: reference_romeo_shared_tree_absorption_2026_06_03
---


On 2026-06-03 slot:romeo committed DB-COVERAGE-GAPFILL-MS0/U-MAT01 from the shared `H:/prism` tree (branch `cad-fusion-live-ms0`). `git add <my 6 paths>` left peer slot:sierra's pre-staged files in the shared `.git/index`, and the commit swept in **10 foreign files** (pre-bash-graph-inject, code-path-resolver, nav-savings-ledger, master-index-precheck-inject, stop-psn-savings-aggregate, node-path-template.md, system-viz/MEMORY.md + tests) under romeo's subject. Files intact, attribution wrong. Did NOT rewrite (3 live peer git.exe procs → orphan risk).

**Why:** the `git add` lane-guard / auto-unstage hook reported "failed to unstage 1 (left staged — guard may still block)" — it is NOT reliable under concurrent staging. The fleet also runs a **commit-lane RPS coordinator** (`AGENT_CHAT.jsonl` kind:`commit-lane`, "commit-coordinator" picks a `nextHolder` via rock-paper-scissors) that romeo bypassed. This is the [[reference_h8_misattribution_2026_05_20|H8 misattribution]] class [[feedback_commit_to_slot_worktree]] exists to prevent.

**How to apply:** before ANY shared-tree commit, run `git reset` (unstage all) then `git add <exact paths>` then **verify `git diff --cached --name-only` lists ONLY your files** before `git commit` — deterministic, independent of the flaky auto-unstage hook. Better: commit from the slot worktree `H:/prism-slot-<name>` (exists for romeo, was "locked"). The fleet's current practice of bootstrap-committing everything to `cad-fusion-live-ms0` with `[BOOTSTRAP-SLOT-ENFORCE]` keeps this hazard live. Related: [[feedback_commit_prefix_main_on_shared_tree]].
