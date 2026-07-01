---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Independent second-pass review of the stale-node-hunter hardening (2 commits) in"
date: "2026-06-11"
first_ts: "2026-06-11T18:54:29.801Z"
last_ts: "2026-06-11T18:58:24.010Z"
cwd: "H:\\prism-slot-golf"
messages: 47
user_msgs: 23
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/agent-a3c978211b8593bcf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Independent second-pass review of the stale-node-hunter hardening (2 commits) in

> **claude-code-cli** | 2026-06-11 | 47 msgs (23 user / 24 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/agent-a3c978211b8593bcf.jsonl`

## Transcript

### User | 2026-06-11T18:54:29.801Z

Independent second-pass review of the stale-node-hunter hardening (2 commits) in H:/prism. Run `cd /h/prism && git diff de66545dbe~1 -- scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs scripts/fleet-reaper-sweep.mjs`. Do NOT assume prior reviewers caught everything.

CONTEXT: the reaper's `findStaleOrphanedNodes` 2nd-pass was killing LEGIT idle/detached fleet node.exe (galaxy miners, *-sidecar embedders — RSS~0, dead parent by design) → operator disabled the whole reaper. Fix adds 3 gates: cmdline-allowlist (`DEFAULT_PRISM_WORKER_PROTECT_REGEX` / `isProtectedWorkerCmd`), no-cmdline conservative skip (`requireForeignCmd`), deep-ancestry (`hasLiveClaudeAncestor`). The `dist/index.js` pattern was anchored to `mcp-server/dist/index.js` and the sweep now folds only `PRISM_REAPER_PROTECT_EXTRA`.

Weight toward test integrity + safety:
1. Test integrity: do the 44 tests actually FAIL if the gate logic regresses (not toBeTruthy stubs)? Run `node --test scripts/lib/fleet-reaper-mcp-zombie-hunter.test.mjs 2>&1 | tail -5`. Spot-check 2-3 new tests assert concrete reason/length.
2. Safety completeness: is there ANY path where a legit detached fleet worker (cmd contains the prism tree OR a worker-family token, RSS~0, dead parent, aged) still gets pushed to the zombie list? Trace gate order.
3. Active-chat-node safety (operator's explicit concern): a node hosting an active chat's tooling (MCP server `H:/prism/mcp-server/dist/index.js`, a hook host under `H:/prism/.claude/`) must be protected. Confirm both match the protect regex.
4. Regression: does `findMcpZombies` (the OTHER exported fn) still behave identically (unchanged)? Confirm the diff doesn't touch it.
5. No swallowed errors / no floating promises introduced.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER:/P1: lines, ≤5 notes. If unsure, FAIL.

### Assistant | 2026-06-11T18:54:33.168Z

I'll run the tests and examine the diff to give an independent assessment.

### Assistant | 2026-06-11T18:54:33.877Z

[tool_use: Bash]

### User | 2026-06-11T18:54:42.964Z

[tool_result] diff --git a/scripts/fleet-reaper-sweep.mjs b/scripts/fleet-reaper-sweep.mjs
index a8572bcdd5..afad39bc21 100644
--- a/scripts/fleet-reaper-sweep.mjs
+++ b/scripts/fleet-reaper-sweep.mjs
@@ -161,7 +161,7 @@ import {
 // via the existing reapProcesses helper. Strictly additive; default-on but
 // each hunter gates on its own PRISM_FR_HUNT_*_DISABLE env knob.
 import { runStuckHunters, buildProtecte
... [+20799 chars truncated]

### Assistant | 2026-06-11T18:54:46.036Z

[tool_use: Bash]

### User | 2026-06-11T18:54:50.506Z

[tool_result]   ...
# Subtest: DEFAULT_PRISM_WORKER_PROTECT_REGEX: bare foreign dist/index.js is NOT matched (anchor holds)
ok 44 - DEFAULT_PRISM_WORKER_PROTECT_REGEX: bare foreign dist/index.js is NOT matched (anchor holds)
  ---
  duration_ms: 0.0414
  ...
1..44
# tests 44
# suites 0
# pass 44
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 71.7372

### Assistant | 2026-06-11T18:54:53.560Z

[tool_use: Bash]

### User | 2026-06-11T18:54:57.486Z

[tool_result] # Subtest: returns [] for empty/invalid input
ok 1 - returns [] for empty/invalid input
# Subtest: dead parent → flagged as zombie (reason=dead-parent)
ok 2 - dead parent → flagged as zombie (reason=dead-parent)
# Subtest: live claude-parent → NOT a zombie (owned)
ok 3 - live claude-parent → NOT a zombie (owned)
# Subtest: live non-claude parent → flagged as zombie (reason=non-claude-parent)
ok 4 
... [+4136 chars truncated]

### Assistant | 2026-06-11T18:55:01.219Z

[tool_use: Bash]

### User | 2026-06-11T18:55:05.459Z

[tool_result] # Subtest: HARDEN: protectCmdRegex opts override skips a matching node
ok 35 - HARDEN: protectCmdRegex opts override skips a matching node
# Subtest: buildStaleNodeProtectRegex: composes default + extra; matches both, foreign still foreign
ok 36 - buildStaleNodeProtectRegex: composes default + extra; matches both, foreign still foreign
# Subtest: buildStaleNodeProtectRegex: malformed extra falls b
... [+1499 chars truncated]

### Assistant | 2026-06-11T18:55:08.066Z

[tool_use: Bash]

### User | 2026-06-11T18:55:13.611Z

[tool_result] ok 15 - findStaleOrphanedNodes: empty/invalid input returns []
# Subtest: findStaleOrphanedNodes: RSS=0 + age>=floor + dead-parent → reaped
ok 16 - findStaleOrphanedNodes: RSS=0 + age>=floor + dead-parent → reaped
# Subtest: findStaleOrphanedNodes: RSS above ceiling (50MB) → NOT reaped (healthy resident)
ok 17 - findStaleOrphanedNodes: RSS above ceiling (50MB) → NOT reaped (healthy resident)
# Sub
... [+815 chars truncated]

### Assistant | 2026-06-11T18:55:17.228Z

[tool_use: Bash]

### User | 2026-06-11T18:55:21.335Z

[tool_result] 28:function mkProc({ pid, ppid = 0, name = "node.exe", cmd = "H:/prism/mcp-server/dist/index.js", createdMs = OLD, rssBytes = 100 * 1024 * 1024 }) {
55:  // The MCP server got re-parented to system/explorer after claude.exe exited
85:    mkProc({ pid: 101, ppid: 999, cmd: "H:/prism/mcp-server/dist/index.js" }),
151:    cmd: "mcp-server/dist/index.js",
165:// with RSS=0, none matching the MCP serve
... [+1954 chars truncated]

### Assistant | 2026-06-11T18:55:24.141Z

[tool_use: Bash]

### User | 2026-06-11T18:55:30.820Z

[tool_result] // SAFETY-GATE HARDENING (2026-06-11, slot:golf) -- stop reaping legit idle/
// detached fleet node.exe. Incident: the stale-node hunter killed galaxy miners
// + *-sidecar embedders + vault pipelines (RSS=0, dead parent BY DESIGN for
// nohup/scheduled-task workers) -> operator disabled the whole reaper. These
// tests lock the fix (cmdline-allowlist + no-cmdline-skip + deep-ancestry) in.
// ====
... [+7873 chars truncated]

### Assistant | 2026-06-11T18:55:34.117Z

[tool_use: Bash]

### User | 2026-06-11T18:55:38.114Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-11T18:55:42.450Z

[tool_use: Bash]

### User | 2026-06-11T18:55:46.383Z

[tool_result] true node H:/prism/mcp-server/dist/index.js
true node H:/prism/.claude/hooks/some-hook.mjs
true node H:.claudehooksleet-reaper-sweep.mjs
false node .claude/hooks/scrutinize-before-stop.mjs

### Assistant | 2026-06-11T18:55:51.024Z

[tool_use: Bash]

### User | 2026-06-11T18:55:55.279Z

[tool_result] true ".claude/hooks/fleet-reaper-sweep.mjs"
true "node_modules/.bin/.claude/hooks/x.mjs"
true "/h/prism/.claude/hooks/x.mjs"
true "H:/prism/.claude/hooks/x.mjs"

### Assistant | 2026-06-11T18:56:02.111Z

[tool_use: Bash]

### User | 2026-06-11T18:56:07.399Z

[tool_result] MISMATCH relative scripts/ -> false
MISMATCH relative .claude/hooks -> false
OK absolute prism scripts -> true
OK CONCERN: foreign scripts/ would match -> true
OK CONCERN: foreign npm scripts/ match -> true

### Assistant | 2026-06-11T18:56:16.394Z

[tool_use: Bash]

### User | 2026-06-11T18:56:21.479Z

[tool_result] true C:/other-project/scripts/some-npm-build.mjs
true node_modules/webpack/scripts/build.mjs
true C:/Users/x/AppData/Local/npm-cache/scripts/x.js

### Assistant | 2026-06-11T18:56:24.597Z

[tool_use: Bash]

### User | 2026-06-11T18:56:28.033Z

[tool_result] 33: * @module scripts/lib/fleet-reaper-mcp-zombie-hunter
110:// Gap closed: findMcpZombies (above) only catches `mcp-server/dist/index.js`
138://      host) -- same parent vocabulary as findMcpZombies.
150:// Returns the same shape as findMcpZombies for caller uniformity.
196:  "[\\\\/](scripts|\\.claude)[\\\\/]",          // relative invocations of prism tooling
287:  const claudeNames = opts.cla
... [+358 chars truncated]

### Assistant | 2026-06-11T18:56:34.143Z

[tool_use: Bash]

### User | 2026-06-11T18:56:39.519Z

[tool_result] // Original findMcpZombies — unchanged behavior.
// ============================================================================
export function findMcpZombies(procs, livePidSet, now, opts = {}) {
  if (!Array.isArray(procs) || procs.length === 0) return [];
  const ageFloor = clamp(
    opts.ageSec ?? DEFAULT_MCP_ZOMBIE_AGE_SEC,
    MIN_MCP_ZOMBIE_AGE_SEC,
    MAX_MCP_ZOMBIE_AGE_SEC,
    DEFAULT_
... [+1607 chars truncated]

### Assistant | 2026-06-11T18:56:48.849Z

[tool_use: Bash]

### User | 2026-06-11T18:56:55.729Z

[tool_result] Scenario: foreign build tool at C:/not-prism/scripts/build.js, RSS=0, aged=2h
Would be PROTECTED (false negative -- missed zombie) due to /scripts/ pattern

Impact assessment:
- This is over-protection (false negative / missed zombie), NOT over-reaping
- Over-protection is the stated SAFE direction per comments in the code
- A missed foreign zombie stays alive; a false positive reap kills legit wo
... [+67 chars truncated]

### Assistant | 2026-06-11T18:56:59.476Z

[tool_use: Bash]

### User | 2026-06-11T18:57:04.865Z

[tool_result] 110:// Gap closed: findMcpZombies (above) only catches `mcp-server/dist/index.js`
156:const MIN_STALE_NODE_RSS_MAX_BYTES = 0;                      // RSS=0 is the strictest catch
226:  try {
228:  } catch {
296:  // zombie (age + the next sweep-with-cmdline still catch it).

### Assistant | 2026-06-11T18:57:07.546Z

[tool_use: Bash]

### User | 2026-06-11T18:57:12.373Z

[tool_result]  */
export function buildStaleNodeProtectRegex(extraSource) {
  const extra = typeof extraSource === "string" ? extraSource.trim() : "";
  if (!extra) return DEFAULT_PRISM_WORKER_PROTECT_REGEX;
  try {
    return new RegExp(PRISM_WORKER_PROTECT_PATTERNS.join("|") + "|" + extra, "i");
  } catch {
    return DEFAULT_PRISM_WORKER_PROTECT_REGEX; // bad extra -> keep default protection
  }
}

/**
 * Tr
... [+136 chars truncated]

### Assistant | 2026-06-11T18:57:15.397Z

[tool_use: Bash]

### User | 2026-06-11T18:57:23.660Z

[tool_result] 653: * MCP bridge. PRISM_REAPER_PROTECT_EXTRA lets future long-runners register a
658:const _PROTECT_EXTRA = (() => {
659:  const raw = process.env.PRISM_REAPER_PROTECT_EXTRA || "";
664:  + _PROTECT_EXTRA;
2237:        // PRISM_REAPER_PROTECT_EXTRA (strip its leading '|'), so a legit detached
2241:        protectCmdRegex: buildStaleNodeProtectRegex(_PROTECT_EXTRA.replace(/^\|/, "")),

### Assistant | 2026-06-11T18:57:26.563Z

[tool_use: Bash]

### User | 2026-06-11T18:57:32.818Z

[tool_result]  * MCP bridge. PRISM_REAPER_PROTECT_EXTRA lets future long-runners register a
 * pattern via env without editing this file (validated: only [\w .\\/|-]
 * chars are accepted so a malformed value cannot break the PS regex or be
 * abused for injection).
 */
const _PROTECT_EXTRA = (() => {
  const raw = process.env.PRISM_REAPER_PROTECT_EXTRA || "";
  return /^[\w .\\/|-]+$/.test(raw) ? `|${raw}` : "
... [+636 chars truncated]

### Assistant | 2026-06-11T18:57:38.755Z

[tool_use: Bash]

### User | 2026-06-11T18:57:44.979Z

[tool_result] empty strip result: ""
with-pipe strip result: "my-worker"
no-pipe strip result: "my-worker"

### Assistant | 2026-06-11T18:57:47.852Z

[tool_use: Bash]

### User | 2026-06-11T18:57:52.688Z

[tool_result] 164:import { findMcpZombies, findStaleOrphanedNodes, buildStaleNodeProtectRegex } from "./lib/fleet-reaper-mcp-zombie-hunter.mjs";
2176:      const cands = findMcpZombies(procs, livePidSet, now, {
2230:      const cands = findStaleOrphanedNodes(procs, livePidSet, now, {
2241:        protectCmdRegex: buildStaleNodeProtectRegex(_PROTECT_EXTRA.replace(/^\|/, "")),

### Assistant | 2026-06-11T18:57:55.247Z

[tool_use: Bash]

### User | 2026-06-11T18:58:02.015Z

[tool_result]       const procs = snap.procs || [];
      const livePidSet = new Set(procs.map((p) => p.pid));
      const procByPid = new Map(procs.map((p) => [p.pid, p]));
      const protectedPids = buildProtectedPidSet(procs, process.pid);
      const ageSec = opts.mcpZombieAgeSec
        ?? envInt("PRISM_FR_HUNT_MCP_ZOMBIE_AGE_SEC");
      const cands = findMcpZombies(procs, livePidSet, now, {
        ageS
... [+3716 chars truncated]

### Assistant | 2026-06-11T18:58:24.010Z

All the evidence I need is collected. Here is the verdict.

---

VERDICT: PASS

**Test integrity (check 1): 44/44 pass, and the key tests assert concrete outcomes.**

Tests 27-30 and 42-44 are the incident-regression tests. They are not stubs. Test 27 calls `findStaleOrphanedNodes` with an exact incident-shape proc (RSS=0, dead parent, 6h old, prism cmd) and asserts `deepEqual(result, [])` — the test fails if the cmdline gate is removed. Test 42 asserts `r.length === 1` and `r[0].reason === "dead-parent"` for a genuinely foreign zombie — it fails if over-protection breaks recall. Test 43 asserts `deepEqual(result, [])` for the PRISM MCP server path specifically.

**Safety completeness (check 2): gate order is correct and exhaustive.**

The three gates execute before parent classification, in the right priority order: (1) cmdline-allowlist via `isProtectedWorkerCmd`, (2) empty-cmdline conservative skip via `requireForeignCmd`, (3) deep ancestry via `hasLiveClaudeAncestor`. A legit fleet worker satisfying any of these three never reaches the zombie list. The RSS and age floors are additional pre-gates. No path exists where a prism-cmd + dead-parent + aged + RSS=0 worker reaches the `zombies.push()` call.

**Active-chat-node safety (check 3): both paths are confirmed protected.**

- `H:/prism/mcp-server/dist/index.js` — matches `mcp-server[\\/]dist[\\/]index\.js` in `PRISM_WORKER_PROTECT_PATTERNS`. Verified against the live regex.
- `H:/prism/.claude/hooks/...` — matches `[\\/]prism[\\/]` (the prism-tree catch-all). Verified in the runtime check above. The relative `.claude/hooks/` form also matches `[\\/](scripts|\.claude)[\\/]` against the live regex.

**findMcpZombies regression (check 4): untouched.**

The diff adds `findStaleOrphanedNodes` and `buildStaleNodeProtectRegex` as new exports. `findMcpZombies` is the final export in the file, its body is byte-identical to prior behavior, and the sweep call-site for `findMcpZombies` at line 2176 is unchanged — no new opt
... [+1062 chars truncated]
