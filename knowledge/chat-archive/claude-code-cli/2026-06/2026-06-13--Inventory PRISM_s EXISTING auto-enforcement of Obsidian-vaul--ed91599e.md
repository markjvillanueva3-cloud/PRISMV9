---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Inventory PRISM's EXISTING auto-enforcement of Obsidian-vault utilization for Cl"
date: "2026-06-13"
first_ts: "2026-06-13T14:33:14.620Z"
last_ts: "2026-06-13T14:49:08.395Z"
cwd: "H:\\prism-slot-sierra"
messages: 68
user_msgs: 29
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/workflows/wf_71067519-f1f/agent-aa389becd73b9b8c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Inventory PRISM's EXISTING auto-enforcement of Obsidian-vault utilization for Cl

> **claude-code-cli** | 2026-06-13 | 68 msgs (29 user / 39 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/workflows/wf_71067519-f1f/agent-aa389becd73b9b8c8.jsonl`

## Transcript

### User | 2026-06-13T14:33:14.620Z

Inventory PRISM's EXISTING auto-enforcement of Obsidian-vault utilization for Claude Code sessions (repo root H:/prism), and classify EACH mechanism as ADVISORY (injects context / suggests, no blocking) vs ENFORCED (blocks/requires the behavior). The operator wants "codified AUTO-ENFORCEMENT" of vault utilization (recall-before-derive + persist-after).

READ IN FULL (Glob/Grep to locate, then Read):
- UserPromptSubmit recall injectors in .claude/hooks/: master-index-precheck-inject.mjs, wiki-precheck-inject.mjs (or wiki-precheck-inject), tribal-by-domain-inject.mjs, the Obsidian vault precheck hook (Glob .claude/hooks/*obsidian*vault* and *vault-precheck*), prompt-context-inject.mjs, and any "brain-recall" hook.
- The persist-after hook: .claude/hooks/stop-obsidian-memory-feed.mjs (full).
- scripts/lib/task-substrate-router.mjs and scripts/lib/cag-router.mjs (full).
- How these are wired: read H:/.claude/settings.json (the hooks arrays for UserPromptSubmit, SessionStart, Stop) and note which of the above are actually wired.

PRODUCE plain-text:
- A table: mechanism | file | hook event | ADVISORY-or-ENFORCED | what it does.
- The GAPS: where vault utilization is merely suggested/injected but NOT enforced. Specifically: is there any hook that BLOCKS a session from deriving an answer without first recalling from the vault? Is persist-after actually guaranteed or best-effort? What would "enforcement" look like for each.
Cite file:line. Plain text only.

### Assistant | 2026-06-13T14:33:17.925Z

I'll systematically locate and read all the relevant files. Let me start with parallel searches.

### Assistant | 2026-06-13T14:33:18.375Z

[tool_use: Glob]

### Assistant | 2026-06-13T14:33:18.881Z

[tool_use: Glob]

### User | 2026-06-13T14:33:49.882Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T14:33:49.883Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T14:33:52.948Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:33:53.350Z

[tool_use: Bash]

### User | 2026-06-13T14:35:26.468Z

[tool_result] Exit code 255

### User | 2026-06-13T14:35:40.664Z

[tool_result] ARCHITECTURE.json
CLAUDE.md
CLAUDE.md.bak-r14
RTK.md
_backups/
agents/
agents.pre-junction-20260422-258290/
archived-commands/
backups/
bin/
cache/
commands/
commands-archive/
commands.pre-junction-20260422-258290/
dashboard.json
file-history/
helpers/
history.jsonl
hookify-block-bash-cat-file.local.md
hookify-block-bash-find.local.md
hookify-block-bash-grep-rg.local.md
hookify-block-bash-head-tai
... [+16723 chars truncated]

### Assistant | 2026-06-13T14:35:43.246Z

Now let me read the hooks directory and settings files.

### Assistant | 2026-06-13T14:35:44.102Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:35:44.363Z

[tool_use: Read]

### User | 2026-06-13T14:35:59.125Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PRISM_FLEET_REAPER_DISABLE": "0",
5	    "PRISM_GOLF_GUARDIAN_DISABLE": "0",
6	    "PRISM_GALAXY_MEMORY_OBSIDIAN_MIRROR": "1",
7	    "PRISM_OBSIDIAN_LIVE": "1",
8	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/Wi
... [+8337 chars truncated]

### User | 2026-06-13T14:36:17.012Z

[tool_result] HOOK-TYPE-GUIDE.md
ai-system-router-inject.mjs*
alpha-token-domain-awareness-inject.mjs*
architecture-scanner.py*
archived/
auto-approve.sh*
configchange-guard.sh*
duplication-guard-stop.mjs*
generate-dashboard.py*
health-scanner.py*
instructions-loaded-handler.sh*
lathe-gcode-lint-guard.mjs*
lib/
logical-build-hook.mjs
node_modules/
plugin-path-fixer.mjs*
postcompact-handler.sh*
posttooluse-failu
... [+550 chars truncated]

### Assistant | 2026-06-13T14:36:19.374Z

Let me continue reading the settings.json and then read all the hook files in parallel.

### Assistant | 2026-06-13T14:36:20.140Z

[tool_use: Read]

### Assistant | 2026-06-13T14:36:20.832Z

[tool_use: Bash]

### User | 2026-06-13T14:36:45.309Z

[tool_result] 200	            "timeout": 8000
201	          },
202	          {
203	            "type": "command",
204	            "command": "\"H:/.claude/bin/portable-node\" H:/.claude/hooks/plugin-path-fixer.mjs",
205	            "timeout": 3000
206	          },
207	          {
208	            "type": "command",
209	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/git-health-gua
... [+11649 chars truncated]

### User | 2026-06-13T14:37:33.570Z

[tool_result] AGI_INFRA_PHASE_A_WIRING.md
HOOK-TYPE-GUIDE.md
HOOK_DIGEST.md
README.md
__tests__/
_disabled/
_envelope.mjs*
_rpc-shim.mjs*
_rpc-shim.test.mjs
activate-before-build-precheck.mjs*
activate-before-build-precheck.test.mjs
active-chat-priority-boost.mjs*
active-chat-priority-decay.mjs*
agent-boundary-guard.mjs*
agent-fanout-pressure-gate.mjs*
agent-fanout-pressure-gate.test.mjs
agent-pid-tracker.mjs*

... [+23430 chars truncated]

### Assistant | 2026-06-13T14:37:37.367Z

Now let me read all the key vault-related hook files in parallel.

### Assistant | 2026-06-13T14:37:38.832Z

[tool_use: Read]

### Assistant | 2026-06-13T14:37:39.063Z

[tool_use: Read]

### Assistant | 2026-06-13T14:37:39.296Z

[tool_use: Read]

### Assistant | 2026-06-13T14:37:39.708Z

[tool_use: Read]

### Assistant | 2026-06-13T14:37:39.840Z

[tool_use: Read]

### User | 2026-06-13T14:38:23.982Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// tribal-by-domain-inject.mjs — UserPromptSubmit
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
6	//
7	// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
8	// already biases wiki-entry ranking toward the active chat-slot's milestone
9	// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
10	// knowledge — 
... [+20952 chars truncated]

### User | 2026-06-13T14:38:24.202Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * obsidian-vault-precheck-inject.mjs — UserPromptSubmit
5	 *
6	 * HIGH-ROI-TS2/iter1 (audit-remainder loop, 2026-05-22). Closes Finding F2
7	 * from OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md.
8	 *
9	 * Surfaces user-written Obsidian vault notes (decisions/errors/research/
10	 * specs/claude-md/lint-reports/code-index/data-index/Materials) that match
1
... [+4894 chars truncated]

### User | 2026-06-13T14:38:24.203Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+17015 chars truncated]

### User | 2026-06-13T14:38:24.211Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+39411 chars truncated]

### User | 2026-06-13T14:38:24.212Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * obsidian-precheck-inject.mjs — UserPromptSubmit hook
5	 *
6	 * BACKEND-DEV-LOOP / U-OBSIDIAN-PRECHECK (slot delta, 2026-05-18).
7	 *
8	 * Sibling to wiki-precheck-inject.mjs: scans the 644+ Obsidian memory files
9	 * under knowledge/memories/{feedback,reference,project,user}/ on every
10	 * UserPromptSubmit. Returns BM25-lite top-K hits as additionalC
... [+12455 chars truncated]

### Assistant | 2026-06-13T14:38:28.925Z

Now let me read the stop/persist hook and the prompt-context-inject and recall-first-advisory hooks, plus the UserPromptSubmit wiring in settings.json.

### Assistant | 2026-06-13T14:38:29.684Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:30.090Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:30.517Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:30.834Z

[tool_use: Read]

### User | 2026-06-13T14:39:53.201Z

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
... [+7033 chars truncated]

### User | 2026-06-13T14:39:58.633Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * prompt-context-inject.mjs — UserPromptSubmit hook (PRISM-STAB-MS0/U-C2).
5	 *
6	 * Reads the pre-aggregated bundle written by the context-bundle daemon
7	 * (prism-awareness-bundle.mjs --daemon) and emits ONE compact injection
8	 * block per prompt. Replaces the per-prompt fork storm of 24 individual
9	 * injectors that each computed the same context 
... [+6160 chars truncated]

### User | 2026-06-13T14:40:01.029Z

[tool_result] 1	#!/usr/bin/env node
2	// recall-first-advisory.mjs — PreToolUse:Read advisory (U-GCF-RECALL-FIRST). Pure thin wrapper over the
3	// shipped lib; never blocks. Knobs: PRISM_GCF_RECALL_DISABLE=1, PRISM_GCF_RECALL_MIN_BYTES=N.
4	import { recallFirst, recordRecallSavings } from "../../scripts/lib/recall-first.mjs";
5	if (process.env.PRISM_GCF_RECALL_DISABLE === "1") { process.stdout.write(JSON.strin
... [+593 chars truncated]

### User | 2026-06-13T14:40:10.654Z

[tool_result] 500	      }
501	    ],
502	    "Stop": [
503	      {
504	        "matcher": "",
505	        "hooks": [
506	          {
507	            "type": "command",
508	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/goal-complete-gate.mjs",
509	            "timeout": 3000
510	          },
511	          {
512	            "type": "command",
513	            "command": "\"H:/.cla
... [+12470 chars truncated]

### Assistant | 2026-06-13T14:40:14.000Z

Now let me check the UserPromptSubmit wiring and check for the memory-index-precheck-inject and brain-recall hooks.

### Assistant | 2026-06-13T14:40:15.325Z

[tool_use: Grep]

### Assistant | 2026-06-13T14:40:15.617Z

[tool_use: Read]

### Assistant | 2026-06-13T14:40:15.855Z

[tool_use: Read]

### User | 2026-06-13T14:42:41.861Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// memory-index-precheck-inject.mjs — UserPromptSubmit injector (T2, advisory).
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: surfaces top-K direct hits over
6	// the Obsidian memory vault (~492 files at audit time) when a user prompt
7	// has 2+ content tokens. Closes the gap left by master-index-precheck-inject
8	// (system-graph node search; only fin
... [+3069 chars truncated]

### User | 2026-06-13T14:42:42.042Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop-obsidian-memory-extract.mjs — Stop Hook
5	 * =============================================
6	 *
7	 * Extracts session learnings and writes to Obsidian vault.
8	 * Uses Ollama (FREE) to analyze the session and extract:
9	 * - Patterns that worked
10	 * - Mistakes to avoid
11	 * - Decisions made
12	 * - Context for next session
13	 *
14	 * This com
... [+2106 chars truncated]

### User | 2026-06-13T14:42:46.078Z

[tool_result] 1372-      }
1373-    ],
1374:    "UserPromptSubmit": [
1375-      {
1376-        "matcher": "",

### Assistant | 2026-06-13T14:42:48.899Z

Now let me read the UserPromptSubmit section of settings.json to see which vault hooks are actually wired.

### Assistant | 2026-06-13T14:42:49.508Z

[tool_use: Read]

### User | 2026-06-13T14:44:01.925Z

[tool_result] 1374	    "UserPromptSubmit": [
1375	      {
1376	        "matcher": "",
1377	        "hooks": [
1378	          {
1379	            "type": "command",
1380	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/rename-window-intercept.mjs",
1381	            "timeout": 6000
1382	          },
1383	          {
1384	            "type": "command",
1385	            "command": "\"$
... [+10448 chars truncated]

### Assistant | 2026-06-13T14:44:05.769Z

Now let me check whether wiki-precheck-inject and obsidian-precheck-inject are wired to UserPromptSubmit, and check the memory-rag-inject and wiki-recall-on-write hooks.

### Assistant | 2026-06-13T14:44:07.779Z

[tool_use: Grep]

### Assistant | 2026-06-13T14:44:08.170Z

[tool_use: Read]

### User | 2026-06-13T14:45:27.739Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * wiki-recall-on-write.mjs — PostToolUse hook for Write|Edit|MultiEdit on vault files
5	 *
6	 * Mirror of recall-counter-track.mjs (which only fires on Read) for the
7	 * write side of the recall signal: closes OBSIDIAN-INTELLIGENCE-MS3 A2.
8	 * Without this, a memo / wiki entry that's only ever WRITTEN-TO (never
9	 * read back in the same session) has 
... [+2171 chars truncated]

### User | 2026-06-13T14:45:31.465Z

[tool_result] 1272-            "type": "command",
1273:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/recall-first-advisory.mjs",
1274-            "timeout": 1500
--
1714-            "type": "command",
1715:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/h-to-c-obsidian-mirror.mjs",
1716-            "timeout": 3000
--
1864-            "type": "com
... [+151 chars truncated]

### Assistant | 2026-06-13T14:45:35.171Z

Now let me check whether wiki-precheck-inject and obsidian-precheck-inject are wired in settings.json UserPromptSubmit, and look at the env flags controlling them.

### Assistant | 2026-06-13T14:45:36.370Z

[tool_use: Grep]

### Assistant | 2026-06-13T14:45:36.910Z

[tool_use: Read]

### User | 2026-06-13T14:46:55.207Z

[tool_result] No matches found

### User | 2026-06-13T14:46:57.706Z

[tool_result] 1625	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/token-budget-gate.mjs",
1626	            "timeout": 2000
1627	          },
1628	          {
1629	            "type": "command",
1630	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/critical-memory-compact-nudge.mjs",
1631	            "timeout": 3000
1632	          },
1633	          
... [+3596 chars truncated]

### Assistant | 2026-06-13T14:47:01.277Z

Now let me check the env flags that control the wired hooks and check for the cag-router-inject and memory-rag-inject behavior.

### Assistant | 2026-06-13T14:47:01.693Z

[tool_use: Read]

### Assistant | 2026-06-13T14:47:02.072Z

[tool_use: Read]

### Assistant | 2026-06-13T14:47:04.076Z

[tool_use: Grep]

### User | 2026-06-13T14:47:44.334Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// .claude/hooks/cag-router-inject.mjs
4	//
5	// TOKEN-SAVINGS-PIVOT/U-CAG-HOOK-INJECT (sierra iter28 2026-05-26):
6	// UserPromptSubmit hook that classifies the operator's prompt as
7	// COLD / HOT / HYBRID via scripts/lib/cag-router.mjs and writes a route
8	// decision sidecar that downstream static-doctrine injectors
9	// (master-index-precheck-inject, memo
... [+1726 chars truncated]

### User | 2026-06-13T14:47:53.980Z

[tool_result] 55:    "PRISM_MASTER_INDEX_INJECT": "1",
56:    "PRISM_MEMORY_INDEX_INJECT": "1",
57:    "PRISM_WIKI_PRECHECK_INJECT": "1",
63:    "PRISM_MEMORY_RAG_DISABLED": "1",
64:    "PRISM_PROMPT_CONTEXT_INJECT_OFF": "1",
65:    "PRISM_OBSIDIAN_VAULT_PRECHECK_DISABLE": "0",

### User | 2026-06-13T14:47:54.921Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * memory-rag-inject.mjs — UserPromptSubmit hook
5	 *
6	 * When the user prompt contains memory-recall keywords (remember, recall,
7	 * previous, last time, earlier, prior, before, context from), surface the
8	 * most relevant entries from the H-drive vault (knowledge/memories/) and
9	 * inject them as additional context.
10	 *
11	 * INTEL-OLLAMA-OBSIDIA
... [+2463 chars truncated]

### Assistant | 2026-06-13T14:49:08.395Z

I now have all the information needed. Here is the complete plain-text report.

---

PRISM OBSIDIAN-VAULT UTILIZATION ENFORCEMENT INVENTORY
=======================================================

PART 1 — MECHANISM TABLE
-------------------------

Mechanism                        | File (relative to H:/prism)                              | Hook Event          | Class    | What It Does
---------------------------------|-----------------------------------------------------------|---------------------|----------|-----------------------------------------------------------
master-index-precheck-inject     | .claude/hooks/master-index-precheck-inject.mjs            | UserPromptSubmit    | ADVISORY | BM25-lite + lexical rerank over system-graph.json (110K nodes, pre-joined wiki/memory). Injects top-K "graph already knows X" banner. Always exits 0. Controlled by PRISM_MASTER_INDEX_INJECT (=1 in env). Wired: settings.json line 1420.
memory-index-precheck-inject     | .claude/hooks/memory-index-precheck-inject.mjs            | UserPromptSubmit    | ADVISORY | BM25-lite over knowledge/memories/ vault (~492 files). Top-K hits injected as additionalContext. Throttled 60s same-prompt. Always exits 0. Controlled by PRISM_MEMORY_INDEX_INJECT (=1 in env). Wired: settings.json line 1520.
wiki-precheck-inject             | .claude/hooks/wiki-precheck-inject.mjs                    | UserPromptSubmit    | ADVISORY | BM25-lite + semantic fallback (nomic-embed-text / Qdrant prism_wiki) over knowledge/wiki/index.md + _leaf-index.jsonl. Top-K injected. Always exits 0. Controlled by PRISM_WIKI_PRECHECK_INJECT (=1 in env). NOT wired in settings.json UserPromptSubmit (grep found zero matches for wiki-precheck-inject.mjs in settings.json).
obsidian-precheck-inject         | .claude/hooks/obsidian-precheck-inject.mjs                | UserPromptSubmit    | ADVISORY | BM25-lite over knowledge/memories/ frontmatter (name/description). Top-3 hits injected. Always exits 0. Controlled by PRISM_OBSIDI
... [+11406 chars truncated]
