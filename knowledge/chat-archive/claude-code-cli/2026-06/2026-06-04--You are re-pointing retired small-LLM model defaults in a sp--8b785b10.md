---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b785b10-fc31-4613-8c28-594f7533b4f2"
title: "You are re-pointing retired small-LLM model defaults in a specific cluster of fi"
date: "2026-06-04"
first_ts: "2026-06-04T15:26:45.919Z"
last_ts: "2026-06-04T15:30:47.786Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 16
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/workflows/wf_e6f03e0a-bac/agent-aed935896f4f01cea.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# You are re-pointing retired small-LLM model defaults in a specific cluster of fi

> **claude-code-cli** | 2026-06-04 | 41 msgs (16 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/workflows/wf_e6f03e0a-bac/agent-aed935896f4f01cea.jsonl`

## Transcript

### User | 2026-06-04T15:26:45.919Z

You are re-pointing retired small-LLM model defaults in a specific cluster of files in the H:/prism repo (Windows; absolute paths under H:/prism/). Your cluster: advisory-hooks-A.

FILES (edit each, all absolute under H:/prism/):
  - H:/prism/.claude/hooks/ollama-context-aggregator.mjs
  - H:/prism/.claude/hooks/ollama-obsidian-rag.mjs
  - H:/prism/.claude/hooks/bundles/lib/ollama-fuse.mjs
  - H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs
  - H:/prism/.claude/hooks/commit-draft-suggest.mjs
  - H:/prism/.claude/hooks/memory-mirror-to-vault.mjs
  - H:/prism/.claude/hooks/ollama-engine-api-extractor.mjs


RETIREMENT RE-POINT MAPPING (the Blackwell host is deleting these four small models so the fleet can never fall back to them):
  qwen2.5-coder:3b   -> qwen2.5-coder:32b
  qwen2.5-coder:7b   -> qwen2.5-coder:32b
  qwen2.5-coder:14b  -> qwen2.5-coder:32b
  deepseek-r1:14b    -> qwen2.5-coder:32b

WHY: qwen2.5-coder:32b is the kept, installed, higher-tier floor (~20GB on the 96GB RTX PRO 6000 Blackwell). It is strictly more capable than every tag above. The big gpt-oss models (gpt-oss:120b / gpt-oss:20b) auto-promote separately via the install-gated cost-router, so hardcoded defaults must point at the always-installed 32b to avoid any cold-fail window.

STRICT RULES:
  1. Change ONLY *executable* model references: hardcoded DEFAULT_MODEL constants, env-var fallbacks like `process.env.X || "qwen2.5-coder:7b"` or `?? "qwen2.5-coder:7b"`, prewarm maps, model-name fields in request objects (`model: 'qwen2.5-coder:7b'`), and model-preference arrays used at runtime.
  2. Update any TEST file assertion that asserts an old default value so the test still passes against the new default (e.g. an assertion expecting "qwen2.5-coder:7b" as the default becomes "qwen2.5-coder:32b").
  3. In advisory *suggestion strings* that a hook injects to guide routing (e.g. text like "call qwen2.5-coder:7b to summarize"), update the model name too: 7b->qwen2.5-coder:32b, 14b->qwen2.5-coder:3
... [+1243 chars truncated]

### Assistant | 2026-06-04T15:27:03.256Z

I'll process each file in my cluster. Let me read all 7 files first.

### Assistant | 2026-06-04T15:27:03.996Z

[tool_use: Read]

### Assistant | 2026-06-04T15:27:04.654Z

[tool_use: Read]

### Assistant | 2026-06-04T15:27:05.069Z

[tool_use: Read]

### Assistant | 2026-06-04T15:27:06.004Z

[tool_use: Read]

### Assistant | 2026-06-04T15:27:06.217Z

[tool_use: Read]

### Assistant | 2026-06-04T15:27:06.552Z

[tool_use: Read]

### Assistant | 2026-06-04T15:27:06.974Z

[tool_use: Read]

### User | 2026-06-04T15:27:42.062Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * memory-mirror-to-vault.mjs — PostToolUse hook
5	 *
6	 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04.
7	 *
8	 * When Claude writes/edits a file in the user's memory directory
9	 * (C:/Users/.../.claude/projects/H--prism/memory/), copy it to the H:
10	 * vault under H:/prism/knowledge/memories/{category}/ and embed it via
11	 * prism_memory:remember through the ru
... [+19425 chars truncated]

### User | 2026-06-04T15:27:42.067Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * claudemd-ollama-enforcer.mjs — UserPromptSubmit hook
5	 *
6	 * REVOLUTIONARY APPROACH: Instead of injecting 2000+ tokens of static
7	 * CLAUDE.md rules, Ollama reads the FULL ruleset locally and outputs
8	 * ONLY the 3-5 most relevant rules for THIS specific prompt.
9	 *
10	 * Token savings: 85-90% (2000 → 150-300 tokens)
11	 * Enforcement quality: BE
... [+12277 chars truncated]

### User | 2026-06-04T15:27:42.071Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * commit-draft-suggest.mjs — OLLAMA-DEV-03
5	 *
6	 * PreToolUse hook on Bash that detects short/generic commit messages
7	 * (`git commit -m "wip"`, `-m "update"`, etc.) and asks the local
8	 * Ollama (via LocalCommitMessageEngine) for a richer draft. The
9	 * suggestion is injected as advisory context — never blocking — so
10	 * Claude can incorporate 
... [+7451 chars truncated]

### User | 2026-06-04T15:27:42.099Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-obsidian-rag.mjs — UserPromptSubmit hook
5	 *
6	 * RAG (Retrieval-Augmented Generation) over Obsidian vault:
7	 * 1. Detect queries that could benefit from memory lookup
8	 * 2. Search Obsidian vault for relevant memories
9	 * 3. Use Ollama to summarize relevant context
10	 *
11	 * Token savings: Avoids Claude reading 57+ memory files (~200 tok
... [+8434 chars truncated]

### User | 2026-06-04T15:27:42.100Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-context-aggregator.mjs — Single UserPromptSubmit injection point
5	 *
6	 * Designed for up to 8 concurrent chats — replaces 3 redundant routers
7	 * (ollama-route-recommender, ollama-unified-semantic-router,
8	 *  ollama-prism-intelligence) with one consolidated pattern matcher.
9	 *
10	 * Output blocks (only those that match are emitted):
11	 
... [+9386 chars truncated]

### User | 2026-06-04T15:27:42.105Z

[tool_result] 1	// tier: T4
2	// ollama-fuse.mjs — fuse multiple advisory hook outputs into one local LLM call.
3	// When Ollama (qwen2.5-coder:7b) is healthy, sends one batched prompt asking
4	// for {antiPatterns, errorLearns, buildChecks} JSON. Falls back to running
5	// the original hooks via runBundle() when Ollama is unhealthy or returns
6	// invalid JSON.
7	//
8	// Wire-up: advisory bundle calls fuseAdvi
... [+4379 chars truncated]

### User | 2026-06-04T15:27:42.125Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * ollama-engine-api-extractor — PreToolUse hook on Read of engine source files.
5	 *
6	 * The U-WIRE13 killer (part 1 of 2). When the agent reads a PRISM engine
7	 * source file, this hook fires Ollama with a structured-extraction prompt
8	 * to capture the engine's public contract:
9	 *
10	 *   { methods: [{ name, params?, returns? }],
11	 *     requir
... [+8474 chars truncated]

### Assistant | 2026-06-04T15:27:53.333Z

I have all 7 files. Each has executable `qwen2.5-coder:7b` references (env-var fallbacks / hardcoded model fields). Let me apply the mapping to each. All are `qwen2.5-coder:7b -> qwen2.5-coder:32b`.

File 1: ollama-context-aggregator.mjs — line 137 (model field in request object).

### Assistant | 2026-06-04T15:27:55.108Z

[tool_use: Edit]

### User | 2026-06-04T15:28:07.956Z

[tool_result] The file H:/prism/.claude/hooks/ollama-context-aggregator.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T15:28:16.609Z

That advisory is a false positive (it's just a model string change, no dependency impact). Continuing with file 2.

File 2: ollama-obsidian-rag.mjs — line 151 (model field in request object).

### Assistant | 2026-06-04T15:28:17.613Z

[tool_use: Edit]

### User | 2026-06-04T15:28:31.316Z

[tool_result] The file H:/prism/.claude/hooks/ollama-obsidian-rag.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T15:28:34.398Z

File 3: ollama-fuse.mjs — line 12 (env-var fallback `OLLAMA_HOOK_MODEL || "qwen2.5-coder:7b"`).

### Assistant | 2026-06-04T15:28:36.531Z

[tool_use: Edit]

### User | 2026-06-04T15:28:51.452Z

[tool_result] The file H:/prism/.claude/hooks/bundles/lib/ollama-fuse.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T15:28:57.434Z

Also line 2 in ollama-fuse.mjs is a code comment mentioning `qwen2.5-coder:7b` describing the active model. Per rule 5, pure documentation is out of scope, but this comment describes the executable default which I just changed — leaving it would create drift. However, the comment is descriptive prose, not executable. I'll leave it as historical/descriptive per the strict "executable only" focus, but it's borderline. Let me update it for consistency since it directly describes the now-changed default behavior.

### Assistant | 2026-06-04T15:28:58.733Z

[tool_use: Edit]

### User | 2026-06-04T15:29:13.289Z

[tool_result] The file H:/prism/.claude/hooks/bundles/lib/ollama-fuse.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T15:29:17.028Z

File 4: claudemd-ollama-enforcer.mjs — line 32 (env-var fallback `CLAUDEMD_ENFORCER_MODEL || "qwen2.5-coder:7b"`).

### Assistant | 2026-06-04T15:29:18.859Z

[tool_use: Edit]

### User | 2026-06-04T15:29:32.270Z

[tool_result] The file H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T15:29:37.409Z

File 5: commit-draft-suggest.mjs — line 119 (env-var fallback `OLLAMA_COMMIT_MODEL ?? "qwen2.5-coder:7b"`).

### Assistant | 2026-06-04T15:29:38.177Z

[tool_use: Edit]

### User | 2026-06-04T15:29:56.237Z

[tool_result] The file H:/prism/.claude/hooks/commit-draft-suggest.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T15:30:03.086Z

File 6: memory-mirror-to-vault.mjs — line 181 (env-var fallback `OLLAMA_CLASSIFY_MODEL ?? "qwen2.5-coder:7b"`). Note: lines 257 is a comment mentioning the model; I'll update it to stay consistent with the changed default.

### Assistant | 2026-06-04T15:30:03.754Z

[tool_use: Edit]

### User | 2026-06-04T15:30:16.059Z

[tool_result] The file H:/prism/.claude/hooks/memory-mirror-to-vault.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T15:30:22.883Z

The comment at line 257 mentions `qwen2.5-coder:7b is fast on short inputs`. This describes the classifier model's behavior; since the default just changed, I'll leave the comment alone — it's narrative prose about why the prompt is kept small (not an executable reference, and rule 5 excludes pure-doc unless load-bearing). The model name in the comment is incidental, not steering routing. Leaving it avoids over-editing.

File 7: ollama-engine-api-extractor.mjs — line 108 (env-var fallback `OLLAMA_HOOK_MODEL ?? "qwen2.5-coder:7b"`).

### Assistant | 2026-06-04T15:30:24.972Z

[tool_use: Edit]

### User | 2026-06-04T15:30:34.019Z

[tool_result] The file H:/prism/.claude/hooks/ollama-engine-api-extractor.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T15:30:47.786Z

All 7 files processed. Each had exactly one executable model reference (env-var fallback or request-object `model:` field), all `qwen2.5-coder:7b -> qwen2.5-coder:32b`. No deepseek-r1, 3b, or 14b references in this cluster. No test files. No advisory suggestion-strings.

advisory-hooks-A cluster — all changes applied (EDIT ONLY, no git/ollama run):

- **H:/prism/.claude/hooks/ollama-context-aggregator.mjs** — 1 edit. Request-object `model: 'qwen2.5-coder:7b'` -> `'qwen2.5-coder:32b'` (queryOllamaPrioritization).
- **H:/prism/.claude/hooks/ollama-obsidian-rag.mjs** — 1 edit. Request-object `model: 'qwen2.5-coder:7b'` -> `'qwen2.5-coder:32b'` (queryOllamaRAG).
- **H:/prism/.claude/hooks/bundles/lib/ollama-fuse.mjs** — 2 edits. Env-var fallback `OLLAMA_HOOK_MODEL || "qwen2.5-coder:7b"` -> `"qwen2.5-coder:32b"` (executable default) + the matching header comment line that names the active model, kept in lockstep to avoid drift.
- **H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs** — 1 edit. Env-var fallback `CLAUDEMD_ENFORCER_MODEL || "qwen2.5-coder:7b"` -> `"qwen2.5-coder:32b"`.
- **H:/prism/.claude/hooks/commit-draft-suggest.mjs** — 1 edit. Env-var fallback `OLLAMA_COMMIT_MODEL ?? "qwen2.5-coder:7b"` -> `"qwen2.5-coder:32b"`.
- **H:/prism/.claude/hooks/memory-mirror-to-vault.mjs** — 1 edit. Env-var fallback `OLLAMA_CLASSIFY_MODEL ?? "qwen2.5-coder:7b"` -> `"qwen2.5-coder:32b"`.
- **H:/prism/.claude/hooks/ollama-engine-api-extractor.mjs** — 1 edit. Env-var fallback `OLLAMA_HOOK_MODEL ?? "qwen2.5-coder:7b"` -> `"qwen2.5-coder:32b"`.

Total: 8 edits across 7 files. None skipped.

Deliberately NOT edited (per rules 1/5):
- memory-mirror-to-vault.mjs line ~257 narrative comment ("qwen2.5-coder:7b is fast on short inputs") — pure descriptive prose explaining why the prompt is kept small, not an executable reference and not a routing-steering suggestion string. Left to avoid over-editing.

No vision tags, nomic-embed, gpt-oss, or 32b/72b/70b references were present to pro
... [+151 chars truncated]
