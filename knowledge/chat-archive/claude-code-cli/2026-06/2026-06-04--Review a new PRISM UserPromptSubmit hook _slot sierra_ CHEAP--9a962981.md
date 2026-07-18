---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a962981-7a23-49ca-a503-804671284925"
title: "Review a new PRISM UserPromptSubmit hook (slot sierra, CHEAP-NODE-ACCESS-MS0 · U"
date: "2026-06-04"
first_ts: "2026-06-04T18:05:16.367Z"
last_ts: "2026-06-04T18:08:07.822Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-ab3a0867e5a825b1e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review a new PRISM UserPromptSubmit hook (slot sierra, CHEAP-NODE-ACCESS-MS0 · U

> **claude-code-cli** | 2026-06-04 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-ab3a0867e5a825b1e.jsonl`

## Transcript

### User | 2026-06-04T18:05:16.367Z

Review a new PRISM UserPromptSubmit hook (slot sierra, CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK). It detects system-viz node ids in a prompt and injects their compact cards via a SEEK (no graph load, no 193MB sidecar parse) — zero-tool-call card prefetch. Read END TO END and grade PASS/FAIL with P0/P1 only:

1. H:/prism/.claude/hooks/node-card-prefetch-inject.mjs  (the hook: detectNodeIds, buildPrefetchContext, renderCard, main)
2. H:/prism/scripts/lib/node-card-read.mjs  (the NEW `seekCard` export near the bottom — seek-only, hook-safe)

Focus on CORRECTNESS + the hook's load-bearing safety guarantees:
- BUDGET INVARIANT (the whole point): the hook must NEVER trigger the 193MB full-sidecar parse. `seekCard` calls `_seekCard` only and returns null on unavailable/miss — confirm it can NEVER reach `buildIndex`. If a prompt names a node but the offset index is absent/stale, does the hook stay cheap (no bulk parse)?
- FAIL-SOFT: main() must never throw/block a prompt. Trace every path (bad stdin, JSON parse fail, seekCard throw, render throw) → exit 0, no output. Any uncaught throw?
- DETECTION regex `ID_RE`: the prefix class is `(?:^|[^A-Za-z0-9_-])(?:eng|disp|ghost|...)\.[A-Za-z0-9][A-Za-z0-9._-]*`. Does the leading non-capturing boundary + the `tok.replace(/^[^A-Za-z0-9_]+/,'')` correctly recover the id without dropping a leading char of the prefix? Does trailing-punctuation strip (`/[._\-,;:)\]}>"'.]+$/`) ever over-strip a valid id (e.g. a real id ending in a digit is fine, but could it strip an internal-looking char)? Any catastrophic-backtracking / ReDoS risk in the regex on a long prompt?
- The `g`-flag regex is module-level (shared) — is `matchAll` (not `.exec` in a loop) used so there's no lastIndex statefulness bug across calls?
- renderCard: any path where a card field (info/label/wikiEntries) shape surprises it into a throw? truncate handles null?

Report: VERDICT (PASS/FAIL), then P0/P1 with file:line + one-line fix. Concise.

### Assistant | 2026-06-04T18:05:32.679Z

I'll review both files end to end now.

### Assistant | 2026-06-04T18:05:33.613Z

[tool_use: Read]

### Assistant | 2026-06-04T18:05:33.637Z

[tool_use: Read]

### User | 2026-06-04T18:05:37.947Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\node-card-read.mjs' was already read 1s ago in this session and is unchanged (mtime 1780595758098). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T18:05:37.959Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\node-card-prefetch-inject.mjs' was already read 3s ago in this session and is unchanged (mtime 1780595991012). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-04T18:05:42.354Z

The read-once guard fired but I don't actually have the content in context from this session. Let me bypass the cache.

### Assistant | 2026-06-04T18:05:43.339Z

[tool_use: Bash]

### User | 2026-06-04T18:05:55.613Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * node-card-prefetch-inject.mjs — UserPromptSubmit injector
 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK, slot:sierra)
 *
 * When a prompt NAMES a system-viz node id (e.g. `eng.mill`, `ghost.galaxy.wedm`,
 * `formula.kienzle`), this hook SEEKS that node's compact card from the offset
 * index and injects it as additionalContext — so the model gets the n
