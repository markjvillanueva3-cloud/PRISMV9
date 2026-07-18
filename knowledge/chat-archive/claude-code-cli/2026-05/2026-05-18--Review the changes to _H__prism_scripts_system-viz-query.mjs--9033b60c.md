---
type: "chat-session"
source: "claude-code-cli"
session_id: "9033b60c-6a5f-4c7e-973c-57826958d374"
title: "Review the changes to `H:/prism/scripts/system-viz-query.mjs`. Two surgical edit"
date: "2026-05-18"
first_ts: "2026-05-18T14:52:07.979Z"
last_ts: "2026-05-18T14:52:55.225Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/9033b60c-6a5f-4c7e-973c-57826958d374/subagents/agent-acc81567882c80fd8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review the changes to `H:/prism/scripts/system-viz-query.mjs`. Two surgical edit

> **claude-code-cli** | 2026-05-18 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9033b60c-6a5f-4c7e-973c-57826958d374/subagents/agent-acc81567882c80fd8.jsonl`

## Transcript

### User | 2026-05-18T14:52:07.979Z

Review the changes to `H:/prism/scripts/system-viz-query.mjs`. Two surgical edits:

1. Line ~23: import added — `loadFindCache` added to the existing `import { loadGraph, findInGraph }` from `./lib/system-viz-graph.mjs`.

2. Around line 38-58 (where `let G; try { G = loadGraph(); } ...` used to be): a NEW early-exit block for `cmd === "find"` was inserted BEFORE the eager `loadGraph()` call. The new block uses `loadFindCache()` instead, formats hits, and `process.exit(0)`. The original `else if (cmd === "find") { ... }` block at line ~190 (formerly line 164) is now UNREACHABLE because the new block exits the process first — verify this is intentional and safe.

CONTEXT: viz-first-redirect hook fires ~1060×/day spawning fresh `node` subprocesses that call this script's `find` cmd. The original code eagerly parses the 370MB system-graph.json BEFORE dispatching cmds, costing ~2s per fire. The short-circuit uses `loadFindCache()` (a ~2MB projected sidecar — 170× smaller) for `find` only; all other cmds still use the existing `loadGraph()` path unchanged.

VERIFY (P0/P1):
1. **Behavioral equivalence** — the new find branch must produce IDENTICAL human + JSON output to the old branch at line ~190. Compare line-by-line:
   - Old: `out(human, hits)` where human = `Found N node(s) matching "q":\n  L?/sub  id  label-firstline`
   - New: inline equivalent
2. **JSON output parity** — `wantJson` path emits the same array shape (hits as-is from findInGraph)
3. **Error exit codes preserved** — empty query → exit 2; load failure → exit 3
4. **No silent change to other cmds** — `loadGraph()` placement after the find short-circuit must not affect headline/roadmap-candidates/blast-radius/etc.
5. **`findInGraph` compatibility** — pass `g` from `loadFindCache()` which returns `{nodes: [...slim nodes with label/id/info/subgroup/layer/kind]}`. Verify the find branch's output formatter reads ONLY those fields (h.layer, h.subgroup, h.id, h.label).
6. **Dead-code clarity** — the old `else if
... [+345 chars truncated]

### Assistant | 2026-05-18T14:52:16.998Z

I'll analyze the changes to `H:/prism/scripts/system-viz-query.mjs`.

### Assistant | 2026-05-18T14:52:17.129Z

[tool_use: Read]

### User | 2026-05-18T14:52:19.370Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+15604 chars truncated]

### Assistant | 2026-05-18T14:52:24.630Z

Now let me check the `loadFindCache` implementation and original `findInGraph` to verify behavioral equivalence.

### Assistant | 2026-05-18T14:52:25.985Z

[tool_use: Grep]

### User | 2026-05-18T14:52:28.833Z

[tool_result] 29: *   findInGraph(G, q, opts)   — case-insensitive node search.
159:export function findInGraph(G, terms, { limit = 30 } = {}) {
171: * loadFindCache — cross-process sidecar optimized for findInGraph().
179: * fields findInGraph() actually reads — label, id, info, subgroup, layer,
187: * is for `findInGraph` ONLY. DO NOT USE if you need `graph.edges`,
231:// Fields findInGraph() actually inspect
... [+171 chars truncated]

### Assistant | 2026-05-18T14:52:31.975Z

[tool_use: Read]

### User | 2026-05-18T14:52:33.265Z

[tool_result] 155	 * @param {object} opts
156	 * @param {number} opts.limit - Maximum hits to return (default 30).
157	 * @returns {Array} Matching node objects.
158	 */
159	export function findInGraph(G, terms, { limit = 30 } = {}) {
160	  const q = (Array.isArray(terms) ? terms.join(" ") : terms).toLowerCase();
161	  return G.nodes
162	    .filter(n =>
163	      (n.label + " " + n.id + " " + (n.info ?? "") + 
... [+8231 chars truncated]

### Assistant | 2026-05-18T14:52:55.225Z

I have all the information needed for the verdict.

## VERDICT: PASS (with 1 P1 finding)

### Verification Results

**1. Behavioral equivalence (P0): PASS**
- New find branch (lines 44-60) produces identical output to old branch (lines 188-196).
- `findInGraph(g, q, {limit:30})` called with same args; same `toLowerCase()` query header; same per-line format `${h.layer}/${h.subgroup ?? '_'}  ${h.id.padEnd(28)} ${(h.label ?? '').split('\n')[0]}`.

**2. JSON output parity (P0): PASS**
- New branch emits `JSON.stringify(hits, null, 2)` — equivalent to old `out(human, hits)` JSON path.

**3. Error exit codes preserved (P0): PASS**
- Empty query → `process.exit(2)` (matches old).
- Load failure → `process.exit(3)` (matches old `loadGraph()` failure path).

**4. No silent change to other cmds (P0): PASS**
- Short-circuit gated on `cmd === "find"` with `process.exit(0)`. All other cmds fall through to `loadGraph()` at line 62 unchanged.

**5. `findInGraph` compatibility (P0): PASS**
- `loadFindCache()` returns `{nodes: [...slim]}` with `FIND_FIELDS = ["label","id","info","subgroup","layer","kind"]`.
- `findInGraph` reads `n.label + n.id + n.info + n.subgroup` (all projected).
- Output formatter reads `h.layer, h.subgroup, h.id, h.label` — all projected.
- `(h.label ?? '')` is MORE defensive than old `h.label.split(...)` (old would crash if label undefined). Improvement.

**7. `out()` function placement: PASS** — short-circuit inlines its own output (no `out()` dependency); intentional and formatting matches.

### P1 Finding

**6. Dead-code clarity (P1): FAIL**
- Lines 188-196 (`else if (cmd === "find") { ... }`) are now unreachable — the short-circuit at line 59 calls `process.exit(0)` before the dispatch chain.
- Risk: future maintainers may edit the dead block believing it's live, causing silent divergence between the two formatters. Either DELETE the dead block OR add a comment like `// UNREACHABLE — see find short-circuit at line 44; kept for diff-review only` and a TODO
... [+460 chars truncated]
