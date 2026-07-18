---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a962981-7a23-49ca-a503-804671284925"
title: "Independent second-pass review of a new PRISM UserPromptSubmit injector hook (sl"
date: "2026-06-04"
first_ts: "2026-06-04T18:05:16.212Z"
last_ts: "2026-06-04T18:07:38.992Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-aa40c1c9e2b186099.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent second-pass review of a new PRISM UserPromptSubmit injector hook (sl

> **claude-code-cli** | 2026-06-04 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-aa40c1c9e2b186099.jsonl`

## Transcript

### User | 2026-06-04T18:05:16.212Z

Independent second-pass review of a new PRISM UserPromptSubmit injector hook (slot sierra, U-NODECARD-PREFETCH-HOOK) that auto-injects a system-viz node's card when a prompt names its id. Read END TO END, grade PASS/FAIL with P0/P1 only:

SOURCE:
1. H:/prism/.claude/hooks/node-card-prefetch-inject.mjs
2. H:/prism/scripts/lib/node-card-read.mjs  (the new `seekCard` export)
TEST:
3. H:/prism/.claude/hooks/node-card-prefetch-inject.test.mjs
WIRING:
4. H:/prism/.claude/hooks/master-index-precheck-inject.mjs  (the SIBLING injector — compare contract conformance: stdin read via readFileSync(0), output shape {hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext}}, exit-0-on-no-match)
5. The hook is wired in H:/.claude/settings.json UserPromptSubmit as `"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/node-card-prefetch-inject.mjs` timeout 3000, right after master-index-precheck-inject.

Weight toward what a correctness reviewer misses:
- OVER-FIRE RISK on real prompts: the trigger prefix whitelist is {eng,disp,ghost,formula,wiki,skill,memory_reference,memory_patterns,tribal-tip,ms-envelope}. On a normal coding prompt, how often would one of these appear as a FALSE dotted token and force the ~619ms cold offset-table parse for nothing? Is the whitelist well-chosen (it deliberately EXCLUDES fs/test/git/core/script)? Any prefix here that's actually a common code/prose token (e.g. could `disp.` or `wiki.` or `skill.` appear spuriously)? Is the cost when it does fire acceptable (timeout 3000 vs ~619ms)?
- TEST INTEGRITY (R9): do the tests actually FAIL if detection or injection logic breaks? The "IGNORES noisy tokens" test — does it truly prove fs/schema/test are not matched, or is it trivially green? Is there a test proving the budget invariant (no bulk parse) at the hook level, or only at seekCard level?
- CONTRACT conformance vs the sibling master-index hook (output shape, exit codes, ENABLED knob pattern, timeout sizing).
- DUPLICATION: is this a real 
... [+314 chars truncated]

### Assistant | 2026-06-04T18:05:31.353Z

I'll review this hook end to end. Let me read all five files.

### Assistant | 2026-06-04T18:05:32.314Z

[tool_use: Read]

### Assistant | 2026-06-04T18:05:33.521Z

[tool_use: Read]

### Assistant | 2026-06-04T18:05:33.527Z

[tool_use: Read]

### Assistant | 2026-06-04T18:05:33.837Z

[tool_use: Read]

### User | 2026-06-04T18:05:37.956Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * node-card-prefetch-inject.mjs — UserPromptSubmit injector
5	 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK, slot:sierra)
6	 *
7	 * When a prompt NAMES a system-viz node id (e.g. `eng.mill`, `ghost.galaxy.wedm`,
8	 * `formula.kienzle`), this hook SEEKS that node's compact card from the offset
9	 * index and injects it as additionalContext — so th
... [+7197 chars truncated]

### User | 2026-06-04T18:05:39.645Z

