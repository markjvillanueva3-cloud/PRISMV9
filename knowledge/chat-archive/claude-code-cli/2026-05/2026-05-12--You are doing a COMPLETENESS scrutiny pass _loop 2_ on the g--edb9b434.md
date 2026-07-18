---
type: "chat-session"
source: "claude-code-cli"
session_id: "edb9b434-2b53-4db2-95d7-2eb3665655ad"
title: "You are doing a COMPLETENESS scrutiny pass (loop 2) on the git-tree remediation "
date: "2026-05-12"
first_ts: "2026-05-12T16:08:27.585Z"
last_ts: "2026-05-12T16:09:42.896Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/edb9b434-2b53-4db2-95d7-2eb3665655ad/subagents/agent-ac7530cd04e12c3a9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# You are doing a COMPLETENESS scrutiny pass (loop 2) on the git-tree remediation 

> **claude-code-cli** | 2026-05-12 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/edb9b434-2b53-4db2-95d7-2eb3665655ad/subagents/agent-ac7530cd04e12c3a9.jsonl`

## Transcript

### User | 2026-05-12T16:08:27.585Z

You are doing a COMPLETENESS scrutiny pass (loop 2) on the git-tree remediation roadmap at `H:/prism/state/shared/specs/GIT-TREE-REMEDIATION-MS0-ROADMAP.md` (v3). It's been through 2 prior scrutiny rounds — the obvious gaps are filled. This is the FINAL polish pass: what's STILL missing?

Background: `H:/prism` git repo, bifurcated trunks (`cad-fusion-live-ms0` live / `main` frozen / `master` stale — mutually unrelated histories), `.git` ~43GB, push REJECTED (>100MB blobs), 40 worktrees, `git-filter-repo` not installed. The roadmap (38 units, 7 phases P0–P7) covers: P0 gitignore+untrack generated artifacts + gc/repack + branch-cruft cleanup + dirty-worktree sweep; P1 process fixes (`worktree.baseRef` harness setting, `trunk-guard.mjs`, `worktree-commit-route` trunk-check, doc reconcile, a read-only generator-rename-safety grep); P3 (quiesce) filter-repo rewrite + force-push behind an env-gated freeze hook; P4 trunk reconciliation (analyze main/master/claude-* → Path B archive-as-tags or Path C merge-unrelated-histories → rename cad-f→main + set GitHub default branch); P5 worktree/branch cleanup (incl. origin-only branches, stale-fork triage script + user review, forge-orphans 3GB-model disposition); P6 system-viz regen + the git-connected nodes (the `Lgit` layer, `git-tree-augmentation.json`, 6 git-connected state files, blast-radius doc); P7 verify + GIT-TOPOLOGY.md + memory.

Look for COMPLETENESS gaps — be specific, not generic:
1. Any git object/ref/config category not addressed? (notes, replace refs, `git config` keys beyond gc.auto/autocrlf/baseRef, submodules/`.gitmodules`, `.mailmap`, sparse-checkout state, `pack.window`/`gc` tuning, alternates, the `commit-graph` file, partial-clone filters)
2. Any consumer of the branch name or `.git` state NOT in the blast-radius? (think: MCP dispatchers, scheduled tasks, the `c-to-h-mirror`, other machines/clones, CI caches, `.github/workflows/*` beyond what's listed, Linear/Supabase sync hooks, the Obsidian vault, `gh` 
... [+1214 chars truncated]

### Assistant | 2026-05-12T16:08:31.380Z

I'll read the roadmap to do the final completeness pass.

### Assistant | 2026-05-12T16:08:31.381Z

[tool_use: Read]

### User | 2026-05-12T16:08:35.215Z

[tool_result] 1	# GIT-TREE-REMEDIATION-MS0 — Roadmap (canonical, evolving)
2	
3	> **v3** · 2026-05-12 · folds in **SCRUTINY-2** (3-agent pass on v2: Correctness 74→88, Safety 58→74, Completeness 68→81 — issues found were polish + one real omission, not structural; convergence near). Supersedes v2 (commit `4051469bc`) and v1 (`…ROADMAP-2026-05-12.md`), both kept for history. Generator: `/rgs6`, domain-adapted (g
... [+48476 chars truncated]

### Assistant | 2026-05-12T16:09:42.896Z

Completeness pass on v3. The structural stuff is done; here's what's still missing.

## Findings

1. **[MUST-ADD] — P3/U-GC-13: `git notes` + `refs/replace/*` are silently dropped by `filter-repo`.** `git filter-repo` does NOT carry `refs/notes/*` or `refs/replace/*` through a `--single-branch` rewrite (they're not reachable from the cloned branches). Add a clause to **U-GC-11** step (2): `git for-each-ref refs/notes refs/replace` → if any exist, either include them in the clone (`--single-branch` won't — must `git clone --mirror` then `filter-repo --refs <list>`) or document them as intentionally dropped. Also **U-GC-29b** should assert `git for-each-ref refs/notes refs/replace` on the rewritten remote matches expectation. (PRISM almost certainly has none, but "verified none" beats "assumed none" given the FAILURE-MODE rigor everywhere else.)

2. **[MUST-ADD] — P3/U-GC-14: `origin/HEAD` (the symbolic-ref) on *existing clones* is stale after the rename, separate from the local `remote set-head`.** U-GC-17 does `git remote set-head origin main` in `H:/prism` and "re-point all 40 worktrees", but worktrees share `H:/prism/.git` so that's one fix — the gap is **other clones** (`C:/PRISM/`, laptops, CI checkout caches): their `.git/refs/remotes/origin/HEAD` still points at `cad-fusion-live-ms0` which no longer exists → `git checkout -` / bare `git pull` misbehaves. Add to **U-GC-14**'s "enumerate other clones" clause: `git -C <clone> remote set-head origin --auto` on each. Also add to the **AGENT_CHAT.md** post-rewrite message.

3. **[MUST-ADD] — `commit-graph` file (`.git/objects/info/commit-graph`) and `multi-pack-index` are stale-or-corrupt after the rewrite and after `gc --prune`.** U-GC-05 does `gc --prune=now` + `repack -adf` but never `git commit-graph write --reachable` (or `--split`); after U-GC-13's force-push + U-GC-14's `reset --hard`, every clone's commit-graph references dead SHAs → `git log` can crash or show phantom commits until regenerated. Add a clause
... [+9102 chars truncated]
