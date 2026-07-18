---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "Adversarially review a bug-fix to a JS module + its test. Read BOTH files end-to"
date: "2026-06-12"
first_ts: "2026-06-12T04:18:12.199Z"
last_ts: "2026-06-12T04:18:46.227Z"
cwd: "H:\\prism-slot-sierra"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a324c601aa72a9f03.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Adversarially review a bug-fix to a JS module + its test. Read BOTH files end-to

> **claude-code-cli** | 2026-06-12 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a324c601aa72a9f03.jsonl`

## Transcript

### User | 2026-06-12T04:18:12.199Z

Adversarially review a bug-fix to a JS module + its test. Read BOTH files end-to-end:
- H:\prism-slot-sierra\scripts\lib\corpus-index-query.mjs
- H:\prism-slot-sierra\scripts\lib\corpus-index-query.test.mjs

CONTEXT / what changed and why:
This lib is the query contract PRISM app features (quoting/ERP/machines/tooling) + the `prism_session:corpus_query` MCP dispatcher use to look up the JM DIE + Docustrata corpora. The OLD code pinned the substrate to a single hardcoded path `H:/prism/state/shared/corpus-index/corpus-index.json`. LIVE BUG: the index was committed to a slot worktree (`H:/prism-slot-sierra`) but absent from the hardcoded canonical path, so the CLI + dispatcher threw "substrate not found" from the slot tree. The fix adds `corpusSubstrateCandidates()` (ordered: env PRISM_CORPUS_SUBSTRATE -> PRISM_REPO-relative -> module-relative repo root via import.meta.url -> canonical H:/prism) + `resolveCorpusSubstrate()` (first existing) and rewrites `loadCorpusIndex()` to resolve across them with a fail-loud error that lists every path tried + the build command.

Verify SPECIFICALLY (this is your mandate — silent failures / fail-loud integrity):
1. Backward compat: existing callers/tests pass an EXPLICIT path. Does the new `loadCorpusIndex(substratePath=null,...)` still honor an explicit path exactly as before (cache behavior, force, fail-loud on a missing explicit path)? The old fail-loud regex was /substrate not found/ — does it still match for the explicit-missing case?
2. Is there ANY path where the lib silently returns `{}`/undefined/stale instead of throwing when the substrate can't be resolved? (R12 — a silent {} makes every consumer think the shop has zero documents.)
3. Cache correctness: `_cache`/`_cachePath` now key on the RESOLVED path, not the passed arg. Any staleness/cross-path cache bleed? (e.g. resolve to slot path, then env changes, then a force call.)
4. The module-relative candidate uses `path.resolve(fileURLToPath(import.meta.url)/../..)`. Is 
... [+532 chars truncated]

### Assistant | 2026-06-12T04:18:15.912Z

I'll read both files end-to-end before reviewing.

### Assistant | 2026-06-12T04:18:16.782Z

[tool_use: Read]

### Assistant | 2026-06-12T04:18:16.952Z

[tool_use: Read]

### User | 2026-06-12T04:18:19.494Z

[tool_result] 1	// scripts/lib/corpus-index-query.mjs -- SIERRA-VAULT-OPS / U-CORPUS-APP-WIRE (2026-06-10, slot:sierra)
2	//
3	// The QUERY CONTRACT that PRISM app features (quoting / business-ERP / machines / tooling)
4	// call to look up the JM DIE + Docustrata corpora WITHOUT walking 428K files. Reads the cheap
5	// aggregate substrate `state/shared/corpus-index/corpus-index.json` produced by
6	// build-corp
... [+7977 chars truncated]

### User | 2026-06-12T04:18:19.527Z

[tool_result] 1	// scripts/lib/corpus-index-query.test.mjs
2	//
3	// U-CORPUS-APP-WIRE (2026-06-10, slot:sierra) -- tests for the corpus-index query contract
4	// that app features (quoting/ERP/machines/tooling) consume.
5	
6	import test from 'node:test';
7	import assert from 'node:assert/strict';
8	import {
9	  loadCorpusIndex, _resetCorpusCache, corpusSummary, findJmFolder,
10	  jmByExtension, docustrataByTyp
... [+9069 chars truncated]

### Assistant | 2026-06-12T04:18:46.227Z

Both files read end-to-end. Verdict against the 5 mandate points.

## PASS

The fix is sound on every mandate axis. No P0/P1 silent-failure findings. Details:

**1. Backward compat (explicit path)** — HONORED exactly. `loadCorpusIndex('/p/sub.json', {_fs})` sets `resolved = substratePath` (line 53, short-circuits resolution), caches on resolved path (60/65-66), forces re-read (60), and throws on a missing explicit path via the `existsSync` check at 61-62. The explicit-missing error string `substrate not found: ${resolved}` still matches the old `/substrate not found/` regex (test line 52-58 passes via `fakeFs(..., {exists:false})`). Cache/force/fail-loud are byte-identical behavior for explicit callers.

**2. Silent `{}`/undefined/stale path** — NONE. Two throw gates: unresolved (54-59) and resolved-but-vanished (61-63). `JSON.parse` at 64 throws on corrupt content rather than returning `{}`. There is no `catch`, no `return {}`, no default. The CLI `isMain` block (155-158) catches only to emit `{"error":...}` to stderr + `exit(1)` — fail-loud, not a silent swallow. R12 holds.

**3. Cache correctness** — Keying on `resolved` (not the arg) is the *correct* fix, and the scenario you flagged is safe: resolve to slot path → env changes → force call re-runs `resolveCorpusSubstrate` (because `substratePath` is null on the default path), gets the new resolved path, `_cachePath === resolved` is now false, so it re-reads even without `force`. No cross-path bleed: a different resolved path always misses the cache (60). One nuance, not a bug: with `force:false` and the env changed but the *old* resolved path still existing, resolution re-runs every call (cheap `existsSync` walk) and returns fresh — never stale.

**4. `../..` + Windows separators** — CORRECT. File at `scripts/lib/corpus-index-query.mjs`; `here = .../scripts/lib`; `path.resolve(here,'..','..')` = repo root. `fileURLToPath` yields native backslashes on Windows and `path.resolve`/`path.join` (via spread `...SUBSTRA
... [+2050 chars truncated]
