---
type: "chat-session"
source: "claude-code-cli"
session_id: "a9284c28-44ab-410b-aa5a-53d41d8084d0"
title: "Scrutiny ARM A (holistic correctness + fail-soft) for slot:sierra's node→vault-p"
date: "2026-06-06"
first_ts: "2026-06-06T16:19:28.243Z"
last_ts: "2026-06-06T16:21:59.995Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/a9284c28-44ab-410b-aa5a-53d41d8084d0/subagents/agent-a19b2a5e20274cee0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Scrutiny ARM A (holistic correctness + fail-soft) for slot:sierra's node→vault-p

> **claude-code-cli** | 2026-06-06 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a9284c28-44ab-410b-aa5a-53d41d8084d0/subagents/agent-a19b2a5e20274cee0.jsonl`

## Transcript

### User | 2026-06-06T16:19:28.243Z

Scrutiny ARM A (holistic correctness + fail-soft) for slot:sierra's node→vault-paths hook wiring (CHEAP-NODE-ACCESS-MS0/U-SV-NODE-VAULT-PATHS). These are HOT PreToolUse hooks firing on every Bash/Grep/Write across a 26-slot fleet — a defect degrades fleet-wide. Grade PASS/FAIL + P0/P1 only.

Review these committed changes:
1. H:/prism/scripts/lib/graph-exact-match.mjs — new `vaultPathsLine(seekDocs, h0)` + `seekDocs` opt threaded into `exactMatchBanner`. Verify: fail-soft (throwing seekDocs → "" not crash), 2-entry cap, id-preferred-over-label, null/empty → "".
2. H:/prism/.claude/hooks/pre-bash-graph-inject.mjs — inline seekDocs in renderInject + main() seekCard wrapper.
3. H:/prism/.claude/hooks/pre-grep-graph-inject.mjs + pre-write-graph-inject.mjs — seekDocs threaded to exactMatchBanner + main() wrapper.
4. seekCard contract: H:/prism/scripts/lib/node-card-read.mjs `seekCard` — confirm it is seek-only, never reads the 644MB graph, never throws (returns null), so calling it in a per-prompt/per-tool hook is latency-safe.

Key question: can the new code EVER throw, block the tool, or change the banner when seekCard returns null? (It must not — the no-regression test asserts banner-identical.) Confirm the wrapper handles seekCard returning null/undefined/missing-card. Report file:line. End: VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-06T16:19:47.428Z

I'll review the committed changes for this hot-path PreToolUse hook wiring. Let me read the four files in question.

### Assistant | 2026-06-06T16:19:48.711Z

[tool_use: Read]

### Assistant | 2026-06-06T16:19:48.801Z

[tool_use: Read]

### User | 2026-06-06T16:19:54.407Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\node-card-read.mjs' was already read 20m ago in this session and is unchanged (mtime 1780596560301). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T16:19:54.999Z

[tool_result] 1	// graph-exact-match.mjs — shared exact-match predicate + node→path render line
2	// for the PreToolUse graph-context-inject hooks (pre-bash / pre-grep / pre-write).
3	// SYSTEM-VIZ / U-SV-NAV-INJECT-GREP-WRITE (sierra).
4	//
5	// WHY shared: pre-bash first grew the "exact-match collapse" (when the derived
6	// keys match exactly ONE concrete graph node, emit a short banner + a
7	// `→ Read <rep
... [+4771 chars truncated]

### Assistant | 2026-06-06T16:19:57.843Z

The node-card-read.mjs was read earlier but I don't have it in my visible context. Let me read it now, plus the three hook files.

### Assistant | 2026-06-06T16:19:58.303Z

[tool_use: Read]

### Assistant | 2026-06-06T16:19:58.842Z

[tool_use: Read]

### User | 2026-06-06T16:20:03.524Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\node-card-read.mjs' was already read 20m ago in this session and is unchanged (mtime 1780596560301). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T16:20:06.184Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-bash-graph-inject.mjs — PreToolUse:Bash graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A4.
7	 *
8	 * Sibling of pre-read / pre-grep / pre-write graph-inject. Before a Bash
9	 * command runs, surface the master-index nodes the graph already knows —
10	 * but NARROW: bash is mostly `git` / `npm` / `node` / build commands that
11
... [+12992 chars truncated]

