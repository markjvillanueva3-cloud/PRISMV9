---
type: "chat-session"
source: "claude-code-cli"
session_id: "a198ff5f-9c3d-44ad-a040-50b918b0a91a"
title: "Regression/SPOF review of a PRISM incremental diff. Run `git -C H:/prism diff --"
date: "2026-05-29"
first_ts: "2026-05-29T00:06:30.877Z"
last_ts: "2026-05-29T00:07:51.570Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a267cfd5f1bafabb7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Regression/SPOF review of a PRISM incremental diff. Run `git -C H:/prism diff --

> **claude-code-cli** | 2026-05-29 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a267cfd5f1bafabb7.jsonl`

## Transcript

### User | 2026-05-29T00:06:30.877Z

Regression/SPOF review of a PRISM incremental diff. Run `git -C H:/prism diff --cached` (3 files: mcp-tool-domains.mjs, .test.mjs, mcp-http-bridge.mjs).

CONTEXT: The MCP tool-domain filter (already 3-of-3'd in the prior commit) gets a NEW 3rd resolution fallback: resolveDomainsFromEnv now falls back to the bridge's CWD — a slot chat in H:/prism-slot-<name> auto-resolves its galaxy→domains with no env. The bridge is the SOLE PRISM tool surface (prism_safe dropped), so a resolver bug = fleet-wide tool loss. Empirically proven: foxtrot worktree cwd → 48 tools (no env), shared tree → 90 (fail-open); 18/18 tests pass.

Grade PASS/FAIL with P0/P1:
1. **Fail-open preserved?** The new cwd fallback runs ONLY after env+galaxy miss. Does it ever return a non-empty domains string for a path that ISN'T a real slot worktree? slotFromCwd regex is /prism-slot-([a-z]+)/i — trace: "H:/prism" → null (good); "H:/prism-slot-foxtrot" → foxtrot; an unknown slot (e.g. "prism-slot-backup") → "backup" → SLOT_GALAXY["backup"]=undefined → falls through to "" (fail-open). Confirm there's no path where an unrecognized slot returns a wrong/empty-but-truthy filter that drops tools.
2. **Precedence correct?** env MCP_TOOL_DOMAINS > PRISM_SLOT_GALAXY > cwd > "". Confirm the cwd branch can't override an explicit env.
3. **Default cwd safety** — resolveDomainsFromEnv(env, cwd) defaults cwd to process.cwd() only when the arg is undefined (not when ""). Confirm passing "" pins it (tests rely on this) and the bridge's no-arg call uses process.cwd().
4. **Bridge log change** — the +5 lines add cwd + toolDomains to the startup log object. Confirm it's purely additive logging, touches no control flow.
5. Confirm staged diff is only these 3 logical changes, no pre-existing dirt swept in.
Run `node --test H:/prism/.claude/helpers/mcp-tool-domains.test.mjs` to confirm 18/18. End with "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-05-29T00:06:42.506Z

I'll review this staged diff. Let me gather the diff and run the test in parallel.

### Assistant | 2026-05-29T00:06:42.992Z

[tool_use: Bash]

### Assistant | 2026-05-29T00:06:43.923Z

[tool_use: Bash]

### Assistant | 2026-05-29T00:06:44.636Z

[tool_use: Bash]

### User | 2026-05-29T00:06:47.223Z

[tool_result] .claude/helpers/mcp-http-bridge.mjs       |  5 +++
 .claude/helpers/mcp-tool-domains.mjs      | 63 +++++++++++++++++++++++++++++--
 .claude/helpers/mcp-tool-domains.test.mjs | 42 +++++++++++++++++----
 3 files changed, 100 insertions(+), 10 deletions(-)

--- Changes ---

.claude/helpers/mcp-http-bridge.mjs
  @@ -506,6 +506,11 @@ async function main() {
  +    // U-MCP-ROLLOUT (alpha 2026-05-28): l
... [+6734 chars truncated]

### User | 2026-05-29T00:06:48.340Z

[tool_result] .claude/helpers/mcp-http-bridge.mjs       |  5 +++
 .claude/helpers/mcp-tool-domains.mjs      | 63 +++++++++++++++++++++++++++++--
 .claude/helpers/mcp-tool-domains.test.mjs | 42 +++++++++++++++++----
 3 files changed, 100 insertions(+), 10 deletions(-)

### User | 2026-05-29T00:06:52.627Z

[tool_result]   ...
# Subtest: filterToolList: NO filter => identity (pre-Tier-1 behavior, every tool kept)
ok 15 - filterToolList: NO filter => identity (pre-Tier-1 behavior, every tool kept)
  ---
  duration_ms: 0.1192
  ...
# Subtest: filterToolList: compute filter keeps compute + ALWAYS, drops other domains
ok 16 - filterToolList: compute filter keeps compute + ALWAYS, drops other domains
  ---
  duration_m
... [+633 chars truncated]

### Assistant | 2026-05-29T00:07:14.468Z

All three inputs are in. Now I'll trace each review item against the actual code.

## Trace

**The resolver (`resolveDomainsFromEnv`):**
```js
1. env.MCP_TOOL_DOMAINS (trimmed, truthy) → return it
2. env.PRISM_SLOT_GALAXY (trimmed) + GALAXY_DOMAINS[galaxy] → join(",")
3. resolvedCwd = cwd !== undefined ? cwd : process.cwd()
   slot = slotFromCwd(resolvedCwd)
   if (slot && SLOT_GALAXY[slot] && GALAXY_DOMAINS[SLOT_GALAXY[slot]]) → join(",")
