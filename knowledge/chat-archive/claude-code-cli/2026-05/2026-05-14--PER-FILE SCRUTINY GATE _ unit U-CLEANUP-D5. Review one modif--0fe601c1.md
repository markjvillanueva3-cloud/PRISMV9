---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "PER-FILE SCRUTINY GATE — unit U-CLEANUP-D5. Review one modified file end-to-end."
date: "2026-05-14"
first_ts: "2026-05-14T13:47:27.298Z"
last_ts: "2026-05-14T13:54:41.402Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 18
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-aa732c470029bd16d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# PER-FILE SCRUTINY GATE — unit U-CLEANUP-D5. Review one modified file end-to-end.

> **claude-code-cli** | 2026-05-14 | 48 msgs (18 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-aa732c470029bd16d.jsonl`

## Transcript

### User | 2026-05-14T13:47:27.298Z

PER-FILE SCRUTINY GATE — unit U-CLEANUP-D5. Review one modified file end-to-end.

FILE: H:\prism\.claude\hooks\wiki-precheck-inject.mjs

UNIT D5 CONTRACT: "EXTEND wiki-precheck-inject.mjs to honor boost_keywords frontmatter (not new parallel hook); extracted wiki entries carry boost_keywords: [hook, settings.json, *.mjs] etc; existing BM25 + semantic-fallback infrastructure reused; cap injection at 8 KB; logs misses with hashed-keyword to wiki-inject-misses.jsonl"

WHAT CHANGED:
- New env-overridable path constants (PRISM_WIKI_LEAF_INDEX, PRISM_WIKI_MISSES_LOG, PRISM_WIKI_CACHE_DIR, etc.) for test isolation; live defaults unchanged.
- New constants: MAX_INJECT_BYTES=8192, BOOST_BASE_SCORE=12.0, BOOST_PER_KEYWORD=3.0, MISS_HASH_TOKENS=16.
- New pure functions: `matchBoostKeywords(promptLower, boostKw)` (substring + glob), `hashKeyword(s)` (12-hex sha1), `capInjection(header, entryLines, footer, maxBytes)` (8KB cap with trim note), `logMiss(promptToks, semReason)` (fail-safe append).
- `loadLeafCorpus()` now carries a `boost` field per entry from the JSONL `boost_keywords`.
- `main()` now takes an optional `injectedInput` param (testability); after BM25 candidates, a boost-keyword scan over leafCorpus adds synthetic-high-score candidates; both the BM25 output path and the semantic-fallback output path now route through `capInjection`; the no-match path calls `logMiss`.
- `out()` now returns the emitted object. Bottom: `export { main, matchBoostKeywords, hashKeyword, capInjection, loadLeafCorpus }` + an `isDirectRun` guard so importing the module (in tests) doesn't auto-run `main()`.

CONTRACT WITH THE PRODUCER: `build-wiki-leaf-index.mjs` emits `boost_keywords` as a lowercased `string[]` per JSONL record. This hook must read that exact field name and shape.

ALREADY VERIFIED by an e2e smoke test (9/9 pass): boost keyword surfaces an entry BM25 would miss; glob `*.mjs` matches; miss logged with hashed tokens (no raw prompt text); `continue:true` always present; capInje
... [+1821 chars truncated]

### Assistant | 2026-05-14T13:47:30.548Z

I'll review this file end-to-end against the contract and focus areas.

### Assistant | 2026-05-14T13:47:30.708Z

[tool_use: Read]

### User | 2026-05-14T13:47:32.940Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+18797 chars truncated]

### Assistant | 2026-05-14T13:47:36.541Z

Now let me check the producer contract to verify the field name and shape.

### Assistant | 2026-05-14T13:47:38.116Z

[tool_use: Bash]

### User | 2026-05-14T13:47:43.236Z

[tool_result] -rwxr-xr-x 1 Mark V 197608 13405 May 14 08:35 H:/prism/scripts/build-wiki-leaf-index.mjs
---
{"name":"acal","title":"adaptiveControl:acal","type":"action","desc":"Dispatcher action — invoke via `adaptiveControl({ action: \"acal\", ... })`","path":"knowledge/wiki/architecture/actions/adaptivecontrol/acal.md"}
{"name":"adachat","title":"adaptiveControl:adaChat","type":"action","desc":"Dispatcher act
... [+893 chars truncated]

### Assistant | 2026-05-14T13:47:46.794Z

[tool_use: Bash]

### User | 2026-05-14T13:47:50.871Z

[tool_result] 47:const ARRAY_KEYS = new Set(["boost_keywords"]);
67:// `boost_keywords` (U-CLEANUP-D5) is extractable:
68://   inline:  boost_keywords: [hook, settings.json, "*.mjs"]
69://   block:   boost_keywords:
118:// Normalize a frontmatter `boost_keywords` value (array | string | absent) into a
162:      rec.boost_keywords = boostKeywords;
176:    pushEntry(name, title, type, desc, path, normalizeBoostKe
... [+568 chars truncated]

### Assistant | 2026-05-14T13:47:53.791Z

[tool_use: Read]

### User | 2026-05-14T13:47:55.863Z

[tool_result] 115	  return fm;
116	}
117	
118	// Normalize a frontmatter `boost_keywords` value (array | string | absent) into a
119	// clean lowercased string[] (or null). Non-string elements are dropped (not
120	// stringified). Capped at MAX_BOOST_KEYWORDS to bound a single entry's footprint.
121	function normalizeBoostKeywords(v) {
122	  let arr = null;
123	  if (Array.isArray(v)) arr = v;
124	  else if (ty
... [+1872 chars truncated]

### Assistant | 2026-05-14T13:48:03.391Z

Producer contract confirmed: `boost_keywords` emitted as a lowercased `string[]`, only present when non-empty. The consumer reads the exact field name. Now let me verify the focus areas in detail.

**Focus 2 — ReDoS:** The glob→regex conversion at line 114: `k.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[\\w.-]*")`. The escape set escapes `. + ^ $ { } ( ) | [ ] \` but **not `?`**. A `?` in a keyword stays literal-regex `?` (zero-or-one quantifier). More importantly: `*` becomes `[\w.-]*`. Multiple adjacent `*` → `[\w.-]*[\w.-]*` — that *is* a classic catastrophic-backtracking shape. Let me verify.

### Assistant | 2026-05-14T13:48:07.992Z

[tool_use: Bash]

### User | 2026-05-14T13:48:14.605Z

[tool_result] Exit code 1
[eval]:2
function build(k){ return new RegExp(k.replace(/[.+^${}()|[\]\]/g, "\$&").replace(/\*/g, "[\w.-]*")); }
                                               ^

SyntaxError: Invalid regular expression: missing /
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:internal/process
... [+141 chars truncated]

### Assistant | 2026-05-14T13:48:17.230Z

Shell escaping mangled it. Let me write a test file instead.

### Assistant | 2026-05-14T13:48:23.788Z

[tool_use: Write]

### User | 2026-05-14T13:48:34.791Z

[tool_result] File created successfully at: H:\prism\.claude\hooks\__redos_probe.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-14T13:48:37.451Z

The probe is a scratch file I'll delete after. Let me run it.

### Assistant | 2026-05-14T13:48:38.248Z

[tool_use: Bash]

### User | 2026-05-14T13:50:05.360Z

[tool_result] Exit code 255
regex(**a): [\w.-]*[\w.-]*a

### Assistant | 2026-05-14T13:50:08.786Z

The probe **crashed/hung** on the very first case — `[\w.-]*[\w.-]*a` against 60k non-matching chars. Exit 255 with no further output means it either hung past a limit or blew up. Let me confirm with a timed, smaller input to characterize it precisely.

### Assistant | 2026-05-14T13:50:12.355Z

[tool_use: Write]

### User | 2026-05-14T13:50:21.807Z

[tool_result] The file H:\prism\.claude\hooks\__redos_probe.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-14T13:50:25.139Z

[tool_use: Bash]

### User | 2026-05-14T13:51:11.622Z

[tool_result] regex(**a): [\w.-]*[\w.-]*a
  **a vs 1000 'w': 892 ms (len 1000)
  **a vs 2000 'w': 6321 ms (len 2000)
exit: 124

### Assistant | 2026-05-14T13:51:20.311Z

**Confirmed P0 — catastrophic backtracking.** `**a` → `[\w.-]*[\w.-]*a`:
- 1000 chars → 892ms
- 2000 chars → 6321ms (≈7x for 2x input — quadratic-to-exponential blowup)
- 4000 chars → timed out past 30s

This is a UserPromptSubmit hook. A boost keyword containing `**` (or any two `*` separated only by escapable metachars) plus a prompt with a few thousand word-characters and no terminating match → the hook **hangs the harness**. `boost_keywords` is frontmatter-derived — any wiki author (or a corrupted/auto-generated entry) can introduce `**`. Even innocently: `boost_keywords: ["**/*.mjs"]` is a *natural* glob a human would write for "any .mjs file", and it produces `[\w.-]*\/[\w.-]*\.mjs` — let me check that realistic case plus a couple more before finalizing.

### Assistant | 2026-05-14T13:51:27.172Z

[tool_use: Write]

### User | 2026-05-14T13:51:40.057Z

[tool_result] The file H:\prism\.claude\hooks\__redos_probe.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-14T13:51:42.754Z

[tool_use: Bash]

### User | 2026-05-14T13:52:08.724Z

[tool_result] k="**/*.mjs" -> [\w.-]*[\w.-]*\/[\w.-]*\.mjs
k="*.*" -> [\w.-]*\.[\w.-]*
k="src/**" -> src\/[\w.-]*[\w.-]*
k="*-engine-*" -> [\w.-]*-engine-[\w.-]*
k="a*a*a*" -> a[\w.-]*a[\w.-]*a[\w.-]*
--- timing realistic pathological inputs (3k chars) ---
**/*.mjs src: [\w.-]*[\w.-]*\/[\w.-]*\.mjs
  **/*.mjs vs 3k 'w': 18624 ms
*-engine-* src: [\w.-]*-engine-[\w.-]*
  *-engine-* vs 3k 'w': 19 ms
a*a*a* src: a[
... [+55 chars truncated]

### Assistant | 2026-05-14T13:52:15.003Z

Confirmed. `**/*.mjs` — a **completely natural human-written glob** — produces `[\w.-]*[\w.-]*\/[\w.-]*\.mjs` and takes **18.6 seconds** against a 3000-char prompt with no `/`. A normal-length prompt of a few thousand characters with file paths or code snippets pasted in would hang the UserPromptSubmit hook for tens of seconds to minutes. `src/**` produces the same adjacent-`[\w.-]*[\w.-]*` shape.

Note `*-engine-*` (single stars separated by a literal) is fine — 19ms. The catastrophic case is specifically **two `*` with nothing (or only escaped metachars) between them**, which `**`, `**/`, and `/**` all produce.

Now let me clean up the probe and verify the remaining focus areas — particularly the cache invalidation and isDirectRun guard.

### Assistant | 2026-05-14T13:52:21.919Z

[tool_use: Bash]

### User | 2026-05-14T13:52:25.963Z

[tool_result] probe removed
hdr+ftr overflow w/ entries -> returns header only, len: 5000 (>8192 OK? defensive)
empty entries: "H\nF"
emoji header bytelen: 21 vs .length: 19

### Assistant | 2026-05-14T13:52:28.803Z

capInjection edge cases are fine: header-only fallback is defensive (unreachable at 8KB with real headers), empty entries work, emoji byte measurement correct. Now the isDirectRun guard and cache invalidation:

### Assistant | 2026-05-14T13:52:33.242Z

[tool_use: Bash]

### User | 2026-05-14T13:52:42.638Z

[tool_result] pathToFileURL(backslash path): file:///H:/prism/prism.claudehookswiki-precheck-inject.mjs
import.meta.url equiv:         file:///H:/prism/.claude/hooks/wiki-precheck-inject.mjs
MATCH: false
fwd-slash argv match: true

### Assistant | 2026-05-14T13:52:49.867Z

That `pathToFileURL` result with the backslash arg looks mangled — but that's the shell eating my backslashes again, not real behavior. Let me test properly with a fixed string.

### Assistant | 2026-05-14T13:52:53.893Z

[tool_use: Write]

### User | 2026-05-14T13:53:04.728Z

[tool_result] File created successfully at: H:\prism\.claude\hooks\__guard_probe.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-14T13:53:08.304Z

[tool_use: Bash]

### User | 2026-05-14T13:53:13.575Z

[tool_result] argv1 (backslash): H:\prism\.claude\hooks\wiki-precheck-inject.mjs
pathToFileURL ->   file:///H:/prism/.claude/hooks/wiki-precheck-inject.mjs
import.meta.url -> file:///H:/prism/.claude/hooks/wiki-precheck-inject.mjs
isDirectRun would be: true
probe removed

### Assistant | 2026-05-14T13:53:17.221Z

`isDirectRun` is correct on Windows — `pathToFileURL` normalizes backslashes to a forward-slash `file://` URL matching `import.meta.url`. No false-negative. The `!!process.argv[1] &&` guard also handles the `argv[1]` undefined case (REPL/`-e`). Safe.

Now let me verify the remaining items: cache invalidation on regen, and the boost-scan dedup interaction.

### Assistant | 2026-05-14T13:53:18.395Z

[tool_use: Read]

### User | 2026-05-14T13:53:22.428Z

[tool_result] 255	
256	| Type | Count |
257	|------|-------|
258	${typeRows}
259	
260	## How the tree stays fresh
261	
262	\`scripts/regen-wiki-from-viz.mjs\` (fingerprint-gated multi-stage orchestrator)
263	regenerates everything on every post-commit + hourly cron — skips the chain when
264	the graph + inputs are unchanged. Generator chain: \`generate-layer-wiki\`,
265	\`generate-domain-wiki\`, \`generate-disp
... [+1277 chars truncated]

### Assistant | 2026-05-14T13:53:38.897Z

The producer does `writeFileSync(LEAF_INDEX, ...)` which updates the file's `mtimeMs`. The consumer's `loadLeafCorpus()` (line 173) checks `c.mtime === st.mtimeMs` — so a regen with new `boost_keywords` produces a new mtime, the cached corpus mismatches, and it rebuilds. Cache invalidation is **correct**. (Caveat: filesystem mtime resolution — if a regen completed within the same mtime tick as the prior write, the cache wouldn't invalidate, but that's a pre-existing property of all three caches in this file, not a D5 regression, and the producer is fingerprint-gated so rapid no-op regens are skipped.)

Now the dedup interaction — let me trace it carefully against the code at lines 298–322:

- BM25 pushes `{e, s, matches, leaf}` for index.md + leaf entries.
- Boost scan pushes `{e, leaf:true, boosted:true, ..., s: BOOST_BASE_SCORE...}` — **same `e` object reference** from `leafCorpus.entries` if that entry also matched BM25.
- Sort by `s` desc, then `seen.has(x.e.name)` dedup.

If a leaf entry matches *both* BM25 and boost: two candidate objects exist, both with `x.e.name` equal. After sort, the boosted one (s≥12) sorts above the BM25 one (typically s<12), so the **boosted variant wins** and the BM25 duplicate is filtered. Correct — and desirable (the boost tag shows). Boosted entries bypass `MIN_SCORE`/`MIN_MATCHES` because they're pushed directly to `candidates` — that's intentional per the contract ("surface an entry BM25 would miss"). The `matches: MIN_MATCHES` field is set but unused after push (only `s` drives ranking). Fine.

One real correctness note: index.md and leaf corpus can have entries with the **same `name`** (the producer dedups names *within* the leaf corpus via `~2` suffixing, but not across index.md). The comment at line 318 says "index.md entry wins over leaf if both match" — but that's only true if the index.md entry has a higher or equal score. If a leaf entry is *boosted* (s≥12) and the index.md entry scored, say, 6.0, the **leaf entry wins**,
... [+287 chars truncated]

### Assistant | 2026-05-14T13:53:46.863Z

[tool_use: Bash]

### User | 2026-05-14T13:53:56.231Z

[tool_result] hashKeyword(undefined): da39a3ee5e6b
fail-safe paths: no unguarded throw found in logMiss/capInjection/matchBoostKeywords/boost-scan

### Assistant | 2026-05-14T13:54:41.402Z

All fail-safe paths trace clean **except the RegExp construction**. Here is the critical gap: `matchBoostKeywords` at line 114 calls `new RegExp(...)` with no try/catch. Beyond ReDoS, a malformed glob could also throw a *synchronous* `SyntaxError` — e.g. a keyword that, after escaping, still contains an unbalanced construct. The escape set escapes `[ ]` and `\`, and `*`→`[\w.-]*`, so a plain syntax error is hard to reach... but `?` is **not** escaped, and a keyword *ending* in `\` — wait, `\` is escaped. Let me confirm whether any unescaped char can produce a SyntaxError, since that throw would propagate up through `main()`'s boost scan (which has no try/catch) and the `.catch()` on line 362 only catches the *promise* rejection — `main()` is `async`, so a synchronous throw inside it *does* become a rejected promise, so `.catch(() => out({}))` **would** catch it. So a SyntaxError is survivable. But ReDoS is not — it hangs, never throws, never rejects.

Let me verify the `out({})` in the `.catch` still emits `continue:true` — yes, line 351 `out` always spreads `{continue:true}`. Good.

Final summary of findings.

---

## Code Quality Analysis Report — `wiki-precheck-inject.mjs` (U-CLEANUP-D5)

### Summary
- File reviewed end-to-end against the D5 contract and producer (`build-wiki-leaf-index.mjs`).
- Contract conformance: **correct** — reads `boost_keywords` as lowercased `string[]`, 8KB cap via `capInjection`, misses logged with hashed tokens, BM25 + semantic infra reused, no parallel hook.
- **1 P0** (live-hook hang), **0 P1**, 2 P2 (noted, non-blocking).

---

### P0 — ReDoS: catastrophic backtracking in `matchBoostKeywords` glob→regex (line 114)

The glob→regex conversion `k.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[\\w.-]*")` produces **adjacent `[\w.-]*[\w.-]*`** whenever a `boost_keywords` value contains two `*` separated by nothing or only escapable metachars. This is classic catastrophic backtracking.

Measured (this review, real `node`):
- `**a` 
... [+4928 chars truncated]
