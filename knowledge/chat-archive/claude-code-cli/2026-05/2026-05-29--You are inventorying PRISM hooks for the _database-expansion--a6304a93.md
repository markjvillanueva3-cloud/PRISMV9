---
type: "chat-session"
source: "claude-code-cli"
session_id: "a6304a93-9f8f-4616-b0a9-eaf94b272d80"
title: "You are inventorying PRISM hooks for the \"database-expansion\" domain (slot:julie"
date: "2026-05-29"
first_ts: "2026-05-29T13:30:06.835Z"
last_ts: "2026-05-29T13:31:57.687Z"
cwd: "H:\\prism-slot-juliett"
messages: 58
user_msgs: 27
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-ad27a1522b2e565a6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:58"
---

# You are inventorying PRISM hooks for the "database-expansion" domain (slot:julie

> **claude-code-cli** | 2026-05-29 | 58 msgs (27 user / 31 assistant) | cwd: H:\prism-slot-juliett
> Raw: `H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-ad27a1522b2e565a6.jsonl`

## Transcript

### User | 2026-05-29T13:30:06.835Z

You are inventorying PRISM hooks for the "database-expansion" domain (slot:juliett). MCP server is DOWN — use Glob + Grep + Read only.

TASK: Find hooks (.mjs) related to persistence/state-writing/coordination. Keywords: atomic, json, schema, migration, lock, claim, ledger, registry, coordination, sqlite, qdrant, memory, mirror, write-guard, snapshot.

Search dir: `H:/prism/.claude/hooks/*.mjs` (and `H:/prism/.claude/hooks/**/*.mjs`).

Do this:
1. Glob the hooks dir.
2. For candidates matching keywords, Read the file header comment to determine the event (PreToolUse / PostToolUse / UserPromptSubmit / Stop / SessionStart) and 1-line purpose.
3. Return the 10-18 strongest matches relevant to persistence/state/coordination/atomic-writes.

RETURN FORMAT (≤25 lines, markdown):
## DB/persistence hooks
- `<hook-name>.mjs` [<event>] — <purpose>

Conclusions only. Note any hook that guards file-claims or atomic writes specifically — those are highest value for juliett.

### Assistant | 2026-05-29T13:30:16.350Z

I'll inventory the PRISM hooks for persistence/state-writing/coordination in the database-expansion domain. Let me start by globbing the hooks directory.

### Assistant | 2026-05-29T13:30:16.606Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:30:16.612Z

[tool_use: Glob]

### User | 2026-05-29T13:30:24.221Z

[tool_result] H:/prism/.claude/hooks\agent-boundary-guard.mjs
H:/prism/.claude/hooks\agent-pid-tracker.mjs
H:/prism/.claude/hooks\agent-registry-load.mjs
H:/prism/.claude/hooks\agent-rules-inject.mjs
H:/prism/.claude/hooks\agent-util-log.mjs
H:/prism/.claude/hooks\agent-vs-direct.mjs
H:/prism/.claude/hooks\agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks\aggressive-killer-stop.mjs
H:/prism/.claude/hooks\a
... [+4754 chars truncated]

### User | 2026-05-29T13:30:25.082Z

[tool_result] H:/prism/.claude/hooks\agent-boundary-guard.mjs
H:/prism/.claude/hooks\agent-pid-tracker.mjs
H:/prism/.claude/hooks\agent-registry-load.mjs
H:/prism/.claude/hooks\agent-rules-inject.mjs
H:/prism/.claude/hooks\agent-util-log.mjs
H:/prism/.claude/hooks\agent-vs-direct.mjs
H:/prism/.claude/hooks\agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks\aggressive-killer-stop.mjs
H:/prism/.claude/hooks\a
... [+4754 chars truncated]

### Assistant | 2026-05-29T13:30:27.491Z

Now let me search for hooks matching the persistence/state keywords using grep.

### Assistant | 2026-05-29T13:30:28.518Z

[tool_use: Grep]

### User | 2026-05-29T13:30:38.137Z

