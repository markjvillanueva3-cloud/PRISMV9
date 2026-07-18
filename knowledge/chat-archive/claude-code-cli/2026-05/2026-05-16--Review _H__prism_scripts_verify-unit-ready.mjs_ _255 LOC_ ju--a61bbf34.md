---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Review `H:/prism/scripts/verify-unit-ready.mjs` (255 LOC, just written) end-to-e"
date: "2026-05-16"
first_ts: "2026-05-16T00:33:16.224Z"
last_ts: "2026-05-16T00:33:47.184Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a71d6467c921ca983.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review `H:/prism/scripts/verify-unit-ready.mjs` (255 LOC, just written) end-to-e

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a71d6467c921ca983.jsonl`

## Transcript

### User | 2026-05-16T00:33:16.224Z

Review `H:/prism/scripts/verify-unit-ready.mjs` (255 LOC, just written) end-to-end. This is U-P3-VERIFY-UNIT-READY for the SYSTEM-VIZ-BRAIN-MS0 milestone — a pre-claim dependency-check helper that `/pick-unit` will use to block surfacing of a unit whose `depends_on` chain is unshipped.

Contract / spec from the milestone envelope: "Pre-claim dependency check on /pick-unit — block if depends_on chain unshipped".

Walk every code path. Specifically look for:
- Off-by-one or infinite-loop risk in the dep-walker (note: it intentionally does NOT walk transitively — surfacing direct deps only is the design intent, NOT a bug).
- The `parseDep` helper: are all malformed inputs caught? (`""`, `":"`, `"MS-X:"`, `":U-X"`, non-string types)
- The `lookupUnitStatus` helper: are envelope-missing vs unit-missing distinguishable in the caller?
- The CLI entrypoint detection (`isMain` check via `import.meta.url`) — does it correctly skip running CLI when imported from the test file?
- The exit codes (0=ready, 2=blocked, 3=bad invocation) — are they consistent + non-overlapping?
- Edge case: what if `envelopes` is an object but `envelopes[milestone]` is null/false/array/string instead of an envelope-shaped object?
- The `CYCLE_LIMIT = 64` constant — does it actually protect against malformed cyclic deps? (it bounds the dep array iteration, not transitive depth — note the design intent is non-transitive so this is fine, but verify)

Read the WHOLE file. Report only P0 (blocks ship) and P1 (must fix before commit) findings. Grade PASS or FAIL. Under 250 words.

### Assistant | 2026-05-16T00:33:27.270Z

I'll read the file end-to-end and analyze every code path.

### Assistant | 2026-05-16T00:33:27.536Z

[tool_use: Read]

### User | 2026-05-16T00:33:28.654Z

[tool_result] 1	#!/usr/bin/env node
2	// SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY
3	//
4	// Pre-claim dependency check for /pick-unit.
5	//
6	// Reads a unit's `depends_on` array and verifies each dep is `status: "complete"`
7	// in its envelope before allowing the picker to surface it. If any dep is missing
8	// or not complete, the pick is BLOCKED with a punch list of unsatisfied prereqs.
9	//
10	// Schema
... [+8271 chars truncated]

### Assistant | 2026-05-16T00:33:47.184Z

## Code Quality Analysis Report

### Grade: PASS (with 2 P1 findings to address before commit)

### P0 Findings
None. All paths terminate, exit codes are disjoint (0/2/3), and the design intent of non-transitive walking is consistently honored.

### P1 Findings

**1. `isMain` CLI-guard crashes on import in worker contexts (line 211)**
`process.argv[1]` is `undefined` when the module is loaded without a script argument (e.g., `node -e "import('./verify-unit-ready.mjs')"`, certain worker_threads / loader contexts, or some test runners). The `.replace()` call then throws `TypeError: Cannot read properties of undefined (reading 'replace')` at module-load time, before any test can even import. Guard it:
```js
const isMain = process.argv[1] && (
  import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`
  || import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))
);
```
Also, the `.endsWith()` fallback is dangerously loose — e.g., `process.argv[1]="ready.mjs"` matches `verify-unit-ready.mjs`. Tighten to require a path separator before the match or use `pathToFileURL` from `node:url`.

**2. `lookupUnitStatus` distinguishes envelope-missing vs unit-missing, but caller silently flattens (line 91)**
The host-unit branch returns `host.reason` as the top-level `reason` — good. But for *dep* lookups (line 123), `reason` is set to `lookup.reason` (`"envelope_missing"` or `"unit_missing_from_envelope"`), which is fine. However, the host-lookup at line 91 returns `missingDeps: []` even when the host's own envelope is missing — making the result indistinguishable from "host found, zero deps". Callers checking `ready===false && missingDeps.length===0` get ambiguity. Recommend host-missing surfaces via a distinct top-level `hostFound: false` field, or push the host into `missingDeps`.

### Verified clean
- `parseDep`: catches `""`, `":"`, `"MS:"`, `":U"`, non-string, null/undefined.
- `CYCLE_LIMIT=64`: bounds the direct-dep array iteration; correct given non-transitiv
... [+595 chars truncated]
