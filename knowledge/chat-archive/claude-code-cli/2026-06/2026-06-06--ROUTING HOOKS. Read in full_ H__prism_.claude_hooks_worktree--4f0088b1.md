---
type: "chat-session"
source: "claude-code-cli"
session_id: "4f0088b1-c2c1-4360-9099-1b8309decd19"
title: "ROUTING HOOKS. Read in full: H:/prism/.claude/hooks/worktree-commit-route.mjs, H"
date: "2026-06-06"
first_ts: "2026-06-06T03:46:32.877Z"
last_ts: "2026-06-06T03:49:15.716Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 15
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/4f0088b1-c2c1-4360-9099-1b8309decd19/subagents/workflows/wf_3b0daf85-68e/agent-ab711139f6fca8ee8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# ROUTING HOOKS. Read in full: H:/prism/.claude/hooks/worktree-commit-route.mjs, H

> **claude-code-cli** | 2026-06-06 | 36 msgs (15 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4f0088b1-c2c1-4360-9099-1b8309decd19/subagents/workflows/wf_3b0daf85-68e/agent-ab711139f6fca8ee8.jsonl`

## Transcript

### User | 2026-06-06T03:46:32.877Z

ROUTING HOOKS. Read in full: H:/prism/.claude/hooks/worktree-commit-route.mjs, H:/prism/.claude/hooks/git-add-lane-guard.mjs, H:/prism/.claude/hooks/main-tree-write-block.mjs (if a filename differs, Glob narrowly under H:/prism/.claude/hooks for *worktree* *lane* *main-tree*). Grep C:/Users/wompu/.claude/settings.json AND H:/.claude/settings.json AND H:/prism/.claude/settings.json for each hook filename to see if/how they are wired (which event, what order). Determine: (a) what each hook does; (b) the EXACT arm condition (doctrine says they arm once chat-slots.json[slot].branch starts with "slot/"); (c) WHY they are inactive for a chat working in shared H:/prism on branch cad-fusion-live-ms0; (d) every env-var knob (PRISM_WORKTREE_ROUTE_ENABLE, PRISM_GIT_ADD_LANE_ENABLE, PRISM_MAINTREE_WRITE_BLOCK_ENABLE, etc.) and its DEFAULT; (e) what concretely must change for golf and the fleet to have commits actually routed to slot branches. Output: ## Each hook (what/arm/knobs) ## Why inactive now ## What activates routing.

HARD CONSTRAINT: READ-ONLY. You may run git read commands (worktree list, status, log, diff, branch, check-ignore, rev-list, show) and Read/Grep/Glob files. You MUST NOT run any mutating command: no git add/commit/restore/checkout/reset/clean/worktree remove/worktree prune/branch -d/push/merge/rebase, and no Edit/Write. If you think a mutation is needed, RECOMMEND it in your report instead of doing it. Report concise structured markdown.

### Assistant | 2026-06-06T03:46:44.459Z

I'll read the routing hooks and settings files to determine how slot-branch routing arms and why it's inactive for a chat on the shared tree. Let me start by locating the hooks and reading them in parallel with the settings files.

### Assistant | 2026-06-06T03:46:45.357Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:46:45.880Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:46:46.301Z

[tool_use: Glob]

### User | 2026-06-06T03:47:07.502Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-06T03:47:08.376Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-06T03:47:08.859Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-06T03:47:12.523Z

Glob timed out on the repo. Let me use direct file reads since the doctrine names exact filenames.

### Assistant | 2026-06-06T03:47:13.630Z

[tool_use: Read]

### User | 2026-06-06T03:47:16.755Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * worktree-commit-route.mjs — PreToolUse(Bash) worktree-routing enforcement
5	 *
6	 * WHY: 6 concurrent chats all try to commit to H:/prism (the main
7	 * worktree). git-anti-clobber.mjs serializes but does NOT route — two
8	 * chats doing unrelated work still collide on HEAD. The user has 15
9	 * worktrees already set up, one per active work theme. Thi
... [+25875 chars truncated]

### Assistant | 2026-06-06T03:47:19.875Z

[tool_use: Read]

### Assistant | 2026-06-06T03:47:20.660Z

[tool_use: Read]

### User | 2026-06-06T03:47:23.860Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * git-add-lane-guard.mjs — PreToolUse(Bash) `git add` SLOT-LANE gate.
5	 *
6	 * Built for SLOT-WORKTREE-MS0/U-P1-ADD-LANE-GUARD (P1-ROUTING). The
7	 * milestone's end state has 25 work slots (alpha..foxtrot, hotel..zulu)
8	 * + golf in their own per-slot worktrees at H:/prism-slot-<name>. Once a
9	 * slot chat is bound to its worktree, a `git add ../pri
... [+18303 chars truncated]

### User | 2026-06-06T03:47:24.083Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * main-tree-write-block.mjs — PreToolUse(Edit | Write | MultiEdit) main-tree gate.
5	 *
6	 * Built for SLOT-WORKTREE-MS0/U-P1-MAINTREE-WRITE-BLOCK (P1-ROUTING).
7	 * Once the milestone's P3-CUTOVER has shipped 9 canonical worktrees
8	 * (H:/prism-slot-<name>) and each chat is bound to its slot worktree,
9	 * the integration tree H:/prism becomes READ-ON
... [+13067 chars truncated]

### Assistant | 2026-06-06T03:47:31.008Z

I have all three hooks read. The doctrine in the code comments contradicts itself (some say DEFAULT OFF, some say DEFAULT ON since P3-DEFAULT-ON) — I need to read the actual code paths carefully and check the settings wiring + live slot state. Let me grep the three settings files and read the live chat-slots.json.

### Assistant | 2026-06-06T03:47:32.416Z

[tool_use: Grep]

### Assistant | 2026-06-06T03:47:34.720Z

[tool_use: Grep]

### Assistant | 2026-06-06T03:47:34.721Z

[tool_use: Grep]

### User | 2026-06-06T03:47:36.638Z

[tool_result] 920:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/worktree-commit-route.mjs",
930:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/git-add-lane-guard.mjs",
1155:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/main-tree-write-block.mjs",

### User | 2026-06-06T03:47:39.289Z

[tool_result] 875:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/edit-bundle.mjs",
910:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/bash-bundle.mjs",
920:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/worktree-commit-route.mjs",
930:            "command": "\"H:/.claude/bin/portable-node\" H:/pris
... [+273 chars truncated]

### User | 2026-06-06T03:47:39.499Z

[tool_result] 619:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/edit-bundle.mjs",
649:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/bash-bundle.mjs",

### Assistant | 2026-06-06T03:47:51.024Z

Now I have the wiring picture. The two important findings: (1) `worktree-commit-route` and `git-add-lane-guard` are wired as **individual entries** in the C: settings (and mirrored to H:) — NOT through the bundles — and `main-tree-write-block` is also individual. (2) `H:/prism/.claude/settings.json` (the project file) does NOT wire any of the three directly. Let me confirm the events these individual entries sit under, and read the live slot state to determine the actual arm condition for this chat.

### Assistant | 2026-06-06T03:47:51.966Z

[tool_use: Read]

### Assistant | 2026-06-06T03:47:52.585Z

[tool_use: Read]

### User | 2026-06-06T03:47:52.939Z

[tool_result] 895	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/agent-vs-direct.mjs",
896	            "timeout": 2000
897	          }
898	        ]
899	      },
900	      {
901	        "matcher": "Bash",
902	        "hooks": [
903	          {
904	            "type": "command",
905	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/git-index-lock-swe
... [+1785 chars truncated]

### User | 2026-06-06T03:47:53.616Z

[tool_result] 1120	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/pre-tool-savings-multi.mjs",
1121	            "timeout": 2000
1122	          }
1123	        ]
1124	      },
1125	      {
1126	        "matcher": "Bash",
1127	        "hooks": [
1128	          {
1129	            "type": "command",
1130	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/
... [+1409 chars truncated]

### Assistant | 2026-06-06T03:47:58.259Z

All three are wired as individual PreToolUse entries (Bash matcher for the two git hooks, Edit|Write|MultiEdit|NotebookEdit for the write block). Now the critical question: the live arm condition. The code defaults are ON (DISABLE-only gate), so what actually keeps them dormant for this chat is the **slot-branch binding**. Let me read the live chat-slots.json and confirm this chat's binding + branch, plus check the slot-commit-worktree-enforce sibling that also appeared.

### Assistant | 2026-06-06T03:47:59.189Z

[tool_use: Read]

### Assistant | 2026-06-06T03:47:59.826Z

[tool_use: Bash]

### User | 2026-06-06T03:48:04.669Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "lastUpdated": "2026-06-06T03:47:33.430Z",
4	  "slots": {
5	    "alpha": {
6	      "chatId": "claude-e2ac25ec",
7	      "host": "DESKTOP-N7MI1VB",
8	      "pid": 34988,
9	      "claimedAt": "2026-06-06T03:21:26.489Z",
10	      "lastHeartbeat": "2026-06-06T03:47:33.429Z",
11	      "branch": "slot/alpha",
12	      "topic": "alpha-work",
13	      "activity": "PostToolU
... [+2521 chars truncated]

### User | 2026-06-06T03:48:15.229Z

[tool_result] cad-fusion-live-ms0
---WORKTREES---
H:/PRISM                                            416acfe8cd [cad-fusion-live-ms0]
H:/PRISM/.claude/worktrees/agent-a01e7b81d0946a97b  4bdfcc902e [worktree-agent-a01e7b81d0946a97b]
H:/PRISM/.claude/worktrees/agent-a0310b5d699214970  4bdfcc902e [worktree-agent-a0310b5d699214970]
H:/PRISM/.claude/worktrees/agent-a149a784779f1da9f  4bdfcc902e [worktree-agent-a149
... [+7003 chars truncated]

### Assistant | 2026-06-06T03:48:21.038Z

I now have everything needed. The picture is complete and the key insight is decisive: the live arm condition is the **per-chat slot binding's `branch` field**, not the worktree's actual checked-out branch. This chat (golf, `claude-4f0088b1`) has `branch: "cad-fusion-live-ms0"` in chat-slots.json — not a `slot/` branch — so all three hooks fail-open for it.

Let me verify the one slot-commit-enforce sibling that also fires on Bash, since it's the most likely candidate that IS active and could already be routing, to give a complete "what activates" answer.

### Assistant | 2026-06-06T03:48:21.882Z

[tool_use: Read]

### User | 2026-06-06T03:48:24.646Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * slot-commit-worktree-enforce.mjs — PreToolUse(Bash) slot-branch HARD enforcement
5	 *
6	 * Closes the operator pain point named 2026-05-24:
7	 *   "put an enforcement for chat slots to commit to their native worktrees
8	 *    the same as their NATO name. I have to manually tell each chat to
9	 *    commit to their designated worktree, they kept trying
... [+3532 chars truncated]

### Assistant | 2026-06-06T03:49:15.716Z

I have everything needed for a complete, evidence-backed answer. The `slot-commit-worktree-enforce` hook is the keystone: it enforces the precondition that the other three silently fail-open on, and it also keys off the chat-slots.json slot binding (not the live branch alone) — and it exempts golf by name. This confirms the full picture.

---

## Each hook (what / arm / knobs)

### 1. `worktree-commit-route.mjs` — PreToolUse(Bash), routes `git commit`
- **What it does:** Intercepts `git commit`, extracts the commit-subject scope token (e.g. `LATHE-…` → `lathe`), runs `git worktree list --porcelain`, and DENIES the commit if the cwd is the main tree while a themed `work/<scope>` worktree exists (or if cwd is a non-matching worktree). Routes you to `cd` into the right tree. `[MAIN]` softens, `[MAIN-FORCE]` hard-bypasses, and `CROSS_CUTTING_SCOPES` (`INFRA-FIX|INFRA-CLEANUP|HOOK-FIX|FLEET-FIX`) are auto-allowed on main.
- **Arm condition (code reality):** **DEFAULT ON.** Despite the top header saying "DEFAULT OFF", the executable gate is line 96-97: `const ROUTE_DISABLED = process.env.PRISM_WORKTREE_ROUTE_DISABLE === "1"; if (ROUTE_DISABLED) exit(0);`. The `PRISM_WORKTREE_ROUTE_ENABLE` knob is now a **no-op** (only `_DISABLE` is read). It then exits early on: no subject, `[MAIN-FORCE]`, cross-cutting scope, no git, empty `git worktree list`, or unknown cwd relationship.
- **Knobs / defaults:** `PRISM_WORKTREE_ROUTE_DISABLE=1` → hard off (default unset → **armed**). `PRISM_WORKTREE_ROUTE_ENABLE` → vestigial no-op (default unset; back-compat only).
- **Note:** This hook keys off **commit-subject scope + cwd vs worktree list**, NOT the chat-slots binding. It only routes to `work/<scope>` themed trees — it never references `slot/<name>` branches.

### 2. `git-add-lane-guard.mjs` — PreToolUse(Bash), gates `git add`
- **What it does:** Parses every `git add` in a command chain, resolves THIS chat's slot via `stable-session-id.mjs` → `chat-slots.json`, resolves that slot's wo
... [+7723 chars truncated]
