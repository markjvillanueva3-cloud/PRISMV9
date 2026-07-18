---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "Review these 3 NEW files end-to-end for the PRISM unit **U-GCF-CARD** (GALAXY-CO"
date: "2026-05-31"
first_ts: "2026-05-31T18:55:41.494Z"
last_ts: "2026-05-31T18:58:05.193Z"
cwd: "H:\\prism-slot-alpha"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a7ca2dc93486c1e36.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:36"
---

# Review these 3 NEW files end-to-end for the PRISM unit **U-GCF-CARD** (GALAXY-CO

> **claude-code-cli** | 2026-05-31 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a7ca2dc93486c1e36.jsonl`

## Transcript

### User | 2026-05-31T18:55:41.494Z

Review these 3 NEW files end-to-end for the PRISM unit **U-GCF-CARD** (GALAXY-CONTEXT-FEDERATION-MS0). Read each file completely:

1. H:/prism/scripts/lib/galaxy-context-card.mjs  (pure core + injected-deps + fail-soft)
2. H:/prism/scripts/galaxy-context-card.mjs       (thin CLI: build|list|show)
3. H:/prism/scripts/lib/galaxy-context-card.test.mjs (13 hermetic node:test cases, all passing)

**Unit spec (what it must do):** Generate a compact per-galaxy CONTEXT-CARD (≤~1 KB) from each galaxy's `mcp-server/src/engines/<g>/MEMORY.md` (+ CLAUDE.md role line + PATHS.md key paths). A card distills the brain into salience-ranked facts so it can be INJECTED/cache-anchored instead of re-reading the whole multi-KB MEMORY.md — that compression IS the token savings. Cards write to `state/shared/galaxy-cards/<g>.card.md` + INDEX.json. It is an OPTIMIZATION, never a correctness gate — must be FAIL-SOFT (a missing/garbage MEMORY.md yields no card, never throws). Must be DETERMINISTIC (no Ollama dependency — Ollama is offline; the Ollama enhancer is a separate gated unit). Design doctrine mirrors scripts/lib/path-ledger.mjs (R11 consistency).

**Verified working:** real-data build produced 34 cards all ≤1024 B; 13/13 tests pass.

**Focus your review on:**
- Correctness of the salience heuristic (headerWeight / scoreLine / top-N selection + source-order restoration). Is it principled and defensible, or arbitrary?
- UTF-8 byte-cap safety in utf8Truncate (multibyte + surrogate-pair handling).
- Fail-soft completeness: is there ANY input/IO path that can throw out of buildAllCards into a caller's work loop? (it must not)
- Path-safety: card filename derives from a readdir'd dir name joined into cardsDir — any traversal/escape risk?
- Test integrity: are the asserts REAL (real expected values, not toBeDefined/stub) and do they actually pin the behavior? Any test that would pass even if the logic broke?
- PRISM conventions: no inlined physics constants (N/A here), no stubs, naming/idiom
... [+252 chars truncated]

### Assistant | 2026-05-31T18:55:50.601Z

I'll review all 3 files end-to-end. Let me read them completely.

### Assistant | 2026-05-31T18:55:51.569Z

[tool_use: Read]

### Assistant | 2026-05-31T18:55:52.034Z

[tool_use: Read]

### Assistant | 2026-05-31T18:55:52.159Z

[tool_use: Read]

### User | 2026-05-31T18:55:55.860Z

[tool_result] 1	// scripts/lib/galaxy-context-card.test.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD (alpha, 2026-05-31).
2	// Hermetic: injected readImpl / listImpl / writeImpl — no real fs, no engines-dir dependency.
3	// Real-value asserts (no stub `toBeDefined()`); the salience heuristic is verified directly.
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  h
... [+10924 chars truncated]

### User | 2026-05-31T18:55:55.898Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/galaxy-context-card.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD (alpha, 2026-05-31).
3	//
4	// Per-galaxy CONTEXT-CARD generator — the cheap inject unit of the federation.
5	// A galaxy's brain lives in mcp-server/src/engines/<g>/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md (often many KB).
6	// Injecting / re-reading a whole MEMORY.md per prompt is the token waste
... [+12282 chars truncated]

### User | 2026-05-31T18:55:56.336Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/galaxy-context-card.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD (alpha, 2026-05-31).
3	//
4	//   node scripts/galaxy-context-card.mjs build [--max-bytes N] [--top-n N]   # (re)build every galaxy card + INDEX.json
5	//   node scripts/galaxy-context-card.mjs list                                # list built cards (from INDEX.json)
6	//   node scripts/ga
... [+2804 chars truncated]

### Assistant | 2026-05-31T18:56:00.384Z

All three files read end-to-end. Let me verify the two most subtle correctness claims directly: the surrogate-pair handling in `utf8Truncate` and the salience top-N + order-restoration behavior.

### Assistant | 2026-05-31T18:56:07.150Z

[tool_use: Bash]

### User | 2026-05-31T18:56:17.339Z

[tool_result] OVER BUDGET at 18 20
OVER BUDGET at 19 20
tiny(5): "\n…[card truncated]" bytes= 20 truncated= true
tiny(0): "\n…[card truncated]" bytes= 20
surrogate/budget bad count: 2

### Assistant | 2026-05-31T18:56:20.762Z

Found a real budget-overflow case. When `maxBytes` is smaller than the marker's byte length, the function returns the marker itself (20 bytes) which exceeds the budget. Let me confirm the marker byte length and check whether this can be reached in production.

### Assistant | 2026-05-31T18:56:25.426Z

[tool_use: Bash]

### User | 2026-05-31T18:56:38.839Z

[tool_result] marker bytes: 20
renderCard(10): bytes= 20 claimed<=10? false

### Assistant | 2026-05-31T18:56:42.499Z

Confirmed. Now let me verify the salience ordering claims and a couple of fail-soft paths — specifically whether `extractGalaxyCard` can throw on any input shape, and whether the `defaultListGalaxies`/`buildAllCards` paths are fully wrapped.

### Assistant | 2026-05-31T18:56:51.049Z

[tool_use: Bash]

### User | 2026-05-31T18:57:10.849Z

[tool_result] THREW extractGalaxyCard: null Cannot read properties of null (reading 'memory')
THREW buildAllCards(listImpl throw): boom
THREW buildAllCards(readImpl throw): readboom
THREW buildAllCards(mkdirImpl throw): mkdirboom
extractKeyPaths big ms: 0

### Assistant | 2026-05-31T18:57:16.081Z

The `null` throw at `extractGalaxyCard` is from my own test harness (`opts={}` default doesn't apply when I pass `null` explicitly — production callers pass `{ memory, claude, paths }` and `{}` default, never `null`), so that one is not a production path. But the `buildAllCards` results are critical. Let me examine the exact lines: the prompt requires `buildAllCards` never throws into a caller's loop. The injected `listImpl`/`readImpl`/`mkdirImpl` throwing are paths the caller controls, but the **default** (production) impls matter most. Let me verify the default paths are wrapped, and confirm the salience ordering.

### Assistant | 2026-05-31T18:57:22.376Z

[tool_use: Bash]

### User | 2026-05-31T18:57:32.716Z

[tool_result] default-impl nonexistent enginesDir → ok= true count= 0 skipped= 0
facts order: ["- a plain pattern line","- UP recall via memory_search 2026-05-30 see foo.ts"]

### Assistant | 2026-05-31T18:57:36.443Z

Default-impl path is fully resilient (nonexistent dir → `ok:true, count:0`, no throw). Source-order restoration works correctly. Let me do a final check on the path-safety question (readdir'd dir name joined into cardsDir) and confirm the test that pins INDEX.json behavior is real.

### Assistant | 2026-05-31T18:57:39.292Z

[tool_use: Bash]

### User | 2026-05-31T18:57:40.769Z

[tool_result] The argument 'args[1]' must be a string without null bytes. Received "source /c/Users/wompu/.claude/shell-snapshots/snapshot-bash-1780097053202-q4mil1.sh 2>/dev/null || true && export TEMP='C:\Users\wompu\AppData\Local\Temp' TMP='C:\Users\wompu\AppData\Local\Temp' && shopt -u extglob 2>/dev/null || true && eval 'cd /h/prism && node -e '\"'\"'
const path = require(\"path\");
// path-safety: a galax
... [+398 chars truncated]

### Assistant | 2026-05-31T18:58:05.193Z

Shell-escaping issue with my multiline command. Let me reason about it directly instead — the path-safety question is answerable analytically. `defaultListGalaxies` uses `readdirImpl(enginesDir, {withFileTypes:true})` filtered to `.isDirectory()`, so names are immediate child directory entries (no path separators possible from a real readdir). The name is joined as `path.join(cardsDir, ``${g}.card.md``)`. A real readdir cannot return `..` or names with separators as directory entries that would escape. I have enough to render the verdict.

## Findings

**P1 — `utf8Truncate` violates its byte-cap contract when `maxBytes` < marker length (20 B).**
`scripts/lib/galaxy-context-card.mjs:81-88`. The marker `"\n…[card truncated]"` is 20 bytes. When `maxBytes < 20` and truncation triggers, `budget = max(0, maxBytes - 20) = 0`, so the result is `"" + marker` = 20 bytes, **exceeding the requested cap** (verified: `utf8Truncate("…long…", 5)` → 20 B; `renderCard(big, {maxBytes:10})` returns `{bytes:20, truncated:true}` while claiming to honor the cap). This is the one place the documented "≤maxBytes / respects the byte budget incl. marker" invariant breaks. Not P0 because production only ever uses `DEFAULT_MAX_BYTES=1024` (and the CLI's `--max-bytes` is operator-supplied), so no real card overflows — but `renderCard`/`utf8Truncate` are exported and the contract is stated unconditionally. Fix: if `maxBytes <= marker bytes`, hard-slice the marker itself to `maxBytes` (or return a budget-clamped marker), so the return is always `≤ maxBytes`.

**P1 — test suite does not pin the small-budget truncation behavior.**
`scripts/lib/galaxy-context-card.test.mjs:41-61`. The `utf8Truncate` test only exercises budgets ≥90 B, all comfortably above the 20 B marker. The asserts `Buffer.byteLength(r.text) <= N` would **fail to catch** the P1 overflow above because no case drives `maxBytes` below the marker length. A test that broke the cap contract for tiny budgets would pass today. Add a case a
... [+2039 chars truncated]