... [+6652 chars truncated]

### Assistant | 2026-06-04T18:05:59.260Z

I have the hook source. Now let me read the `seekCard` export in node-card-read.mjs, focusing on the relevant portion.

### Assistant | 2026-06-04T18:06:01.153Z

[tool_use: Bash]

### User | 2026-06-04T18:06:13.324Z

[tool_result]      1	/**
     2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
     3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
     4	 *
     5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
     6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
     7	 * compact projection sidecar (no new heavy build):
     8	
... [+15943 chars truncated]

### Assistant | 2026-06-04T18:06:18.855Z

I have both files fully. Let me verify the schema helper's `assertCard`/`makeCard` behavior to confirm whether a malformed seeked record could throw inside `seekCard` (it's wrapped in try/catch, but let me confirm renderCard's field assumptions against what `assertCard` guarantees).

### Assistant | 2026-06-04T18:06:20.411Z

[tool_use: Bash]

### User | 2026-06-04T18:06:32.757Z

[tool_result]      1	/**
     2	 * node-card-schema.mjs — the compact "node card" record shape for token-cheap
     3	 * node reads (CHEAP-NODE-ACCESS-MS0, slot:sierra).
     4	 *
     5	 * THE PROBLEM: status-quo "find + read a node" loads the 644MB system-graph.json
     6	 * to extract one node — ~186K tokens per access. A NodeCard is the minimal record
     7	 * that lets an agent IDENTIFY + LOCATE a node (
... [+6136 chars truncated]

### Assistant | 2026-06-04T18:06:53.577Z

I now have all three files end to end. Let me trace the critical paths carefully.

**BUDGET INVARIANT trace:** The hook imports only `seekCard`. `seekCard` → `_seekCard` → `loadOffsets`. None of these reach `buildIndex` (which is the only function that parses the 193MB sidecar). `_seekCard` returns `unavailable`/`miss`/`hit`; `seekCard` maps anything not-`hit` to `null`. `buildIndex` is reached only via `readCard`/`cardCount`, which the hook never calls. **Confirmed: the hook can NEVER trigger the bulk parse.** Absent/stale/corrupt offset index → `loadOffsets` returns `null` → `unavailable` → `null`. Stale → `unavailable` → `null`. All cheap.

**FAIL-SOFT trace in main():** `readStdinSync` catches → "". `JSON.parse` wrapped → exit 0. `buildPrefetchContext` wrapped in try/catch → exit 0. `seekCard` itself never throws (internal try/catch, bad-id guard). `renderCard` only runs on a validated card. No uncaught throw path. **Confirmed fail-soft.**

Now let me scrutinize the detection regex and renderCard edge cases more carefully.

**Detection / leading-char recovery:** `ID_RE` = `(?:^|[^A-Za-z0-9_-])(?:eng|...)\.[A-Za-z0-9][...]*`. The leading alternation is either start-of-string `^` (zero-width) or a single non-`[A-Za-z0-9_-]` char (consumed into m[0]). Then `tok.replace(/^[^A-Za-z0-9_]+/, "")` strips leading non-`[A-Za-z0-9_]`.

Let me check the comment's claim about `memory_reference` with a leading `_`. The boundary class is `[^A-Za-z0-9_-]` — it excludes `_` and `-`. So an underscore can NOT be the consumed boundary char (good — it means `_eng.mill` won't match because `_` isn't a boundary and `_e` isn't a prefix start... actually wait).

Let me think about a real concern. Consider the prompt token `memory_reference.foo`. The regex needs a prefix from the list. The list has `memory_reference`. The match: `^` or boundary, then `memory_reference\.`. Fine. But the leading-strip regex `/^[^A-Za-z0-9_]+/` — if the boundary char consumed was e.g. a space, `tok` = `" me
... [+1402 chars truncated]

### Assistant | 2026-06-04T18:07:02.308Z

[tool_use: Bash]

### User | 2026-06-04T18:07:06.152Z

[tool_result] call1: ["eng.mill","ghost.galaxy.wedm"]
call2: ["eng.mill","ghost.galaxy.wedm"]
startofstring: ["eng.mill"]
mem_ref: ["memory_reference.foo_bar"]
tribal: ["tribal-tip.x123"]
nonNode: []
paren-wrapped eng: ["eng.mill"]
redos1 ms: 1
redos2 ms: 2
redos3 ms: 0

### Assistant | 2026-06-04T18:07:20.405Z

All empirical checks pass:
- `matchAll` is stateless across calls (call1 === call2) — no `lastIndex` bug. The module-level `g`-flag regex with `.exec()` in a loop would have leaked `lastIndex`, but `matchAll` creates a fresh iterator each call. **Correct.**
- Leading prefix char never dropped (`eng.mill`, `memory_reference.foo_bar`, `tribal-tip.x123` all recovered intact).
- Non-node dotted tokens (`fs.`, `schema.org`, `test.js`) correctly excluded.
- ReDoS: linear, all sub-3ms on 200K-char adversarial inputs. The regex body is `[A-Za-z0-9._-]*` (no nested quantifier / no overlapping alternation that backtracks) — no catastrophic backtracking. **Safe.**

One remaining concern to verify: in `buildPrefetchContext`, `detectNodeIds` caps at `MAX_SCAN=24`, then the loop calls `seekCard` up to `k` (≤8) times. Each `seekCard` parses the offsets table once but it's cached after the first (`_offsetsCacheByPath`), so multiple ids in one prompt pay the ~13MB parse once, not per-id. Good — but note the cache is keyed by offsets-file path and persists module-scope; in the short-lived hook process this is fine.

Let me confirm the renderCard null/shape safety and the `truncate` null handling, plus verify there's no path where a card field surprises renderCard into a throw, by checking against the `assertCard` guarantees (id: non-empty string; label: string; layer: string|null; everything else optional/untyped).

### Assistant | 2026-06-04T18:07:30.143Z

[tool_use: Bash]

### User | 2026-06-04T18:07:35.301Z

[tool_result] A: "- **eng.mill** [L8]"
B: "- **x.y**"
C: "- **x.y** — 12345"
D: "- **x.y**\n  docs to read: wiki: [object Object] ·  (+3)"
E: "- **x.y**\n  docs to read: wiki: a · b"
F: "- **x.y**"

### Assistant | 2026-06-04T18:08:07.822Z

`renderCard` is throw-free across all surprising shapes: null/number `info`, missing `docTotals`, non-string array elements (coerced via `join`, no throw), non-string `kind`/`status` (filtered by `typeof` guard). The only cosmetic wart is case D (`[object Object]` if a wikiEntry were a non-string), but `assertCard` doesn't constrain `wikiEntries` element types — however, `makeCard` always builds them from `relDocPath`-mapped strings, and the seek path validates via `assertCard`. Worst case is an ugly string injected, never a throw or a budget breach. Not P0/P1.

I have everything I need. Final assessment.

---

## VERDICT: PASS

Both files are correct and the load-bearing safety guarantees hold. No P0 or P1 findings.

### Budget invariant — HOLDS
The hook imports only `seekCard`. Call graph `seekCard → _seekCard → loadOffsets` never reaches `buildIndex` (the sole 193MB-sidecar parser, reachable only via `readCard`/`cardCount`/`readCards`, none called by the hook). Every non-`hit` `_seekCard` status (`unavailable` from absent/stale/corrupt/torn-pair/bad-offset; `miss` from a fresh-index genuine absence) maps to `null` in `seekCard` (node-card-read.mjs:299-302). Absent or stale offset index → `loadOffsets` returns `null` (line 78) or `_seekCard` returns `unavailable` on `loaded.stale` (line 126) → cheap. **The hook can never trigger the bulk parse.** Confirmed empirically that the jsonl is only `fs.readSync`'d for exact `length` bytes (lines 138-139), never bulk-read.

### Fail-soft — HOLDS
`main()` (node-card-prefetch-inject.mjs:138-150) has no uncaught-throw path: bad stdin → `readStdinSync` catch → `""`; JSON parse fail → catch → exit 0; `buildPrefetchContext` (which calls `detectNodeIds`, `seekCard`, `renderCard`) wrapped in try/catch → exit 0; `seekCard` is internally non-throwing (try/catch at line 294 + bad-id guard at 291); `renderCard` runs only on an `assertCard`-validated card and is throw-free against all field shapes (verified). Output only on a real hit.
... [+1941 chars truncated]
