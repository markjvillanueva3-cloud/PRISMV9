---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27aedbd-e3dc-4ad4-8d70-302aab2a3861"
title: "Per-file scrutiny — reviewer arm A (code-analyzer) for U-MASTER-INDEX-HIT-COUNTE"
date: "2026-05-18"
first_ts: "2026-05-18T22:42:55.485Z"
last_ts: "2026-05-18T22:45:12.399Z"
cwd: "H:\\prism-slot-charlie"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-a8a7738ccfc4d70d9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Per-file scrutiny — reviewer arm A (code-analyzer) for U-MASTER-INDEX-HIT-COUNTE

> **claude-code-cli** | 2026-05-18 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-a8a7738ccfc4d70d9.jsonl`

## Transcript

### User | 2026-05-18T22:42:55.485Z

Per-file scrutiny — reviewer arm A (code-analyzer) for U-MASTER-INDEX-HIT-COUNTER.

FILES TO REVIEW (read each end-to-end):
1. H:/prism-slot-charlie/scripts/lib/master-index-hit-counter.mjs   (NEW, ~150 LOC pure lib)
2. H:/prism-slot-charlie/scripts/lib/master-index-hit-counter.test.mjs (NEW, 21 tests)
3. H:/prism-slot-charlie/.claude/hooks/master-index-precheck-inject.mjs (PATCHED — counter wired in)
4. H:/prism-slot-charlie/.claude/hooks/__tests__/master-index-precheck-inject.test.mjs (NEW, 6 hook tests)

CONTEXT — unit spec (from HIGH-ROI-USAGE-AUDIT-2026-05-18.md action #2):
> Instrument master-index-precheck-inject.mjs with per-query hit counter (~30 LOC). Mirror the wiki-recall-counts.json pattern to reveal which graph queries are high-value.

CONTRACT THE NEW CODE MUST UPHOLD:
- Counter writes to mcp-server/data/state/master-index-hit-counts.json (or env-overridable path).
- Schema mirrors wiki-recall-counts.json (schemaVersion + totalInjections + queries{} + nodes{} with firstSeenIso/lastSeenIso).
- Counter is fail-soft: any I/O failure must NOT block the hook's emit() of additionalContext to stdout.
- Atomic write (tmp + rename) so concurrent reads from peer chats don't see torn JSON.
- LRU prune cap (default 2000 queries / 5000 nodes) to bound the file size.
- Pure-core lib (mkEmptyState/applyHitDelta/pruneOverflow/summarizeState) — no I/O, deterministic, testable.
- Knobs: PRISM_MASTER_INDEX_HIT_COUNTER (off-switch), _FILE (path override), _MAX_QUERIES, _MAX_NODES.

WEIGHT YOUR REVIEW ON:
- Silent breakage / regression risk (R12 fail-loud is gospel — counter errors must be honest, not swallowed-silent)
- I/O security (path injection via env knob? tmp file leak under concurrent writers?)
- Error-budget completeness (what fails when the counter file is locked/missing/corrupt?)
- Integration coupling (does the patch keep the hook's emit() byte-identical for the existing search path?)
- Anti-patterns the hook author may have introduced (magic numbers in test 
... [+279 chars truncated]

### Assistant | 2026-05-18T22:43:12.913Z

I'll perform a thorough code review of the U-MASTER-INDEX-HIT-COUNTER unit. Let me read all four files end-to-end.

### Assistant | 2026-05-18T22:43:13.239Z

[tool_use: Read]

### User | 2026-05-18T22:43:15.786Z

[tool_result] 1	// scripts/lib/master-index-hit-counter.mjs
2	//
3	// Pure-core counter for master-index injector telemetry.
4	// Mirrors the wiki-recall-counts.json schema/pattern (same shape, same
5	// firstSeen/lastSeen semantics) so the existing /wiki-morning + digest
6	// tools can later consume both surfaces uniformly.
7	//
8	// Sister to: mcp-server/data/state/wiki-recall-counts.json
9	// Counter file: m
... [+8538 chars truncated]

### Assistant | 2026-05-18T22:43:19.265Z

[tool_use: Read]

### User | 2026-05-18T22:43:22.850Z

[tool_result] 1	// Tests for master-index-hit-counter.mjs
2	// Uses node:test (matches master-index-search-lib.test.mjs sibling).
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  SCHEMA_VERSION,
8	  DEFAULT_MAX_QUERIES,
9	  DEFAULT_MAX_NODES,
10	  mkEmptyState,
11	  applyHitDelta,
12	  pruneOverflow,
13	  summarizeState,
14	} from "./master-index-hit-counter.mjs";
... [+9055 chars truncated]

### Assistant | 2026-05-18T22:43:25.567Z

[tool_use: Read]

### User | 2026-05-18T22:43:26.968Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+8806 chars truncated]

### Assistant | 2026-05-18T22:43:29.915Z

[tool_use: Read]

### User | 2026-05-18T22:43:30.930Z

[tool_result] read-once-guard: 'H:\prism-slot-charlie\.claude\hooks\__tests__\master-index-precheck-inject.test.mjs' was already read 0s ago in this session and is unchanged (mtime 1779144135553). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you
... [+31 chars truncated]

### Assistant | 2026-05-18T22:43:33.821Z

[tool_use: Bash]

### User | 2026-05-18T22:43:39.803Z

[tool_result] // Integration tests for master-index-precheck-inject.mjs hit counter.
// Focuses on the U-MASTER-INDEX-HIT-COUNTER wire-in:
//  - Counter file is written when hits emit (default-on knob)
//  - Disabled by PRISM_MASTER_INDEX_HIT_COUNTER=0
//  - Repeated runs accumulate
//  - Counter failure does NOT block the additionalContext emit (fail-soft)
//
// Hermetic: the counter file is overridden to a tm
... [+5534 chars truncated]

### Assistant | 2026-05-18T22:43:42.448Z

Now I have all four files reviewed. Let me check the search lib's contract to verify integration.

### Assistant | 2026-05-18T22:43:44.150Z

[tool_use: Grep]

### User | 2026-05-18T22:43:46.500Z

[tool_result] 17: * implementation; both callers import `runMasterIndexSearch` / `runTribalSearch`.
47:export const STOPWORDS = new Set([
66:export const DEFAULT_EXCLUDED_LAYERS = new Set(["L9", "L11"]);
88:export function tokenize(text, opts = {}) {
138: * agent lib calls runMasterIndexSearch + runTribalSearch back-to-back).
145:export function loadGraph(graphPath = DEFAULT_GRAPH_PATH) {
237:export function se
... [+425 chars truncated]

### Assistant | 2026-05-18T22:45:12.399Z

I have enough context now. Let me produce the review.

---

## Per-File Scrutiny — Arm A (code-analyzer) for U-MASTER-INDEX-HIT-COUNTER

**Files reviewed end-to-end:**
- `H:/prism-slot-charlie/scripts/lib/master-index-hit-counter.mjs` (225 LOC)
- `H:/prism-slot-charlie/scripts/lib/master-index-hit-counter.test.mjs` (233 LOC, 21 tests)
- `H:/prism-slot-charlie/.claude/hooks/master-index-precheck-inject.mjs` (208 LOC, patched)
- `H:/prism-slot-charlie/.claude/hooks/__tests__/master-index-precheck-inject.test.mjs` (132 LOC, 6 tests)

---

### Findings

#### P1 — Counter R12 violation: `loadCounterState` silently treats a corrupt JSON file as fresh state

`master-index-precheck-inject.mjs:106-113`:
```js
function loadCounterState(filePath) {
  try {
    const raw = readFileSync(filePath, "utf8");
    const j = JSON.parse(raw);
    if (j && typeof j === "object") return j;
  } catch { /* missing or corrupt -> fresh state */ }
  return mkEmptyState();
}
```

A corrupt counter file (truncated JSON, partial write from a non-atomic peer, disk-flake) is **silently replaced with `mkEmptyState()`** — the next `persistCounterState` then overwrites the corrupt file with fresh state, **destroying all prior `firstSeenIso` history and accumulated counts fleet-wide**.

This is the exact silent-corruption-masquerading-as-recovery class CLAUDE.md `## Recent regressions` (2026-05-17 `U-REGEN-VIZ-MERGE-FAILLOUD`) and R12 forbid. The atomic-write design upstream of this *prevents* torn writes from this hook, but a peer-tool clobber, antivirus interrupt, or pre-MS0 schema migration is still possible.

**Fix:** distinguish ENOENT (silent-OK) from JSON.parse / shape errors. On a parse failure, write the corrupt file aside as `<file>.corrupt-<ts>` THEN return empty state, and emit one `stderr` line naming the recovery. The hook stays fail-soft (still emits hits), but the data loss is honest and recoverable.

```js
function loadCounterState(filePath) {
  let raw;
  try { raw = readFileSync(fil
... [+11438 chars truncated]