[tool_result] Found 50 files limit: 50
H:\prism\.claude\hooks\foxtrot-mill-awareness-inject.test.mjs
H:\prism\.claude\hooks\foxtrot-mill-awareness-inject.mjs
H:\prism\.claude\hooks\india-awareness-inject.mjs
H:\prism\.claude\hooks\post-nc-dialect-guard.mjs
H:\prism\.claude\hooks\cad-step-lint-guard.mjs
H:\prism\.claude\hooks\delta-cad-awareness-inject.mjs
H:\prism\.claude\hooks\charlie-quoting-awareness-inject.
... [+2251 chars truncated]

### Assistant | 2026-05-29T13:30:45.271Z

Good signal. Let me now read the header comments from the most promising candidates to identify their event types and purposes.

### Assistant | 2026-05-29T13:30:45.718Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:45.913Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:46.333Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:46.548Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:46.791Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:46.956Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:47.209Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:47.582Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:47.798Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:48.153Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:48.465Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:48.638Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:49.069Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:49.268Z

[tool_use: Read]

### Assistant | 2026-05-29T13:30:49.806Z

[tool_use: Read]

### User | 2026-05-29T13:31:13.360Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * PreCompact hook — flush this terminal's active claims to status=compacted
5	 * so concurrent sessions know they're in-flight during compaction, not stale.
6	 *
7	 * Paired with claim-registry-surface.mjs which calls compact-restore on
8	 * SessionStart to flip them back to active.
9	 *
10	 * continueOnError: true.
11	 */
12	
13	import { spawnSync } fr
... [+511 chars truncated]

