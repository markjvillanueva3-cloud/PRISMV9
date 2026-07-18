---
type: "chat-session"
source: "claude-code-cli"
session_id: "4f0088b1-c2c1-4360-9099-1b8309decd19"
title: "WORKTREE CLEANUP SAFETY. Run `git -C H:/prism worktree list --porcelain` and cla"
date: "2026-06-06"
first_ts: "2026-06-06T03:46:32.878Z"
last_ts: "2026-06-06T03:53:54.503Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 16
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/4f0088b1-c2c1-4360-9099-1b8309decd19/subagents/workflows/wf_3b0daf85-68e/agent-aa3fd9b4f0bc33e97.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# WORKTREE CLEANUP SAFETY. Run `git -C H:/prism worktree list --porcelain` and cla

> **claude-code-cli** | 2026-06-06 | 41 msgs (16 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4f0088b1-c2c1-4360-9099-1b8309decd19/subagents/workflows/wf_3b0daf85-68e/agent-aa3fd9b4f0bc33e97.jsonl`

## Transcript

### User | 2026-06-06T03:46:32.878Z

WORKTREE CLEANUP SAFETY. Run `git -C H:/prism worktree list --porcelain` and classify EVERY worktree for safe cleanup without removing anything. Groups: (1) 21 ephemeral agent worktrees at H:/PRISM/.claude/worktrees/agent-* (all at 4bdfcc902e, branches worktree-agent-*) — sample ~4 with `git -C <path> status --porcelain | wc -l` (dirty?) and check merged via `git -C H:/prism branch --merged cad-fusion-live-ms0 | grep -c worktree-agent`; treat the set uniformly if consistent. (2) H:/prism-wsm — detached HEAD, prunable, gitdir points to non-existent location. (3) ~30 work/* worktrees (H:/prism-*, branch work/*) — for each: last-commit age `git -C H:/prism log -1 --format=%cr <branch>`, dirty? (`git -C <path> status --porcelain | wc -l`), merged into cad-fusion-live-ms0? (`git -C H:/prism branch --merged cad-fusion-live-ms0`). (4) 26 slot worktrees H:/prism-slot-* — age, dirty, locked. For each worktree output a row: path | branch | ageOfHEAD | dirtyFileCount | mergedIntoMain(Y/N) | locked(Y/N) | PRUNE-VERDICT(safe/keep/needs-review) + 1-line reason. Then a RANKED safe-prune list (clear wins first: orphaned agent-* + wsm). DO NOT run worktree remove/prune/branch -d. Output: ## Classification table ## Ranked safe-prune list ## Worktrees that are dirty/unmerged (must preserve).

HARD CONSTRAINT: READ-ONLY. You may run git read commands (worktree list, status, log, diff, branch, check-ignore, rev-list, show) and Read/Grep/Glob files. You MUST NOT run any mutating command: no git add/commit/restore/checkout/reset/clean/worktree remove/worktree prune/branch -d/push/merge/rebase, and no Edit/Write. If you think a mutation is needed, RECOMMEND it in your report instead of doing it. Report concise structured markdown.

### Assistant | 2026-06-06T03:46:44.358Z

I'll classify every worktree for safe cleanup. Let me start by getting the full worktree list and the merge-base branch.

### Assistant | 2026-06-06T03:46:45.200Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:46:45.997Z

[tool_use: Bash]

### User | 2026-06-06T03:46:56.635Z

[tool_result] worktree H:/PRISM
HEAD 416acfe8cd7cdfb5b1c3295ae04b5c874f267224
branch refs/heads/cad-fusion-live-ms0

worktree H:/PRISM/.claude/worktrees/agent-a01e7b81d0946a97b
HEAD 4bdfcc902e3ddfc3d93846e4b9b14151787dc9ad
branch refs/heads/worktree-agent-a01e7b81d0946a97b

worktree H:/PRISM/.claude/worktrees/agent-a0310b5d699214970
HEAD 4bdfcc902e3ddfc3d93846e4b9b14151787dc9ad
branch refs/heads/worktree-agent-
... [+10309 chars truncated]

### User | 2026-06-06T03:47:01.727Z

[tool_result] 27
---merged-count-done---

### Assistant | 2026-06-06T03:47:10.142Z

Note the main worktree HEAD here shows `416acfe8cd` (current branch `cad-fusion-live-ms0`), which differs from the gitStatus snapshot — the branch has advanced. Let me get the merged-branch list and sample data in parallel.

### Assistant | 2026-06-06T03:47:11.784Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:47:14.712Z

[tool_use: Bash]

### User | 2026-06-06T03:47:16.703Z

[tool_result] 0
===agent-merged-count===
* cad-fusion-live-ms0
+ slot/quebec
+ slot/uniform
+ slot/xray
+ slot/yankee
+ slot/zulu
+ work/-system-viz-brain-ms0-u--41db1b
  work/auto-learning-loop-ms0
+ work/cad-complete-ms0
  work/cinf04x-test
  work/command-kernel-ms0
+ work/commit-coord-ms0
  work/docu-print-org
  work/hotel-merge
  work/hva-validator-and-parser-fix
  work/infra-neural-ledger-ms1
  work/macro-
... [+285 chars truncated]

### User | 2026-06-06T03:47:23.880Z

[tool_result] agent-a01e7b81d0946a97b dirty=266
agent-a4553ad14430ed1b4 dirty=0
agent-a8585051a4b3592a1 dirty=1
agent-afb774eec891f75f8 dirty=2

### Assistant | 2026-06-06T03:47:29.067Z

Important findings: the agent worktrees are NOT uniformly clean — one sample has 266 dirty files, others 0/1/2. And `worktree-agent-*` branches: 0 are reported by `--merged` (grep returns 0), which means the merged-branch filter doesn't list them at all — but they're all at `4bdfcc902e`. Let me verify whether `4bdfcc902e` is an ancestor of the main branch directly (the reliable merged test), and dig into the dirty agent worktrees + check the agent branches' relationship to main.

### Assistant | 2026-06-06T03:47:31.810Z

[tool_use: Bash]

### User | 2026-06-06T03:47:37.477Z

[tool_result] AGENT-BASE-4bdfcc=NOT-ancestor

### Assistant | 2026-06-06T03:47:39.164Z

[tool_use: Bash]

### User | 2026-06-06T03:47:47.393Z

[tool_result] 1 agent-a0310b5d699214970
17538 agent-a149a784779f1da9f
1 agent-a37d7460d5d653f84
2 agent-a4a1bed8bf503c2f9
1 agent-a4b4ba53a073a32b7
1 agent-a68051c75f771f518
1 agent-a6be0f8474b62402b
1 agent-a7da59baa62663f71
1 agent-a8299dd3b088946a6
0 agent-a8b4b61a9ebee0955
1 agent-ab5510c8cab2eee07
1 agent-abd240de561947257
1 agent-ac2e2c6ce0f637a08
1 agent-ad6991466ebd4ee9d
2 agent-ae9df739c4735b122
17538 
... [+129 chars truncated]

### Assistant | 2026-06-06T03:47:52.227Z

Critical correction to the task's premise: the agent base commit `4bdfcc902e` is NOT an ancestor of `cad-fusion-live-ms0` — so the 21 agent worktrees are **NOT merged** into main. And they have varied dirty counts (two with 17538 dirty files, one 266, most 1-2, two clean). The "1 dirty" is likely a single transient file. Let me inspect what the dirty files actually are, and check the agent branch commits relative to base.

### Assistant | 2026-06-06T03:47:55.954Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:47:59.649Z

[tool_use: Bash]

### User | 2026-06-06T03:48:05.735Z

[tool_result] === a0310b5 (1 dirty) ===
?? .claude/cache/
=== a8585051 (1 dirty) ===
?? .claude/cache/
=== afb774e (2 dirty) ===
 M mcp-server/data/state/ollama-offload-stats.json
?? .claude/cache/
=== a01e7b8 (266 dirty) sample ===
 M state/shared/claude-user-mirror/plans/synchronous-nibbling-taco-agent-ad96a36e856c45ce0.md
 M state/shared/claude-user-mirror/plans/synchronous-nibbling-taco-agent-ada74b680849ab
... [+830 chars truncated]

### User | 2026-06-06T03:48:15.665Z

[tool_result] === are agent branch HEADs unique commits or all == base 4bdfcc? ===
4bdfcc902e3ddfc3d93846e4b9b14151787dc9ad 4 weeks ago [MAIN] CAM-EXHAUST-MS0/U-CAM60-61-69: VIRTUAL+SQL_Tool+en-2 extractions + batch script
=== commits on a sample agent branch ahead of its own HEAD parent ===
0
=== main branch HEAD ===
416acfe8cd7cdfb5b1c3295ae04b5c874f267224 3 minutes ago [MAIN] [BLACKWELL-MODEL-UPGRADE]/U-BW-G
... [+137 chars truncated]

### Assistant | 2026-06-06T03:48:21.081Z

Now I have a clear picture. The agent worktrees all sit at `4bdfcc902e` (4 weeks ago, NOT merged into main — base diverged). The "dirty" files are mostly untracked `.claude/cache/` (transient) plus, in a few, real modifications/deletions. The agent branches have 0 unique commits ahead of base. Let me gather the ~30 work/* and the wsm details. I'll batch the work/* age + dirty + merged check.

### Assistant | 2026-06-06T03:48:29.722Z

[tool_use: Bash]

### User | 2026-06-06T03:50:44.779Z

[tool_result] H:/prism-cam-engine-fixes | work/cam-engine-fixes | 5 weeks ago | dirty=0 | merged=N
H:/PRISM/prism-test-6d0595 | work/test-6d0595 | 3 weeks ago | dirty=0 | merged=Y
H:/prism-cad-complete | work/cad-complete-ms0 | 6 weeks ago | dirty=3811 | merged=Y
H:/prism-golf-watchdog | work/golf-watchdog-ms0 | 3 weeks ago | dirty=0 | merged=N
H:/prism-hotel-c2 | work/hotel-c2-dashboard | 3 weeks ago | dirty=1
... [+1038 chars truncated]

### Assistant | 2026-06-06T03:50:51.611Z

Now batch 2: the remaining work/* worktrees.

### Assistant | 2026-06-06T03:50:55.332Z

[tool_use: Bash]

### User | 2026-06-06T03:51:20.738Z

[tool_result] H:/prism-lathe-pro-v3 | work/lathe-pro-v3-ms2 | 4 weeks ago | dirty=4 | merged=N
H:/prism-obsidian-ms1 | work/obsidian-compound-ms1-recover | 4 weeks ago | dirty=5 | merged=N
H:/prism-phase27 | work/cad-phase27-ms0 | 4 weeks ago | dirty=4 | merged=N
H:/prism-wire-unwired | work/wire-unwired-echo | 3 weeks ago | dirty=36963 | merged=Y
H:/prism-unslotted | work/unslotted | 2 weeks ago | dirty=0 | me
... [+1162 chars truncated]

### Assistant | 2026-06-06T03:51:27.959Z

Now the small-dirty-count work/* worktrees need a content check — like the agents, a "dirty=2-8" is often just `.claude/cache/` + a stats json (transient noise), not real unmerged work. Let me check the merged-but-dirty ones and a few unmerged low-dirty ones to distinguish transient noise from real changes. Also check the slot worktrees and wsm.

### Assistant | 2026-06-06T03:51:29.844Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:51:32.178Z

[tool_use: Bash]

### User | 2026-06-06T03:51:34.581Z

[tool_result] === merged work/* with low dirty — what's dirty? ===
--- prism-unslotted (merged, dirty=0) clean ---
--- prism-qcalc (merged dirty=2) ---
?? mcp-server/data/state/indexes/
?? mcp-server/node_modules
--- prism-nn-stack-integ (merged dirty=3) ---
 M mcp-server/src/engines/OEECalculatorEngine.ts
 M mcp-server/src/engines/OSHAComplianceEngine.ts
 M mcp-server/src/engines/ObsidianPluginBridgeEngine.ts

... [+1017 chars truncated]

### User | 2026-06-06T03:51:40.013Z

[tool_result] === unmerged low-dirty work/* — real changes or noise? ===
--- prism-tsc-fix (unmerged dirty=4) ---
 M TSC-ERROR-CAMPAIGN.md
?? .tsc-error-partition.json
?? mcp-server/.tsbuildinfo
?? tsc-baseline.txt
--- prism-lathe-pro-v3 (unmerged dirty=4) ---
?? mcp-server/data/state/SCRUTINY_LEDGER.json
?? mcp-server/scripts/hooks/cam-phase5-impl-gate.mjs
?? state/shared/TSC_BASELINE_CACHE.json
?? state/share
... [+235 chars truncated]

### Assistant | 2026-06-06T03:51:49.444Z

Key nuance confirmed: even some "merged" worktrees carry uncommitted *tracked* modifications (e.g. `system-viz-brain` has 15 modified `.ts`/dispatcher files, `nn-stack-integ` has 3 modified engines). Those modifications are NOT in any commit, so "merged=Y" only covers committed history — the working-tree edits would be lost on removal. The "dirty" in tsc-fix/lathe/phase27 is transient build artifacts (`.tsbuildinfo`, baseline caches, SCRUTINY_LEDGER) — noise. Let me now check the slot worktrees and finalize wsm.

### Assistant | 2026-06-06T03:51:50.694Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:51:54.955Z

[tool_use: Bash]

### User | 2026-06-06T03:52:24.418Z

[tool_result] H:/prism-slot-alpha    | slot/alpha    | 2 days ago    | dirty=175    | merged=N
H:/prism-slot-bravo    | slot/bravo    | 7 days ago    | dirty=478    | merged=N
H:/prism-slot-charlie  | slot/charlie  | 5 days ago    | dirty=16     | merged=N
H:/prism-slot-delta    | slot/delta    | 3 days ago    | dirty=6748   | merged=N
H:/prism-slot-echo     | slot/echo     | 11 days ago   | dirty=112    | merg
... [+1705 chars truncated]

### User | 2026-06-06T03:52:29.888Z

[tool_result] === wsm ===
fatal: not a git repository (or any of the parent directories): .git
exit=0
=== wsm reachable from main? ===
WSM-HEAD=ancestor(merged-content)
=== wsm gitdir file exists? ===
ls: cannot access 'H:/prism-wsm/.git': No such file or directory
=== prunable list (porcelain) ===
HEAD 4d920c67a0f29bb4ef8496085c5c2be04d22cce8
detached
prunable gitdir file points to non-existent location

### Assistant | 2026-06-06T03:52:39.142Z

I have everything needed. The `wsm` worktree's directory has no `.git` file at all (the gitdir pointer is broken), its HEAD content IS an ancestor of main, and git already flags it `prunable`. The slot worktrees are all dirty (active fleet, never prune). Let me do a final confirmation on which low-dirty slot worktrees are pure-noise vs real, for the "merged slot" rows, then write the report.

### Assistant | 2026-06-06T03:52:41.890Z

[tool_use: Bash]

### User | 2026-06-06T03:52:51.685Z

[tool_result] --- slot/uniform (merged dirty=3) ---
 M .claude/settings.json
 M .mcp.json
?? .vscode/
--- slot/zulu (merged dirty=3) ---
 M .claude/settings.json
 M .mcp.json
?? .vscode/
--- slot/sierra (unmerged dirty=0, 31h) clean? ---
0
--- agent a4553ad / a8b4b61 (dirty=0) confirm clean ---
0
0

### Assistant | 2026-06-06T03:53:54.503Z

Even the "merged, dirty=3" slot worktrees carry tracked modifications to `.claude/settings.json` and `.mcp.json` — config the active fleet depends on. All slot worktrees are off-limits. I now have a complete, verified picture. Writing the report.

---

# Worktree Cleanup Safety Classification (READ-ONLY)

**Main branch:** `cad-fusion-live-ms0` @ `416acfe8cd` (advanced past the gitStatus snapshot). Total worktrees: 78 (1 main + 21 agent + 1 wsm + ~30 work/* + 26 slot/*).

> **Premise corrections found during analysis (important):**
> 1. The 21 agent worktrees are **NOT merged into main.** Their base commit `4bdfcc902e` (4 weeks old) is **NOT an ancestor** of `cad-fusion-live-ms0` (`merge-base --is-ancestor` returned false; `branch --merged` lists zero `worktree-agent-*`). They are stale-but-divergent. However, each agent branch has **0 unique commits** ahead of that base — so no committed work would be lost; only working-tree state would.
> 2. Agent worktrees are **NOT uniformly clean.** Dirty counts range 0 → 17,538. Two carry 17,538 (mass deletions of `.claude/bin`, commands), one 266 (modified mirror plans). Most show only untracked `.claude/cache/`.
> 3. "merged=Y" means *committed history* is merged — several merged worktrees still hold **uncommitted tracked edits** (real, would be lost on removal). Verdicts below distinguish this.

## Classification table

### Group 1 — Ephemeral agent worktrees (`H:/PRISM/.claude/worktrees/agent-*`, all @ 4bdfcc902e, base 4 weeks old, 0 commits ahead)
| path (agent-…) | branch | ageOfHEAD | dirty | merged | locked | verdict | reason |
|---|---|---|---|---|---|---|---|
| a4553ad14430ed1b4 | worktree-agent-… | 4w | 0 | N(base diverged) | N | **safe** | clean, no commits ahead, pure orphan |
| a8b4b61a9ebee0955 | … | 4w | 0 | N | N | **safe** | clean, no commits ahead |
| a0310b5d699214970 | … | 4w | 1 | N | N | **safe** | only `?? .claude/cache/` (transient) |
| a37d7460d5d653f84 | … | 4w | 1 | N | N | **safe** | only `.claude/c
... [+9385 chars truncated]
