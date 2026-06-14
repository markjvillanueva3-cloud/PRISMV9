---
name: reference_mcp_cmdmatch_blind_2026_06_09
description: "singleton-service-guard cmdMatch was BACKSLASH-only ('mcp-server\\dist\\index') but the real MCP daemon cmdline is FORWARD-slash ('node H:/prism/mcp-server/dist/index.js') → guard reported daemonCount=0 while the daemon owned :3100. Hermetic tests injected daemonPids so never caught it. Fixed slash-agnostic + port-owner union (ed6662f45e). Open: why supervisor was slow to respawn at counter=10."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.204Z
aliases: reference_mcp_cmdmatch_blind_2026_06_09
---


**2026-06-09 (slot golf, synergy /goal — found while recovering the 3rd MCP outage this session).**

**THE BUG (verified + fixed, commit `ed6662f45e` U-MCP-CMDMATCH-FIX):** `scripts/singleton-service-guard.mjs` `SINGLETON_SERVICES[mcp].cmdMatch` was `"mcp-server\\dist\\index"` (BACKSLASH literal). But the live MCP daemon (pid 63828, the `:3100` port owner) has command line **`H:\Tools\nodejs\node.exe H:/prism/mcp-server/dist/index.js`** — FORWARD slashes (the supervisor's spawn form); the daemon-helper spawns relative `node dist/index.js` (also forward, no `mcp-server` prefix). The backslash regex matched NEITHER → `daemonPidsFor` returned `[]` → the guard reported **`daemonCount=0` while the daemon was alive + healthy + owning :3100** (a self-contradiction: `healthy=true, daemonCount=0`). **Consequence:** the reap logic was unreliable for the ACTUAL spawn paths — a forward-slash WEDGED daemon reads as `not-running` (→ start, no reap) instead of `all-wedged` (→ reap+start), so the guard's whole reason-for-being (reap a duplicate pileup) could silently fail in production.

**Why the tests missed it (the lesson):** the hermetic suite injects `daemonPids` directly into `classifyServiceHealth`/`fixPlan` (pure core) and NEVER exercised `daemonPidsFor`'s regex against a real command-line string. Classic **pure-core-tested / IO-shell-untested-against-reality** gap — the same lesson as RGS-MS1's "pure-core + injected-readers MUST ship a real-data E2E." The "daemonCount" the guard reported in prior memories (e.g. [[reference_mcp_daemon_pileup_port_conflict_2026_06_09]] "2 wedged daemons 53400/63708") was likely from a MANUAL `Get-CimInstance` by the chat, not the guard's own (broken) regex.

**FIX:** (1) cmdMatch → slash-agnostic `"mcp-server[\\\\/]+dist[\\\\/]+index"` (matches `mcp-server/dist/index` AND `mcp-server\dist\index`); (2) `main()` unions the authoritative port-owner PID (`portOwnerPid` via Get-NetTCPConnection, path-agnostic) into the daemon set so a relative-path serving daemon is never under-counted; (3) exported pure `isMcpDaemonCmdline(cmdLine, cmdMatch)` + 3 real-string tests (fwd-slash supervisor form, backslash form, tsserver/supervisor-loop non-match) that FAIL against the old regex (R9). 17/17 tests. **LIVE-validated: daemonCount 0 → 1** (guard now sees pid 63828).

**STILL OPEN (honest — NOT concluded):** at `consolidate-graph counter=10` MCP was genuinely down (`portUp=false` via HTTP probe, authoritative) for ~10 cycles before `--fix` recovered it. The `PRISM MCP Server` supervisor task was `state=Running` with a live loop process (count=1) and a port-lock held by pid 63828 (ALIVE) — so this was NOT a stale-lock-from-dead-pid. After `--fix`, pid 63828 (a SUPERVISOR-spawned daemon) is what owns :3100 — so the supervisor likely DID respawn ~concurrently with my --fix. **Unresolved:** whether the ~10-cycle down window is a slow cold-boot (40-50s × exponential backoff, per [[reference_mcp_supervisor_persistence_fix_2026_05_31]]) or a real respawn-latency gap. Needs clean-box observation; this is 06-04-plan FIX-1/FIX-6 territory (allocation-storm crash + escalation-backoff), papa/backend lane — [[reference_mcp_resilience_plan_2026_06_04]]. The recurring crash itself (forcing the cold-boot) is the deeper root cause, NOT golf's lane to fix.

Related: [[reference_mcp_daemon_pileup_port_conflict_2026_06_09]] (the --fix tool this guard's reap logic backs), [[reference_infra_health_verified_2026_06_09]].
