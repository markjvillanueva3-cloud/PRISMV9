---
type: "chat-session"
source: "claude-code-cli"
session_id: "4f0088b1-c2c1-4360-9099-1b8309decd19"
title: "SLOT-WORKTREE DESIGN & GAP. Read H:/prism/state/shared/SLOT-WORKTREE-ARCHITECTUR"
date: "2026-06-06"
first_ts: "2026-06-06T03:46:32.875Z"
last_ts: "2026-06-06T03:55:17.152Z"
cwd: "H:\\prism"
messages: 85
user_msgs: 37
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism/4f0088b1-c2c1-4360-9099-1b8309decd19/subagents/workflows/wf_3b0daf85-68e/agent-a164c9c76ea5da084.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# SLOT-WORKTREE DESIGN & GAP. Read H:/prism/state/shared/SLOT-WORKTREE-ARCHITECTUR

> **claude-code-cli** | 2026-06-06 | 85 msgs (37 user / 48 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4f0088b1-c2c1-4360-9099-1b8309decd19/subagents/workflows/wf_3b0daf85-68e/agent-a164c9c76ea5da084.jsonl`

## Transcript

### User | 2026-06-06T03:46:32.875Z

SLOT-WORKTREE DESIGN & GAP. Read H:/prism/state/shared/SLOT-WORKTREE-ARCHITECTURE.md in full. Read H:/prism/.claude/commands/checkin.md and find its "Step 2c" slot-worktree cutover section. Find + read the generator/setup scripts: H:/prism/scripts/generate-per-slot-wrappers.mjs and anything matching *slot-worktree* / *setup-slot* / *slot-cutover* under H:/prism/scripts and H:/prism/.claude/helpers (use Glob with a NARROW path, not repo-root recursive). Read H:/prism/.claude/helpers/chat-slots.mjs enough to see how a slot binds a branch. Determine: (a) the INTENDED design — how each slot is supposed to stage+commit to slot/<name> inside H:/prism-slot-<name>; (b) which components exist vs are missing for the system to be fully operational fleet-wide; (c) the EXACT concrete steps a chat takes to cut over from the shared H:/prism tree to its slot worktree (the documented procedure); (d) whether a fleet-wide bootstrap exists and whether it appears to have been run. Output: ## Design ## Components present ## Gaps (what "finish setting up" concretely requires) ## Cutover procedure (numbered).

HARD CONSTRAINT: READ-ONLY. You may run git read commands (worktree list, status, log, diff, branch, check-ignore, rev-list, show) and Read/Grep/Glob files. You MUST NOT run any mutating command: no git add/commit/restore/checkout/reset/clean/worktree remove/worktree prune/branch -d/push/merge/rebase, and no Edit/Write. If you think a mutation is needed, RECOMMEND it in your report instead of doing it. Report concise structured markdown.

### Assistant | 2026-06-06T03:46:48.368Z

I'll start by reading the architecture doc and the key files in parallel.

### Assistant | 2026-06-06T03:46:50.110Z

[tool_use: Read]

### Assistant | 2026-06-06T03:46:50.114Z

[tool_use: Read]

### Assistant | 2026-06-06T03:46:50.243Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:46:50.681Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:46:50.712Z

[tool_use: Glob]

### User | 2026-06-06T03:46:53.486Z

[tool_result] 1	# SLOT-WORKTREE ARCHITECTURE — structural chat isolation
2	
3	**Status:** ACTIVE — shipped as SLOT-WORKTREE-MS0 (2026-05-15, status `complete`); 12-slot fleet bootstrapped + enforcement hooks default-on; `/checkin` Step 2c performs the per-chat cutover (wired 2026-05-16). See §ACTIVATION STATUS below.
4	**Replaces:** WORKTREE-CONSOLIDATE-MS0's "land stranded commits into shared tree" framing
5	*
... [+14590 chars truncated]

### User | 2026-06-06T03:46:57.418Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1107 of 1623 total (31129 tokens, cap 25000). Call Read with offset=1108 limit=1107 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#!/usr/bin/env node
2	/**
3	 * chat-slots.mjs — 7-slot fleet manager for concurrent PRISM chats.
4	 *

... [+56316 chars truncated]

### User | 2026-06-06T03:47:12.270Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-06T03:47:13.193Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-06T03:47:13.204Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-06T03:47:16.197Z

The Glob calls timed out (repo-root recursive is too broad). Let me use narrow directory-scoped Glob calls and read the checkin.md Step 2c section.

### Assistant | 2026-06-06T03:47:17.144Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:47:17.624Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:47:18.455Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:47:18.457Z

[tool_use: Read]

### User | 2026-06-06T03:47:19.809Z

[tool_result] scripts\slot-worktree-bootstrap.mjs
scripts\__tests__\slot-worktree-migration-status.test.mjs
scripts\slot-worktree-migration-status.mjs

### User | 2026-06-06T03:47:19.894Z

[tool_result] scripts\slot-integrator.mjs

### User | 2026-06-06T03:47:20.186Z

[tool_result] 1	---
2	name: checkin
3	description: Slot-claim + drift + commit-hygiene + position via the psk `checkin` composite syscall. Args after /checkin are the primary work order — slot-claim is a minimal silent preamble before acting on them.
4	trigger:
5	  autoSuggest:
6	    keywords: ["checkin", "check in", "claim a slot", "fleet slot", "which chat am i", "login to the fleet", "start a development pip
... [+4606 chars truncated]

### User | 2026-06-06T03:47:20.879Z

[tool_result] .claude\helpers\chat-slots-smoke.mjs
.claude\helpers\chat-slots.test.mjs
.claude\helpers\chat-slots-slot-truth.smoke.mjs
.claude\helpers\__tests__\chat-slots-rename.test.mjs
.claude\helpers\chat-slots-force-fix.test.mjs
.claude\helpers\slot-task-claim.e2e.test.mjs
.claude\helpers\chat-slots-pid-gate.test.mjs
.claude\helpers\chat-slots-transcript-gate.test.mjs
.claude\helpers\slot-identity-cache.mj
... [+804 chars truncated]

### Assistant | 2026-06-06T03:47:36.963Z

The current `checkin.md` is the thin psk client (769-line runbook retired) — it no longer literally contains a "Step 2c" section. The Step 2c cutover is now inside the psk `checkin` composite. Let me read the bootstrap, integrator, migration-status scripts, and the worktree-route hooks, plus check live git/worktree state.

### Assistant | 2026-06-06T03:47:37.426Z

[tool_use: Read]

### Assistant | 2026-06-06T03:47:37.691Z

[tool_use: Read]

### User | 2026-06-06T03:47:40.360Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * slot-worktree-bootstrap.mjs — one-shot Phase 0 setup of the per-slot
4	 * worktree architecture (see state/shared/SLOT-WORKTREE-ARCHITECTURE.md).
5	 *
6	 * Creates one worktree per NATO slot, each on a long-lived `slot/<name>`
7	 * branch off `origin/cad-fusion-live-ms0`. node_modules is junctioned from
8	 * the main tree to avoid 8× npm install. Records the bootst
... [+21669 chars truncated]

### User | 2026-06-06T03:47:40.692Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * slot-worktree-migration-status.mjs — U-WAVE5c-AUTO (2026-05-19)
4	 *
5	 * Cron-able audit that answers ONE question: which of the 13 NATO chat slots
6	 * are bound to a `slot/<nato>` branch (lane-routing hooks ARMED) vs still
7	 * drifting on the shared main-tree `cad-fusion-live-ms0` branch (hooks
8	 * SILENTLY DORMANT)?
9	 *
10	 * Inputs:
11	 *   - `git worktree 
... [+15944 chars truncated]

### Assistant | 2026-06-06T03:48:04.259Z

Now let me read the integrator script and check the live state: git worktree list, branch list, the chat-slots.json, slot-branch-bindings.json, and the migration-status report.

### Assistant | 2026-06-06T03:48:04.746Z

[tool_use: Read]

### Assistant | 2026-06-06T03:48:05.667Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:48:06.041Z

[tool_use: Bash]

### User | 2026-06-06T03:48:12.845Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * slot-integrator.mjs — Bidirectional sync between slot/* branches and the
5	 * fleet's main target branch (default: cad-fusion-live-ms0).
6	 *
7	 * SHIPPED 2026-05-15 as SLOT-WORKTREE-MS0/U-P4-INTEGRATOR. Operator directive:
8	 * "I set 7 chats up and named them all corresponding with slot claimed and
9	 *  envelope/milestones they're working on. lets 
... [+9778 chars truncated]

### User | 2026-06-06T03:48:15.498Z

[tool_result] H:/PRISM                                            416acfe8cd [cad-fusion-live-ms0]
H:/PRISM/.claude/worktrees/agent-a01e7b81d0946a97b  4bdfcc902e [worktree-agent-a01e7b81d0946a97b]
H:/PRISM/.claude/worktrees/agent-a0310b5d699214970  4bdfcc902e [worktree-agent-a0310b5d699214970]
H:/PRISM/.claude/worktrees/agent-a149a784779f1da9f  4bdfcc902e [worktree-agent-a149a784779f1da9f]
H:/PRISM/.claude/work
... [+5002 chars truncated]

### User | 2026-06-06T03:48:18.958Z

[tool_result] + slot/alpha
+ slot/bravo
+ slot/charlie
+ slot/delta
+ slot/echo
+ slot/foxtrot
+ slot/golf
+ slot/hotel
+ slot/india
  slot/india-premerge-backup
+ slot/juliett
+ slot/kilo
+ slot/lima
+ slot/mike
+ slot/november
+ slot/oscar
+ slot/papa
+ slot/quebec
+ slot/romeo
+ slot/sierra
+ slot/tango
+ slot/uniform
+ slot/victor
+ slot/whiskey
+ slot/xray
+ slot/yankee
+ slot/zulu

### Assistant | 2026-06-06T03:48:33.630Z

The worktree list got cut off at india (60-line head limit). All 26 `slot/*` branches exist. Let me see the full slot worktree list, the live state files, and the lane-routing hooks. Note the `+` prefix on the branch list means each `slot/*` branch is currently checked out in a worktree.

### Assistant | 2026-06-06T03:48:34.651Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:48:35.120Z

[tool_use: Read]

### Assistant | 2026-06-06T03:48:35.576Z

[tool_use: Read]

### Assistant | 2026-06-06T03:48:35.962Z

[tool_use: Read]

### User | 2026-06-06T03:50:27.969Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-06-06T03:50:29.586Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "lastUpdated": "2026-06-06T03:34:49.458Z",
4	  "bindings": {
5	    "alpha": "slot/alpha",
6	    "charlie": "slot/charlie",
7	    "delta": "slot/delta",
8	    "echo": "slot/echo",
9	    "foxtrot": "slot/foxtrot",
10	    "hotel": "slot/hotel",
11	    "india": "slot/india",
12	    "juliett": "slot/juliett",
13	    "kilo": "slot/kilo",
14	    "lima": "slot/lima",
15	   
... [+438 chars truncated]

### system

... [5 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-06T03:50:38.972Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:50:39.464Z

[tool_use: Glob]

### User | 2026-06-06T03:50:40.378Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\main-tree-write-block.mjs' was already read 3m ago in this session and is unchanged (mtime 1779768112067). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T03:50:41.786Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "lastUpdated": "2026-06-06T03:50:39.493Z",
4	  "slots": {
5	    "alpha": {
6	      "chatId": "claude-e2ac25ec",
7	      "host": "DESKTOP-N7MI1VB",
8	      "pid": 34988,
9	      "claimedAt": "2026-06-06T03:21:26.489Z",
10	      "lastHeartbeat": "2026-06-06T03:50:29.757Z",
11	      "branch": "slot/alpha",
12	      "topic": "alpha-work",
13	      "activity": "PostToolU
... [+2231 chars truncated]

### User | 2026-06-06T03:50:41.918Z

[tool_result] .claude\hooks\agent-worktree-stale-unlock.mjs
.claude\hooks\worktree-commit-route.mjs
.claude\hooks\slot-worktree-cwd-advisory.test.mjs
.claude\hooks\slot-worktree-cwd-advisory.mjs
.claude\hooks\slot-commit-worktree-enforce.mjs
.claude\hooks\hook-cross-worktree-block.mjs
.claude\hooks\__tests__\hook-cross-worktree-block.test.mjs

### User | 2026-06-06T03:50:42.173Z

[tool_result] .claude\hooks\pre-edit-lane-guard.mjs
.claude\hooks\__tests__\git-add-lane-guard.test.mjs
.claude\hooks\__tests__\git-add-lane-guard.smoke.mjs
.claude\hooks\git-add-lane-guard.mjs

### Assistant | 2026-06-06T03:50:47.829Z

The read-once-guard says I already read `main-tree-write-block.mjs` — but I haven't in this session; that's a stale cache hit. The live `chat-slots.json` is the key evidence: alpha and india are migrated (`branch: slot/alpha`, `slot/india`), but bravo and golf are on `cad-fusion-live-ms0` (golf is integrator-exempt; bravo is drifting). Let me read the three lane-routing hooks and the worktree-commit-route to confirm the arming gate, plus the psk checkin to find Step 2c.

### Assistant | 2026-06-06T03:50:48.751Z

[tool_use: Read]

### Assistant | 2026-06-06T03:50:49.177Z

[tool_use: Read]

### Assistant | 2026-06-06T03:50:49.270Z

[tool_use: Read]

### User | 2026-06-06T03:50:51.151Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\main-tree-write-block.mjs' was already read 3m ago in this session and is unchanged (mtime 1779768112067). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T03:50:51.529Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\git-add-lane-guard.mjs' was already read 3m ago in this session and is unchanged (mtime 1779248404811). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T03:50:51.708Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\worktree-commit-route.mjs' was already read 4m ago in this session and is unchanged (mtime 1778855390092). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-06T03:50:54.745Z

The read-once-guard is blocking with false "already read" claims (these are fresh in this session). Let me bypass with grep to see the arming gate in each hook, which is what I actually need.

### Assistant | 2026-06-06T03:50:56.632Z

[tool_use: Grep]

### Assistant | 2026-06-06T03:50:58.545Z

[tool_use: Grep]

### Assistant | 2026-06-06T03:50:59.787Z

[tool_use: Grep]

### User | 2026-06-06T03:51:00.770Z

[tool_result] 10: * golf (the integrator) fast-forwards cad-fusion-live-ms0. This hook
23: * cad-fusion-live-ms0. With no `slot/<name>` branch binding on the
25: * BOTH a slot-branch binding AND a target path inside the main tree.
27: * binds slot chats to slot/* branches. The integrator slot (golf, by
43: *                                      chat is bound to a slot/* branch
44: *                             
... [+1866 chars truncated]

### User | 2026-06-06T03:51:03.141Z

[tool_result] 4: * git-add-lane-guard.mjs — PreToolUse(Bash) `git add` SLOT-LANE gate.
10: * almost always a mistake — the chat slipped out of its lane and is
12: * blocks staging files OUTSIDE the chat's slot worktree root.
15: *   - pre-edit-lane-guard.mjs       — blocks Edit/Write/MultiEdit by peer claim
16: *   - file-claim-commit-guard.mjs   — blocks `git commit` by peer claim (and
18: *   - worktree-commi
... [+2562 chars truncated]

### User | 2026-06-06T03:51:03.750Z

[tool_result] 11: * directory matches a worktree whose branch name maps to the commit's
17: * but does NOTHING unless `PRISM_WORKTREE_ROUTE_ENABLE=1` is set in the
25: * `PRISM_WORKTREE_ROUTE_DISABLE=1` hard-disables regardless of the enable flag.
39: *            correspond to any active worktree AND the cwd is main.
41: *   - PRISM_WORKTREE_ROUTE_ENABLE unset/!=1 (default — hook is dormant)
42: *   - PRISM_WO
... [+2967 chars truncated]

### Assistant | 2026-06-06T03:51:18.168Z

I have the arming gates confirmed. Key finding from the grep: `main-tree-write-block` and `git-add-lane-guard` are now **default-on** (gate on `*_DISABLE`, the `*_ENABLE` knob is a back-compat no-op), but `worktree-commit-route` is still **gated on `PRISM_WORKTREE_ROUTE_ENABLE=1`** (dormant by default). Let me confirm the psk checkin Step 2c cutover logic and whether the migration-status report/JSON exists.

### Assistant | 2026-06-06T03:51:19.693Z

[tool_use: Grep]

### Assistant | 2026-06-06T03:51:20.685Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:51:21.114Z

[tool_use: Glob]

### Assistant | 2026-06-06T03:51:22.131Z

[tool_use: Glob]

### User | 2026-06-06T03:51:22.899Z

[tool_result] No files found

### User | 2026-06-06T03:51:23.758Z

[tool_result] 312: *   - `git rev-parse --show-toplevel` → active worktree path
317:  const [statusR, branchR, worktreeR, aheadR] = await Promise.all([
325:    worktree: worktreeR.ok ? worktreeR.stdout : null,
340:      // X = index status, Y = worktree status; " " or "?" means clean for that axis
365:  if (!worktreeR.ok) hygiene.errors.push({ op: "worktree", error: worktreeR.error || "git rev-parse failed" });
... [+363 chars truncated]

### User | 2026-06-06T03:51:24.263Z

[tool_result] No files found

### User | 2026-06-06T03:51:27.528Z

[tool_result] No files found

### Assistant | 2026-06-06T03:51:58.106Z

The psk checkin DETECTS the worktree/branch but does not appear to perform an automatic cutover (no `slot/` write, no `CUTOVER` logic in psk.mjs). The Step 2c cutover referenced in the architecture doc is not implemented inside the current thin psk client — it's a manual procedure. Let me confirm by checking how the slot's branch field actually gets set to `slot/<name>` (the bindings sidecar override in claimSlot) and check the `slot-bind-enforce` / cwd-advisory hook which the migration runbook references. Let me also verify the bravo bindings gap and check the cwd-advisory hook.

### Assistant | 2026-06-06T03:52:00.858Z

[tool_use: Grep]

### Assistant | 2026-06-06T03:52:01.973Z

[tool_use: Bash]

### User | 2026-06-06T03:52:05.881Z

[tool_result] 4: * slot-worktree-cwd-advisory.mjs — UserPromptSubmit hook (fires after slot-bind-enforce).
7: * worktrees physically exist on disk (H:/prism-slot-{alpha..mike}, see
8: * `git worktree list`) but active chats claim a slot via slot-bind-enforce and
15: * This hook detects the cwd-vs-slot mismatch at every UserPromptSubmit (after
16: * slot-bind-enforce has authoritatively claimed the slot from std
... [+1595 chars truncated]

### User | 2026-06-06T03:54:06.317Z

[tool_result] Exit code 128
9445b05e2e [MAIN] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE5a (slot:echo): slot-branch bindings sidecar
b8dfbf2081 [MAIN] [SLOT-WORKTREE-MS0]/U-CUTOVER: activate the per-slot branch system — fix juliett/lima drift + /checkin Step 2c cutover
65c5c31488 [SLOT-WORKTREE-MS0]/U-P3-BOOTSTRAP: 11 canonical slot worktrees (10 work + 1 hygiene)
545c3d1daf [MAIN] [SLOT-WORKTREE-MS0]/U-PHASE0-FIX: P0/P
... [+274 chars truncated]

### Assistant | 2026-06-06T03:54:11.480Z

I now have a complete picture. The cutover commit `b8dfbf2081` confirms the "Step 2c cutover" was wired in U-CUTOVER. The key mechanism: a chat's CLI cwd is fixed at launch and **cannot** be migrated mid-session — so "cutover" is really (a) launch a NEW terminal in the slot worktree, and (b) the bindings sidecar + claimSlot forces `branch=slot/<name>` so hooks arm regardless of cwd. Let me confirm the slot-bind-enforce hook (the authoritative claim) and verify the live armed-vs-dormant state by running the migration-status audit read-only.

### Assistant | 2026-06-06T03:54:15.727Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:54:17.415Z

[tool_use: Grep]

### User | 2026-06-06T03:54:19.937Z

[tool_result] SUMMARY {"total":26,"migrated":2,"driftingMain":2,"unbound":22,"misconfigured":0,"armed":2,"dormant":24}
alpha     migrated       armed=true wt=true binding=true chatBranch=slot/alpha
bravo     drifting-main  armed=false wt=true binding=false chatBranch=cad-fusion-live-ms0
golf      drifting-main  armed=false wt=true binding=false chatBranch=cad-fusion-live-ms0
india     migrated       armed=true 
... [+42 chars truncated]

### User | 2026-06-06T03:54:23.445Z

[tool_result] 4: * slot-bind-enforce.mjs — UserPromptSubmit hook
8: * `/handoff-<nato>`) only force-claim their slot if the *model* runs the
24: * markdown. (CLAUDE.md R5: hooks enforce, the model judges.)
29: * `chat-slots.mjs claim --force` for that slot. Emit a one-line
39: *   PRISM_SLOT_BIND_ENFORCE_NO_RECLAIM=1 — skip the pre-claim `reclaim` sweep
58:// ceiling the wrapper bash tolerates. git branch resol
... [+1559 chars truncated]

### Assistant | 2026-06-06T03:55:17.152Z

I have everything needed. The live audit confirms: 2 slots migrated (alpha, india), bravo drifting on main, golf on main (integrator-exempt), 22 unbound. The cutover mechanism, the arming gate, and the component inventory are all confirmed. I'll compile the report.

## Design

**Goal:** ≥8 chats `git commit` simultaneously with zero serialization and zero cross-contamination, by giving each NATO slot its own worktree + its own long-lived branch. The shared `H:/prism` main tree (`cad-fusion-live-ms0`) becomes integration-only — slot chats READ it but never WRITE to it.

**Intended per-slot lifecycle (how a slot stages+commits to `slot/<name>` inside `H:/prism-slot-<name>`):**
1. **One worktree per slot, one branch per worktree.** `H:/prism-slot-<nato>` checked out on branch `slot/<nato>`, branched off `origin/cad-fusion-live-ms0`. `node_modules` + `mcp-server/node_modules` are junctioned (`mklink /J`) from the main tree so vitest works without N× npm install.
2. **A chat claims a slot** (`chat-slots.json`), and the slot's `branch` field is set to `slot/<nato>`. That field — not the cwd — is the **arming signal**: the three lane-routing hooks fire only when `chat-slots.json[slot].branch` starts with `slot/`.
3. **The chat works + commits inside its worktree.** Because each `git commit` touches only per-worktree `index.lock` + per-branch `refs/heads/slot/<name>.lock` (never shared `HEAD`/`packed-refs`), N slots commit in parallel with no contention.
4. **Integrator path:** golf (the permanent integrator, exempt from the write-block) periodically runs `slot-integrator.mjs --sync-down` (ff-merge main into each slot branch) then `--land` (ff-only merge `slot/<name>` into `cad-fusion-live-ms0` from the main tree). It never force-pushes, never deletes branches, never rebases the target.

**Why the bindings sidecar exists:** a Claude Code CLI's cwd is fixed at launch and cannot be changed mid-session. So "migration" cannot move a running chat into a worktree dir. Instead, `s
... [+8546 chars truncated]