### Assistant | 2026-06-06T16:20:09.603Z

Now let me read the node-card-read.mjs seekCard contract (bypassing cache) and the remaining two hooks.

### Assistant | 2026-06-06T16:20:11.462Z

[tool_use: Bash]

### Assistant | 2026-06-06T16:20:11.864Z

[tool_use: Read]

### Assistant | 2026-06-06T16:20:12.109Z

[tool_use: Read]

### User | 2026-06-06T16:20:34.375Z

[tool_result] 6: * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
17: * flag rather than silently triggering the 644MB load (R12). If NO compact sidecar
44:export const DEFAULT_PATHS = Object.freeze({
55:// serves stale data when a fresh one is available, and never the 644MB graph.
78:  if (!offsetsPath || !fs.existsSync(offsetsPath)) return null;
87:    doc = JSON.parse(fs.readF
... [+1583 chars truncated]

### User | 2026-06-06T16:20:46.280Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-write-graph-inject.mjs — PreToolUse:Write graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A3.
7	 *
8	 * Sibling of pre-read / pre-grep graph-inject. Before a Write creates or
9	 * overwrites a file, surface the master-index nodes whose name overlaps the
10	 * target filename — "the graph has N related/duplicate nodes for this n
... [+10482 chars truncated]

### User | 2026-06-06T16:20:46.373Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-grep-graph-inject.mjs — PreToolUse:Grep graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A2.
7	 *
8	 * Sibling of pre-read-graph-inject.mjs. Before a Grep runs, surface the
9	 * master-index nodes that already match the grep pattern — "the graph
10	 * already knows these N nodes for your pattern" — so Claude can often
11	 * answ
... [+10121 chars truncated]

### Assistant | 2026-06-06T16:20:54.606Z

I now have the full contract for `seekCard`. Let me verify the two critical branches of `seekCard` (lines 290-303) and confirm what `_seekCard` returns so I can trace the null-handling exactly.

### Assistant | 2026-06-06T16:20:55.493Z

[tool_use: Read]

### User | 2026-06-06T16:20:59.391Z

[tool_result] 238	 * sidecars. Pass a COMPLETE path set when you need full isolation (tests do).
239	 */
240	export function readCard(id, opts = {}) {
241	  if (typeof id !== "string" || !id.trim()) {
242	    throw new Error("readCard: id must be a non-empty string");
243	  }
244	  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };
245	
246	  // Cheap seek path first (U-NODECARD-OFFSET-INDEX): when the 
... [+2891 chars truncated]

### Assistant | 2026-06-06T16:21:20.673Z

I have everything needed. Let me trace the critical null-handling path and confirm the no-regression invariant holds.

**Trace of `seekCard` → `seekDocs` → banner, for every return shape:**

`seekCard(id)` returns exactly one of two shapes:
- `{ card, source, stale:false, schemaVersion }` on a fresh-index hit (line 300), or
- `null` (line 291 bad-id guard, line 297 `_seekCard` throw, line 302 miss/stale/corrupt).

It can NEVER throw (try/catch at 294-298 wraps the only throwing call; the bad-id and miss paths return `null` directly).

**`seekDocs` wrapper (identical in all 3 hooks, e.g. pre-bash 193-201):**
```
const r = seekCard(id);
if (!r || !r.card) return null;   // null OR shape without .card → null
```
`seekCard` never returns a truthy value without `.card`, so `!r` covers the null case and `!r.card` is belt-and-suspenders. No throw possible. `c.wikiEntries`/`c.memoryEntries` defensively coerced to `[]` via `Array.isArray`. Clean.

**`vaultPathsLine(seekDocs, h0)` (graph-exact-match.mjs 58-70) — the shared renderer:**
- Line 59: `if (typeof seekDocs !== "function" || !h0) return ""` — handles undefined resolver / missing hit.
- Line 60-69: whole body in `try { ... } catch { return "" }` — a throwing `seekDocs` yields `""`.
- Line 61: `seekDocs(h0.id || h0.label)` — id preferred, label fallback. ✓
- Line 62: `if (!d) return ""` — null docs → `""`. ✓
- Line 64-65: 2-entry cap via `.slice(0, 2)`. ✓
- Line 66: `bits.length ? line : ""` — both arrays empty → `""`. ✓

**The no-regression invariant (banner-identical when seekDocs returns null):**
When `seekDocs` returns `null` (the overwhelmingly common case — node has no card, or offset index absent/stale), `vaultPathsLine` returns `""`. In `exactMatchBanner` line 90-91, `docLine = ""` and the banner template appends `${docLine}` = empty string. The banner is byte-identical to the pre-change form. ✓ Same for the inlined pre-bash version (lines 91-102: `docLine` stays `""`). ✓

**Latency/fail-soft chain:** import wr
... [+1374 chars truncated]

### Assistant | 2026-06-06T16:21:21.734Z

[tool_use: Bash]

### User | 2026-06-06T16:21:38.339Z

[tool_result] H:/prism/scripts/lib/node-card-offset-lib.mjs:51: * @param {Array<object>} nodes  compact node records ({id,label,layer,status,info,knowledge?})
H:/prism/scripts/lib/node-card-schema.mjs:22:  "wikiPath", "pointerPath", "wikiEntries", "memoryEntries", "docTotals",
H:/prism/scripts/lib/node-card-schema.mjs:35: * genuinely-relative path that merely contains `knowledge/` mid-path is left
H:/prism/scri
... [+877 chars truncated]

### Assistant | 2026-06-06T16:21:59.995Z

Confirmed. The NodeCard schema (`node-card-schema.mjs` line 22, 88-89) defines top-level `card.wikiEntries` and `card.memoryEntries` — exactly the field names the `seekDocs` wrappers read (`c.wikiEntries` / `c.memoryEntries`). So the feature genuinely surfaces data when a card has docs; the field names are correct, not just fail-safe. No correctness concern remains.

This completes the review.

---

## VERDICT: PASS

Scrutiny ARM A (holistic correctness + fail-soft) — slot:sierra's `U-SV-NODE-VAULT-PATHS` hook wiring. No P0, no P1.

### Key question answered: Can the new code EVER throw, block the tool, or change the banner when `seekCard` returns null?
**No — proven on all three counts.** Four independent fail-soft layers each degrade to `""`/`null`, any one of which alone preserves the invariant:

1. **`seekCard` no-throw contract** — `node-card-read.mjs:290-303`: bad-id guard returns `null` (291), the only throwing call `_seekCard` is wrapped `try/catch → return null` (294-298), miss/stale/corrupt returns `null` (302). It is seek-only; it never reaches `readCard`'s `buildIndex`/193MB parse or the 644MB-graph throw (`node-card-read.mjs:200`, reachable only via `readCard`, not `seekCard`). Latency-safe for a per-tool hot path. ✓
2. **Wrapper null-guard** — `pre-bash:194-195`, `pre-grep:158-159`, `pre-write:163-164`: `if (!r || !r.card) return null` covers null and any shape-without-card. ✓
3. **`vaultPathsLine` triple guard** — `graph-exact-match.mjs:58-70`: `typeof seekDocs !== "function" || !h0 → ""` (59); entire body in `try/catch → ""` (60,67-68); `!d → ""` (62); empty arrays → `bits.length ? … : ""` (66). ✓
4. **Import fail-open** — `pre-bash:191-202` (and grep/write siblings): import wrapped, `catch → seekDocs=null → renderInject(..., undefined)`. ✓

**No-regression (banner-identical) verified:** when `seekCard`→null (the dominant case), `vaultPathsLine`→`""`, and `exactMatchBanner` (`graph-exact-match.mjs:90-91`) / inlined pre-bash (`91-105`) append `${docLi
... [+1721 chars truncated]
