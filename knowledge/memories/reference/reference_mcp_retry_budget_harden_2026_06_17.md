---
name: reference_mcp_retry_budget_harden_2026_06_17
description: "MCP bridge request-retry budget was 15s but a server cold-boot/restart takes ~50s, so a tool call landing in a restart window threw a JSON-RPC connection error and Claude Code could drop `prism` for the session. Raised request 15s->75s, init 60s->90s (both < .mcp.json MCP_TIMEOUT=120000). DEFENSE-IN-DEPTH for the rare real restart -- NOT the primary cause (that was the already-fixed false-broadcast). R12: corrected my own OOM-misdiagnosis mid-review."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.653Z
aliases: reference_mcp_retry_budget_harden_2026_06_17
---


# MCP bridge retry-budget hardening + an OOM-misdiagnosis self-correction (2026-06-17, slot:golf)

Operator: *"still having mcp server issues" / "chats will not stay connected."*

## The change (LIVE on-disk; commit routed)
`.claude/helpers/mcp-http-bridge.mjs` retry-budget DEFAULTS:
- `REQUEST_RETRY_BUDGET_MS` **15000 -> 75000** (the load-bearing one)
- `INIT_RETRY_BUDGET_MS` **60000 -> 90000**
- `READY_BUDGET_MS` 60000 -> 90000 (INERT for live `prism` -- `.mcp.json` pins `PRISM_MCP_READY_BUDGET_MS=120000`; the default is only the no-env fallback)

All three stay UNDER the `.mcp.json` `MCP_TIMEOUT=120000` per-call ceiling so a retried-then-succeeded call still returns in-window. Env-overridable; the DEFAULT change fixes every slot's bridge on next respawn.

## The real, verified gap (narrow)
The bridge already retries connection-class errors (ECONNREFUSED/ECONNRESET/EPIPE) in `forwardWithRetry`, but a REGULAR request used only a **15s** budget while a server cold-boot/restart takes **~50s** (`scripts/mcp-server-supervisor.mjs:238` "~50s cold boot"). So a tool call landing in a restart window exhausted 15s, threw a JSON-RPC connection error, and Claude Code could then drop `prism` for the whole session. `initialize` had 60s (only ~10s margin over the 50s boot). Raising both gives comfortable margin. App errors / wedged-but-alive servers still throw IMMEDIATELY (not retried) -- the longer budget only extends connection-class retries (3-of-3 verified at `mcp-http-bridge.mjs:279-282`).

## R12 SELF-CORRECTION (the important part)
My first-draft comment asserted the server "OOM-restarts every ~2.4h (documented leak, exit 0xFFFFFFFF)" as FACT. 3-of-3 arm B caught it: this contradicts the same-day 3-of-3-PASS memory [[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]] (slot:bravo), which establishes that exit **0xFFFFFFFF / signal null is a Windows TerminateProcess/force-kill signature, NOT a confirmed V8 OOM** (no FATAL/heap marker anywhere in the logs). The supervisor's OWN "OOM-killed" comment (lines 197-214) is itself suspect on that basis. Corrected the comment to the verified narrow claim (restart/boot ~50s > old 15s budget; force-kill not OOM) + framed the raise as defense-in-depth.

## The bigger reframe (do not re-derive the false positive)
Per bravo + golf same-day memories, **0 live `mcp-http-bridge` processes is the NORMAL resting state, not an outage** -- the bridges are spawn/serve shims and a census of 0 is the exact false-positive that [[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]] + [[reference_golf_mcp_bridge_count_false_positive_2026_06_17]] already diagnosed. The operator's recurring "chats kicked" pain was verified to be a **FALSE fleet-reconnect broadcast on a HEALTHY server**, already fixed in `80ce407d2c` + `U-MCP-FALSEPOS-LIVEPROBE` (live-probe gate: broadcast only on CONFIRMED-down). My budget raise is a SEPARATE, additive hardening for the rare REAL restart -- it is not the primary cure. Honest status to operator: server `:3100` is healthy (5ms /health, /ready 200); the false-broadcast is fixed; this closes the last latent retry-window gap.

## Lineage (fits the whole, R16)
Closes the "Bridge resilience" follow-up explicitly flagged in [[reference_mcp_server_3100_crash_fix_2026_05_22]] (lines 97-103): "a retry-with-backoff in `mcp-http-bridge.mjs` would close this -- NOT built." Retry + `/ready` gate were built since; this widens the REQUEST budget to finally cover the full boot window. Not a duplicate, not a conflict.

## Verification
- 3-of-3 PASS (session claude-04256fb3): arm A holistic PASS, arm B independent PASS on re-verify (both P1s -- OOM-misdiagnosis + READY-inert -- resolved), arm C analyst PASS (P2 head-of-line + single-attempt-overshoot are pre-existing/amplified, not introduced).
- `node --check` PASS; grep-confirmed values 90000/75000/90000; invariant 50000 < v < 120000.

## Commit routing + owed follow-ups
- **Commit:** golf's `git-add-lane-guard` blocks staging from the shared `h:/prism` tree (cwd != golf worktree scope, and the bash cwd is pinned to h:/prism so even the golf-worktree path is unreachable from this chat). Fix is LIVE on-disk + saved as `H:/prism/.git/mcp-bridge-budget-fix.patch` (valid unified diff). ROUTE to a shared-tree chat (papa): `[MAIN-FORCE] [GOLF-FLEET-HYGIENE]/U-MCP-RETRY-BUDGET-HARDEN`.
- **OWED (out of golf lane, deeper):** (1) confirm WHAT force-kills `:3100` ~every few h (watchdog killing a wedged server? operator? -- read `mcp-server-watchdog.mjs` decideRestart + the 5 competing scheduled tasks: `PRISM MCP Server`, `...Watchdog`, `Connectivity Monitor`, `Priority Guardian`); (2) consolidate the competing managers to ONE owner (the deep 21-process respawn tree self-converged via the O_EXCL bind-race, but it is loud); (3) a real memory leak -- if any -- is server-code (mcp-server/src TS), not confirmed from exit-code alone.

Siblings: [[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]] · [[reference_mcp_falsepos_idle_broadcast_fix_2026_06_17]] · [[reference_golf_mcp_bridge_count_false_positive_2026_06_17]] · [[reference_mcp_server_3100_crash_fix_2026_05_22]] · [[reference_mcp_client_enforce_ms0_2026_06_13]].
