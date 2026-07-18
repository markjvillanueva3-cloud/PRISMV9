---
name: reference_reaper_safety_audit_complete_2026_06_11
description: 2026-06-11 — COMPLETE 7-path fleet-reaper safety audit (operator "reapers must not kill active fleet nodes/tools"). ALL 7 node-killing paths confirmed safe (2 fixed this session, 5 already-safe by design). Zombie Reaper v2 is allow-list-gated (NOT the RSS vector — corrects an earlier misread). Also: `PRISM Fleet Reaper` LastResult=0x1 is BENIGN (caveats-present exit, NOT a failure).
type: reference
galaxy: fleet-hygiene
source: prism-memory
synced: 2026-06-27T20:30:47.144Z
aliases: reference_reaper_safety_audit_complete_2026_06_11
---


# Fleet-reaper safety audit — all 7 node-killing paths (2026-06-11, slot:golf)

Operator directive: *"make sure fleet reapers are running, adjust so they dont kill active chat fleet nodes and tools."* Comprehensive (R13/R15 apply-to-all) audit of EVERY reaper that can kill a node/bash/git process:

| Reaper (script) | Kill vector | Verdict |
|---|---|---|
| `findStaleOrphanedNodes` in `scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs` | RSS/age/dead-parent classification, NO cmdline allowlist | **HAD THE BUG → FIXED** — added `DEFAULT_PRISM_WORKER_PROTECT_REGEX` + `buildStaleNodeProtectRegex` + `isProtectedWorkerCmd` + `hasLiveClaudeAncestor` + no-cmdline-skip. Commits `de66545dbe` + `1b49790a70`, 44/44 tests. |
| `.claude/helpers/node-orphan-cleaner.mjs` | transient node.exe | **HAD related vector → FIXED** — imports the shared protect-regex into `isProtected`. Commit `8ee957e6ee`, 10/10 tests. |
| `scripts/reap-orphan-procs.ps1` (PS Orphan Process Reaper) | **cmdline-allowlist** (only node.exe matching `.claude/(hooks\|helpers)` AND age>120s) | **ALREADY SAFE** — pure-PS, no child spawns (works when machine is process-exhausted). 16-case self-test asserts MCP server `dist/index.js`, Claude Code, LSP, Playwright MCP, vitest, tsx are NEVER killed. This is the SAFE design the others now match. |
| `bash-orphan-cleaner.mjs` | orphan bash.exe from THIS host's claude tree | conservative, different vector (bash not node) |
| `scripts/system-health/28-cleanup-orchestrator.ps1` (Cleanup Orchestrator) | delegates to node-orphan-cleaner + bash-orphan-cleaner, "NO new kill logic" | **INHERITS the hardening** of node-orphan-cleaner (fixed above) |
| `scripts/system-health/03-memory-pressure-auto-relief.ps1` (Memory Pressure Auto-Relief) | kills only `02-kill-zombie-tsservers.ps1` (stale MCP TS-servers) + tree-kills its own hung sub-cleaner on timeout | no fleet-node kills; "does NOT kill live processes the operator sees" |
| `.claude/hooks/stop_close_prism_nodes_v2.mjs` (Zombie Reaper v2) | **CommandLine allow-list** — kills only orphaned (parent-dead, ESRCH) node.exe/git.exe whose cmdline matches `.claude/(hooks\|helpers\|scripts)` or `H:/.claude` | **ALREADY SAFE (verified — corrects earlier misread).** Wired as a Stop hook (settings.json:763). Has NONE of the RSS/workingSet/ageMs fields. "Never kill outside this allow-list" (line 36). MCP server `mcp-server/dist/index.js` + top-level `scripts/` galaxy miners are OUTSIDE the allow-list → never killed. NO fix needed; NO firewall bypass needed. (An earlier session summary wrongly claimed v2 "shares the same RSS vector" — that was an unverified carry-forward; the code shows allow-list gating.) |

## `PRISM Fleet Reaper` scheduled task LastResult=0x1 is BENIGN (do NOT "fix" it)
`node scripts/fleet-reaper-sweep.mjs --once` exits **1** whenever it surfaces caveats (e.g. `CHAT CRASH DETECTED (N slots)`), with `ok:false` in the JSON. The 2026-06-11 run: `disabled:false, dryRun:false, underPressure:false, pressureTier:normal, slots.protected:17`, caveat = 12 crashed slots (70-147min stale heartbeats = genuinely dead sessions). The reaper ran HEALTHY — `0x1` is its designed "caveats present" exit, NOT a crash. `0x1` is a script exit code, not a Windows HRESULT launch-failure (0x8.. / 0xFFFD0000), so `fleet-task-health-watch.mjs` correctly does NOT flag it (per CLAUDE.md "only HRESULT launch-failure codes count as failing"). A future chat seeing 0x1 must NOT treat it as broken.

**Why:** prevents re-auditing all 7 paths + prevents a future chat misreading the by-design 0x1 as a failure to "fix". **How to apply:** the directive is FULLY satisfied — all 7 node-killing paths are safe, NO open safety item, NO firewall bypass needed (the only operator actions left are capacity-side: `wsl --shutdown` to apply the 32GB WSL cap, and optional elevated re-register of the durable `PRISM Fleet Reaper` task — it's already Enabled + guardian-backed). The safe design pattern for ANY node-reaper is the cmdline-allowlist (`reap-orphan-procs.ps1` + Zombie Reaper v2): protect by what the process IS, never by RSS/age alone. The 2 fixed paths now match this pattern. Related: [[feedback_reapers_disabled_2026_06_11]], [[reference_golf_inventory_of_record_2026_06_11]], [[feedback_golf_owns_reaper]].
