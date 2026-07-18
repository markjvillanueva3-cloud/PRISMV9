---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Read H:/prism/.claude/hooks/node-card-prefetch-inject.mjs END TO END, and find h"
date: "2026-06-09"
first_ts: "2026-06-09T13:08:27.538Z"
last_ts: "2026-06-09T13:10:13.991Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_b5aa5735-a88/agent-a8069cf20f9ba373c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Read H:/prism/.claude/hooks/node-card-prefetch-inject.mjs END TO END, and find h

> **claude-code-cli** | 2026-06-09 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_b5aa5735-a88/agent-a8069cf20f9ba373c.jsonl`

## Transcript

### User | 2026-06-09T13:08:27.538Z

Read H:/prism/.claude/hooks/node-card-prefetch-inject.mjs END TO END, and find how it is wired (grep C:/Users/wompu/.claude/settings.json and H:/.claude/settings.json for node-card-prefetch-inject — report the exact UserPromptSubmit entry, its position/order, timeout, and any env knobs). I am cloning this PER-PROMPT PREFETCH pattern for the REVERSE direction: a new hook vault-doc-prefetch-inject.mjs that detects a VAULT DOC reference in a prompt (a wiki path like 'architecture/foo' or 'knowledge/wiki/...md', or a memory slug like 'feedback_psn_definition') and injects the graph node(s) that document it (via a seek-only reader, ZERO tool call). Produce a precise BLUEPRINT: (1) how node-card-prefetch detects candidate node-ids in the prompt (the whitelist of distinctive prefixes, the regex, why it EXCLUDES noisy prefixes like fs/test/git); (2) how it calls the seek-only reader (seekCard) and guarantees never-throw + cheap-when-irrelevant (regex-only ~0ms unless a candidate present); (3) the exact hookSpecificOutput/additionalContext JSON shape it emits; (4) its env knobs (DISABLE, K). Then ASSESS: for the reverse hook, what is a SAFE, LOW-FALSE-POSITIVE detection rule for a vault-doc reference in a prompt? (wiki paths contain a slash + a known section like architecture/lessons/code-tribal; memory slugs are snake_case with a known prefix like feedback_/reference_/project_). What would make it cheap-when-irrelevant? Plain text, no JSON.

### Assistant | 2026-06-09T13:08:45.498Z

I'll read the target hook end-to-end and find its wiring, then produce the blueprint and assessment.

### Assistant | 2026-06-09T13:08:45.500Z

[tool_use: Read]

### Assistant | 2026-06-09T13:08:45.506Z

[tool_use: Grep]

### Assistant | 2026-06-09T13:08:45.508Z

[tool_use: Grep]

### User | 2026-06-09T13:08:47.472Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * node-card-prefetch-inject.mjs — UserPromptSubmit injector
5	 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK, slot:sierra)
6	 *
7	 * When a prompt NAMES a system-viz node id (e.g. `eng.mill`, `ghost.galaxy.wedm`,
8	 * `formula.kienzle`), this hook SEEKS that node's compact card from the offset
9	 * index and injects it as additionalContext — so th
... [+7227 chars truncated]

### User | 2026-06-09T13:08:47.750Z

[tool_result] 1230-          },
1231-          {
1232-            "type": "command",
1233-            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/master-index-precheck-inject.mjs",
1234-            "timeout": 3000
1235-          },
1236-          {
1237-            "type": "command",
1238:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/node-card-prefetch-i
... [+292 chars truncated]

### User | 2026-06-09T13:08:47.897Z

[tool_result] 1230-          },
1231-          {
1232-            "type": "command",
1233-            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/master-index-precheck-inject.mjs",
1234-            "timeout": 3000
1235-          },
1236-          {
1237-            "type": "command",
1238:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/node-card-prefetch-i
... [+292 chars truncated]

### Assistant | 2026-06-09T13:08:58.970Z

I have everything I need. The seek-only reader contract is the one load-bearing piece I haven't yet confirmed — let me verify `seekCard`'s signature and never-throw/no-graph-load guarantees before I cite them.

### Assistant | 2026-06-09T13:08:59.085Z

[tool_use: Read]

### User | 2026-06-09T13:09:01.732Z

[tool_result] 1	/**
2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
7	 * compact projection sidecar (no new heavy build):
8	 *   - system-graph-index.json (~193MB, 
... [+14916 chars truncated]

### Assistant | 2026-06-09T13:10:13.991Z

I have everything verified end-to-end. Here is the report.

---

# WIRING (verified)

`node-card-prefetch-inject.mjs` is wired identically in both `C:/Users/wompu/.claude/settings.json` and `H:/.claude/settings.json` (the c-to-h mirror keeps them byte-equal). Exact `UserPromptSubmit` entry:

```json
{ "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/node-card-prefetch-inject.mjs",
  "timeout": 3000 }
```

- **Position/order**: immediately AFTER `master-index-precheck-inject.mjs` (timeout 3000) at C:/H: line 1233, and immediately BEFORE `memory-rag-inject.mjs` (timeout 4000) at line 1243. So the prefetch runs in the UserPromptSubmit chain right after the master-index precheck and before the RAG inject.
- **Timeout**: 3000 ms.
- **Env knobs**: `PRISM_NODECARD_PREFETCH_DISABLE=1` (off-switch) and `PRISM_NODECARD_PREFETCH_K=<n>` (default 3, clamped 1..8). These are read inside the script, not in settings.json.

This is the deliberate "individual entries, not the bundle" wiring the CLAUDE.md MASTER-INDEX section mandates (bundle is high-contention).

---

# BLUEPRINT — how node-card-prefetch works (cite-level)

### (1) Candidate node-id detection in the prompt

- **Whitelist** (`TRIGGER_PREFIXES`, `node-card-prefetch-inject.mjs:48-51`, exported + `Object.freeze`d): `eng`, `disp`, `ghost`, `formula`, `wiki`, `skill`, `memory_reference`, `memory_patterns`, `tribal-tip`, `ms-envelope`.
- **Regex** (`ID_RE`, line 57-60): `(?:^|[^A-Za-z0-9_-])(?:<prefix1>|<prefix2>|…)\.[A-Za-z0-9][A-Za-z0-9._-]*` with the `g` flag. It anchors on a non-word boundary char OR string start (NOT `\b` — chosen deliberately so a leading `_` in `memory_reference` still anchors, line 73-75), requires the whitelisted prefix + a literal `.`, then an id body whose first char is alnum and whose tail allows internal dots/underscores/hyphens (so `ghost.galaxy.wedm`, `wiki.a.b` match as one token).
- **`detectNodeIds(prompt)`** (line 68-84, pure, exported): iterates `m
... [+9918 chars truncated]
