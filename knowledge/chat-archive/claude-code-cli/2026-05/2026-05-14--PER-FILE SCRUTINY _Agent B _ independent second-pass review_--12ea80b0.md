---
type: "chat-session"
source: "claude-code-cli"
session_id: "12ea80b0-7cb4-4428-ad57-8a83f049e411"
title: "PER-FILE SCRUTINY (Agent B — independent second-pass review) for COMMAND-KERNEL-"
date: "2026-05-14"
first_ts: "2026-05-14T18:37:22.855Z"
last_ts: "2026-05-14T18:40:41.571Z"
cwd: "H:\\prism\\mcp-server"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/12ea80b0-7cb4-4428-ad57-8a83f049e411/subagents/agent-a393f13b5f197314d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# PER-FILE SCRUTINY (Agent B — independent second-pass review) for COMMAND-KERNEL-

> **claude-code-cli** | 2026-05-14 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/12ea80b0-7cb4-4428-ad57-8a83f049e411/subagents/agent-a393f13b5f197314d.jsonl`

## Transcript

### User | 2026-05-14T18:37:22.855Z

PER-FILE SCRUTINY (Agent B — independent second-pass review) for COMMAND-KERNEL-MS0/U-CK02.

Review the WHOLE file end-to-end: `H:/prism/.claude/kernel/psk.mjs`

DO NOT ASSUME Agent A caught everything. Your weighting:
- **Integration coupling** — how does this change ripple through callers? (MCP wire at `mcp-server/src/tools/dispatchers/sessionDispatcher.ts:1738-1798`, test file `mcp-server/src/__tests__/psk.test.ts`)
- **Existing-test breakage** — the existing U-CK01 test at psk.test.ts:110-126 asserts `shell_only===true` on manifest, and similar on whoami at line 128-143. Did those assertions go stale? If yes, the user (downstream consumer) loses coverage until tests are updated.
- **Hidden coupling / silent breakage** — any caller that expected the old `shell_only:true` marker to detect "not yet implemented" state will now get a real result and stop fallback-degrading.
- **Naming / convention conformance** — file uses snake_case for syscall functions (`syscall_whoami`), camelCase for helpers (`detectUserClaudeDir`), UPPER_SNAKE for constants. Do new additions match?
- **Inlined constants** — anywhere we baked a magic number that should be in the named-constants block at top of file?
- **Stub assertions / regression risks** — any place where a contract field's "happy path" silently swallows the "missing" case?
- **Error budgets** — is every async fail-soft path actually catching? Any `await` outside try/catch that could blow up?
- **Security** — input validation on params, especially for the new composition helpers. Can a caller smuggle a malicious memoryPath via `PRISM_USER_CLAUDE_DIR`?

UNIT SPEC (U-CK02) — same as Agent A:
- whoami resolves {sessionId, slot, branch, topic, worktree, userClaudeDir, memoryPath} with paths DETECTED at runtime (NO hardcoded usernames)
- manifest returns live counts from PRISM-INVENTORY-LATEST.md (never baked)
- position returns build/svi/drift/buildState from snapshots without re-deriving

CRITICAL CONTEXT — load-bearing constrain
... [+1693 chars truncated]

### Assistant | 2026-05-14T18:37:27.340Z

I'll review `H:/prism/.claude/kernel/psk.mjs` end-to-end with the weightings specified.

### Assistant | 2026-05-14T18:37:27.683Z

[tool_use: Read]

### User | 2026-05-14T18:37:28.584Z

[tool_result] read-once-guard: 'H:\prism\.claude\kernel\psk.mjs' was already read 21s ago in this session and is unchanged (mtime 1778783764824). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-14T18:37:31.484Z

[tool_use: Bash]

### User | 2026-05-14T18:37:35.076Z

[tool_result] #!/usr/bin/env node
/**
 * psk — PRISM Syscall Kernel (CLI dispatch shell)
 *
 * COMMAND-KERNEL-MS0 / U-CK01 — thin dispatch shell only. Declares the
 * 10-syscall surface every PRISM slash-command, hook, and MCP caller can
 * resolve live state through. The actual per-syscall semantics ship in
 * follow-on units:
 *   - U-CK02 fills whoami / manifest / position
 *   - U-CK03 fills handoff / check
... [+20662 chars truncated]

### Assistant | 2026-05-14T18:37:38.969Z

[tool_use: Bash]

### User | 2026-05-14T18:37:43.160Z

[tool_result]       const driftedCount = (typeof j.drifts_found === "number" ? j.drifts_found : null)
        ?? (Array.isArray(drifted) ? drifted.length : 0);
      result.drift = {
        drifted_count: driftedCount,
        top: Array.isArray(drifted)
          ? drifted.slice(0, POSITION_TOP_DRIFT_K).map((m) => ({
              // current schema: id / current_status / proposed_status / delta
              
... [+16466 chars truncated]

### Assistant | 2026-05-14T18:37:48.211Z

[tool_use: Bash]

### User | 2026-05-14T18:37:51.010Z

[tool_result] }

async function syscall_handoff(params) {
  // Delegate to per-agent-handoff.mjs read/write. U-CK03 absorbs the
  // U-TODOWRITE-HANDOFF-BRIDGE behavior on top.
  const handoffScript = path.join(HELPERS_DIR, "per-agent-handoff.mjs");
  if (!fs.existsSync(handoffScript)) {
    return {
      ok: false, syscall: "handoff", degraded: true,
      error: `per-agent-handoff.mjs missing at ${handoffScr
... [+12645 chars truncated]

### Assistant | 2026-05-14T18:37:58.882Z

Now let me check the test file and dispatcher wire site.

### Assistant | 2026-05-14T18:37:59.090Z

[tool_use: Read]

### User | 2026-05-14T18:38:01.801Z

[tool_result] 1	/**
2	 * psk.test.ts — COMMAND-KERNEL-MS0/U-CK01 acceptance tests.
3	 *
4	 * Covers the U-CK01 exit conditions:
5	 *   1. `node .claude/kernel/psk.mjs --help` enumerates every declared syscall
6	 *      (count DERIVED from psk's own table, NOT a hardcoded literal).
7	 *   2. `prism_session:psk` MCP action round-trips a syscall via the dispatcher.
8	 *   3. ≥8 cases incl. fail-soft on every sysca
... [+20357 chars truncated]

### Assistant | 2026-05-14T18:38:36.740Z

I have everything I need. The PostToolUse "test_timeout" triage message was just generic hook noise — no test was actually run. Here is the independent second-pass review.

---

# Agent B — Independent Second-Pass Review of `H:/prism/.claude/kernel/psk.mjs` (U-CK02)

**Overall verdict: FAIL** — ships with **6 P0/P1 issues**. Two of them (downstream test breakage on `whoami`/`manifest`, and `shell_only` contract drift for `whoami`/`manifest`/`position`) are guaranteed to make `mcp-server/src/__tests__/psk.test.ts` red as-is. The unit's *intended behavior* is correct, but the *contract surface* is shipped with broken integration to the very test file U-CK01 already wrote.

---

## P0 — Must fix before next file

### P0-1 — `psk.test.ts` will fail on `manifest`, `whoami`, `delta` assertions (existing-test breakage)

This is the load-bearing item the spec asked me to call out.

The U-CK01 acceptance test makes three assertions that **U-CK02 deliberately removed**:

- **`psk.test.ts:114`** in test `"dispatch('manifest') returns the 4 hardcoded source paths + availability flags"`:
  ```ts
  expect(r.shell_only).toBe(true);
  ```
  U-CK02 `syscall_manifest` (psk.mjs lines ~673-710) no longer sets `shell_only:true` on the happy path. The result object is `{ok, syscall, note, result:{...}}` — no `shell_only` key. **The assertion will fail with `expected undefined to be true`.**

- **`psk.test.ts:132`** in test `"dispatch('whoami') resolves repoRoot + helpersDir to existing directories"`:
  ```ts
  expect(r.shell_only).toBe(true);
  ```
  U-CK02 `syscall_whoami` (psk.mjs lines ~605-669) likewise drops `shell_only`. **Will fail identically.**

- **`psk.test.ts:244`** in test `"dispatch('delta') returns the shell-only placeholder with available:false"`:
  This one still passes because `delta` is unchanged at U-CK02. But it's now inconsistent with the new policy: `whoami`/`manifest`/`position` (which the spec says are now "real") drop the marker, while `delta`/`tools`/`pick`/`ch
... [+3901 chars truncated]

### Assistant | 2026-05-14T18:38:38.056Z

[tool_use: Bash]

### User | 2026-05-14T18:38:45.274Z

[tool_result] 41:engines:              3236
42:dispatchers:            97
43:actions (z.enum):     7471
44:algorithms:             53
45:registries:             27
46:tests:                3597
47:source hooks:           54
48:claude hooks:          536
49:scripts:               683
50:slash cmds (local):    167
51:slash cmds (user):     392
52:migrations:              1

### Assistant | 2026-05-14T18:40:41.571Z

OK — on this *specific* file the regex is fine because the `## Live Scan Detail` lines are the only ones matching `<keyword>:<spaces><integer>` at column 0. **But the regex is over-permissive on principle**:
- `### Section: 42` would match (a markdown H3 heading starting with a letter).
- `<!-- todo: 5 -->` would match (HTML comment with a count).
- A future inventory rewrite adding `## TODO: 12 unresolved` would silently get scraped into `counts.todo = 12`.

The file format isn't enforced anywhere — anyone editing `scripts/update-prism-inventory.mjs` to add a status comment will introduce a count-collision.

**Fix:** Either (a) anchor the parse to the `## Live Scan Detail` section explicitly (split on that heading, parse only the next ~30 lines), or (b) tighten the regex to disallow leading `#`/`<` and require the key to start at column 0 with no preceding whitespace AND not be inside a code fence. (a) is structurally correct. Without it, count-pollution is one rewrite away.

---

## P1 — Same-cycle fixable

### P1-1 — `worktreeDetail` key-presence variation breaks destructuring callers (the question YOU asked me to verify)

Spec asked: *"Could that key-presence variation break a downstream consumer that destructures the result?"*

**Answer: No, because the key is *always* present — but only because the implementation always sets it.** Read whoami return (line ~659-661):
```js
worktreeDetail: worktreeInfo && worktreeInfo.error ? worktreeInfo : null,
```

The key is always emitted, but the **value** flips between `null` and an object. That's fine for a destructure like `const {worktreeDetail} = r.result;` — both cases give a defined value.

**HOWEVER** — and this is the actual P1 — `slimResponse` in the MCP wrapper (mentioned in psk.mjs comments line ~558) **strips literal `null`**. So:
- Direct `psk.dispatch()` caller sees `worktreeDetail: null`.
- MCP `prism_session:psk` caller sees `worktreeDetail` *missing*.

That's a real two-surface contract drift. A caller us
... [+18882 chars truncated]
