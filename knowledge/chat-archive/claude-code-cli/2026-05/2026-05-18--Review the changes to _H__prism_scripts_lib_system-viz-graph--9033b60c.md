---
type: "chat-session"
source: "claude-code-cli"
session_id: "9033b60c-6a5f-4c7e-973c-57826958d374"
title: "Review the changes to `H:/prism/scripts/lib/system-viz-graph.mjs` — specifically"
date: "2026-05-18"
first_ts: "2026-05-18T14:45:25.806Z"
last_ts: "2026-05-18T14:46:20.023Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/9033b60c-6a5f-4c7e-973c-57826958d374/subagents/agent-adbb51a7bd42dc48a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review the changes to `H:/prism/scripts/lib/system-viz-graph.mjs` — specifically

> **claude-code-cli** | 2026-05-18 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9033b60c-6a5f-4c7e-973c-57826958d374/subagents/agent-adbb51a7bd42dc48a.jsonl`

## Transcript

### User | 2026-05-18T14:45:25.806Z

Review the changes to `H:/prism/scripts/lib/system-viz-graph.mjs` — specifically the new `loadFindCache` function and supporting helpers (`projectForFind`, `readSidecarIfFresh`, `writeSidecarAtomic`, `FIND_CACHE_PATH`, `findCacheDisabled`, `FIND_FIELDS`) appended to the end of the file. The existing `loadGraph` + `findInGraph` are unchanged.

CONTEXT: This is a perf optimization for the system-viz query path. The hook `viz-first-redirect.mjs` fires ~1060 times/day and each spawns a fresh `node` process that calls `loadGraph()` (370 MB system-graph.json parse, ~2s post-cable-swap on USB SSD). The new `loadFindCache()` reads a tiny sidecar `state/shared/system-viz/find-cache.json` (only the 6 fields findInGraph cares about — label/id/info/subgroup/layer/kind, ~2MB) that's 170× smaller, falling back to a full parse + atomic sidecar write on cache miss.

WHAT TO VERIFY (P0/P1 only — flag findings as PASS/FAIL):
1. **Schema invariants** — `readSidecarIfFresh` must reject any sidecar lacking `nodes:array + sourceMtimeMs:number + sourceSize:number`. A malformed sidecar must not cause findInGraph to crash or serve garbage.
2. **Freshness logic** — sidecar with mtime+size mismatch vs the graph file must be treated as stale (fall through to full parse). A graph file that's grown OR shrunk OR been touched must invalidate.
3. **Atomic write correctness** — temp file + rename pattern. PID + Date.now() suffix uniqueness. Failure to write is silently swallowed (perf optimization, non-fatal — but the function should still return the freshly-parsed graph).
4. **No false hit** — if sidecar exists but graph file is GONE, we return null from readSidecarIfFresh and fall through to loadGraph (which throws the canonical error). Critical that we don't serve a sidecar against a vanished graph.
5. **Project-for-find lockstep** — `FIND_FIELDS` includes every field that `findInGraph` (lines 159-168 of same file) actually reads. Missing field would silently degrade search quality on cache-hit. 
... [+896 chars truncated]

### Assistant | 2026-05-18T14:45:43.163Z

I'll read the file to verify the new code against the existing `findInGraph`.

### Assistant | 2026-05-18T14:45:43.472Z

[tool_use: Read]

### User | 2026-05-18T14:45:44.848Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+11874 chars truncated]

### Assistant | 2026-05-18T14:46:20.023Z

## Code Quality Analysis Report

### Verdict: **PASS** (with 2 P1 findings + 1 P2 advisory)

The implementation is sound — schema gating is strict, mtime+size invariants match `loadGraph`, atomic write is correctly ordered, knobs bypass both read and write, and `projectForFind` fail-loud throws on malformed input (R12). The `FIND_FIELDS` superset claim holds.

### Findings

**1. PASS — Schema invariants (line 236-240)** — `readSidecarIfFresh` correctly rejects on missing `nodes:array`, non-number `sourceMtimeMs`, or non-number `sourceSize`. A malformed sidecar returns `null` → falls through to `loadGraph()`. No crash path.

**2. PASS — Freshness logic (line 244-246)** — mtime OR size mismatch invalidates. Grew/shrunk/touched all caught. Matches `loadGraph` invariant exactly.

**3. PASS — Atomic write (line 259-261)** — temp + rename. PID + Date.now() suffix avoids inter-process collision. Wrapped in try/catch → silent on failure but `loadFindCache` still returns the freshly-parsed graph (line 278).

**4. PASS — No false hit on vanished graph (line 242-243)** — `statSync` failure returns null; control falls through to `loadGraph()` which throws the canonical descriptive error.

**5. PASS — Project-for-find lockstep** — `findInGraph` (line 162-165) reads `label/id/info/subgroup`. `FIND_FIELDS` includes those + `layer/kind` (forward-looking superset). The lockstep comment at line 210-212 is load-bearing — future maintainers must update both sites.

**6. PASS — Knob behavior** — `PRISM_VIZ_FIND_CACHE_DISABLE=1`: bypass read (line 266) AND bypass write (line 272). `fresh:true`: same dual bypass. Correct.

**7. PASS — R12 fail-loud discipline** — `projectForFind` throws (caller wants to know schema is wrong); sidecar read/write errors silent (perf path, non-fatal). Correct partitioning.

---

### P1 Findings

**P1-A — Return-shape divergence (line 268 vs 278).** Cache hit returns `{ nodes: sidecar.nodes }` (bare object, 1 field). Cache miss returns `graph` from `loadGraph
... [+1684 chars truncated]
