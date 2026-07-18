---
name: reference_fleet_search_daemon_ms0_2026_06_14
description: Warm persistent master-index search daemon (:3101) resurrects the dead 262MB sidecar; sync curl seam + opt-in subagent daemon search. slot tango 2026-06-14.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.576Z
aliases: reference_fleet_search_daemon_ms0_2026_06_14
---


**FLEET-SEARCH-DAEMON-MS0** (slot tango, 2026-06-14, commits `6da1246aa7` + `1ab1f6644f`) — resurrects the dead 262MB master-index sidecar.

**The dead-sidecar problem:** `master-index-search-lib.mjs` builds a 262MB `system-graph-index.json` sidecar to speed search over the 745MB `system-graph.json`, but it is **rejected fleet-wide** — hooks run at ~384MB heap (~432MB limit), the lib's sidecar parse ceiling is 35%-of-heap (~151MB), so 262MB > ceiling → every consumer falls back to the 59MB architecture-graph (partial) or slow streaming. The expensive index exists on disk and is never used.

**Fix:** `scripts/master-index-daemon.mjs` — long-lived HTTP daemon on `127.0.0.1:3101` (`PRISM_INDEX_DAEMON_PORT`) with `--max-old-space-size=2048`. Loads graph + sidecar ONCE at startup, answers `/health` `/search?q=&k=` `/tribal?q=&k=` from the warm index. Sets `PRISM_INDEX_DAEMON_SELF=1` + `PRISM_SIDECAR_MAX_BYTES=1GB` at top (anti-recursion + raise its own ceiling). Single-instance via EADDRINUSE→exit 0. Live: warm 2133ms, /search 82ms, pid 38976, 10.5h uptime.

**Client seam (U-DAEMON-WIRE):** async `searchViaDaemon`/`masterIndexSearch` (daemon-first, fail-soft null, 250ms timeout, `source` provenance) + sync `searchViaDaemonSync`/`masterIndexSearchSync` (ONE `curl` spawn via execFileSync, 16MB cap, bounded timeout, null on any miss). `runMasterIndexSearch` UNCHANGED (backward-compat). First consumer wired: `spawned-agent-context-lib.runPerTaskSearches` opt-in via `PRISM_SUBAGENT_DAEMON_SEARCH=1` — full-coverage subagent pre-search with NO local graph load, lifting the `PRISM_MASTER_INDEX_INJECT=0` OOM gate; zero cost when off, clean fallback on miss.

**Test deadlock lesson (load-bearing):** `searchViaDaemonSync` uses SYNCHRONOUS `execFileSync('curl')` which blocks the caller's event loop → an IN-PROCESS stub HTTP server (same process) cannot serve that curl → hangs → null. The happy-path test MUST use a SEPARATE-process stub (child `node -e` http server, read port from stdout, then sync-curl it). Miss-path tests (disabled/self/empty/refused) need no server. 19/19 green.

**Durable activation (operator-gated):** `.claude/helpers/install-index-daemon-task.ps1` (`PRISM Index Daemon` task, AtStartup+AtLogon+5min, SYSTEM principal). Needs ONE elevated run: `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-index-daemon-task.ps1 -RunNow`. Until then alive as manual pid 38976, not self-healing across reboot.

**Reaper-protected:** `master-index-daemon` in `_MCP_PROTECT_REGEX` + `PROTECTED_PATTERNS`.

**Knobs:** `PRISM_INDEX_DAEMON_{PORT,HOST,DISABLE,SELF}` · `PRISM_SIDECAR_MAX_BYTES` · `PRISM_SUBAGENT_DAEMON_SEARCH=1`.

**Hot per-tool consumers (U-DAEMON-HOTHOOKS, commit `20d835024e`):** the 4 `pre-{read,write,grep,bash}-graph-inject.mjs` PreToolUse hooks (fire on EVERY Read/Write/Grep/Bash, fleet-wide) now query the daemon FIRST via the ASYNC `searchViaDaemon` seam (node http, ZERO extra spawn — sync curl would add a process per tool call and worsen the fork-storm). `main()` is already async; `renderInject` uses only `/search`-returned fields (no downstream decorate = the trap that reverted precheck-inject). Measured pre-read (distinct sessions): 463ms avg, 5/5 reliable, 3 full-coverage hits each, vs multi-second flaky in-process. `daemonTimeoutMs:400` (daemon serves 82-150ms); daemon-down = instant ECONNREFUSED fall-back. Recipe: `scripts/wire-graph-inject-hooks-to-daemon.mjs` (idempotent, count-verified + node --check + auto-revert). **Measurement-trap lesson:** these hooks dedup per-(session,file) (U-PRGI-DEDUP) — reusing one session_id reads "1/5 hits" (dedup markers on calls 2..N), looks flaky but is by-design; use DISTINCT session_ids per timing run.

Wiki: [[fleet-search-daemon-ms0]]. Sister to the MCP-CLIENT-ENFORCE work this session ([[reference_mcp_client_enforce_ms0_2026_06_13]]) and the fleet efficiency audit ([[reference_fleet_efficiency_audit_2026_06_14]]).
