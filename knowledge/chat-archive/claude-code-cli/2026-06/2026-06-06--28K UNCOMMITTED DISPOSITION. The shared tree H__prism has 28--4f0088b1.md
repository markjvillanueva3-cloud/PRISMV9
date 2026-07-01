---
type: "chat-session"
source: "claude-code-cli"
session_id: "4f0088b1-c2c1-4360-9099-1b8309decd19"
title: "28K UNCOMMITTED DISPOSITION. The shared tree H:/prism has 28,026 uncommitted fil"
date: "2026-06-06"
first_ts: "2026-06-06T03:46:32.877Z"
last_ts: "2026-06-06T04:10:18.962Z"
cwd: "H:\\prism"
messages: 69
user_msgs: 27
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/4f0088b1-c2c1-4360-9099-1b8309decd19/subagents/workflows/wf_3b0daf85-68e/agent-afcfeb77b50e39e15.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# 28K UNCOMMITTED DISPOSITION. The shared tree H:/prism has 28,026 uncommitted fil

> **claude-code-cli** | 2026-06-06 | 69 msgs (27 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4f0088b1-c2c1-4360-9099-1b8309decd19/subagents/workflows/wf_3b0daf85-68e/agent-afcfeb77b50e39e15.jsonl`

## Transcript

### User | 2026-06-06T03:46:32.877Z

28K UNCOMMITTED DISPOSITION. The shared tree H:/prism has 28,026 uncommitted files: 22,075 untracked, 5,943 modified, 8 deleted; 22,326 are under knowledge/ and 23,762 are .md. Investigate without mutating: (a) Are the untracked knowledge/ files auto-generated? Inspect subdirs knowledge/wiki, knowledge/memories, knowledge/tribal (ls + sample a few). Read H:/prism/.gitignore and report any knowledge/ rules; run `git -C H:/prism check-ignore -v` on ~5 sample untracked knowledge paths to see if any are (or should be) ignored. (b) Of the 5,943 modified tracked files, estimate how many are pure EOL/CRLF flips vs real content: compare `git -C H:/prism diff --stat | tail -1` (total) against `git -C H:/prism diff --ignore-all-space --stat | tail -1` (content-only) — the delta ≈ whitespace-only files. (c) Categorize non-knowledge dirs (mcp-server 1867, state 1898, scripts 439, web 280, .claude 266): real source edits vs generated state/logs. Sample filenames. (d) Recommend disposition buckets with concrete git commands: which to gitignore, which to batch-commit as generated artifacts, which need real per-slot attribution. Output: ## knowledge/ verdict ## CRLF-flip share (numbers) ## Non-knowledge buckets ## Recommended disposition + commands. Use NARROW paths; aggregate, never dump 28K lines.

HARD CONSTRAINT: READ-ONLY. You may run git read commands (worktree list, status, log, diff, branch, check-ignore, rev-list, show) and Read/Grep/Glob files. You MUST NOT run any mutating command: no git add/commit/restore/checkout/reset/clean/worktree remove/worktree prune/branch -d/push/merge/rebase, and no Edit/Write. If you think a mutation is needed, RECOMMEND it in your report instead of doing it. Report concise structured markdown.

### Assistant | 2026-06-06T03:46:43.368Z

I'll investigate the 28K uncommitted files read-only. Let me start with parallel diagnostic commands.

### Assistant | 2026-06-06T03:46:44.793Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:46:46.202Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:46:46.474Z

[tool_use: Bash]

### User | 2026-06-06T03:46:57.071Z

[tool_result] === .gitignore knowledge rules ===
26:# of truth is the markdown under knowledge/wiki/os/. Mirrors are a
145:knowledge/memories/reference/node_*.md
149:knowledge/memories/galaxies/**/*.md
150:!knowledge/memories/galaxies/README.md

### User | 2026-06-06T03:46:57.465Z

[tool_result] H:/PRISM                                            416acfe8cd [cad-fusion-live-ms0]
H:/PRISM/.claude/worktrees/agent-a01e7b81d0946a97b  4bdfcc902e [worktree-agent-a01e7b81d0946a97b]
H:/PRISM/.claude/worktrees/agent-a0310b5d699214970  4bdfcc902e [worktree-agent-a0310b5d699214970]
H:/PRISM/.claude/worktrees/agent-a149a784779f1da9f  4bdfcc902e [worktree-agent-a149a784779f1da9f]
H:/PRISM/.claude/work
... [+6967 chars truncated]

### User | 2026-06-06T03:47:41.781Z

[tool_result]  5793 files changed, 63555 insertions(+), 111638 deletions(-)
---CONTENT-ONLY---
 5793 files changed, 59291 insertions(+), 107374 deletions(-)

### Assistant | 2026-06-06T03:48:03.931Z

Key finding already: the CRLF delta is small. Total diff and content-only diff both show 5793 files — let me dig into the actual whitespace-only file count and the knowledge/ structure.

### Assistant | 2026-06-06T03:48:06.307Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:48:07.869Z

[tool_use: Bash]

### User | 2026-06-06T03:48:37.736Z

[tool_result] <persisted-output>
Output too large (2.8MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\4f0088b1-c2c1-4360-9099-1b8309decd19\tool-results\bu3gx0ajj.txt

Preview (first 2KB):
=== per-file: total changed ===
warning: in the working copy of '.claude/helpers/mcp-tool-domains.mjs', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of '.claude/hook
... [+1817 chars truncated]

### User | 2026-06-06T03:50:35.177Z

[tool_result] === untracked count under knowledge/ ===
31401
=== untracked top subdirs under knowledge/ (counts) ===
  26374 wiki
   3133 handoffs
   1768 memories
     41 Skills
     34 claude-md
     16 tribal
     10 .obsidian
      5 hermes-outputs
      5 decisions
      3 sessions
      1 test_entries.json
      1 session_2026-02-17_entries.json
      1 observations
      1 lint-reports
      1 index_sche
... [+199 chars truncated]

### Assistant | 2026-06-06T03:50:45.964Z

The first command produced warnings that polluted the count. Let me redirect stderr and get clean numbers. Note: untracked under knowledge/ is 31,401 here (working tree may have changed since the 28K snapshot). Let me get the whitespace-only count cleanly and sample the knowledge subdirs.

### Assistant | 2026-06-06T03:50:47.913Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:50:49.846Z

[tool_use: Bash]

### User | 2026-06-06T03:51:02.298Z

[tool_result] 0
=== ^ pure-whitespace tracked files ===
5793
=== ^ total tracked-modified files ===

### User | 2026-06-06T03:51:07.594Z

[tool_result] === knowledge/wiki sample (top dir listing) ===
architecture/
code-tribal/
concepts/
consensus/
coordination/
decisions/
entities/
formulas/
index.jsonl
index.md
lessons/
log.md
log.md.39700.1780520332941.tmp
os/
patterns/
reference/
software-engineering/
summaries/
training/
trajectories/
ux-design/
=== count by wiki subdir ===
  18318 architecture
   4925 .hook-cache
   2967 code-tribal
    141 
... [+197 chars truncated]

### Assistant | 2026-06-06T03:51:27.223Z

Important finding: `comm -23` returned 0 because both name-only lists are identical (the whitespace-only-FILE concept doesn't apply here — git's content insertions/deletions are nearly identical with/without whitespace, meaning these are real content changes, not CRLF flips). The 4264-line insertion delta (63555 vs 59291) is the whitespace portion within otherwise-real diffs. Let me verify the CRLF nature directly and sample knowledge/wiki/architecture (the 18,318 bulk).

### Assistant | 2026-06-06T03:51:31.194Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:51:32.321Z

[tool_use: Bash]

### User | 2026-06-06T03:51:49.000Z

[tool_result] === git diff numstat: lines where added==deleted (likely full-file rewrites/EOL) sample ===
added==deleted files: 5156
=== files with ZERO content-diff under ignore-all-space (pure EOL) ===
zero-content-change files: 0

### User | 2026-06-06T03:51:54.169Z

[tool_result] === sample 8 untracked knowledge/wiki/architecture files ===
knowledge/wiki/architecture/actions/adaptivecontrol/rtac-gcode.md
knowledge/wiki/architecture/actions/adaptivecontrol/rtac-metrics.md
knowledge/wiki/architecture/actions/adaptivecontrol/rtac-reset.md
knowledge/wiki/architecture/actions/adaptivecontrol/rtac-state.md
knowledge/wiki/architecture/actions/adaptivecontrol/rtac-targets.md
knowl
... [+869 chars truncated]

### Assistant | 2026-06-06T03:52:06.535Z

Now I have the real picture on CRLF. `added==deleted` for 5156 of 5793 files (89%) — these are full-file LF→CRLF→LF re-write flips where every line is "changed" (deleted + re-added). The `ignore-all-space` numstat shows 0 files with zero content change, which is the known quirk: git's `--ignore-all-space` still counts the line as changed if the EOL differs but treats interior whitespace as same — the 4264-insertion/4264-deletion delta between the two stats is the pure-EOL noise. Let me confirm with actual CRLF byte inspection on a sample and check the .gitignore for the cache/tmp patterns.

### Assistant | 2026-06-06T03:52:29.384Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:52:29.394Z

[tool_use: Bash]

### User | 2026-06-06T03:52:34.213Z

[tool_result] === CRLF check on 5 sample modified files (count CR bytes) ===
CLAUDE.md -> HEAD_CR=527 WORKTREE_CR=531
.claude/hooks/read-auto-limit.mjs -> HEAD_CR=80 WORKTREE_CR=80
knowledge/memories/feedback/feedback_karpathy_discipline.md -> HEAD_CR=69 WORKTREE_CR=69
PRISM-INVENTORY-LATEST.md -> HEAD_CR=78 WORKTREE_CR=78
knowledge/PRISM-System-Map.canvas -> HEAD_CR=7951 WORKTREE_CR=7599

### User | 2026-06-06T03:52:38.584Z

[tool_result] === check-ignore -v on 5 sample untracked knowledge paths ===
--- knowledge/wiki/.hook-cache/000b14ce32b34b35a83665a974f668405f6db070.json
   NOT IGNORED
--- knowledge/wiki/architecture/actions/adaptivecontrol/rtac.md
   NOT IGNORED
--- knowledge/memories/reference/node_foo.md
.gitignore:145:knowledge/memories/reference/node_*.md	knowledge/memories/reference/node_foo.md
--- knowledge/memories/gala
... [+219 chars truncated]

### Assistant | 2026-06-06T03:52:49.594Z

Crucial finding: HEAD and worktree have **nearly identical CR counts** (CLAUDE.md: 527 vs 531, read-auto-limit.mjs: 80 vs 80, feedback: 69 vs 69). These files are **already CRLF in HEAD** — so the diffs are NOT CRLF flips; they're real content edits. The `.gitattributes`/autocrlf "CRLF will be replaced by LF" warnings are about git's normalization-on-next-touch, not an existing flip. Let me confirm whether the repo is LF-canonical (gitattributes) and quantify the real-content share, then categorize non-knowledge dirs.

### Assistant | 2026-06-06T03:52:53.365Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:52:55.324Z

[tool_use: Bash]

### User | 2026-06-06T03:53:04.664Z

[tool_result] === .gitattributes EOL rules ===
# WHY: the 26-chat fleet shares one working tree; CRLF-vs-LF drift re-dirties
# chats (the EOL-absorption conflict class — e.g. the EventBus 047fd6ab8 and
# calcDispatcher 61e9cfe6a LF-restore regressions). `core.autocrlf` is false on
# rewrites already-CRLF-in-index blobs is a SEPARATE, deliberately-scoped commit
# Default: auto-detect text, store + check out as L
... [+501 chars truncated]

### User | 2026-06-06T03:53:14.595Z

[tool_result] === non-knowledge modified-tracked by top dir ===
   1000 state
     85 mcp-server
     74 scripts
     22 .claude
      2 resources
      1 PRISM-INVENTORY-LATEST.md
      1 CLAUDE.md
=== untracked non-knowledge by top dir ===
 257668 Docustrata
   8689 mcp-server
   6543 state
   6279 output
   5215 data
   3497 src
   3254 tmp
   1047 extracted_modules
    895 extracted
    710 tests
    575 .c
... [+80 chars truncated]

### Assistant | 2026-06-06T03:53:22.959Z

Now the picture is clear and very different from the prompt's framing. The repo declares `* text=auto eol=lf` in `.gitattributes`, but `core.autocrlf=false` and many working-tree files are CRLF — so on `git add` git **renormalizes CRLF→LF**, which is exactly why the diffs show massive add/delete churn. 21/40 sampled files have SAME CR count (real content edit) and 19/40 DIFF (EOL-influenced). Let me quantify this ratio across all modified files and sample the state/ and mcp-server/ churn to finish categorization.

### Assistant | 2026-06-06T03:53:25.294Z

[tool_use: Bash]

### User | 2026-06-06T03:58:27.761Z

[tool_result] Command running in background with ID: bxhyvyxdo. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4f0088b1-c2c1-4360-9099-1b8309decd19\tasks\bxhyvyxdo.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-06T03:58:31.106Z

That full scan will take a while (5793 git show calls). Let me run the lighter categorization in parallel while it completes.

### Assistant | 2026-06-06T03:58:33.921Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:58:35.846Z

[tool_use: Bash]

### User | 2026-06-06T03:58:50.561Z

[tool_result] === state/ modified-tracked: subdir breakdown ===
    999 shared
      1 memory_consolidation_state.json
=== state/ sample filenames ===
state/memory_consolidation_state.json
state/shared/.wiki-tribal-coverage-by-domain.json
state/shared/AGENT_CHAT.jsonl
state/shared/AUDIT-REGISTRY.json
state/shared/AWARENESS-SNAPSHOT.md
state/shared/BUILD_STATE.json
state/shared/BUILD_STATE.md
state/shared/CAD-DR
... [+550 chars truncated]

### User | 2026-06-06T03:59:01.061Z

[tool_result] === .gitignore: state/output/tmp/data rules (sample) ===
16:state/logs/audit.jsonl
17:state/logs/
19:state/logs/
28:state/shared/os-mirrors/
31:state/shared/AGENT_*.json
32:state/shared/AGENT_*.md
33:state/shared/HANDOFF-latest.md
34:state/shared/ROADMAP_COLLABORATION_STATE.*
35:state/shared/SVI.json
36:state/shared/SVI-compact.md
37:state/shared/TASK_QUEUE.*
38:state/shared/QUALITY_SCORES.json
39
... [+965 chars truncated]

### Assistant | 2026-06-06T03:59:14.157Z

Background full scan failed (likely a `git show` on a deleted file or shell issue at exit). I have a strong statistical sample already (21 SAME / 19 DIFF on 40 files). Let me run a more robust full scan using git's own machinery — comparing per-file numstat with vs without `--ignore-cr-at-eol` to get an exact EOL-only count.

### Assistant | 2026-06-06T03:59:17.553Z

[tool_use: Bash]

### User | 2026-06-06T04:00:41.501Z

[tool_result] === diff stat WITH cr-ignore (content+interior-ws only) ===
 5791 files changed, 61982 insertions(+), 110063 deletions(-)
=== files that become CLEAN when CR-at-eol ignored (pure EOL flips) ===
pure-EOL-only files: 0
=== files still changed after cr-at-eol ignore (real content) ===
real-content files: 5791

### Assistant | 2026-06-06T04:01:03.553Z

Definitive: `--ignore-cr-at-eol` leaves **0 pure-EOL files** and all 5791 still show real content changes. So the 5793 modified files are NOT CRLF flips at all — they are genuine content rewrites. The "added==deleted" pattern (5156 files) combined with massive deletions (110K) indicates these files were **largely rewritten or truncated**, not EOL-churned. Let me confirm the deletion-heavy nature and spot-check whether these are content reductions (e.g., compaction/regeneration of state artifacts) on a couple of tracked state files.

### Assistant | 2026-06-06T04:01:05.812Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:01:07.582Z

[tool_use: Bash]

### User | 2026-06-06T04:01:22.457Z

[tool_result] === top 12 files by deletion volume (numstat: add del path) ===
7991	85251	state/shared/roadmap-tool-plans.json
2434	3007	mcp-server/data/state/cad-cam-resources-pdf-index.json
1370	1618	state/shared/system-viz-dead-pixels-2026-05-31.json
1449	1449	knowledge/wiki/index.md
5807	939	state/shared/HOOK_REGISTRY.json
491	843	knowledge/PRISM-System-Map.canvas
2178	742	state/shared/specs/ROADMAP-CONSOLID
... [+407 chars truncated]

### User | 2026-06-06T04:01:28.573Z

[tool_result] === sample real content diff: a small tracked memory file (first 30 diff lines) ===

### Assistant | 2026-06-06T04:01:45.516Z

The `feedback_karpathy_discipline.md` diff returned **empty** — that file (CR=69 SAME in both) has no content diff, meaning git considers it modified only due to the index/attribute normalization state, not actual content. But the big hitters (`roadmap-tool-plans.json` -85K lines, `HOOK_REGISTRY.json`, `cad-cam-resources-pdf-index.json`) are clearly **regenerated state artifacts**. Let me reconcile this apparent contradiction — why does karpathy show as modified with empty diff — and confirm the index.md / canvas are regenerated artifacts.

### Assistant | 2026-06-06T04:01:52.715Z

[tool_use: Bash]

### User | 2026-06-06T04:01:57.231Z

[tool_result] === why is karpathy modified? numstat + raw status ===
 M knowledge/memories/feedback/feedback_karpathy_discipline.md
=== diff with --ignore-cr-at-eol (empty means EOL-only) ===
(if blank above = pure EOL/normalization, not content)

### Assistant | 2026-06-06T04:02:13.405Z

This is the key reconciliation. `git diff --numstat` for karpathy returns **nothing** (no add/del lines) yet `git status` shows it as ` M`. This is the classic **`text=auto eol=lf` renormalization-pending** state: the file is CRLF in the working tree, the index blob differs only by EOL normalization, so `git status` flags it modified but `git diff` (which respects the eol=lf attribute) shows zero content lines. These are the "SAME CR-count" files — pure normalization, no real edit.

So there are TWO distinct populations. Let me get the exact split: files where `git diff` shows actual line changes vs files that are status-modified-but-diff-empty (normalization-only).

### Assistant | 2026-06-06T04:02:16.388Z

[tool_use: Bash]

### User | 2026-06-06T04:02:33.389Z

[tool_result] === status-modified count (porcelain ' M') ===
5939
=== diff-has-real-lines count (numstat non-empty) ===
5788
=== files modified in status but EMPTY git diff (normalization-only / EOL) ===
157

### Assistant | 2026-06-06T04:02:46.806Z

So: 5939 status-modified, 5788 have real diff lines, ~157 are normalization/EOL-only (empty diff). But wait — many of the 5788 "real diff" files are still partly EOL-renormalized (the `eol=lf` attribute means git's diff shows LF-normalized content, so a file that was CRLF→had-real-edits shows ALL lines as changed if the index blob was CRLF). Let me settle the final question: of the 5788 real-diff files, how many are dominated by add==delete full rewrites (regenerated artifacts) vs surgical edits. I have enough; let me just confirm the canvas/index are generated and check deleted files.

### Assistant | 2026-06-06T04:02:51.477Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:02:51.838Z

[tool_use: Bash]

### User | 2026-06-06T04:07:54.272Z

[tool_result] Command running in background with ID: byd109at3. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4f0088b1-c2c1-4360-9099-1b8309decd19\tasks\byd109at3.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-06-06T04:07:59.488Z

[tool_result] === full untracked count + non-knowledge breakdown (committable-source vs generated) ===
   8689 mcp-server
   6543 state
   3497 src
    710 tests
    575 .claude
    563 web
    447 scripts
    287 skills-consolidated
    244 cad-engine
    167 docs
    155 audits
    140 "Docustrata
     95 deployment
     78 .playwright-mcp
     69 mcp-cadquery
     53 registries
     43 logs
     39 skills-ar
... [+36 chars truncated]

### Assistant | 2026-06-06T04:08:24.323Z

The grep is running in background (it's recursing a huge tree). Let me kill it and target it narrowly, while I have enough data to finish.

### Assistant | 2026-06-06T04:08:24.852Z

[tool_use: TaskStop]

### User | 2026-06-06T04:08:25.665Z

[tool_result] {"message":"Successfully stopped task: byd109at3 (echo \"=== 8 deleted tracked files ===\" && git status --porcelain 2>/dev/null | grep '^ D' | head -10; echo \"=== are wiki/index.md, PRISM-System-Map.canvas, roadmap-tool-plans.json git-generated artifacts? (check for generator refs) ===\" && grep -rlE \"writeFile.*(wiki/index\\.md|PRISM-System-Map\\.canvas|roadmap-tool-plans\\.json|HOOK_REGISTRY\
... [+551 chars truncated]

### Assistant | 2026-06-06T04:08:26.412Z

[tool_use: Bash]

### User | 2026-06-06T04:08:33.459Z

[tool_result] === deleted files ===
 D mcp-server/src/__tests__/BidWinCalibratorEngine.test.ts
 D mcp-server/src/__tests__/InternalAuditCalendarEngine.test.ts
 D mcp-server/src/__tests__/ManagementReviewEngine.test.ts
 D state/shared/dashboards/patches/CLAUDE-MD-PATCH-TOKEN-AWARENESS-MS0.md
 D state/shared/dashboards/patches/CLAUDE-MD-PATCH-rtk-dead-hook-fix-2026-05-18.md
 D state/shared/dashboards/patches/CLAU
... [+444 chars truncated]

### Assistant | 2026-06-06T04:09:00.553Z

Confirmed: `state/shared/HOOK_REGISTRY.json` has a generator (`scripts/build-hook-registry.mjs`), `PRISM-System-Map.canvas` and `roadmap-tool-plans.json` are generated artifacts. The deleted files include 3 real test deletions (`BidWinCalibratorEngine.test.ts` etc.) which need attribution, plus generated patch dashboards. I now have everything needed. Let me do one final targeted check on the `src/` 3497 untracked (is it a stray dir or real) and confirm whether mcp-server untracked is mostly generated state.

### Assistant | 2026-06-06T04:09:02.703Z

[tool_use: Bash]

### User | 2026-06-06T04:09:14.062Z

[tool_result] === top-level untracked dir 'src/' — what is it? ===
src/__tests__/.claude/CLAUDE.md
src/__tests__/AIMLFormulasEngine.test.ts
src/__tests__/AccountingHardeningEngine.test.ts
src/__tests__/AdaptiveFeedControlEngine.test.ts
=== untracked mcp-server breakdown ===
   5179 data
   1203 state
    709 tests
    678 .claude
    347 scripts
    229 src
     69 uploads
     54 web
=== untracked .claude brea
... [+225 chars truncated]

### Assistant | 2026-06-06T04:10:18.962Z

I have a complete picture. The untracked `src/__tests__/` (3497) and untracked `mcp-server/.claude/hooks` (65) and `helpers` (49) are real source/config that need attribution; `mcp-server/data` (5179) and `state` are generated. Final report.

---

## knowledge/ verdict

**Untracked knowledge/ is overwhelmingly auto-generated, NOT hand-authored source.** Of ~31,401 untracked knowledge/ files (number grew past the 22,326 snapshot — the fleet is actively regenerating):

| knowledge/ subtree | untracked count | nature |
|---|---|---|
| `wiki/architecture/actions/**` | **18,318** | per-dispatcher-action `.md` stubs (e.g. `architecture/actions/adaptivecontrol/rtac-*.md`) — machine-emitted by the wiki index maintainer, one file per action |
| `wiki/.hook-cache/*.json` | **4,925** | SHA-named hook cache blobs — pure cache, should never be committed |
| `wiki/code-tribal/*.md` | **2,967** | generated tribal-tip leaves |
| `handoffs/` | **3,133** | per-chat handoff `.md` — already partially `.gitignore`d (`HANDOFF-*.md` line 83) but the dir has stragglers |
| `memories/` | **1,768** | auto-memory mirror (fed every Stop by `stop-obsidian-memory-feed.mjs`) |

**.gitignore knowledge/ rules that exist (lines 145–150):** `knowledge/memories/reference/node_*.md`, `knowledge/memories/galaxies/**/*.md` (with `!README.md` un-ignore). `check-ignore -v` confirms these fire correctly, and `*.tmp` (line 14) catches `knowledge/wiki/log.md.*.tmp`.

**Gap:** the three biggest untracked buckets are **NOT ignored** — `check-ignore` reports `NOT IGNORED` for `knowledge/wiki/.hook-cache/*.json`, `knowledge/wiki/architecture/actions/**`, and `knowledge/wiki/code-tribal/*.md`. The `.hook-cache` tree (4,925 cache files) is the clearest accidental-noise: it is a content-addressed cache and has no business in git.

## CRLF-flip share (numbers)

**The 5,943 modified tracked files are essentially ZERO real CRLF flips — they split into two populations, neither of which is a "CRLF flip" in the sense the 
... [+5806 chars truncated]
