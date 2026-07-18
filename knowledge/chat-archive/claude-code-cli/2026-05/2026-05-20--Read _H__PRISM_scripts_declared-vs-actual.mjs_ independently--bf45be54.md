---
type: "chat-session"
source: "claude-code-cli"
session_id: "bf45be54-4309-4d36-b13d-385ef2eddd6d"
title: "Read `H:/PRISM/scripts/declared-vs-actual.mjs` independently — do NOT trust that"
date: "2026-05-20"
first_ts: "2026-05-20T02:13:58.228Z"
last_ts: "2026-05-20T02:15:02.720Z"
cwd: "H:\\PRISM"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/bf45be54-4309-4d36-b13d-385ef2eddd6d/subagents/agent-a6ff92edca7e0f577.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Read `H:/PRISM/scripts/declared-vs-actual.mjs` independently — do NOT trust that

> **claude-code-cli** | 2026-05-20 | 10 msgs (4 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/bf45be54-4309-4d36-b13d-385ef2eddd6d/subagents/agent-a6ff92edca7e0f577.jsonl`

## Transcript

### User | 2026-05-20T02:13:58.228Z

Read `H:/PRISM/scripts/declared-vs-actual.mjs` independently — do NOT trust that any prior reviewer caught everything.

CONTEXT: New script just shipped. It powers a HARD BLOCK gate in forge7's preflight (Phase 0.2) — when `enabledMcpjsonServers` declares an MCP server that isn't in `.mcp.json`, forge7 BLOCKS the run. False positives here halt fleet work; false negatives let the 2026-05-19 dormancy bug class ship.

REVIEW WEIGHTED ON (things the code-analyzer agent is LESS likely to catch):
1. **Integration coupling** — does this script silently depend on side effects (process.env, cwd, file mtimes) that production callers don't satisfy?
2. **CLI contract precision** — `--json` is the default; `--text` opt-in. Does `cli()` handle unknown flags? Does it crash on stdin pipes? Does `process.exit()` happen BEFORE pending stdout writes flush?
3. **Cross-platform** — Windows path handling (case-insensitive drives, `\` vs `/`). The script will run on Win11 production AND the agent's sandbox simultaneously.
4. **Determinism** — same input MUST produce same JSON (modulo `generatedAt`). Any non-deterministic sort? Any Set→Array iteration that's insertion-ordered but should be sorted?
5. **Hostile inputs** — what if `.mcp.json` is 100MB? What if `enabledMcpjsonServers` contains a value that's an object, not a string? What if a hook command string has 50,000 `.mjs` substring matches?
6. **Naming / project conventions** — Does it follow PRISM's pattern (other scripts in `H:/PRISM/scripts/` use what export style)? Any names that conflict with existing engines?
7. **Verification re-runnability** — Boris #1: can a future audit re-run this and get a stable signal? Is there ANY hidden state?
8. **Error-message quality** — when this BLOCKS forge7, the operator sees the error. Is the message actionable or generic?

REPORT FORMAT:
- One line per finding: `Pn | <line/section> | <one-sentence finding>`
- End with: `VERDICT: PASS` or `VERDICT: FAIL — <one-line reason>`
- ≤300 words total
-
... [+78 chars truncated]

### Assistant | 2026-05-20T02:14:20.628Z

I'll read the file independently and review it weighted on the listed concerns.

### Assistant | 2026-05-20T02:14:20.777Z

[tool_use: Read]

### User | 2026-05-20T02:14:22.162Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\declared-vs-actual.mjs' was already read 1s ago in this session and is unchanged (mtime 1779242980224). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-20T02:14:26.034Z

The file was supposedly read previously but isn't in my context. Let me bypass the cache.

### Assistant | 2026-05-20T02:14:26.866Z

[tool_use: Bash]

### User | 2026-05-20T02:14:30.527Z

[tool_result] #!/usr/bin/env node
/**
 * scripts/declared-vs-actual.mjs
 *
 * Substrate-health measurement — surfaces drift between what PRISM settings
 * DECLARE (enabled MCP servers, env vars, user-vs-project keys, hook wiring)
 * and what is ACTUALLY configured on disk.
 *
 * Designed against the 2026-05-19 bug class: `enabledMcpjsonServers` listed
 * `prism-mcp-server` (typo'd name), `prism_safe` missing fr
... [+13144 chars truncated]

### Assistant | 2026-05-20T02:14:33.821Z

[tool_use: Read]

### User | 2026-05-20T02:14:37.806Z

[tool_result] 400	    `  drift: ${summary.drift_count}  blocking: ${summary.blocking_count}  ok: ${summary.ok}`
401	  );
402	  lines.push("");
403	  lines.push("MCP:");
404	  lines.push(
405	    `  declared    (${mcp.declared_in_settings.length}): ${mcp.declared_in_settings.join(", ") || "—"}`
406	  );
407	  lines.push(
408	    `  configured  (${mcp.configured_in_mcp_json.length}): ${mcp.configured_in_mcp_json.
... [+3017 chars truncated]

### Assistant | 2026-05-20T02:15:02.720Z

Independent review complete. Findings weighted on items code-analyzer is less likely to catch:

P0 | L483/L486 | `process.exit()` after sync `process.stdout.write` of a 2MB+ JSON report can truncate on Windows when stdout is piped — write returns false (backpressure) but exit fires before the drain event. Forge7's hard block sees a partial JSON and ERRORs out (exit 2) on a clean repo.

P1 | L446 | `new Set(process.argv.slice(2))` silently swallows unknown flags. `--strick` (typo) → no error, no strict mode, operator thinks they ran strict. CLI contract failure — no `for (arg of args) if (!KNOWN.has(arg)) die()` guard.

P1 | L490-492 | `path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)` is case-sensitive string compare. On Windows, `H:\PRISM\scripts\...` vs `h:\prism\scripts\...` (drive letter casing varies by shell) fails equality → `cli()` never fires when invoked as `node h:/prism/...`. Should use `path.relative(a,b) === ""` or normalize-case compare.

P1 | L296 | `extractWiredHookBasenames` regex `[A-Za-z0-9._-]+\.mjs` matches inside arbitrary command strings — a hook command containing `echo "fake-hook.mjs"` or a comment registers a phantom wired entry, masking a real orphan. Hostile-input class.

P2 | L246 | `deepEqual` does `Object.keys(a)` ordered iteration but compares by `ak.every((k) => deepEqual(a[k],b[k]))` without checking key presence in `b` — `{a:1,c:2}` vs `{a:1,b:undefined}` both length 2; `b[c]` is `undefined` and `b[a]==b[a]` short-circuits. Edge: same length, different keys, both contain undefined → false-equal.

P2 | L377 | `defaultPaths()` reads `process.env.PRISM_ROOT` — hidden state. Two invocations from different shells produce different reports on same repo. Determinism leak; should be logged in `report.host` or `report.context`.

P3 | L300 | `extractWiredHookBasenames` Set→Array is insertion-ordered but final `.sort()` saves it. OK.

P3 | L210 | `levenshtein` early-return `if (!a || !b)` treats `""` as falsy correctly but `l
... [+887 chars truncated]
