---
type: "chat-session"
source: "claude-code-cli"
session_id: "396bc735-a076-4d5a-977a-de669f963c1b"
title: "You are reviewing a 2026-05-18 backend-dev tribal-knowledge wiring change in PRI"
date: "2026-05-18"
first_ts: "2026-05-18T17:40:26.985Z"
last_ts: "2026-05-18T17:45:24.152Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 11
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/396bc735-a076-4d5a-977a-de669f963c1b/subagents/agent-a93428ea1959ef07d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# You are reviewing a 2026-05-18 backend-dev tribal-knowledge wiring change in PRI

> **claude-code-cli** | 2026-05-18 | 25 msgs (11 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/396bc735-a076-4d5a-977a-de669f963c1b/subagents/agent-a93428ea1959ef07d.jsonl`

## Transcript

### User | 2026-05-18T17:40:26.985Z

You are reviewing a 2026-05-18 backend-dev tribal-knowledge wiring change in PRISM. Verify end-to-end correctness against the unit goal.

**Unit goal:** Wire high-ROI tribal knowledge (coding, computer sciences, software development, software engineering, AI building, deep learning systems, neural networks) to PRISM nodes that surface knowledge to backend-dev chats. Concretely: add `backend-dev` as a 6th domain to the tribal precontext pipeline so backend-dev memory/external entries get the 2× in-domain cosine boost in `tribal-rerank.mjs` when a backend-dev slot queries.

**Files changed in this session (review end-to-end, not split sections):**

1. `H:/prism/.claude/hooks/tribal-by-domain-inject.mjs` — added `backend-dev` entry to `DOMAIN_MAP`, placed LAST (after the 5 manufacturing domains) so first-match-wins preserves mill/lathe/wedm/cad/cam precedence. Tokens cover backend-dev milestone vocabulary (backend, hook, ollama, lora, gnn, neural, llm, embedding, knowledge, etc.).

2. `H:/prism/.claude/scripts/tribal-rerank.mjs` — docstring + usage CLI text now include `backend-dev` in the accepted-domain list. (Logic unchanged: `e.domain === domain` is a string compare that works for any domain string.)

3. `H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs` — added 4 new test groups covering backend-dev tokens, first-match-wins safety invariant (mill+hook → still routes to mill), case-insensitive backend-dev matching, plus rewrote the "system, viz, brain → general" test to assert that `hook+synergy` now routes to backend-dev (intentional contract change).

4. `H:/prism/scripts/retag-tribal-backend-dev.mjs` (NEW) — one-shot idempotent script that retags 34 entries in `state/shared/tribal-embed-index.json` from `general`/`cam`/`lathe` → `backend-dev`. Selection: memory entries with kw≥2 OR external entries with kw≥4. Pure planner/applier, atomic write.

5. `H:/prism/scripts/retag-tribal-backend-dev.test.mjs` (NEW) — 24-case node:test suite for BD_KEYWORD_RE / sco
... [+1880 chars truncated]

### Assistant | 2026-05-18T17:41:59.981Z

I'll verify the invariants by reading the actual files and running the tests.

### Assistant | 2026-05-18T17:42:00.703Z

[tool_use: Read]

### User | 2026-05-18T17:42:07.712Z

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
... [+11793 chars truncated]

### Assistant | 2026-05-18T17:42:13.998Z

[tool_use: Read]

### User | 2026-05-18T17:42:17.671Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * tribal-rerank.mjs — L2 of TRIBAL × AI
4	 *
5	 * Reads `state/shared/tribal-embed-index.json` (L1), embeds the
6	 * incoming query via Ollama nomic-embed-text, returns top-N hits
7	 * with optional domain weighting.
8	 *
9	 * Differs from L1 --query in three ways:
10	 *   1. Domain-aware: --domain <mill|lathe|wedm|cad|cam|backend-dev|general>
11	 *      doubles the 
... [+2608 chars truncated]

### Assistant | 2026-05-18T17:42:22.203Z

[tool_use: Bash]

### User | 2026-05-18T17:42:37.277Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
14 matches in 8F:

[file] 10 (1):
     0: --domain <mill|lathe|wedm|cad|cam|backend-dev|general>

[file] 112 (1):
     0: null;

[file] 120 (1):
     0: ...mjs --query \"<text>\" [--domain mill|lathe|wedm|cad|cam|backend-dev|ge
... [+672 chars truncated]

### Assistant | 2026-05-18T17:42:41.312Z

[tool_use: Read]

### User | 2026-05-18T17:42:44.360Z

[tool_result] 85	    process.stderr.write(`[citation-log] append failed: ${e.message}\n`);
86	  }
87	}
88	
89	async function rerank({ query, domain, k }) {
90	  if (!query || typeof query !== "string" || query.length < 3) {
91	    throw new Error("query must be a non-empty string (≥3 chars)");
92	  }
93	  const idx = readIndex();
94	  if (!idx.entries || idx.entries.length === 0) {
95	    throw new Error("index
... [+2404 chars truncated]

### Assistant | 2026-05-18T17:42:50.121Z

Good — `e.domain === domain` is a clean string compare, works for any new domain value.

### Assistant | 2026-05-18T17:42:50.246Z

[tool_use: Read]

### User | 2026-05-18T17:42:55.500Z

[tool_result] 1	#!/usr/bin/env node
2	// tribal-by-domain-inject.test.mjs — hermetic node:test suite
3	//
4	// Pure-function tests for extractPrompt / inferTribalDomain /
5	// parseRerankOutput / formatInjection. No Ollama / no subprocess.
6	//
7	// Run: node --test H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs
8	
9	import { describe, it } from "node:test";
10	import assert from "node:assert/strict";

... [+13272 chars truncated]

### Assistant | 2026-05-18T17:43:03.958Z

Now let me check token collision and run both test suites.

### Assistant | 2026-05-18T17:43:11.194Z

[tool_use: Bash]

### User | 2026-05-18T17:43:45.264Z

[tool_result] overlap count: 0 tokens: []

### Assistant | 2026-05-18T17:43:52.163Z

[tool_use: Bash]

### User | 2026-05-18T17:44:23.020Z

[tool_result]     1..8
ok 5 - formatInjection
  ---
  duration_ms: 1.9956
  type: 'suite'
  ...
1..5
# tests 40
# suites 5
# pass 40
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 400.7119

### Assistant | 2026-05-18T17:44:27.583Z

[tool_use: Bash]

### User | 2026-05-18T17:44:41.691Z

[tool_result]   ...
1..6
# tests 24
# suites 6
# pass 24
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 182.2935

### Assistant | 2026-05-18T17:44:45.443Z

[tool_use: Read]

### User | 2026-05-18T17:44:47.524Z

[tool_result] read-once-guard: 'H:\prism\scripts\retag-tribal-backend-dev.mjs' was already read 3m ago in this session and is unchanged (mtime 1779125780579). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T17:44:57.893Z

[tool_use: Grep]

### User | 2026-05-18T17:45:03.144Z

[tool_result] 29: * Pure: BD_KEYWORD_RE + scoreEntry + classify are exported for the hermetic
47:export const TARGET_DOMAIN = "backend-dev";
66:export function classify(entry) {
68:  if (entry.domain === TARGET_DOMAIN) return { retag: false, reason: "already", score: 0 };
92:    const c = classify(e);
116:    next.entries[step.idx] = { ...original, domain: TARGET_DOMAIN };
121:function atomicWriteJSON(outPath, 
... [+378 chars truncated]

### Assistant | 2026-05-18T17:45:24.152Z

All invariants verified. Final review.

---

## Grade: PASS

**Tests:** 40/40 + 24/24 PASS.

**Invariants verified:**

- **Token collision: ZERO overlap.** Cross-set check confirmed 0 of 38 backend-dev tokens collide with the 54 mfg tokens. Manufacturing-only slots cannot route to backend-dev; pure dev slots cannot capture manufacturing precedence.
- **First-match-wins precedence:** `DOMAIN_MAP` at `tribal-by-domain-inject.mjs:65-86` lists mill→lathe→wedm→cad→cam→backend-dev. `inferTribalDomain` at `:140-144` short-circuits on first match. Test `:159-168` regression-pins `["mill","hook"]→mill`, `["lathe","ollama"]→lathe`, `["wedm","neural"]→wedm`, `["cad","embedding"]→cad`, `["cam","lora"]→cam`. Load-bearing order is locked.
- **Intentional contract change:** Original `["hook","synergy"]→"general"` test was correctly inverted to backend-dev at `:148`. Old "unrelated tokens" coverage preserved at `:137-138` via `["system","viz","brain"]→"general"` (none of those tokens appear in any domain set — independently verified).
- **`tribal-rerank.mjs`:** logic at `:102` is `e.domain === domain` — pure string compare, no enum gate, works for `backend-dev` immediately. Usage strings at `:10`, `:120` correctly list `backend-dev`. CLI arg lowercased at `:112` (`backend-dev` lowercases to itself — safe).
- **Idempotency:** `classify` at `retag-tribal-backend-dev.mjs:68` short-circuits with `{retag:false, reason:"already"}` when `entry.domain === TARGET_DOMAIN`. Second `--apply` is a no-op.
- **Atomic write:** `atomicWriteJSON` at `:121-124` uses `outPath + ".tmp." + process.pid + "." + Date.now()`. Single-process collision risk: bounded by ms-tick uniqueness within the same PID; cross-process: bounded by PID disjointness. Acceptable for a one-shot script — not a hot-path concurrent writer.
- **No physics constants / no stub assertions** — n/a, confirmed clean. All new tests assert concrete expected values.

**Findings:**

- **P2** (informational, not blocking): `retag-tribal-back
... [+604 chars truncated]
