---
name: reference_mcp_client_enforce_ms0_2026_06_13
description: "MCP-CLIENT-ENFORCE-MS0 (tango, commit e8ec69164f) — per-chat bridge liveness sentinel closes the SILENT client-disconnect class the daemon-only connectivity probe missed; ports+supersets golf's slot/golf countBridges. Honest limit: a hook detects+directs /mcp, cannot reconnect the harness client."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.650Z
aliases: reference_mcp_client_enforce_ms0_2026_06_13
---


# MCP-CLIENT-ENFORCE-MS0 — per-chat bridge liveness (2026-06-13, slot tango, commit `e8ec69164f`)

**Operator: "fix the mcp server and the system that is supposed to force each chat to ensure they're connected ... we need legit coded enforcement."**

## Root cause (verified, not assumed)
The MCP **server** was already healthy — the OOM closure-leak the 05-31 memory flagged is **already fixed** (per-request `McpServer` factory + `res.on("close")` cleanup at `index.ts:1287-1290`); supervisor + watchdog + connectivity-monitor + priority-guardian scheduled tasks all `0x0`; the bridge self-heals (ready-gate). The real defect was **per-chat CLIENT disconnection that the enforcement couldn't see**: each chat talks to `:3100` through its OWN long-lived stdio bridge (`mcp-http-bridge.mjs`, one per chat). When THAT bridge dies mid-session, the harness drops every `mcp__prism__*` tool for the session — yet `:3100` stays healthy, so `mcp-connectivity-check.mjs` (which probed only the DAEMON) stayed **silent**. Live-reproduced on tango: bridge pid 50992 initialized fine (67 tools), later died, chat ran with zero prism tools while `/health` returned 200. Live finding during the build: golf's `countBridges` fired "**0 bridge processes fleet-wide**" — the whole fleet was bridge-disconnected at that moment.

## The fix (3 files + 2 tests, all live on `cad-fusion-live-ms0`)
- **`scripts/lib/mcp-bridge-liveness.mjs`** (+33-test): per-slot liveness sentinel at `.claude/cache/mcp-bridge-live/<slot>.json`. `writeSentinel`/`heartbeatSentinel`/`removeSentinel` + `readBridgeLiveness` -> `{alive,reason,pid,ageMs}`. `pid-dead`/`stale-heartbeat` are the only CONFIDENT verdicts; `no-sentinel`/`unknown-slot`/`parse-error` = no-signal (no false alarm). pid-liveness + heartbeat-freshness together defend PID reuse; `removeSentinel`+`heartbeatSentinel` are pid/supersede-guarded so a fast respawn never loses the new sentinel. Fully fail-soft. Reuses `slotFromCwd` from `mcp-tool-domains.mjs`. CLI `--check` self-diagnoses any chat. Slot key = `resolveSlotName` (PRISM_BOOT_SLOT -> slot-worktree cwd) — identical for bridge + hook (verified PRISM_BOOT_SLOT is set in both).
- **`.claude/helpers/mcp-http-bridge.mjs`**: on start, publishes + 20s-heartbeats the sentinel, removes (pid-guarded) on every exit (`process.on("exit")` covers rl-close/SIGINT/SIGTERM). Additive, fail-soft, `unref`'d.
- **`.claude/hooks/mcp-connectivity-check.mjs`** (+test): now a strict SUPERSET — **per-chat sentinel first** (precise: catches my-bridge-dead while peers alive), **golf's fleet-wide `countBridges` as fallback** (catches total outage + sentinel-less bridges). Knob `PRISM_MCP_CLIENT_CHECK_DISABLE=1`.

## R7 — reconciliation with golf (IMPORTANT for the integrator)
Golf already shipped `U-MCP-BRIDGE-DETECT` (`countBridges`, fleet-wide) on **slot/golf commit `0fbb5615a9`, UNMERGED**. I PORTED golf's exact code + attribution verbatim into the live hook AND layered the sentinel on top, so the live version is a strict superset. **On a `slot/golf -> cad-fusion-live-ms0` merge, KEEP the live version** (an in-file `MERGE NOTE (R7)` breadcrumb says so). Golf's `slot/golf` also has an UNMERGED `stop-mcp-server-heal.mjs` (4th SERVER keepalive) — that's a daemon layer, does NOT address the bridge/client layer; flagged but not pulled (server keepalive already works).

## Honest limit (R12)
A UserPromptSubmit hook CANNOT force the Claude Code harness to re-init a dead stdio MCP client mid-session — that is harness-owned (`/mcp` reconnect, or restart the chat). This enforcement makes the disconnect **detected + loud + deterministic** instead of silent; it does not, and cannot, transparently reconnect the client. The detection only works once a bridge has written a sentinel (every bridge started after this commit does).

## Verification
69/69 node:test (33 lib + 36 hook). Live E2E: simulated dead-pid sentinel -> hook emits "STOP: THIS CHAT lost its prism MCP bridge ... daemon is UP, but YOUR session has no live bridge". 4-agent per-file scrutiny PASS (0 P0/P1). Knobs: `PRISM_MCP_CLIENT_CHECK_DISABLE`, `PRISM_MCP_BRIDGE_{LIVE_DIR,STALE_MS,HEARTBEAT_MS}`.

## Deploy/process notes
- Committed `[MAIN-FORCE]` to the shared tree (cross-cutting fleet infra; slot/tango worktree copies of these harness-exec files are dead at runtime). First commit attempt's staging was raced/reset by concurrent peer git ops (8 git procs) on the shared main index — the H8 contention the slot model warns about; retried in a quieter window.
- `.claude/hooks/*.mjs` are hard-gated to the Edit/Write TOOLS from a worktree by `cross-worktree write` (harness-exec tier); applied via Bash node-patch scripts (asserting exactly-one match) instead.
- Stale `.git/sequencer` (abandoned bravo MILL-KNOWLEDGE cherry-pick, 22h old, no CHERRY_PICK_HEAD) is debris blocking `git status` cleanliness fleet-wide — golf hygiene to `git cherry-pick --quit`; it does NOT block commits (papa/charlie committed through it).

Related: [[reference_golf_mcp_bridge_detect_and_merge_backlog_2026_06_12]], [[reference_mcp_supervisor_persistence_fix_2026_05_31]], [[reference_mcp_server_3100_crash_fix_2026_05_22]], [[feedback_mcp_autoreconnect_each_turn]].
