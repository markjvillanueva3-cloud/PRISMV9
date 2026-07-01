---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "ROI + risk assessment for two proposed sierra units extending the vault-backlink"
date: "2026-06-09"
first_ts: "2026-06-09T13:08:27.539Z"
last_ts: "2026-06-09T13:12:43.129Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_b5aa5735-a88/agent-abd8adf2935617fbf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# ROI + risk assessment for two proposed sierra units extending the vault-backlink

> **claude-code-cli** | 2026-06-09 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_b5aa5735-a88/agent-abd8adf2935617fbf.jsonl`

## Transcript

### User | 2026-06-09T13:08:27.539Z

ROI + risk assessment for two proposed sierra units extending the vault-backlink reverse edge (CHEAP-NODE-ACCESS-MS0). Context: vault-backlinks.json (19.8MB, {vaultKey:[graphNodeIds]}) lets 'doc-nodes <doc>' answer "which graph node(s) does this wiki/memory doc document" — the reverse of node-card. UNIT A = a per-prompt UserPromptSubmit hook 'vault-doc-prefetch-inject' that auto-injects the graph node(s) when a vault doc appears in a prompt (zero tool call). UNIT B = a prism_session/prism_dev DISPATCHER action 'doc_nodes' so it's MCP-invokable not just CLI. Assess: (1) How OFTEN does a vault doc path/slug actually appear in a fleet prompt? (the awareness/master-index/tribal injectors surface wiki+memory paths constantly into additionalContext — but does the USER prompt itself contain them? consider that the hook sees the user prompt, not the injected context). Is UNIT A high-ROI or a rarely-firing per-prompt tax across 26 slots? (2) For UNIT A, what's the false-positive risk (a snake_case word that isn't a memory slug; a slash-path that isn't a wiki doc)? (3) Which is higher leverage given the operator goal 'keep mapping nodes for quick searches and tool usage savings'? Give a clear go/defer recommendation for each with reasoning. Plain text, no JSON.

### Assistant | 2026-06-09T13:08:46.634Z

I'll assess these two proposed sierra units. Let me first verify the actual state of the artifacts described to ground the assessment in reality rather than the prompt's framing.

### Assistant | 2026-06-09T13:08:51.992Z

[tool_use: Bash]

### Assistant | 2026-06-09T13:08:52.168Z

[tool_use: Bash]

### User | 2026-06-09T13:09:35.537Z

[tool_result] -rw-r--r-- 1 wompu 197611 19794545 Jun  8 22:24 state/shared/system-viz/vault-backlinks.json
---HEAD---
{"schemaVersion":"1.0.0","nodeCap":50,"builtFrom":"state/shared/system-viz/node-cards.jsonl","builtFromMtimeMs":1780972129664,"sourceCardCount":301216,"keyCount":29479,"edgeCount":1520813,"cappedKeyCount":2657,"truncated":{"architecture/course-forge-stubs-emitter":168,"feedback_ai_upgrade_broadc
... [+562 chars truncated]

### User | 2026-06-09T13:10:42.044Z

[tool_result] scripts/build-vault-backlink-index.mjs
scripts/lib/vault-backlink-read.mjs
scripts/lib/vault-backlink-read.test.mjs
scripts/system-viz-query.mjs
.claude/cache/_vbl_A.txt
.claude/cache/_vbl_B.txt
.claude/cache/_vbl_C.txt

### Assistant | 2026-06-09T13:10:48.379Z

The artifacts are real and richer than the prompt described. Let me verify the key claims that determine ROI: how vault doc paths actually reach the hook, and the false-positive surface in the existing reader.

### Assistant | 2026-06-09T13:10:49.181Z

[tool_use: Read]

### Assistant | 2026-06-09T13:10:50.876Z

[tool_use: Bash]

### User | 2026-06-09T13:10:51.311Z

[tool_result] 1	/**
2	 * vault-backlink-read.mjs — reader for the REVERSE edge (vault doc → graph node).
3	 *
4	 * `backlinksFor(query)` answers "which live graph node(s) does this wiki/memory
5	 * doc document?" from the inverted index `vault-backlinks.json` (built by
6	 * build-vault-backlink-index.mjs). The agent then `node-card <id>`s the node for
7	 * its real status/wiring — closing the system-viz↔Obsidia
... [+7365 chars truncated]

### User | 2026-06-09T13:10:55.601Z

[tool_result] 15: *   node scripts/system-viz-query.mjs node-card <id> [<id>..]  # token-cheap read-by-id (no 644MB load)
25:import { readCards } from "./lib/node-card-read.mjs";
37:  console.error("usage: system-viz-query <roadmap-candidates|build-order|blast-radius|dispatcher-summary|coverage-by-domain|worktrees|find|node-card|doc-nodes|headline|cache-status> [params] [--json]");
103:// scripts/lib/node-card-
... [+1120 chars truncated]

### Assistant | 2026-06-09T13:11:00.494Z

Now let me verify the critical ROI question: does the existing node-card prefetch hook actually parse vault paths/slugs out of the *user prompt*, and what does the normalizeVaultKey false-positive surface look like.

### Assistant | 2026-06-09T13:11:01.438Z

[tool_use: Read]

### Assistant | 2026-06-09T13:11:01.743Z

[tool_use: Read]

### User | 2026-06-09T13:11:02.137Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\node-card-prefetch-inject.mjs' was already read 2m ago in this session and is unchanged (mtime 1780596583744). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T13:11:02.395Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\vault-backlink-schema.mjs' was already read 79s ago in this session and is unchanged (mtime 1780975303200). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T13:11:08.644Z

The read-once guard says both files are already in my context from earlier in this session, but I don't have them. Let me read the schema's normalizer and the prefetch hook's prompt-parsing logic via Grep to ground the false-positive and firing-rate assessment.

### Assistant | 2026-06-09T13:11:10.258Z

[tool_use: Bash]

### Assistant | 2026-06-09T13:11:11.800Z

[tool_use: Bash]

### User | 2026-06-09T13:11:14.181Z

[tool_result] 7: * But the REVERSE is unmapped: an agent reading a wiki/memory doc has no cheap way
39: *   3. strip a leading `knowledge/wiki/` or `knowledge/memories/<type>/` prefix
40: *   4. strip a trailing `.md`
47:export function normalizeVaultKey(raw) {
49:  let k = raw.trim().replace(/\\/g, "/");
51:  k = k.replace(/^[A-Za-z]:\/prism\//i, "");           // 2: repo root
52:  k = k.replace(/^knowledge\/w
... [+535 chars truncated]

### User | 2026-06-09T13:11:18.178Z

[tool_result] 1:#!/usr/bin/env node
2:// tier: T2
4: * node-card-prefetch-inject.mjs — UserPromptSubmit injector
5: * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK, slot:sierra)
7: * When a prompt NAMES a system-viz node id (e.g. `eng.mill`, `ghost.galaxy.wedm`,
8: * `formula.kienzle`), this hook SEEKS that node's compact card from the offset
9: * index and injects it as additionalContext — so the model get
... [+2962 chars truncated]

### Assistant | 2026-06-09T13:11:29.476Z

I now have enough verified ground truth. The key architectural facts:

1. **The existing prefetch hook** (`node-card-prefetch-inject.mjs`) already parses the user prompt with `ID_RE` matching **dotted node-id prefixes** (`eng.`, `ghost.`, `wiki.`, `memory_reference`, etc.) — the *forward* direction. UNIT A would parse the *reverse* keys: slash-paths (`knowledge/wiki/...`) and snake_case memory slugs (`feedback_psn_definition`).

2. **`normalizeVaultKey`** strips path prefixes/`.md`/case-folds but applies **no shape validation** — any string becomes a candidate key; the only filter is whether it hits `index.map`. The index has 29,479 keys.

Let me confirm one last thing: the dominant vault-key shapes (slash-path vs bare snake_case slug) to size the false-positive surface precisely.

### Assistant | 2026-06-09T13:11:37.869Z

[tool_use: Bash]

### User | 2026-06-09T13:11:44.082Z

[tool_result] total keys: 29628
slash-path keys: 22978
snake_case (multi-token) keys: 6403
plain bareword/hyphen keys: 180
other: 67
--- sample plain barewords (the FP hazard class) ---
memory  tribal-levels-2026-24  tribal-link-2026-24  tribal-technology-2026-24  tribal-specialty-2026-24  tribal-boundary-2026-24  tribal-contouring-2026-24  tribal-display-2026-24  tribal-tool-selection-2026-24  tribal-ai-ml-202
... [+398 chars truncated]

### Assistant | 2026-06-09T13:12:43.129Z

I have everything I need. The key shapes are now precisely sized: 22,978 slash-paths (78%), 6,403 multi-token snake_case slugs (22%), and only 180 plain barewords (the worst FP class). Here is the assessment.

---

# ROI + Risk Assessment — vault-backlink reverse-edge units (sierra)

## Verified ground truth
- `vault-backlinks.json` is real: 19.8 MB, 29,628 keys, 1.52 M edges, built from `node-cards.jsonl` (mtime-stamped, staleness-aware). Reader `vault-backlink-read.mjs` is fail-soft and process-cached.
- `doc-nodes` / `doc_nodes` is **already shipped as CLI** in `system-viz-query.mjs` (`cmd === "doc-nodes"`), short-circuited before `loadGraph()`. So both proposed units are *extensions*, not greenfield.
- The forward-direction prefetch hook `node-card-prefetch-inject.mjs` already exists and parses the user prompt for **dotted node-ids** (`eng.`, `ghost.`, `wiki.`, …). UNIT A is its mirror image for **reverse keys** (slash-paths + snake_case slugs).
- `normalizeVaultKey` does NO shape validation — it strips prefixes/`.md`/case-folds and trusts the `index.map` hit as the only filter.

---

## (1) How often does a vault doc actually appear in the USER prompt?

**Rarely — and this is the load-bearing finding.** The prompt's own framing flags the trap correctly: the awareness/master-index/tribal injectors flood `additionalContext` with wiki+memory paths, but a UserPromptSubmit hook sees **the raw user prompt, not the injected context**. The injected paths are invisible to UNIT A.

What does a real user prompt contain? Operators type natural-language work orders ("`/checkin-sierra` extend the backlink edge…", "fix the OCR page-0 bug", "audit galaxy X"). Vault keys appear in a user prompt only when the operator hand-types a path or slug — e.g. `[[feedback_psn_definition]]`, `knowledge/wiki/lessons/foo.md`, or a bare `reference_cheap_node_access_ms0`. That happens, but it is a **small minority of prompts**, concentrated in doc-reflection / wiki-maintenance / "look at this 
... [+6366 chars truncated]
