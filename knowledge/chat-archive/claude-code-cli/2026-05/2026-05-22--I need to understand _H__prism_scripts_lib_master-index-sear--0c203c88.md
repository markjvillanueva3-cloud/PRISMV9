---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c203c88-6d98-44df-931a-5945093269a2"
title: "I need to understand `H:\\prism\\scripts\\lib\\master-index-search-lib.mjs` so I can"
date: "2026-05-22"
first_ts: "2026-05-22T15:43:30.047Z"
last_ts: "2026-05-22T15:45:16.135Z"
cwd: "H:\\PRISM"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-a22498dfe9ab7ab05.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# I need to understand `H:\prism\scripts\lib\master-index-search-lib.mjs` so I can

> **claude-code-cli** | 2026-05-22 | 19 msgs (7 user / 12 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-a22498dfe9ab7ab05.jsonl`

## Transcript

### User | 2026-05-22T15:43:30.047Z

I need to understand `H:\prism\scripts\lib\master-index-search-lib.mjs` so I can design high-ROI query-key extraction for new PreToolUse tool hooks (the hooks will query this lib with a derived key and inject the top hits).

Investigate and report (medium-depth):

1. The full public API of `master-index-search-lib.mjs`: the signature of `runMasterIndexSearch(query, opts)` (and any other exports), what `opts` accepts (topK?), and the exact shape of a returned result object and each hit object (fields like id, label, info, layer, status, type, score).

2. The scoring algorithm — what node fields it tokenizes and scores against, the BM25-lite / weighting scheme, and whether it does any token-splitting, lowercasing, or stopword filtering on the incoming `query` string, or whether it scores the raw string as-is.

3. What makes a query string "high-ROI" vs low-ROI for this index — i.e. what kinds of strings yield specific useful hits vs generic noise. To answer this, read a small sample (5-10 objects) of nodes from `H:\prism\state\shared\system-viz\system-graph.json` so you can see how node `id`/`label`/`info`/`type` are actually shaped. Report 3-4 example node objects verbatim.

4. Whether the lib reads the graph fresh each call or caches it (mtime cache?), and the default graph path it loads.

Report code excerpts with line numbers. Keep under 450 words.

### Assistant | 2026-05-22T15:43:36.984Z

I'll investigate this master index search library and its integration points. Let me start by examining the main file and then sample the graph data.

### Assistant | 2026-05-22T15:43:36.991Z

[tool_use: Read]

### Assistant | 2026-05-22T15:43:37.269Z

[tool_use: Read]

### User | 2026-05-22T15:43:39.990Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+27618 chars truncated]

### User | 2026-05-22T15:44:24.036Z

[tool_result] File content (215869215 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-05-22T15:44:26.373Z

I need to sample the system-graph.json file to see actual node structures. Let me use a smaller read with offset/limit to extract sample nodes.

### Assistant | 2026-05-22T15:44:26.962Z

[tool_use: Bash]

### User | 2026-05-22T15:44:30.188Z

[tool_result] Exit code 1
/usr/bin/bash: line 6: cd: too many arguments

### Assistant | 2026-05-22T15:44:32.300Z

Let me fix the Bash syntax for Windows:

### Assistant | 2026-05-22T15:44:32.482Z

[tool_use: Bash]

### User | 2026-05-22T15:44:37.190Z

[tool_result] -fusion-live-ms0","generatedAt":"2026-05-17T20:38:20.424Z"},"roadmap":{"principle":"Build atomic-first. Tier 0 (cores/data) → Tier 1 (engines) → Tier 2 (dispatchers/AI) → Tier 3 (transport) → Tier 4 (frontend) → Tier 5 (users). Never start higher tier work that depends on missing lower-tier blocks.","phases":[{"phase":0,"name":"Reality reconciliation","reason":"Fix milestone envelope drift so plan
... [+3588 chars truncated]

### Assistant | 2026-05-22T15:44:39.186Z

I need to parse the JSON more carefully. Let me use a targeted approach:

### Assistant | 2026-05-22T15:44:39.886Z

[tool_use: Bash]

### User | 2026-05-22T15:44:44.190Z

[tool_result] Exit code 1
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'H:\PRISM\prismstatesharedsystem-vizsystem-graph.json'
    at Object.readFileSync (node:fs:441:20)
    at [eval]:3:28
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execution:118:14
    at [ev
... [+325 chars truncated]

### Assistant | 2026-05-22T15:44:45.806Z

Let me fix the path escaping:

### Assistant | 2026-05-22T15:44:46.234Z

[tool_use: Bash]

### User | 2026-05-22T15:44:53.372Z

[tool_result] [
  {
    "id": "p.operator",
    "layer": "L0",
    "subgroup": "personas",
    "label": "Operator",
    "info": "Shop floor — runs jobs, scans travelers, reports SPC",
    "status": "built",
    "size": 1.2,
    "tier": 5,
    "knowledge": {
      "wikiEntries": [
        {
          "title": "guard:operator_audit_record",
          "path": "H:/prism/knowledge/wiki/architecture/actions/guard/ope
... [+22664 chars truncated]

### Assistant | 2026-05-22T15:45:16.135Z

Perfect! Now I have the context I need. Let me compile the comprehensive investigation report.

---

## Investigation Report: `master-index-search-lib.mjs` API & Scoring

### 1. **Public API Signatures**

**`runMasterIndexSearch(query, opts)`** (lines 427–442)
- **Input:** `query` (string), `opts` object with:
  - `topK` (default 5) — number of results
  - `graphPath` (default `H:/prism/state/shared/system-viz/system-graph.json`)
  - `excludedLayers` (default `{"L9", "L11"}`)
  - `maxTokens` (default 8)
  - `maxLen` (default 4000)
- **Returns:** `{ tokens: string[], hits: Array }`

**Hit object shape** (lines 393–401):
```javascript
{
  id,                    // node.id (string)
  score,                 // cumulative BM25-lite weight
  layer,                 // node.layer (string, e.g. "L0", "L3")
  label,                 // node.label truncated to 80 chars, first line only
  status,                // node.status (string, e.g. "built", "pending_merge")
  wiki: Array<string>,   // up to 3 wiki entry names
  memory: Array<string>  // up to 2 memory entry names
}
```

**Other exports:** `tokenize(text, opts)`, `loadGraph(path)`, `searchGraphHits(graph, tokens, opts)`, `loadTribalIndex(path)`, `searchTribalHits(index, tokens, opts)`, `runTribalSearch(query, opts)`, `STOPWORDS` (Set)

---

### 2. **Scoring Algorithm**

**Query processing** (lines 89–108):
- Lowercases input
- Strips non-word characters: `/[^\p{L}\p{N}_\s]/gu`
- Splits on whitespace
- Filters tokens < 3 chars and stopwords (Set of 47 common words, lines 48–56)
- Dedupes and caps at `maxTokens` (default 8)
- **Raw query string is never scored directly** — only tokenized → scored per token

**BM25-lite Weighting** (lines 60–63):
```javascript
W_LABEL = 3.0   // exact substring match in node.label
W_ID = 2.0      // exact substring match in node.id
W_INFO = 1.5    // exact substring match in node.info
W_VAULT = 1.0   // match in wiki/memory entry concatenated blobs
```

**Scoring logic** (lines 366–386):
- F
... [+3614 chars truncated]