4. return ""
```

**Item 1 — Fail-open preserved?** The cwd branch is gated by a triple AND: `slot && SLOT_GALAXY[slot] && GALAXY_DOMAINS[SLOT_GALAXY[slot]]`. Tracing the failure paths:
- `"H:/prism"` → regex `/prism-slot-([a-z]+)/i` has no `-slot-` segment → `slotFromCwd` returns null → branch skipped → `""` (fail-open). Correct.
- `"prism-slot-backup"` → slot=`"backup"` → `SLOT_GALAXY["backup"]` is `undefined` → second AND term falsy → branch skipped → `""` (fail-open). Correct.
- A slot whose galaxy key is bad → caught by the third AND term `GALAXY_DOMAINS[...]`. This is the same defense the `SAFETY INVARIANT` test asserts (every SLOT_GALAXY value maps to a real GALAXY_DOMAINS key — 18/18 includes it).

Critical check: can the cwd branch ever return an **empty-but-truthy** filter that *drops* tools? No. The return value is always `GALAXY_DOMAINS[...].join(",")`, and the third AND term proves the array exists; a galaxy with `[]` would `.join("")` to `""` → fail-open (no drop), and test 18 (`every galaxy resolves to >=1 recognized domain`) proves no galaxy is empty anyway. There is no path where an unrecognized/partial slot yields a non-empty wrong filter. **PASS.**

One subtle edge worth naming (not a defect): the regex `[a-z]+` is greedy and case-insensitized, so `"H:/prism-slot-foxtrot-backup"` → captures `"foxtrot-backup"`? No — `[a-z]+` does not match `-`, so it captures only `"foxtrot"` → resolves to mill. A path like `H:/prism-slot-foxtrot/mcp-server` correctly yields `foxtrot` (test covers `whiskey\mcp-server`). Acceptabl
... [+1026 chars truncated]

### Assistant | 2026-05-29T00:07:15.599Z

[tool_use: Bash]

### User | 2026-05-29T00:07:19.555Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
9 matches in 5 files:

378:0:skipped entirely when TOOL_DOMAINS is empty, and any error inside
390:0:TOOL_DOMAINS,
512:0:process.cwd(),
513:0:TOOL_DOMAINS || "(none/all - fail-open)",
H:/prism/.claude/helpers/mcp-http-bridge.mjs:44:import { filterToolList, resolveDomainsFromEnv } from "./mcp-tool-domai
... [+422 chars truncated]

### Assistant | 2026-05-29T00:07:24.495Z

Line 60: `const TOOL_DOMAINS = resolveDomainsFromEnv();` — no-arg call → cwd defaults to `process.cwd()`. This is the inheritance premise: the bridge resolves once at startup from its own cwd. **Item 3b PASS.** Let me read the bridge log block (item 4) and the full resolver region to confirm no control-flow coupling.

### Assistant | 2026-05-29T00:07:25.424Z

[tool_use: Read]

### Assistant | 2026-05-29T00:07:25.963Z

[tool_use: Read]

### User | 2026-05-29T00:07:28.122Z

[tool_result] 498	  });
499	}
500	
501	async function main() {
502	  log("info", "Bridge starting", {
503	    pid: process.pid,
504	    mcpUrl: MCP_HTTP_URL,
505	    maxConcurrent: MAX_CONCURRENT,
506	    selfHeal: SELF_HEAL,
507	    waitForReady: WAIT_FOR_READY,
508	    readyBudgetMs: READY_BUDGET_MS,
509	    // U-MCP-ROLLOUT (alpha 2026-05-28): log cwd + resolved domains so the next slot
510	    // launch emp
... [+540 chars truncated]

### User | 2026-05-29T00:07:28.620Z

[tool_result] 114	  Object.values(DOMAIN_DISPATCHERS).flat()
115	);
116	
117	// Slot name -> galaxy (inverse of slot-context-bundle-inject.mjs SLOT_GALAXY_MAP;
118	// source of truth H:/CHAT-SLOT-DOMAINS.md). Drives CWD-based self-resolution so a chat
119	// running in its slot worktree auto-scopes its tools with no env. papa+quebec both ->
120	// frontend-app (2026-05-28 re-designation). november/yankee omitte
... [+2556 chars truncated]

### Assistant | 2026-05-29T00:07:51.570Z

**Item 4 — Bridge log change.** Lines 509-513 add two keys (`cwd`, `toolDomains`) to the object literal passed into the existing `log("info", "Bridge starting", {...})` call. No new statement, no conditional, no early return — purely additive properties on a log payload. `TOOL_DOMAINS` was already resolved at line 60; this just renders it. Touches zero control flow. **PASS.**

**Item 5 — Diff hygiene.** The staged diff is exactly the three described logical changes:
1. `mcp-tool-domains.mjs`: `SLOT_GALAXY` const + `slotFromCwd()` + the cwd fallback branch in `resolveDomainsFromEnv` (signature gained optional `cwd`).
2. `mcp-tool-domains.test.mjs`: import additions + cwd-pinned existing tests + 3 new tests (slotFromCwd, cwd self-resolution, SLOT_GALAXY→GALAXY_DOMAINS invariant).
3. `mcp-http-bridge.mjs`: +5 log lines.

No unrelated edits, no formatting churn, no swept-in dirt. The `+60 -3 / +35 -7 / +5 -0` line counts match the three changes precisely.

**Test gate:** `node --test` → `# pass 18 # fail 0`. 18/18 confirmed.

## Additional second-pass observations (no P0/P1)

- **Comment-vs-code consistency check:** The header comment (line 119-121) says "papa+quebec both → frontend-app" and "november/yankee omitted." Verified against the const: papa+quebec=frontend-app present; november+yankee absent → both fail-open. Self-documenting and accurate. Note november/yankee/zulu: zulu *is* present (hermes-zebra) but november+yankee are not — matches the comment. No drift.
- **Coverage gap (P3, non-blocking):** The new tests don't assert the no-arg `resolveDomainsFromEnv()` defaulting-to-`process.cwd()` path directly (it's exercised implicitly by the bridge at runtime and the empirical 48-vs-90 proof). The `cwd !== undefined` branch logic is covered by the `""`-pinned tests. Acceptable — the load-bearing behavior is tested; the default-arg branch is a one-liner.
- **`hermes-zebra` shared by bravo/zebra/zulu:** three slots → same galaxy is intentional (matches CLAUDE.md D3 ma
... [+1586 chars truncated]