### User | 2026-05-29T13:31:13.961Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * Stop / SessionEnd hook — release this terminal's claims so peers can
5	 * pick them up without waiting for the staleness TTL.
6	 *
7	 * If this is a clean stop, claims go away. If the process crashed, the
8	 * 2h staleness TTL in roadmap-claim-registry.mjs gc will eventually
9	 * expire them.
10	 *
11	 * continueOnError: true.
12	 */
13	
14	import { s
... [+503 chars truncated]

### User | 2026-05-29T13:31:14.565Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * SessionStart hook — surfaces other sessions' active roadmap claims in
5	 * boot context so this session doesn't grab the same milestone.
6	 *
7	 * Also triggers compact-restore for this terminal's previously-compacted
8	 * claims so they flip back to active.
9	 *
10	 * continueOnError: true — never fails the session.
11	 */
12	
13	import { spawnSync }
... [+514 chars truncated]

### User | 2026-05-29T13:31:15.040Z

[tool_result] 1	// tier: T0
2	/**
3	 * claim-required.mjs — Phase 1 Tier 5D
4	 *
5	 * PreTool hook that blocks milestone/unit edits without a claim.
6	 * Prevents concurrent work conflicts on the same roadmap unit.
7	 */
8	
9	import * as fs from "fs";
10	import * as path from "path";
11	
12	const CLAIMS_PATH = "mcp-server/data/state/active-claims.json";
13	const ROADMAP_INDEX_PATH = "mcp-server/data/roadmap-ind
... [+661 chars truncated]

### User | 2026-05-29T13:31:15.854Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * git-lock-sweeper.mjs — HS-02 mid-session stale-lock cleanup.
5	 *
6	 * Phase 1 (HS-02, 2026-05-12): Stop/UserPromptSubmit sweep with 5/60 min ages.
7	 * Phase 2 (DEV-VELOCITY-AUTOTRIGGER-MS0/U-C2, 2026-05-12): + PreToolUse:Bash
8	 * arm with retry-with-backoff and a shorter 30s min-age when fired immediately
9	 * before a git command. Rationale: a 30-
... [+1203 chars truncated]

### User | 2026-05-29T13:31:15.961Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * hook-registry-regen.mjs — PostToolUse:Edit|Write|MultiEdit (HOOK-SYNERGY-MS0 / U-H1 step-4).
5	 *
6	 * When an edit touches a `.claude/hooks/**.mjs` (a hook source OR a `bundles/*.mjs` wrapper)
7	 * or a `.claude/settings*.json` layer, fire-and-forget a detached
8	 * `node scripts/build-hook-registry.mjs` so `state/shared/HOOK_REGISTRY.json` stays cur
... [+1380 chars truncated]

### User | 2026-05-29T13:31:16.911Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * chat-state-isolator.mjs — SessionStart hook
5	 *
6	 * Event: SessionStart
7	 *
8	 * Creates chat-specific state directories to prevent cross-chat conflicts:
9	 * 1. Creates isolated state directory for this chat session
10	 * 2. Sets environment hints for other hooks
11	 * 3. Cleans up stale chat directories (>48h old)
12	 *
13	 * State isolation prev
... [+528 chars truncated]

### User | 2026-05-29T13:31:18.066Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * checkpoint-auto-trigger.mjs — Context Retention Hook
5	 * =====================================================
6	 *
7	 * PostToolUse hook that tracks edit counts and auto-triggers
8	 * ContextCheckpointEngine at 15/25/35 edit thresholds.
9	 *
10	 * FIRES ON: PostToolUse(Edit|Write|MultiEdit)
11	 *
12	 * Behavior:
13	 *   1. Increment edit counter in 
... [+606 chars truncated]

### User | 2026-05-29T13:31:19.353Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * claude-md-mirror.mjs — SessionStart: mirror H:\.claude\CLAUDE.md → ~/.claude/CLAUDE.md.
5	 *
6	 * H: is canonical. If ~/.claude/CLAUDE.md differs from the master, back up the C: copy
7	 * and overwrite from H:. This turns the per-PC global CLAUDE.md into a view of the
8	 * shared master — any edit to H:\.claude\CLAUDE.md becomes active on both PCs on 
... [+770 chars truncated]

### User | 2026-05-29T13:31:19.606Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// U-GALAXY-MS1-B1 (2026-05-27, slot:alpha — sierra's territory, alpha-skeleton ship):
4	// HMEMV04 Obsidian bidirectional vault — H: → C: reverse-mirror per
5	// SCOPE-EXPANSION §Q6 #1 (cyrilXBT bidirectional vault, biggest dormant-X-article miss).
6	//
7	// PostToolUse hook that fires when a Write/Edit/MultiEdit lands under
8	// H:/prism/knowledge/memories/*
... [+1220 chars truncated]

### User | 2026-05-29T13:31:20.433Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * c-to-h-mirror.mjs — PostToolUse hook
5	 *
6	 * After any Write/Edit/MultiEdit touches a CLI-owned file on C:\Users\*\.claude\,
7	 * mirror it to H:\.claude\ so the portable drive stays canonical.
8	 *
9	 * Mirrored ROOT files: settings.json, settings.local.json, .mcp.json, CLAUDE.md, keybindings.json
10	 * Mirrored SUBDIRS:    commands/, hooks/, agent
... [+996 chars truncated]

### User | 2026-05-29T13:31:21.007Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * compaction-survival-auto.mjs — PostToolUse hook
5	 *
6	 * Automatically records important context to CompactionSurvivalEngine
7	 * so critical info survives compaction.
8	 */
9	
10	import * as fs from 'fs';
11	
12	function readStdinSafe() {
13	  try {
14	    if (process.stdin.isTTY) return "";
15	    return fs.readFileSync(0, "utf-8");
16	  } catch {

... [+319 chars truncated]

### User | 2026-05-29T13:31:21.577Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * Decision Capture — PostToolUse Hook
5	 *
6	 * Prompts for decision rationale on significant choices:
7	 * - New file creation (architecture decisions)
8	 * - Major edits (approach decisions)
9	 * - Dependency changes (tool decisions)
10	 */
11	
12	import { readFileSync, writeFileSync, existsSync } from 'node:fs';
13	
14	const DECISION_LOG_PATH = 'H:/p
... [+682 chars truncated]

### User | 2026-05-29T13:31:21.701Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * SessionStart hook — surfaces Task-tool agent registry (AGENT_REGISTRY.json)
5	 * freshness in boot context so prism_ai { action: "ai_agr_match" } is
6	 * known to be available for routing prompts to appropriate subagents.
7	 *
8	 * Phase 0.17 U-PLG1 runtime seed.
9	 *
10	 * Exits 0 on any failure (continueOnError: true contract).
11	 */
12	
13	import 
... [+879 chars truncated]

### User | 2026-05-29T13:31:23.381Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * Bash Result Cache — PreToolUse Hook
5	 *
6	 * Blocks duplicate Bash executions within a session for a narrow whitelist
7	 * of read-only, idempotent commands. Saves tokens on repeat `git log`,
8	 * `git diff`, `ls`, `wc`, `stat`-type probes that already returned in this
9	 * session.
10	 *
11	 * Cache key: sessionId + normalized command + cwd
12	 *
13
... [+777 chars truncated]

### Assistant | 2026-05-29T13:31:26.005Z

Now let me read a few more candidates to get a comprehensive inventory.

### Assistant | 2026-05-29T13:31:26.468Z

[tool_use: Read]

### Assistant | 2026-05-29T13:31:26.886Z

[tool_use: Read]

### Assistant | 2026-05-29T13:31:27.398Z

[tool_use: Read]

### Assistant | 2026-05-29T13:31:27.766Z

[tool_use: Read]

### Assistant | 2026-05-29T13:31:27.772Z

[tool_use: Read]

### Assistant | 2026-05-29T13:31:28.486Z

[tool_use: Read]

### Assistant | 2026-05-29T13:31:28.574Z

[tool_use: Read]

### Assistant | 2026-05-29T13:31:28.849Z

[tool_use: Read]

### User | 2026-05-29T13:31:41.290Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * auto-record-tool-call.mjs — PostToolUse hook
5	 *
6	 * Automatically records every tool call to ToolCallParallelizationEngine
7	 * so /parallel-audit has data to analyze. Records both single calls and
8	 * detects parallel-batch context (multiple tool_use entries in same message).
9	 *
10	 * Non-blocking: never denies a call, only observes.
11	 */
12	
... [+423 chars truncated]

### User | 2026-05-29T13:31:41.460Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * auto-precompact-watchdog.mjs — UserPromptSubmit hook
5	 *
6	 * Belt-and-suspenders for auto-compact. Claude Code's PreCompact hook only
7	 * fires reliably on user-initiated `/compact`; an auto-compact triggered by
8	 * the model approaching its context limit may skip PreCompact depending on
9	 * the harness build. Without a fresh handoff at that mome
... [+893 chars truncated]

### User | 2026-05-29T13:31:41.766Z

[tool_result] 1	// tier: T3
2	/**
3	 * corpus-integrity.mjs — CADCAM-DAGI-MS0/U-DAGI03 guard hook
4	 *
5	 * PostToolUse(Write|Edit|MultiEdit) hook that protects the CAD training
6	 * corpus pipeline. It runs in two modes:
7	 *
8	 *   1. Engine-surface check — when CADCorpusIngesterEngine.ts is edited,
9	 *      assert it still exports the five public methods the dispatcher
10	 *      and trainers depend on: cla
... [+679 chars truncated]

### User | 2026-05-29T13:31:41.975Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop-obsidian-memory-feed.mjs — Stop Hook
5	 * =========================================
6	 *
7	 * Dedicated, RELIABLE auto-memory -> Obsidian feed.
8	 *
9	 * Spawns `obsidian-memory-sync.mjs --quiet` detached on Stop so every memory
10	 * file written to C:/Users/<u>/.claude/projects/H--prism/memory/*.md gets
11	 * mirrored into the H: Obsidian vault
... [+846 chars truncated]

### User | 2026-05-29T13:31:42.570Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * awareness-snapshot-inject.mjs — SessionStart injector
5	 *
6	 * OBSIDIAN-PRISM-OS-MS0/U-AWARENESS-INJECT.
7	 *
8	 * Reads state/shared/AWARENESS-SNAPSHOT.md (generated by
9	 * scripts/awareness-snapshot.mjs — companion to /awareness-snapshot
10	 * skill) and emits a compact ~10-line digest as SessionStart
11	 * additionalContext so every fresh chat kn
... [+792 chars truncated]

### User | 2026-05-29T13:31:43.834Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * wiki-recall-on-write.mjs — PostToolUse hook for Write|Edit|MultiEdit on vault files
5	 *
6	 * Mirror of recall-counter-track.mjs (which only fires on Read) for the
7	 * write side of the recall signal: closes OBSIDIAN-INTELLIGENCE-MS3 A2.
8	 * Without this, a memo / wiki entry that's only ever WRITTEN-TO (never
9	 * read back in the same session) has 
... [+801 chars truncated]

### User | 2026-05-29T13:31:43.854Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop-wiki-stub-stager.mjs — Stop hook (T4, fire-and-forget)
5	 * ============================================================
6	 *
7	 * MEMORY-WIKI-OPTIMIZATION-MS0 / U-MWO07 (slot:bravo 2026-05-26). Shift-D
8	 * implementation: on a successful /loop tick this session, stage a Hermes-
9	 * Dreaming receipt bundle proposing a NEW wiki entry under
10	 *
... [+907 chars truncated]

### User | 2026-05-29T13:31:44.546Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * build-state-inject.mjs — UserPromptSubmit + SessionStart hook.
5	 *
6	 * Permanent-memory anchor for "what's already built / what needs wiring /
7	 * what's still pending / what's awaiting frontend merge". Reads the
8	 * compact BUILD_STATE.json snapshot generated by
9	 * scripts/build-state-snapshot.mjs and injects a token-bounded summary
10	 * (≤500
... [+834 chars truncated]

### Assistant | 2026-05-29T13:31:57.687Z

Based on my inventory of the PRISM hooks directory, here are the 16 strongest matches for persistence/state-writing/coordination related to the database-expansion domain (slot:juliett):

## DB/persistence hooks

- `claim-registry-precompact.mjs` [PreCompact] — Flush active claims to compacted status for concurrent session awareness during context compaction
- `claim-registry-release.mjs` [Stop/SessionEnd] — Release terminal claims so peers can pick them up without staleness TTL wait
- `claim-registry-surface.mjs` [SessionStart] — Surface other sessions' active roadmap claims + restore this terminal's previously-compacted claims
- `claim-required.mjs` [PreToolUse] — Block milestone/unit edits without a claim; atomic write-guard preventing concurrent work conflicts
- `git-lock-sweeper.mjs` [Stop/PreToolUse:Bash] — Mid-session stale-lock cleanup with retry-with-backoff; guards against NTFS handle races on lock files
- `hook-registry-regen.mjs` [PostToolUse:Edit|Write] — Keep HOOK_REGISTRY.json + STOP_HOOK_REGISTRY.json current via detached builder; schema integrity
- `chat-state-isolator.mjs` [SessionStart] — Create isolated chat state directories; prevent cross-chat conflicts via manifest file
- `checkpoint-auto-trigger.mjs` [PostToolUse:Edit|Write] — Auto-trigger context checkpoints at edit thresholds; atomic snapshot writes to CHECKPOINT_TRACKER.json
- `claude-md-mirror.mjs` [SessionStart] — Mirror H:\.claude\CLAUDE.md → ~/.claude/CLAUDE.md; canonical state sync across machines
- `c-to-h-mirror.mjs` [PostToolUse:Write|Edit] — Mirror C: CLI files → H: portable drive; keep .claude settings in lock-step
- `h-to-c-obsidian-mirror.mjs` [PostToolUse:Write|Edit] — Reverse-mirror H: Obsidian vault → C: source-of-truth; bidirectional memory sync with SHA-256 dedup
- `auto-precompact-watchdog.mjs` [UserPromptSubmit] — Belt-and-suspenders for auto-compact; idempotent atomic handoff writes to precompact state
- `auto-record-tool-call.mjs` [PostToolUse] — Record tool calls to To
... [+713 chars truncated]