[tool_result] 1	/**
2	 * node-card-prefetch-inject.test.mjs — verifies the prefetch hook's INTENT:
3	 *   1. detection fires ONLY on whitelisted node-id prefixes and IGNORES noisy
4	 *      code/prose dotted tokens (fs.readFileSync, version 2.5, schema.org) —
5	 *      so the common prompt never even triggers a seek,
6	 *   2. trailing punctuation / dedup / cap handled,
7	 *   3. buildPrefetchContext injects ca
... [+5643 chars truncated]

### User | 2026-06-04T18:05:39.825Z

[tool_result] 1	/**
2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
7	 * compact projection sidecar (no new heavy build):
8	 *   - system-graph-index.json (~193MB, 
... [+14895 chars truncated]

### User | 2026-06-04T18:05:40.323Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+13000 chars truncated]

### Assistant | 2026-06-04T18:05:47.665Z

Now let me check the offset lib used by the test, the schema (for `kind` field — `renderCard` uses `c.kind` but the index node shape may differ), and verify a couple of seams before grading.

### Assistant | 2026-06-04T18:05:48.473Z

[tool_use: Read]

### Assistant | 2026-06-04T18:05:48.481Z

[tool_use: Read]

### User | 2026-06-04T18:05:58.445Z

[tool_result] 1	/**
2	 * node-card-schema.mjs — the compact "node card" record shape for token-cheap
3	 * node reads (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * THE PROBLEM: status-quo "find + read a node" loads the 644MB system-graph.json
6	 * to extract one node — ~186K tokens per access. A NodeCard is the minimal record
7	 * that lets an agent IDENTIFY + LOCATE a node (and route to its source doc) WITHOU
... [+5691 chars truncated]

### User | 2026-06-04T18:05:58.715Z

[tool_result] 1	/**
2	 * node-card-offset-lib.mjs — the seekable card-offset index for sub-parse
3	 * node reads (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-OFFSET-INDEX, slot:sierra).
4	 *
5	 * THE PROBLEM (the next layer down from node-card-read): readCard's full-sidecar
6	 * path parses the WHOLE 193MB system-graph-index.json (or 55MB find-cache) to
7	 * build an id->node Map. A long-lived process caches that, but a
... [+7488 chars truncated]

### Assistant | 2026-06-04T18:06:09.151Z

I have enough to grade. Let me verify two final seams: (1) does the live `find-cache.json` / `system-graph-index.json` carry a `knowledge.wikiEntries` field (so `docTotals.wiki` rendering in the hook is reachable, vs. dead code), and (2) confirm the over-fire claim by checking which prefixes are common — specifically `skill.` `wiki.` `disp.`. Let me also confirm the wiring claim against settings.json.

### Assistant | 2026-06-04T18:06:09.152Z

[tool_use: Grep]

### Assistant | 2026-06-04T18:06:10.124Z

[tool_use: Grep]

### User | 2026-06-04T18:06:10.215Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/scripts/lib/node-card-prefetch-inject.test.mjs. Note: your current working directory is H:\prism.</tool_use_error>

### User | 2026-06-04T18:06:21.458Z

[tool_result] 1220-          {
1221-            "type": "command",
1222:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/node-card-prefetch-inject.mjs",
1223-            "timeout": 3000
1224-          },

### Assistant | 2026-06-04T18:06:25.828Z

Wiring confirmed in `H:/.claude/settings.json` line 1222 (timeout 3000). Let me verify the prefetch hook is positioned right after the master-index hook, and check what the live `find-cache.json` carries (whether `knowledge.wikiEntries` is even present — that determines whether the hook's wiki/mem rendering is dead code against the real index).

### Assistant | 2026-06-04T18:06:26.973Z

[tool_use: Grep]

### Assistant | 2026-06-04T18:06:29.199Z

[tool_use: Bash]

### User | 2026-06-04T18:06:35.426Z

[tool_result] 1217:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/master-index-precheck-inject.mjs",
1222:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/node-card-prefetch-inject.mjs",

### User | 2026-06-04T18:06:39.972Z

[tool_result] find-cache head: {"schemaVersion":1,"generatedAt":"2026-06-04T13:03:11.590Z","sourceMtimeMs":1780578067486.758,"sourceSize":675859110,"nodes":[{"label":"Operator","id":"p.operator","info":"Shop floor — runs jobs, scans travelers, reports SPC","subgroup":"personas","layer":"L0","noteCount":16},{"label":"Programmer","id":"p.programmer","info":"Quotes, CAM programming, post-process, prove-out","subgr
... [+805 chars truncated]

### Assistant | 2026-06-04T18:06:47.188Z

Wiring confirmed: prefetch hook (line 1222) fires immediately after master-index (line 1217), as documented. The live `find-cache.json` shape is important — it carries `subgroup`/`noteCount` but NO `knowledge.wikiEntries`. But that's the *fallback* sidecar; the seek path reads `node-cards.jsonl` built from `system-graph-index.json`. Let me confirm the offset-index pair exists on disk and whether it carries the `knowledge` field (this determines whether the hook's doc-pointer rendering is live against the real index, vs. only exercised in fixtures).

### Assistant | 2026-06-04T18:06:50.306Z

[tool_use: Bash]

### User | 2026-06-04T18:07:00.496Z

[tool_result] node-card-offsets.json 24.2MB
node-cards.jsonl 159.2MB
system-graph-index.json 193.1MB
jsonl head: {"id":"p.operator","label":"Operator","layer":"L0","kind":"p","status":"built","info":"Shop floor — runs jobs, scans travelers, reports SPC","noteCount":16,"wikiEntries":["knowledge/wiki/architecture/actions/guard/operator-audit-record.md","knowledge/wiki/architecture/actions/guard/operator-audit-sta
... [+297 chars truncated]

### Assistant | 2026-06-04T18:07:38.992Z

The full picture is confirmed. The offset-index pair is live on disk (24.2MB offsets, 159.2MB jsonl), the cards carry real `wikiEntries`/`memoryEntries`, and the hook's doc-pointer rendering is exercised against the real index — not dead code. The seek reads the 24.2MB offsets table once (matching the ~619ms cold-parse claim) and `fs.read`s exact bytes, never the 644MB graph.

Now I have everything needed to grade.

---

## VERDICT: PASS

Clean, hook-safe, well-tested implementation. The over-fire surface is the only real concern, and it is bounded acceptably. No P0. Two P1s below — both judgment/robustness calls, neither blocks ship.

### Over-fire analysis (the weighted concern)
The whitelist is well-chosen. On a real coding prompt, a false dotted token forcing the ~619ms cold parse requires a token matching `(eng|disp|ghost|formula|wiki|skill|memory_reference|memory_patterns|tribal-tip|ms-envelope)\.<ident>`:
- `eng.`, `disp.`, `ghost.`, `formula.`, `tribal-tip.`, `ms-envelope.`, `memory_*` — effectively never appear as prose/code dotted tokens. Good.
- `wiki.` and `skill.` are the only plausible spurious hits, and both are rare as `<word>.<ident>` in code (you'd write `wiki/index.md` or `skills/`, not `wiki.foo`). Acceptable.
- Critically, the seek VERIFIES each candidate against the offset table (`hasOwnProperty` + id-match) and `seekCard` NEVER bulk-parses the 193MB sidecar (`node-card-read.mjs:290-303` returns null on `unavailable`). So even a false trigger costs only the one-time 24MB offsets parse (cached per-process), well under the 3000ms timeout vs ~619ms worst case. The cost-when-fired is acceptable. Excluding `fs/test/git/core/script/fe/vault/datacat` is the right call and is asserted in the test.

### Contract conformance vs the sibling
Matches `master-index-precheck-inject.mjs` on every axis: `readFileSync(0,"utf8")` stdin (`:141`), exact output shape `{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext}}` (`:135-137`), exit-0-on-
... [+3795 chars truncated]
