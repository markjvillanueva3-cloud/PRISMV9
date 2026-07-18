---
type: "chat-session"
source: "claude-code-cli"
session_id: "e91338dc-6a34-4db2-9d78-8cb86d5548d3"
title: "You are investigating PRISM's knowledge-injection landscape to help decide what "
date: "2026-05-19"
first_ts: "2026-05-19T02:04:35.450Z"
last_ts: "2026-05-19T02:19:50.570Z"
cwd: "H:\\prism"
messages: 99
user_msgs: 41
assistant_msgs: 58
raw_file: "H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a04d5b89196f011a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# You are investigating PRISM's knowledge-injection landscape to help decide what 

> **claude-code-cli** | 2026-05-19 | 99 msgs (41 user / 58 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a04d5b89196f011a1.jsonl`

## Transcript

### User | 2026-05-19T02:04:35.450Z

You are investigating PRISM's knowledge-injection landscape to help decide what high-ROI skill to build next. PRISM root: H:/prism (Windows; also referred to as h:\PRISM).

GOAL CONTEXT: We need to generate high-ROI "skills" (Claude Code slash commands = `.claude/commands/*.md` files) that improve KNOWLEDGE INJECTION — mechanisms that load deep, relevant domain knowledge into a chat's context BEFORE/DURING building a PRISM feature, so build output quality is higher. Principle: "the more you know about the subject, the higher the quality output."

INVESTIGATE AND REPORT (do NOT modify any files — read-only):

1. **Existing knowledge-injection SKILLS** — examine these command files and summarize what each does in 1-2 lines: `.claude/commands/ref-first.md`, `prism-lookup.md`, `prism-navigate.md`, `wiki-query.md`, `master-index.md`, `knowledge-query.md`, `deep-search.md`, `awareness-snapshot.md`, plus any other `.claude/commands/*.md` whose purpose is loading context/knowledge/wiki/memory. Check BOTH `H:/prism/.claude/commands/` and `H:/.claude/commands/`. Note which exist and which are stubs.

2. **`unit-knowledge-pack`** — read `H:/prism/knowledge/memories/reference/reference_unit_knowledge_pack_2026_05_18.md` and find the actual skill/script/engine it refers to. Summarize EXACTLY what it does, its inputs/outputs, and whether it is wired/working. Find and inspect the actual implementation file(s).

3. **Knowledge-injection HOOKS** — list the `.claude/hooks/*.mjs` that inject knowledge on UserPromptSubmit/SessionStart/SubagentStart (e.g. wiki-precheck-inject, master-index-precheck-inject, memory-relevance-inject, tribal-by-domain-inject, subagent-start-context, awareness-snapshot-inject, build-state-inject). For each: what it injects, how much (top-K), trigger event.

4. **The HIGH-ROI audit** — read `H:/prism/state/shared/specs/HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17.md` if it exists (also try glob `H:/prism/state/shared/specs/*HIGH-ROI*`), and summarize its findings 
... [+443 chars truncated]

### Assistant | 2026-05-19T02:04:58.354Z

I'll investigate PRISM's knowledge-injection landscape systematically. Let me start by examining the existing skills and files in parallel.

### Assistant | 2026-05-19T02:05:01.303Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:05:02.659Z

[tool_use: Bash]

### User | 2026-05-19T02:05:23.002Z

[tool_result] Exit code 2
-rw-r--r-- 1 wompu 197611 3043 May 15 15:30 H:/prism/.claude/commands/awareness-snapshot.md
-rw-r--r-- 1 wompu 197611 6082 May 15 15:30 H:/prism/.claude/commands/deep-search.md
-rw-r--r-- 1 wompu 197611 5447 May 18 09:41 H:/prism/.claude/commands/knowledge-query.md
-rw-r--r-- 1 wompu 197611 5549 May 15 15:30 H:/prism/.claude/commands/master-index.md
/usr/bin/ls: cannot access 'H:/prism
... [+1097 chars truncated]

### User | 2026-05-19T02:05:26.911Z

[tool_result] H:/prism/knowledge/memories/reference/reference_unit_knowledge_pack_2026_05_18.md  4.1K
=== HIGH-ROI ===
H:/prism/state/shared/specs/HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17.html  31.8K
H:/prism/state/shared/specs/HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17.html.hash  109B
H:/prism/state/shared/specs/HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17.md  10.7K

### Assistant | 2026-05-19T02:05:33.711Z

Let me find the missing skills and gather more files. Some skills may exist with different names or in subdirectories.

### Assistant | 2026-05-19T02:05:34.173Z

[tool_use: Glob]

### Assistant | 2026-05-19T02:05:35.192Z

[tool_use: Glob]

### Assistant | 2026-05-19T02:05:35.399Z

[tool_use: Glob]

### Assistant | 2026-05-19T02:05:36.232Z

[tool_use: Glob]

### Assistant | 2026-05-19T02:05:37.254Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:37.520Z

[tool_use: Read]

### User | 2026-05-19T02:05:46.306Z

[tool_result] 1	---
2	name: unit-knowledge-pack-2026-05-18
3	description: U-UKP01 — per-unit knowledge-pack composer that gives a chat slot all Obsidian+wiki+graph+tribal+git knowledge dedicated to the unit it is working on
4	metadata:
5	  type: reference
6	---
7	
8	# U-UKP01 — `unit-knowledge-pack` (2026-05-18 charlie)
9	
10	Closes operator directive 2026-05-18 charlie:
11	
12	> *"move to development back end 
... [+4054 chars truncated]

### User | 2026-05-19T02:05:46.415Z

[tool_result] 1	---
2	title: High-ROI Skill Creation + Hook Auto-Injection + Obsidian/Ollama Routing Audit
3	date: 2026-05-17
4	slot: lima
5	session: claude-88486e9e
6	auditor: claude-88486e9e
7	tool: /forge-audit-v2
8	meta_artifact: scripts/high-roi-skill-rank.mjs
9	verdict: FAIL (2 CRITICAL + 2 WARN signals — corrected after peer review)
10	advisoryOnly: true
11	mustHumanVerify: true
12	peerReview: PASS-with-
... [+10853 chars truncated]

### User | 2026-05-19T02:05:59.704Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-19T02:05:59.724Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-19T02:06:00.816Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-19T02:06:00.822Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-19T02:06:06.605Z

Let me read the existing skill files and find the missing ones. The Glob timed out — I'll use targeted bash with a timeout.

### Assistant | 2026-05-19T02:06:07.939Z

[tool_use: Read]

### Assistant | 2026-05-19T02:06:08.278Z

[tool_use: Read]

### Assistant | 2026-05-19T02:06:08.505Z

[tool_use: Read]

### Assistant | 2026-05-19T02:06:08.384Z

[tool_use: Read]

### Assistant | 2026-05-19T02:06:08.822Z

[tool_use: Read]

### User | 2026-05-19T02:06:16.467Z

[tool_result] 1	---
2	description: Unified knowledge query — ONE MCP call replaces N Grep/Glob/Agent searches. Hits prism_session:master_index_query (system-viz graph + Obsidian vault wikiEntries + memoryEntries + capability index + BUILD_STATE classification + utilization scoring, all pre-joined per node). Use this BEFORE Grep/Glob/Agent whenever the question is "where is X / does Y exist / what's wired to Z /
... [+5413 chars truncated]

### User | 2026-05-19T02:06:17.956Z

[tool_result] 1	---
2	description: Unified master search across system-viz graph + Obsidian vault + capability index + BUILD_STATE. Use INSTEAD OF Grep/Glob/Agent for "where is X" / "what handles Y" / "is Z built/wired/utilized" questions.
3	allowed-tools: mcp__prism_safe__prism_session, Bash, Read
4	---
5	
6	# /master-index — One Search Replaces N
7	
8	Unified ranked search across the **PRISM brain** in a sing
... [+5352 chars truncated]

### User | 2026-05-19T02:06:18.015Z

[tool_result] 1	---
2	description: Search-first then deep-reason fallback. Runs master_index_query first; if top hits all score below the confidence floor, escalates to model deep-reasoning with the master-index hits pre-loaded as context. Cuts token waste on shallow lookups while keeping neural-grade answers for ambiguous queries.
3	allowed-tools: mcp__prism_safe__prism_session, mcp__prism_safe__prism_intellig
... [+5740 chars truncated]

### User | 2026-05-19T02:06:19.554Z

[tool_result] 1	---
2	description: One-shot PRISM awareness snapshot — built/wired/utilized/drifted in 60 lines. Regenerates state/shared/AWARENESS-SNAPSHOT.md by orchestrating BUILD_STATE + MILESTONE_PROGRESS + system-graph utilization classifier. Cron-able session warmup.
3	allowed-tools: Bash, Read
4	---
5	
6	# /awareness-snapshot — Session warmup digest
7	
8	Generates `state/shared/AWARENESS-SNAPSHOT.md` — 
... [+2745 chars truncated]

### User | 2026-05-19T02:06:19.563Z

[tool_result] 1	---
2	name: wiki-query
3	description: Query the PRISM wiki by similarity (HNSW + Ollama embed), then synthesise an answer with citations.
4	---
5	
6	# /wiki-query
7	
8	Answer a free-form question using the existing wiki vault — read first, derive only if no page is close enough.
9	
10	## When to use
11	- The user asks a manufacturing / domain question.
12	- You're about to re-derive a formula or
... [+1151 chars truncated]

### Assistant | 2026-05-19T02:06:26.705Z

Now let me find the missing skills (ref-first, prism-lookup, prism-navigate) and the unit-knowledge-pack implementation, plus look at the knowledge-injection hooks.

### Assistant | 2026-05-19T02:06:30.307Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:06:31.251Z

[tool_use: Bash]

### User | 2026-05-19T02:07:01.683Z

[tool_result] MISSING project: ref-first.md
MISSING project: prism-lookup.md
MISSING project: prism-navigate.md
MISSING project: wiki-query.md
MISSING project: wiki-ingest.md
MISSING project: wiki-morning.md
MISSING project: prism-status.md
MISSING project: prism-roadmap.md
=== USER TREE C: ===
MISSING user: ref-first.md
MISSING user: prism-lookup.md
MISSING user: prism-navigate.md
FOUND user: wiki-query.md (14
... [+132 chars truncated]

### User | 2026-05-19T02:07:35.463Z

[tool_result] scripts/unit-knowledge-pack.mjs  12.1K
scripts/unit-knowledge-pack.test.mjs  14.1K
=== hooks dir count ===
548

### Assistant | 2026-05-19T02:07:38.728Z

The skills `ref-first`, `prism-lookup`, `prism-navigate` are referenced in the system prompt's skill list but don't exist as `.md` files in the standard locations. Let me search the H: drive root commands directory and check for these via a broader search, plus read the unit-knowledge-pack implementation.

### Assistant | 2026-05-19T02:07:41.268Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:07:44.158Z

[tool_use: Read]

### User | 2026-05-19T02:09:37.314Z

[tool_result] === prism* and ref* in H:/.claude/commands ===
=== same in H:/prism/.claude/commands ===

### User | 2026-05-19T02:09:40.819Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * unit-knowledge-pack.mjs — per-unit knowledge surfacing for a chat slot
4	 *
5	 * BACKEND-DEV-LOOP / OLLAMA-EXPAND-MS0 follow-on.
6	 *
7	 * Closes the gap behind the operator directive 2026-05-18 charlie:
8	 *   "expand ollama and obsidian utilization for the purpose of developing
9	 *    with all relevant knowledge dedicated to the specific task and unit
10	 *    t
... [+13112 chars truncated]

### system

... [19 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-19T02:12:31.631Z

The find for ref-first/prism-lookup/prism-navigate produced no output (only L10 graph nodes — meaning they're indexed but the files may be elsewhere). Let me check the tribal-by-domain-inject and wiki-precheck-inject headers, verify the hooks are wired in settings.json, and do a final search for the missing skills.

### Assistant | 2026-05-19T02:12:33.589Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:12:35.013Z

[tool_use: Bash]

### User | 2026-05-19T02:14:41.081Z

[tool_result] Command running in background with ID: bdwi33k10. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\h--PRISM\cdfb103c-04dc-4242-861f-a2bf5f316565\tasks\bdwi33k10.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-19T02:14:47.265Z

[tool_result] #!/usr/bin/env node
// tier: T2
// tribal-by-domain-inject.mjs — UserPromptSubmit
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
//
// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
// already biases wiki-entry ranking toward the active chat-slot's milestone
// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
// knowledge — surfaces top-K tribal
... [+2204 chars truncated]

### Assistant | 2026-05-19T02:14:53.603Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:14:54.218Z

[tool_use: Read]

### User | 2026-05-19T02:14:57.872Z

[tool_result] === HOOK WIRING in H:/.claude/settings.json ===
wiki-precheck-inject : 0 refs
master-index-precheck-inject : 1 refs
memory-relevance-inject : 0 refs
tribal-by-domain-inject : 0 refs
subagent-start-context : 1 refs
awareness-snapshot-inject : 1 refs
build-state-inject : 1 refs
unit-knowledge-pack-inject : 0 refs

### User | 2026-05-19T02:15:02.170Z

[tool_result] 1	=== ref-first ===
2	

### Assistant | 2026-05-19T02:15:05.219Z

Several hooks show 0 refs in settings.json — but they may be wired via bundles or in the C: settings. Let me verify thoroughly since this is load-bearing for my gap analysis.

### Assistant | 2026-05-19T02:15:11.831Z

[tool_use: Bash]

### User | 2026-05-19T02:15:20.398Z

[tool_result] === bundle membership + C: settings ===
wiki-precheck-inject : bundles=[] C:settings=0
memory-relevance-inject : bundles=[] C:settings=0
tribal-by-domain-inject : bundles=[] C:settings=0
unit-knowledge-pack-inject : bundles=[] C:settings=0
=== which bundles are wired in H:/.claude/settings.json ===
bash-bundle.mjs
edit-bundle.mjs
posttool-bash-read-bundle.mjs
posttool-edit-bundle.mjs
read-bundle.m
... [+29 chars truncated]

### Assistant | 2026-05-19T02:15:25.740Z

The grep into bundles found nothing — but `memory-relevance-inject` is referenced in its own header as firing "via edit-bundle.mjs". Let me verify the actual bundle contents and the UserPromptSubmit chain definitively.

### Assistant | 2026-05-19T02:15:29.131Z

[tool_use: Bash]

### User | 2026-05-19T02:15:37.234Z

[tool_result] === edit-bundle.mjs hook list ===
=== UserPromptSubmit hooks in H:/.claude/settings.json ===
node:internal/modules/cjs/loader:1252
  throw err;
  ^

Error: Cannot find module '/h/.claude/settings.json'
Require stack:
- H:\prism\[eval]
    at Function._resolveFilename (node:internal/modules/cjs/loader:1249:15)
    at Function._load (node:internal/modules/cjs/loader:1075:27)
    at TracingC
... [+482 chars truncated]

### Assistant | 2026-05-19T02:15:41.445Z

[tool_use: Bash]

### User | 2026-05-19T02:15:53.585Z

[tool_result] UserPromptSubmit groups: 1
  rename-window-intercept.mjs
  stress-harness-emit.mjs
  checkin-args-surface.mjs
  skill-auto-trigger.mjs
  close-out-audit-suggest.mjs
  prompt-context-inject.mjs
  master-index-precheck-inject.mjs
  audit-viz-first-inject.mjs
  ollama-auto-router.mjs
  session-id-pin.mjs
  slot-bind-enforce.mjs
  session-reorient-inject.mjs
  stale-state-warn.mjs
  prompt-rewriter-ol
... [+423 chars truncated]

### Assistant | 2026-05-19T02:15:57.026Z

This is a key finding. The UserPromptSubmit chain has **`master-index-precheck-inject`** wired but **NOT** `wiki-precheck-inject`, `memory-relevance-inject`, `tribal-by-domain-inject`, or `unit-knowledge-pack-inject`. Let me verify the SessionStart chain and confirm `memory-relevance-inject` (a PreToolUse hook) wiring via edit-bundle.

### Assistant | 2026-05-19T02:16:01.577Z

[tool_use: Bash]

### User | 2026-05-19T02:16:07.965Z

[tool_result] === SessionStart (3 groups) ===
  *: stress-harness-emit.mjs
  *: session-id-pin.mjs
  *: session-start-terminal-pin.mjs
  *: settings-mirror-guard.mjs
  *: portable-node-guard.mjs
  *: verify-hook-refs.mjs
  *: portable-python-guard.mjs
  *: multi-computer-awareness.mjs
  *: ollama-autostart.mjs
  *: nim-autostart.mjs
  *: plugin-path-fixer.mjs
  *: git-health-guard.mjs
  *: git-sync-fetch.mjs
  
... [+1930 chars truncated]

### Assistant | 2026-05-19T02:16:11.274Z

Let me confirm the edit-bundle child hook list (it's a bundler — children declared via a manifest or array).

### Assistant | 2026-05-19T02:16:12.710Z

[tool_use: Bash]

### User | 2026-05-19T02:16:22.897Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T02:16:26.141Z

[tool_use: Bash]

### User | 2026-05-19T02:16:28.842Z

[tool_result] Exit code 1

---
cat: .claude/hooks/edit-bundle.mjs: The system cannot find the file specified. (os error 2)

### Assistant | 2026-05-19T02:16:32.477Z

edit-bundle.mjs doesn't exist at that path. Let me locate it.

### Assistant | 2026-05-19T02:16:32.857Z

[tool_use: Bash]

### User | 2026-05-19T02:16:39.433Z

[tool_result] CMD: "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/edit-bundle.mjs

### Assistant | 2026-05-19T02:16:43.115Z

[tool_use: Bash]

### User | 2026-05-19T02:16:49.224Z

[tool_result] agent-boundary-guard.mjs
ai-reasoning-inject.mjs
ai-system-router-inject.mjs
anti-pattern-detector.mjs
api-contract-enforcer.mjs
asset-deletion-block.mjs
auto-consensus-critical-edit.mjs
ban-facade-patterns.mjs
build-create-detector.mjs
code-completeness-gate.mjs
consistent-return-checker.mjs
dedup-auto-invoke.mjs
duplication-hard-block.mjs
edit-bundle.mjs
edit-old-string-verify.mjs
encoding-guard
... [+466 chars truncated]

### Assistant | 2026-05-19T02:16:53.051Z

Confirmed: `memory-relevance-inject.mjs` IS wired via `edit-bundle.mjs` (PreToolUse on Edit/Write). Now let me check whether `wiki-precheck-inject`, `tribal-by-domain-inject`, and `unit-knowledge-pack-inject` are wired anywhere — they may be in the C: settings (which mirrors to H:) or genuinely unwired.

### Assistant | 2026-05-19T02:16:56.262Z

[tool_use: Bash]

### User | 2026-05-19T02:17:21.091Z

[tool_result] === full-tree scan: where are these 3 hooks referenced ===
--- wiki-precheck-inject ---
--- tribal-by-domain-inject ---
--- unit-knowledge-pack-inject ---
=== prompt-context-inject — does it sub-delegate? ===
tribal

### Assistant | 2026-05-19T02:17:30.122Z

Significant finding confirmed. Let me do one final check — what `prompt-context-inject.mjs` actually injects (it's the first context hook in the chain), and whether the `ref-first`/`prism-lookup`/`prism-navigate` skills exist anywhere on disk.

### Assistant | 2026-05-19T02:17:32.860Z

[tool_use: Bash]

### User | 2026-05-19T02:18:14.014Z

[tool_result] === prompt-context-inject header ===
#!/usr/bin/env node
// tier: T4
/**
 * prompt-context-inject.mjs — UserPromptSubmit hook (PRISM-STAB-MS0/U-C2).
 *
 * Reads the pre-aggregated bundle written by the context-bundle daemon
 * (prism-awareness-bundle.mjs --daemon) and emits ONE compact injection
 * block per prompt. Replaces the per-prompt fork storm of 24 individual
 * injectors that each compute
... [+383 chars truncated]

### Assistant | 2026-05-19T02:18:18.804Z

Confirmed: `ref-first.md`, `prism-lookup.md`, `prism-navigate.md` do **not exist** anywhere on the H: drive — they appear in the system-prompt skill list (their descriptions are loaded) but the actual `.md` files are absent or stubs. The `prompt-context-inject.mjs` is a bundle-reading hook that consolidates context from a daemon-written bundle.

I have enough to compile the report. Let me do one final verification of the prompt-context-inject bundle contents to know what it actually surfaces.

### Assistant | 2026-05-19T02:18:21.263Z

[tool_use: Bash]

### User | 2026-05-19T02:18:28.668Z

[tool_result] awareness
brief
handoff
tribal
=== bundle keys ===
generatedAt, mode, durationMs, sources, bytes, schemaVersion, body

### Assistant | 2026-05-19T02:19:50.570Z

I have everything needed. Here is my report.

---

# PRISM Knowledge-Injection Landscape — Investigation Report

## 1. Existing knowledge-injection SKILLS

Checked `H:/prism/.claude/commands/` and `H:/.claude/commands/`. Results:

| Skill | Status | What it does |
|---|---|---|
| `knowledge-query.md` | **EXISTS** (project, 5.4K) | Discoverability surface for the `prism_session:master_index_query` MCP action — one call hits system-graph (53K+ nodes) + Obsidian wiki/memory entries + capability index + BUILD_STATE. Documents filter idioms (`sources`, `layers`, `build_classes`, `min_confidence`). |
| `master-index.md` | **EXISTS** (project, 5.5K) | Manual entry point to the same unified master search (`master_index_query` / `master_index_node_status`). Returns ranked hits with `buildClass` + `utilization`. Companion to the auto-inject hook. |
| `deep-search.md` | **EXISTS** (project, 6.1K) | Policy/orchestration skill: 4-stage escalation — master_index_query → node_status → load-top-K-as-context → `prism_intelligence` neural fallback. Enforces search-first discipline, no script. |
| `awareness-snapshot.md` | **EXISTS** (project, 3.0K) | Regenerates `state/shared/AWARENESS-SNAPSHOT.md` — 60-line built/wired/utilized/drifted digest. Session-warmup rollup. |
| `wiki-query.md` | **EXISTS** (user `H:/.claude/`, 1.5K) | Thin: embed question via Ollama → top-3 HNSW wiki neighbors → synthesize with `[[slug]]` citations. The only one on the user tree. |
| `ref-first.md` | **MISSING** | Listed in system-prompt skill catalog ("Load PRISM reference indexes into context… prevents wasteful Glob/Grep") but **no `.md` file exists** on either drive. Description is loaded; body is absent/stub. |
| `prism-lookup.md` | **MISSING** | Catalog says "reference-first data lookup" — **no file exists**. |
| `prism-navigate.md` | **MISSING** | Catalog says "Zero-IO PRISM file routing lookup" — **no file exists**. |

**Key finding:** Three of the eight named skills (`ref-first`, `prism-lookup`, `pr
... [+12596 chars truncated]
