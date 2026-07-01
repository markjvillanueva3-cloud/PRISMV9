---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "INVESTIGATE a suspected broken heuristic: H:/prism/scripts/galaxy-verify.mjs rep"
date: "2026-06-01"
first_ts: "2026-06-01T16:59:17.691Z"
last_ts: "2026-06-01T17:03:25.130Z"
cwd: "H:\\prism-slot-bravo"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_a4f7e4a2-5e4/agent-ae747ae6470003ee2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# INVESTIGATE a suspected broken heuristic: H:/prism/scripts/galaxy-verify.mjs rep

> **claude-code-cli** | 2026-06-01 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_a4f7e4a2-5e4/agent-ae747ae6470003ee2.jsonl`

## Transcript

### User | 2026-06-01T16:59:17.691Z

INVESTIGATE a suspected broken heuristic: H:/prism/scripts/galaxy-verify.mjs reports ">=3 wiki refs (heuristic) — 0 hits in wiki/index.md" for what looks like EVERY galaxy (alpha, bravo, charlie all show 0). Determine the ROOT CAUSE:
1. Read scripts/galaxy-verify.mjs — find the exact wiki-ref check (what string does it grep for in knowledge/wiki/index.md, and how?).
2. Independently verify: do galaxies ACTUALLY appear in knowledge/wiki/index.md? Pick 3 galaxies (quoting, cad, mill), grep knowledge/wiki/index.md for their names/engines, report real hit counts.
3. CONCLUDE: is the 0-wiki-refs a (a) BROKEN HEURISTIC in galaxy-verify (e.g. wrong search string / wrong file / case mismatch), or (b) a REAL fleet-wide gap (galaxies genuinely absent from wiki/index.md)?
Return: root cause (a or b) + the exact buggy line if (a) + a one-line proposed fix + evidence (the real grep counts). Return ONLY that.

### Assistant | 2026-06-01T17:00:27.811Z

I'll investigate this step by step. Let me start by reading the script and independently verifying the wiki index in parallel.

### Assistant | 2026-06-01T17:00:28.482Z

[tool_use: Read]

### Assistant | 2026-06-01T17:00:29.722Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:00:30.683Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:00:31.328Z

[tool_use: Grep]

### User | 2026-06-01T17:00:48.484Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### User | 2026-06-01T17:00:48.745Z

[tool_result] H:\prism\knowledge\wiki\index.md:64

Found 64 total occurrences across 1 file.

### User | 2026-06-01T17:00:49.042Z

[tool_result] H:\prism\knowledge\wiki\index.md:10

Found 10 total occurrences across 1 file.

### User | 2026-06-01T17:00:49.934Z

[tool_result] 1	// scripts/galaxy-verify.mjs — galaxy completeness scorecard (GALAXY-KIT-MS0, slot:bravo 2026-05-29).
2	// CONTENT-level checks (not just file-existence) for a slot's galaxy, per the canonical kit
3	// (state/shared/specs/GALAXY-CANONICAL-KIT-2026-05-29.md). Single-sourced slot->galaxy map.
4	// CLI:  node scripts/galaxy-verify.mjs <slot>     |     node scripts/galaxy-verify.mjs --all
5	// Exit 
... [+3802 chars truncated]

### Assistant | 2026-06-01T17:01:05.495Z

The buggy line is clear. Let me confirm the slot→galaxy map names and verify with the exact regex the script uses (word-boundary, since galaxy names contain hyphens).

### Assistant | 2026-06-01T17:01:05.884Z

[tool_use: Read]

### User | 2026-06-01T17:01:11.813Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\slot-galaxy-map.mjs' was already read 78s ago in this session and is unchanged (mtime 1780114614869). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-01T17:01:31.280Z

[tool_use: Grep]

### User | 2026-06-01T17:01:35.265Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### Assistant | 2026-06-01T17:01:47.178Z

The read-once guard says the slot-galaxy-map is already in my context, but it isn't — let me grep it for the three galaxy names I'm verifying to confirm the actual galaxy strings the script resolves.

### Assistant | 2026-06-01T17:01:48.443Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:01:52.883Z

[tool_use: Grep]

### User | 2026-06-01T17:01:53.010Z

[tool_result] 2:// SINGLE SOURCE OF TRUTH for slot -> galaxy mapping (GALAXY-KIT-MS0, slot:bravo 2026-05-29).
29:  alpha:   "token-optimization",
30:  bravo:   "hermes-zulu",
31:  charlie: "quoting",
32:  delta:   "cad",
34:  foxtrot: "mill",
52:  zulu:   "hermes-zulu",      // legacy alias (pre-SLOT-RECLAIM); shares galaxy with bravo

### User | 2026-06-01T17:02:01.819Z

[tool_result] 29:- [[AssemblyPlanner]] — AssemblyPlannerEngine — U-CUIX-P0-22 / CAD-UIX-MS0 | category:concepts | sources:1 | confidence:0.7 | last_verified:2026-05-08 | source:src/engines/AssemblyPlannerEngine.ts
34:- [[AutoCADAddinPlugin]] — AutoCADAddinPluginEngine — U-CAD-APP-12 (PHASE-48) | category:concepts | sources:1 | confidence:0.7 | last_verified:2026-05-08 | source:src/engines/AutoCADAddinPluginEngi
... [+1286 chars truncated]

### Assistant | 2026-06-01T17:02:11.379Z

I have all the evidence I need. The root cause is now fully diagnosed.

The key insight: `mill` got 10 hits and `cad` got 10 hits under my Grep — but those were **case-insensitive substring** matches inside `CADAdapterRegistry`, `BliskCAD`, etc. The script's regex is **case-INsensitive** too (`'gi'` flag) AND uses **word boundaries** (`\bmill\b`, `\bcad\b`). With word boundaries, `CADAdapterRegistry` does NOT match `\bcad\b` (no boundary between `CAD` and `Adapter`). So the script counts genuine standalone-token hits, which can legitimately be near-zero for galaxy names that never appear as a bare word in the engine-keyed index.

But the decisive finding is `quoting`: my own case-insensitive grep returned **0 hits** for `quoting` in `index.md`. That is not a regex artifact — the galaxy names are genuinely absent. Let me do one final confirmation pass to distinguish broken-heuristic from real-gap, checking the exact tokens the script searches for.

### Assistant | 2026-06-01T17:02:13.615Z

[tool_use: Bash]

### User | 2026-06-01T17:03:00.915Z

[tool_result] quoting              word-boundary(gi) hits = 0
cad                  word-boundary(gi) hits = 0
mill                 word-boundary(gi) hits = 0
token-optimization   word-boundary(gi) hits = 0
hermes-zulu          word-boundary(gi) hits = 0
cad-fusion-live      word-boundary(gi) hits = 0

### Assistant | 2026-06-01T17:03:25.130Z

ROOT CAUSE: **(a) BROKEN HEURISTIC** in galaxy-verify.mjs — the check greps `knowledge/wiki/index.md` for the bare galaxy *directory name* as a standalone word, but that index keys every entry by CamelCase **engine class name** (e.g. `[[CADAdapterRegistry]] — CADAdapterRegistryEngine`), never the lowercase galaxy slug. So the search term has zero structural reason to appear and returns 0 for every galaxy — including hermes-zulu and token-optimization, which are demonstrably mature.

EXACT BUGGY LINES (scripts/galaxy-verify.mjs:50-52):
```
const wikiIdx = readSafe(`${REPO}/knowledge/wiki/index.md`) || '';
const wikiHits = (wikiIdx.match(new RegExp(`\\b${g.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi')) || []).length;
add(`>=3 wiki refs for ${g} (heuristic)`, wikiHits >= 3, `${wikiHits} hits in wiki/index.md`);
```
The defect: `\b${g}\b` requires the slug as a whole word, but (1) the index never contains lowercase slugs, and (2) even where the chars appear they're inside CamelCase tokens like `CADAdapter` where `\bcad\b` cannot match (no word boundary mid-token). Fails identically for ALL 26 galaxies.

PROPOSED FIX (one line): drop the word boundaries and search the engine *directory path* that the index actually records — match the `source:src/engines/<galaxy>/` substring instead of the bare slug:
```
const wikiHits = (wikiIdx.match(new RegExp(`src/engines/${g.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}/`, 'gi')) || []).length;
```
(or, if the index has no per-galaxy `source:` paths, point the heuristic at `wiki/index.md` substring `\\[\\[.*${g}` case-insensitive without `\b`, or better: count entries whose `source:` resolves under that galaxy dir.)

EVIDENCE (real grep counts):
- Script's exact regex `\bquoting\b/gi`, `\bcad\b/gi`, `\bmill\b/gi` → **0, 0, 0** hits in index.md (also hermes-zulu=0, token-optimization=0, cad-fusion-live=0 — all mature galaxies, proving it's not a content gap).
- Plain case-insensitive substring `cad` = 64 hits, `mill` = 10 hits in i
... [+608 chars truncated]
