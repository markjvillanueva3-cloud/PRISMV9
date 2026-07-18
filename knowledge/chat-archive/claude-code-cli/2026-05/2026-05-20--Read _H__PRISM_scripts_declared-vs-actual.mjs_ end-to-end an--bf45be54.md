---
type: "chat-session"
source: "claude-code-cli"
session_id: "bf45be54-4309-4d36-b13d-385ef2eddd6d"
title: "Read `H:/PRISM/scripts/declared-vs-actual.mjs` end-to-end and review it as a cod"
date: "2026-05-20"
first_ts: "2026-05-20T02:13:58.214Z"
last_ts: "2026-05-20T02:14:45.140Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/bf45be54-4309-4d36-b13d-385ef2eddd6d/subagents/agent-aa1765b46d62c0858.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Read `H:/PRISM/scripts/declared-vs-actual.mjs` end-to-end and review it as a cod

> **claude-code-cli** | 2026-05-20 | 5 msgs (2 user / 3 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/bf45be54-4309-4d36-b13d-385ef2eddd6d/subagents/agent-aa1765b46d62c0858.jsonl`

## Transcript

### User | 2026-05-20T02:13:58.214Z

Read `H:/PRISM/scripts/declared-vs-actual.mjs` end-to-end and review it as a code-analyzer specialist.

CONTEXT: This script is the substrate-health measurement tool for PRISM's forge7 §Phase 0.2 BLOCK gate and forge-audit-v2 §Phase 6A META artifact. It detects drift between what `enabledMcpjsonServers` declares and what `.mcp.json` actually configures, plus empty env scaffolding, user-vs-project settings drift, and unwired hooks. It was just shipped — designed against the 2026-05-19 bug class where `prism-mcp-server` was declared but only `prism` + `prism_safe` were configured.

CONTRACT THE SCRIPT MUST UPHOLD:
1. Pure-core functions (getMcpDrift, findScaffoldedEmpty, diffSettings, levenshtein, auditHooks, extractWiredHookBasenames, buildReport) have NO I/O — fully testable by hermetic mocks
2. I/O wrappers (readJsonFile, listHookFiles) take injected readers
3. `dormant_declared_not_configured` count drives `blocking_count` — must be the ONLY blocker
4. Exit codes: 0 clean / 1 drift / 2 reader error
5. Cross-platform paths (no hardcoded `/` or `\`)
6. No external deps — node builtins only
7. Schema-versioned JSON output (`schemaVersion: "1.0.0"`)

REVIEW AGAINST:
- Logic bugs (esp. in levenshtein, diffSettings, buildReport.drift_count math)
- Edge cases not handled (null/undefined inputs, malformed JSON, fs ENOENT)
- Magic numbers (only `TYPO_MAX_DISTANCE=4` and `PRISM_ROOT_WALK_MAX_DEPTH=6` are exempt — anything else is a finding)
- Inlined constants (no physics — this is a config tool — but inlined paths or thresholds are findings)
- Stub/empty-catch patterns (none allowed)
- Hostile-payload robustness in JSON parsing
- Whether `extractWiredHookBasenames` regex `[A-Za-z0-9._-]+\.mjs` would miss valid hook names or match false positives
- Whether `autoDetectPrismRoot` could infinite-loop or escape the intended scope

REPORT FORMAT:
- One line per finding: `Pn | <line> | <one-sentence finding>` (P0=blocking, P1=must-fix, P2=should-fix, P3=nit)
- End with verdict: `
... [+34 chars truncated]

### Assistant | 2026-05-20T02:14:19.553Z

I'll read the script end-to-end and review it.

### Assistant | 2026-05-20T02:14:19.998Z

[tool_use: Read]

### User | 2026-05-20T02:14:21.834Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * scripts/declared-vs-actual.mjs
4	 *
5	 * Substrate-health measurement — surfaces drift between what PRISM settings
6	 * DECLARE (enabled MCP servers, env vars, user-vs-project keys, hook wiring)
7	 * and what is ACTUALLY configured on disk.
8	 *
9	 * Designed against the 2026-05-19 bug class: `enabledMcpjsonServers` listed
10	 * `prism-mcp-server` (typo'd name), `p
... [+17956 chars truncated]

### Assistant | 2026-05-20T02:14:45.140Z

## Code Review: `declared-vs-actual.mjs`

**P1 | 137 | `diffSettings` iterates `userKeys` only — keys present in BOTH (compared via `deepEqual`) work, but `valueDiffs` will miss cases where iteration order matters for stable output; not a correctness bug but the iteration is asymmetric by design — minor: no sort applied to `value_diffs`, so output is non-deterministic across runs with different key-insertion orders.**

**P1 | 167 | `deepEqual` array-branch: `a.every((x,i)=>deepEqual(x,b[i]))` is correct, but the object branch (170-173) does NOT verify that keys MATCH — `ak.every(k => deepEqual(a[k], b[k]))` passes if `a={x:1}, b={y:1}` (same length, `b[x]===undefined`, `a[y]===undefined` → `deepEqual(1,undef)=false`, OK)... actually safe via the undefined fallthrough. Verified correct on second read.**

**P2 | 183 | `levenshtein` short-circuit `!a || !b` treats empty string `""` as falsy → returns `Math.max(a?.length||0, b?.length||0)`. Correct numerically (distance from "" to "abc" = 3), but the guard is value-coincidence, not intent — a comment would help.**

**P2 | 238 | Regex `/[A-Za-z0-9._-]+\.mjs/g` will match `node_modules/foo.mjs` substrings, paths like `../foo.mjs`, and ALSO false-positive on a command string like `--input=mock.mjs` (treating it as a wired hook). Since `auditHooks` compares basenames extracted here vs `readdir`-listed basenames in the hooks dir, a stray `.mjs` token in any command string inflates `wired_count` and hides a real orphan. Tighten to require a path-separator or start-of-token boundary.**

**P2 | 312 | `listHookFiles` filters by `.endsWith(".mjs")` but does NOT exclude directories — if `hooks/` contains a subdir named `foo.mjs/`, it's counted as a hook file. Use `withFileTypes:true`.**

**P3 | 198 | Two-row swap `[prev, curr] = [curr, prev]` leaves stale data in the now-`curr` row; the next iteration overwrites `curr[0]=i` then fills `curr[j]` — safe, but a `.fill(0)` reset would be defensive against future edits.**

**P3 | 369 |
... [+614 chars truncated]
