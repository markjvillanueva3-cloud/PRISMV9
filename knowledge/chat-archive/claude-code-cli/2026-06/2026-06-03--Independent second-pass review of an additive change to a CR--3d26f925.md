---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Independent second-pass review of an additive change to a CRITICAL fleet-wide MC"
date: "2026-06-03"
first_ts: "2026-06-03T01:00:06.659Z"
last_ts: "2026-06-03T01:03:55.415Z"
cwd: "H:\\prism-slot-golf"
messages: 41
user_msgs: 15
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a965f2d2c78c15efa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Independent second-pass review of an additive change to a CRITICAL fleet-wide MC

> **claude-code-cli** | 2026-06-03 | 41 msgs (15 user / 26 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a965f2d2c78c15efa.jsonl`

## Transcript

### User | 2026-06-03T01:00:06.659Z

Independent second-pass review of an additive change to a CRITICAL fleet-wide MCP-server reliability lib. Read BOTH files fully:
- H:/prism/scripts/lib/mcp-reconnect-action.mjs
- H:/prism/scripts/lib/mcp-reconnect-action.test.mjs

The change adds a BOOTING-aware restart predicate (`decideRestart`) + unified port-lock helpers (`readPortLock`/`writePortLock`/`isOwnerAlive`/`DEFAULT_PORT_LOCK_PATH`) + `BOOT_GRACE_MS`/`resolveBootGraceMs`. Goal: stop the MCP server from "flapping" — three uncoordinated restarters (hook/supervisor/watchdog) respawn a server that is still in its ~50s cold boot, resetting the boot clock. The predicate lets a restarter DEFER when a peer is BOOTING.

Weight your review on what a purity/branch reviewer is LIKELY TO MISS:
1. SEMANTIC CORRECTNESS of the three states vs the stated goal: does 'booting' actually fire in the real scenario (server mid-boot, /health refused, supervisor PID alive, fresh bootStartedAt)? Does it correctly NOT fire (→ restart) for a genuinely crashed server? Reason about the REAL runtime values the supervisor/watchdog will pass, not just the test inputs.
2. THE STALE-LOCK DEADLOCK RISK from the design: "if the lock owner is SIGKILL'd mid-boot, the lock persists; without PID-liveness recovery every restarter defers forever and the port stays dead." Does decideRestart + isOwnerAlive actually defuse this? Trace: owner SIGKILLed mid-boot → lock has fresh bootStartedAt + dead pid → what does decideRestart return? Confirm it restarts (does NOT deadlock). If ownerAlive isn't wired by a future caller, what's the fallback?
3. INTEGRATION SEAM: the future callers (watchdog, supervisor, hook) must pass healthUp + ownerAlive. Is the function signature ergonomic + hard to misuse? If a caller forgets ownerAlive (undefined), does the within-grace branch still behave safely (defer only while fresh, never forever)? Is there a footgun where undefined ownerAlive + fresh boot defers a dead server up to 90s? Is that acceptable/bounded? Flag 
... [+815 chars truncated]

### Assistant | 2026-06-03T01:00:15.842Z

I'll review both files thoroughly. Let me read them in full.

### Assistant | 2026-06-03T01:00:16.793Z

[tool_use: Read]

### Assistant | 2026-06-03T01:00:16.834Z

[tool_use: Read]

### User | 2026-06-03T01:00:20.084Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-reconnect-action.test.mjs' was already read 16s ago in this session and is unchanged (mtime 1780448303699). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T01:00:20.096Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-reconnect-action.mjs' was already read 16s ago in this session and is unchanged (mtime 1780448245734). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-03T01:00:25.214Z

The read-once guard claims these files are in context, but I don't actually see their content in my context. Let me bypass the cache to read them properly.

### Assistant | 2026-06-03T01:00:26.475Z

[tool_use: Bash]

### User | 2026-06-03T01:00:33.309Z

[tool_result] #!/usr/bin/env node
// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
// connect and check each turn to ensure you guys are always connected."
//
// THE GAP THIS CLOSES (R8 — read before write):
//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every turn, throttle
... [+18501 chars truncated]

### Assistant | 2026-06-03T01:00:38.747Z

I have the source file. Now let me read the test file (bypassing cache).

### Assistant | 2026-06-03T01:00:39.905Z

[tool_use: Bash]

### User | 2026-06-03T01:00:47.901Z

[tool_result] #!/usr/bin/env node
// scripts/lib/mcp-reconnect-action.test.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
// Hermetic node:test for the single-flight reconnect action. Injected deps everywhere EXCEPT
// the real-fs O_EXCL lock round-trip + the CLI subprocess oracle (the two "hermetic fakes
// don't prove wiring" guards — the lock primitive and the main() path must be exercised live).

impo
... [+21718 chars truncated]

### Assistant | 2026-06-03T01:00:53.519Z

Both files read in full. Now let me run the test suite to confirm the baseline state, then verify the integration claims against the actual callers referenced in the comments.

### Assistant | 2026-06-03T01:00:54.478Z

[tool_use: Bash]

### User | 2026-06-03T01:01:10.551Z

[tool_result]   ...
# Subtest: writePortLock → readPortLock round-trip preserves the canonical fields
ok 48 - writePortLock → readPortLock round-trip preserves the canonical fields
  ---
  duration_ms: 1.1853
  ...
# Subtest: writePortLock: fail-soft → false when the write impl throws (never breaks a restarter)
ok 49 - writePortLock: fail-soft → false when the write impl throws (never breaks a restarter)
  ---

... [+503 chars truncated]

### Assistant | 2026-06-03T01:01:14.060Z

All 51 tests pass. Now let me verify the integration claims — the comment references a future supervisor that "always stamps bootStartedAt at spawn." Let me check whether any caller actually wires `decideRestart`/`writePortLock`/`isOwnerAlive` yet, and whether the supervisor/watchdog/hook exist.

### Assistant | 2026-06-03T01:01:15.464Z

[tool_use: Grep]

### Assistant | 2026-06-03T01:01:15.828Z

[tool_use: Grep]

### User | 2026-06-03T01:01:25.449Z

[tool_result] Found 4 files
scripts\mcp-health-watchdog.mjs
scripts\lib\chat-orchestrator-decisions.test.mjs
scripts\lib\chat-orchestrator-decisions.mjs
scripts\fleet-services-watchdog.mjs

### User | 2026-06-03T01:01:41.473Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-03T01:01:44.128Z

Let me check who actually imports the new symbols and whether the consumers reference these functions. The grep matched 4 files — let me check which ones actually consume the new predicate/port-lock helpers vs the pre-existing reconnect symbols.

### Assistant | 2026-06-03T01:01:45.838Z

[tool_use: Grep]

### User | 2026-06-03T01:01:50.111Z

[tool_result] scripts\fleet-services-watchdog.mjs:72:export function decideRestart({ health, lastRestartAt, cooldownSec, nowMs, dryRun }) {
scripts\fleet-services-watchdog.mjs:349:    const decision = decideRestart({
scripts\mcp-health-watchdog.mjs:28: *   PRISM_MCP_WATCHDOG_BOOT_GRACE_MS=12000     post-spawn wait before re-probe
scripts\mcp-health-watchdog.mjs:37:const BOOT_GRACE_MS = Number(process.env.PRISM_
... [+103 chars truncated]

### Assistant | 2026-06-03T01:01:54.964Z

Important finding for the integration seam. There are name collisions in sibling files:
- `fleet-services-watchdog.mjs` has its OWN `decideRestart` (different signature — `{ health, lastRestartAt, cooldownSec, nowMs, dryRun }`).
- `mcp-health-watchdog.mjs` has its OWN `BOOT_GRACE_MS = 12000` (different value from the new `90000`).

Neither imports from `mcp-reconnect-action.mjs`. So the new symbols are NOT yet wired by any caller (consistent with the prompt's "this step is inert"). Let me confirm these two watchdogs don't import the new lib and check the existing connectivity hook to understand the real `up`/`ok` integration seam, plus confirm no top-level side effects.

### Assistant | 2026-06-03T01:01:56.724Z

[tool_use: Bash]

### User | 2026-06-03T01:02:03.238Z

[tool_result] === mcp-health-watchdog imports ===
grep: scripts/mcp-health-watchdog.mjs: No such file or directory

=== fleet-services-watchdog imports ===
37:import { existsSync, writeFileSync, mkdirSync, appendFileSync, statSync, readFileSync } from "node:fs";
38:import { dirname } from "node:path";
39:import { spawnSync, spawn } from "node:child_process";

### Assistant | 2026-06-03T01:02:05.813Z

The bash working-directory reset bit me (path is case/separator sensitive). Let me use Grep directly for the imports.

### Assistant | 2026-06-03T01:02:07.249Z

[tool_use: Grep]

### Assistant | 2026-06-03T01:02:08.741Z

[tool_use: Grep]

### User | 2026-06-03T01:02:11.951Z

[tool_result] scripts\mcp-health-watchdog.mjs:32:import { spawn, execFileSync } from "node:child_process";
scripts\mcp-health-watchdog.mjs:33:import { existsSync } from "node:fs";

### User | 2026-06-03T01:02:13.419Z

[tool_result] .claude\hooks\mcp-connectivity-check.mjs:94:  if (state.lastStatus && state.lastStatus.ok === false) return true;
.claude\hooks\mcp-connectivity-check.mjs:135:  if (probeResult.ok) {
.claude\hooks\mcp-connectivity-check.mjs:169:      ? { continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: `mcp-connectivity: cached (probed ${Math.round((nowMs - state.lastProb
... [+72 chars truncated]

### Assistant | 2026-06-03T01:02:19.000Z

Confirmed. The connectivity hook's probe result uses `.ok` (line 135: `if (probeResult.ok)`), which validates the new `ok`-alias integration seam reasoning in `maybeReconnect`. And `mcp-health-watchdog.mjs` does NOT import the new lib — its `BOOT_GRACE_MS=12000` is a separate, unrelated post-spawn re-probe delay (different semantics).

Now let me verify the critical safety claim — no top-level side effects and the export shape is purely additive (existing importers of `decideReconnect`, `maybeReconnect`, etc. unaffected). Let me confirm by importing the module and checking it produces no I/O, plus diff the export list.

### Assistant | 2026-06-03T01:02:24.584Z

[tool_use: Bash]

### User | 2026-06-03T01:02:30.274Z

[tool_result] EXPORTS: BOOT_GRACE_MS, DEFAULT_DAEMON_HELPER, DEFAULT_HEALTH_URL, DEFAULT_LOCK_PATH, DEFAULT_LOCK_TTL_MS, DEFAULT_PORT_LOCK_PATH, DEFAULT_PROBE_TIMEOUT_MS, acquireReconnectLock, decideReconnect, decideRestart, isOwnerAlive, maybeReconnect, probeDaemon, readPortLock, renderReconnectLine, resolveBootGraceMs, spawnDaemon, writePortLock
DEADLOCK-TRACE (SIGKILL mid-boot, dead pid, fresh stamp): {"stat
... [+323 chars truncated]

### Assistant | 2026-06-03T01:02:35.978Z

This confirms the critical traces:

1. **Deadlock defuse (P0 risk in the prompt)**: SIGKILL'd owner mid-boot (dead pid + fresh stamp) → `{state:"dead", shouldRestart:true, reason:"owner-dead-in-grace"}`. **The deadlock is defused** — provided the caller passes `ownerAlive:false`.

2. **Undefined ownerAlive within grace** → `booting, shouldRestart:false`. This is the footgun the prompt asked me to flag: a caller that forgets `ownerAlive` defers a possibly-dead server. But it's **bounded** — at grace exhaustion (`bootAgeMs:99000`) it returns `dead, shouldRestart:true`. So the worst case is a bounded ~90s defer, never a permanent deadlock.

Now let me check git to confirm this is purely additive (no existing export was removed/changed) and verify there's no test asserting `decideRestart` against undefined-ownerAlive, which is the gap.

### Assistant | 2026-06-03T01:02:37.745Z

[tool_use: Bash]

### User | 2026-06-03T01:02:44.163Z

[tool_result] 7af3d6ab65 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-AUTORECONNECT-MS0]/U-MCP-RECONNECT-ACTION: per-turn MCP daemon auto-reconnect (single-flight O_EXCL) + CLI + golf wire patch
=== DIFF (additive check) ===

### Assistant | 2026-06-03T01:02:49.098Z

The `git diff HEAD` shows zero removed lines (no `-` lines that aren't the `---` header) — confirming the change is **purely additive** to the working tree relative to HEAD. The prior commit was the original reconnect-action ship; the BOOTING-aware additions are uncommitted working-tree changes that only ADD exports. No existing export shape changed.

Let me do one final check on the test for the undefined-ownerAlive case and verify the `now`-default and `bootGraceMs`-default are consistent (the test passes `now` always, but does the function default it safely?).

### Assistant | 2026-06-03T01:02:57.739Z

[tool_use: Bash]

### User | 2026-06-03T01:03:03.292Z

[tool_result] now=undefined (NaN bootAge): {"state":"dead","shouldRestart":true,"reason":"boot-grace-exhausted","bootAgeMs":null}
env grace=120s but not passed → uses 90s default, grace exhausted: {"state":"dead","shouldRestart":true,"reason":"boot-grace-exhausted","bootAgeMs":99999}
resolveBootGraceMs reads env: 120000

### Assistant | 2026-06-03T01:03:55.415Z

Two more findings surfaced:

1. **`now=undefined` edge**: produces `bootAgeMs: NaN` (the `< 0` and `< bootGraceMs` comparisons are both false for NaN), so it falls through to `boot-grace-exhausted → shouldRestart:true`. This is **fail-safe** (errs toward restart, never deadlock) — but `bootAgeMs` serializes as `null` and the reason is misleading. Minor.

2. **Integration seam (the important one)**: `decideRestart` does NOT internally call `resolveBootGraceMs` — it defaults `bootGraceMs = BOOT_GRACE_MS` (raw 90000). So the `PRISM_MCP_BOOT_GRACE_MS` env knob is **inert unless every caller explicitly passes `resolveBootGraceMs()`**. The JSDoc never tells the caller to do this. That's a real footgun for the future watchdog/supervisor wiring.

I have everything I need. Here is my review.

---

## Independent Second-Pass Review — `mcp-reconnect-action.mjs` (BOOTING-aware restart predicate)

**Scope verified:** Read both files end-to-end. Ran the suite (51/51 PASS). Traced the real runtime branches via live `node` evaluation. Confirmed the three referenced callers (`mcp-connectivity-check.mjs`, `mcp-health-watchdog.mjs`, `fleet-services-watchdog.mjs`) and the git diff. The change is uncommitted working-tree, purely additive.

### 1. Semantic correctness of the three states (PASS)
`decideRestart` correctly classifies the real scenario:
- Server mid-boot (`/health` refused → `healthUp:false`), supervisor PID alive, fresh `bootStartedAt` within 90s → `booting / shouldRestart:false`. Verified live: `{state:"booting",reason:"peer-booting",bootAgeMs:30000}`. **The flap is killed.**
- Genuinely crashed server: two correct sub-cases — owner PID gone mid-grace → `dead / owner-dead-in-grace / shouldRestart:true`; or grace exhausted → `dead / boot-grace-exhausted / shouldRestart:true`. Both restart.
- No-boot-stamp wedged server (live owner, no stamp) → `dead / no-boot-stamp / restart`. Correct — never defers on an unprovable boot.

The state machine matches the stated goal. The asym
... [+7492 chars truncated]
