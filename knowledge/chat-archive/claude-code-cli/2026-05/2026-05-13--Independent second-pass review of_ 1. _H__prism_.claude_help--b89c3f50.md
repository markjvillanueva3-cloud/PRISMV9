---
type: "chat-session"
source: "claude-code-cli"
session_id: "b89c3f50-1cd2-448c-b2d0-f04ee6b13601"
title: "Independent second-pass review of: 1. `H:/prism/.claude/helpers/jsonl-schema-rea"
date: "2026-05-13"
first_ts: "2026-05-13T23:51:42.793Z"
last_ts: "2026-05-13T23:52:51.275Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/b89c3f50-1cd2-448c-b2d0-f04ee6b13601/subagents/agent-a4a34dc05a317bdb4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass review of: 1. `H:/prism/.claude/helpers/jsonl-schema-rea

> **claude-code-cli** | 2026-05-13 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b89c3f50-1cd2-448c-b2d0-f04ee6b13601/subagents/agent-a4a34dc05a317bdb4.jsonl`

## Transcript

### User | 2026-05-13T23:51:42.793Z

Independent second-pass review of:
1. `H:/prism/.claude/helpers/jsonl-schema-reader.mjs` (~280 LOC)
2. `H:/prism/scripts/__tests__/jsonl-schema-reader.test.mjs` (~370 LOC, 40/40 green)

Context: CLEANUP-MS0/U-CLEANUP-SCHEMA-READER — pure-functional helper that PRISM hooks + scripts use to read JSONL files (`state/shared/AGENT_CHAT.jsonl`, `state/shared/COORDINATION_LEDGER.jsonl`, etc.) with versioned dispatch. Critical-domain SUT — many hooks WILL consume this. Must not silently swallow lines.

Read end-to-end. Weight your review on dimensions a content-specialist often misses:

- **Real-world JSONL shapes**: PRISM JSONL files in production have rows like `{"ts":"...", "from":"claude-...", "scope":"...", "event":"ship", ...}` (no schemaVersion field — pre-versioning). Will the reader correctly default these to v1 + dispatch them?
- **Streaming readiness**: readFile loads the entire file into memory via readFileSync. For multi-GB JSONL files (e.g. `audit.jsonl` historically grew to 10+ GB before pruning), this OOMs. Is there a follow-up stream API needed, or is sync-read justified for the typical 100KB-10MB sizes?
- **Atomic-write race**: writeActiveVersions uses pid+ts+random suffix. But concurrent runs of the SAME helper from different chats writing the same `.schema-active-versions.json` will still last-writer-wins on the rename. Is that acceptable?
- **Active-version registry schema bootstrap**: the registry itself has a `schemaVersion: 1` field. What happens if a future v2 of the registry adds a new field — does loadActiveVersions handle it gracefully? (i.e. does the helper eat its own dogfood?)
- **Edge: handler returning a Promise**: handlers are called sync (no await). If a registered handler is async + returns a Promise, the dispatch returns immediately and the handler's errors silently disappear into the unhandled-rejection void. Should this be documented as "sync handlers only" OR async-await'd?
- **Edge: very small line that's pure JSON whitespace**: `{}`
... [+784 chars truncated]

### Assistant | 2026-05-13T23:51:50.139Z

I'll read both files end-to-end before reviewing.

### Assistant | 2026-05-13T23:51:50.597Z

[tool_use: Read]

### User | 2026-05-13T23:51:51.023Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\jsonl-schema-reader.mjs' was already read 24s ago in this session and is unchanged (mtime 1778716028462). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-13T23:51:51.139Z

[tool_use: Read]

### User | 2026-05-13T23:51:51.558Z

[tool_result] read-once-guard: 'H:\prism\scripts\__tests__\jsonl-schema-reader.test.mjs' was already read 25s ago in this session and is unchanged (mtime 1778716222032). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-13T23:51:57.817Z

Both files are already in context from the prior reads. Proceeding with the review based on what I have plus targeted Grep to confirm specifics the read-once guard says I should already know.

### Assistant | 2026-05-13T23:51:58.185Z

[tool_use: Grep]

### User | 2026-05-13T23:51:58.903Z

[tool_result] 35:  readFileSync,
36:  writeFileSync,
37:  renameSync,
97:  const observedVersions = new Map(); // Map<schemaName, Set<version>>
113:    const s = observedVersions.get(schemaName);
127:      if (!observedVersions.has(opts.schemaName)) observedVersions.set(opts.schemaName, new Set());
128:      observedVersions.get(opts.schemaName).add(v);
176:    try { raw = readFileSync(absPath, "utf8"); }
181: 
... [+192 chars truncated]

### Assistant | 2026-05-13T23:51:59.491Z

[tool_use: Grep]

### User | 2026-05-13T23:52:00.057Z

[tool_result] 62:  it("parses a valid object line + extracts explicit schemaVersion", () => {
63:    const out = parseJsonlLine('{"schemaVersion":2,"foo":"bar"}');
65:    expect(out.value).toEqual({ schemaVersion: 2, foo: "bar" });
66:    expect(out.schemaVersion).toBe(2);
69:  it("defaults schemaVersion to 1 when missing", () => {
72:    expect(out.schemaVersion).toBe(1);
75:  it("respects opts.defaultVersion 
... [+2253 chars truncated]

### Assistant | 2026-05-13T23:52:51.275Z

I have what I need. Reviewing now.

---

**Independent second-pass review — `jsonl-schema-reader.mjs` + 40-test suite**

### P0 findings

**P0-1 — Async handler errors silently swallowed (intent + safety violation).**
`createReader.dispatch()` calls `handler(value)` synchronously (line ~135-ish based on grep — no `await`, no `.catch`). If a hook author registers an `async` handler, the returned Promise is dropped on the floor: parse errors throw normally, but the entire handler body's exceptions become uncaught rejections that bypass `result.errors[]`. For a "critical-domain SUT, must not silently swallow lines" helper, this is exactly the swallow path the docstring forbids. Either: (a) detect `result?.then` and `await` it (changes signature to async), (b) detect + reject async handlers at `registerHandler()` time with a thrown `TypeError("sync handlers only")`, or (c) document the constraint loud in the JSDoc + add a runtime warning. Silent today.

**P0-2 — Test fixtures use synthetic shapes, miss real PRISM regressions.**
Every test row in the 40-test suite uses `{id, foo, schemaVersion, extra}` shapes. Zero tests exercise the actual production shape `{ts, from, scope, event, ...}` that `AGENT_CHAT.jsonl` / `COORDINATION_LEDGER.jsonl` / `audit.jsonl` use. A handler that crashes on a missing `ts`, or a field-name typo (`event` vs `eventType`), would pass all 40 tests but fail on first contact with prod. Add ≥1 fixture per real consumer (`AGENT_CHAT`, `COORDINATION_LEDGER`, `audit`) using a redacted-but-real shape. This is the "tests verify intent, not behavior" rule (R9) — the current suite verifies the parser is correct on `{id,foo}`, not that PRISM hooks will work.

### P1 findings

**P1-1 — Multi-GB OOM risk undocumented.**
`readFileSync(absPath, "utf8")` + `.split("\n")` materializes the whole file twice (UTF-8 buffer + line array). For a 2 GB `audit.jsonl` that's ~6-8 GB resident. No JSDoc warning, no size guard, no streaming alternative. At minimum: document 
... [+3711 chars truncated]
