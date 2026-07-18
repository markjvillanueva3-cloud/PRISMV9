---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Holistic final review of the stale-node-hunter hardening (2 commits) in H:/prism"
date: "2026-06-11"
first_ts: "2026-06-11T18:45:28.397Z"
last_ts: "2026-06-11T18:46:51.250Z"
cwd: "H:\\prism-slot-golf"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/agent-a7f42c09f64d13dbd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Holistic final review of the stale-node-hunter hardening (2 commits) in H:/prism

> **claude-code-cli** | 2026-06-11 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/agent-a7f42c09f64d13dbd.jsonl`

## Transcript

### User | 2026-06-11T18:45:28.397Z

Holistic final review of the stale-node-hunter hardening (2 commits) in H:/prism. Run `cd /h/prism && git diff de66545dbe~1 -- scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs scripts/fleet-reaper-sweep.mjs` to see the full change, and `git log --oneline de66545dbe~1..HEAD -- scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs` for the commit chain.

CONTEXT: this reaper 2nd-pass (`findStaleOrphanedNodes`) was killing LEGIT idle/detached fleet node.exe (galaxy miners, *-sidecar embedders, vault pipelines — RSS~0, dead parent by design) → operator disabled the whole reaper. The fix adds 3 safety gates (cmdline-allowlist + no-cmdline-skip + deep-ancestry). A prior reviewer (C) raised 2 BLOCKERs now fixed in commit 1b49790a70: (B1) bare `dist/index.js` over-protected foreign npm zombies → anchored to `mcp-server/dist/index.js`; (B2) sweep folded whole _MCP_PROTECT_REGEX → now folds only PRISM_REAPER_PROTECT_EXTRA.

VERIFY (FAIL on any real defect):
1. BLOCKER-1 RESOLVED: confirm the lib pattern is now `mcp-server[\\/]dist[\\/]index\.js` (anchored), NOT bare `dist/index.js`. Confirm `node /opt/foreign/dist/index.js` does NOT match the protect regex but `node H:/prism/mcp-server/dist/index.js` does.
2. BLOCKER-2 RESOLVED: confirm the sweep call passes `buildStaleNodeProtectRegex(_PROTECT_EXTRA.replace(/^\|/, ""))` (env-extra only), and the lib default genuinely covers the sweep's named patterns (galaxy-/vault-/fleet-/build-memory/watchdog/mcp-*) so nothing is lost.
3. INCIDENT STILL PREVENTED: a detached `node H:/prism/scripts/mine-galaxy-transcripts.mjs` (RSS=0, dead parent, aged) is still NOT reaped.
4. No stubs/no weakened tests; the 3 new tests actually assert the BLOCKER fixes.
5. Run `node --test scripts/lib/fleet-reaper-mcp-zombie-hunter.test.mjs 2>&1 | tail -5` and confirm all pass.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER:/P1: lines, ≤5 notes. If unsure, FAIL.

### Assistant | 2026-06-11T18:45:31.627Z

I'll run the git commands and read the relevant files to conduct this review.

### Assistant | 2026-06-11T18:45:32.570Z

[tool_use: Bash]

### Assistant | 2026-06-11T18:45:33.314Z

[tool_use: Bash]

### User | 2026-06-11T18:45:45.453Z

[tool_result] diff --git a/scripts/fleet-reaper-sweep.mjs b/scripts/fleet-reaper-sweep.mjs
index a8572bcdd5..afad39bc21 100644
--- a/scripts/fleet-reaper-sweep.mjs
+++ b/scripts/fleet-reaper-sweep.mjs
@@ -161,7 +161,7 @@ import {
 // via the existing reapProcesses helper. Strictly additive; default-on but
 // each hunter gates on its own PRISM_FR_HUNT_*_DISABLE env knob.
 import { runStuckHunters, buildProtecte
... [+20799 chars truncated]

### User | 2026-06-11T18:45:50.207Z

[tool_result] 1b49790a70 [MAIN] [FLEET-REAPER-HARDEN]/U-STALE-NODE-DIST-ANCHOR-FIX (slot:golf /loop): anchor dist/index.js + fold env-extra only (reviewer-C BLOCKER-1/-2)
de66545dbe [MAIN] [FLEET-REAPER-HARDEN]/U-STALE-NODE-CMDLINE-ALLOWLIST (slot:golf /loop): stop reaping legit idle/detached fleet node.exe

### Assistant | 2026-06-11T18:45:52.704Z

Now let me read the test file and run it:

### Assistant | 2026-06-11T18:45:54.131Z

[tool_use: Bash]

### Assistant | 2026-06-11T18:45:54.312Z

[tool_use: Glob]

### User | 2026-06-11T18:45:59.376Z

[tool_result]   ...
# Subtest: HARDEN: PRISM mcp-server/dist/index.js -> NOT reaped (anchored pattern still protects the real MCP server)
ok 43 - HARDEN: PRISM mcp-server/dist/index.js -> NOT reaped (anchored pattern still protects the real MCP server)
  ---
  duration_ms: 0.0716
  ...
# Subtest: DEFAULT_PRISM_WORKER_PROTECT_REGEX: bare foreign dist/index.js is NOT matched (anchor holds)
ok 44 - DEFAULT_PRISM_W
... [+214 chars truncated]

### User | 2026-06-11T18:46:20.234Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-11T18:46:23.157Z

I have sufficient information from the diff and test run. Let me verify the specific regex patterns against the BLOCKER criteria directly from the code.

### Assistant | 2026-06-11T18:46:32.582Z

[tool_use: Bash]

### User | 2026-06-11T18:46:38.909Z

[tool_result] BLOCKER-1 foreign dist/index.js matches DEFAULT: false
BLOCKER-1 PRISM mcp-server/dist/index.js matches DEFAULT: true
BLOCKER-2 regex same as default (empty extra): true
DEFAULT covers galaxy-miner.mjs: true
DEFAULT covers vault-pipeline.mjs: true
DEFAULT covers fleet-reaper.mjs: true
DEFAULT covers build-memory.mjs: true
DEFAULT covers watchdog.mjs: true
DEFAULT covers mcp-health-watchdog: true
I
... [+47 chars truncated]

### Assistant | 2026-06-11T18:46:51.250Z

All three verification targets confirmed. 44/44 tests pass.

---

VERDICT: PASS

BLOCKER-1 RESOLVED: `node /opt/foreign/dist/index.js` does NOT match `DEFAULT_PRISM_WORKER_PROTECT_REGEX` (returns `false`); `node H:/prism/mcp-server/dist/index.js` DOES match (returns `true`). The pattern `mcp-server[\\/]dist[\\/]index\.js` is correctly anchored — foreign npm tools with a bare `dist/index.js` path are not shielded.

BLOCKER-2 RESOLVED: The sweep passes `buildStaleNodeProtectRegex(_PROTECT_EXTRA.replace(/^\|/, ""))`, which folds only the operator-extensible env extra, not the entire old `_MCP_PROTECT_REGEX`. With empty `_PROTECT_EXTRA`, `buildStaleNodeProtectRegex("")` returns the exact `DEFAULT_PRISM_WORKER_PROTECT_REGEX` object (object identity confirmed). The default genuinely covers all six named sweep patterns — `galaxy-`, `vault-`, `fleet-`, `build-memory`, `watchdog`, `mcp-health-watchdog` — so nothing that was previously protected is lost.

INCIDENT PREVENTED: `node H:/prism/scripts/mine-galaxy-transcripts.mjs` (RSS=0, dead parent, aged) matches the protect regex via the `[\\/]prism[\\/]` catch-all pattern and would be skipped by gate 1 before any parent/RSS evaluation.

NOTE-1: Tests 43 and 44 in the suite directly assert the BLOCKER-1 anchor fix (`mcp-server/dist/index.js` protected, bare `dist/index.js` not). All 44 pass cleanly with no skips or stubs.

NOTE-2: `requireForeignCmd` defaults `true` — a node process with no recoverable cmdline is conservatively left alone, which is the right failure mode given the incident history (over-reaping is worse than under-reaping here).
