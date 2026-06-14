---
name: reference_wsl_guard_register_mcp_down_2026_06_08
description: "Golf 2026-06-08 close-out — registered the MISSING PRISM WSL Memory Guard task (fixed installer token-window mismatch), and caught+restarted a silently-down MCP server (task said Running, wire refused)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.064Z
aliases: reference_wsl_guard_register_mcp_down_2026_06_08
---


# WSL guard registration + MCP-down catch (golf, 2026-06-08)

## 1. Installer sanity-check token-window mismatch (real defect, fixed)
`install-wsl-memory-guard-task.ps1` (sierra, MCP-FLEET-CAPACITY-MS0) refused to register: it greps the **first 120 lines** (`Get-Content -TotalCount 120`) of `27-wsl-memory-guard.mjs` for BOTH `wsl-memory-guard` AND `parseWslConfigCap`. `parseWslConfigCap` is at line 69 (in-window), but the literal hyphenated string `wsl-memory-guard` first appeared only at **line 200** (the run-as-main guard comment) — the header said "WSL memory-cap guard" (`memory-cap`, not `memory-guard`). So the `-and` legitimately failed.
- **Fix (golf):** added a self-id token line to the engine header (line ~3-9) carrying both `wsl-memory-guard` and `parseWslConfigCap` inside the 120-line window. Comment-only — cannot affect logic. Smoke-tested: engine still emits valid JSON + exit code.
- **Lesson:** an installer that greps a fixed line-window for identity tokens is brittle to header wording. The token must live in the header, not just at EOF. (Could also widen `-TotalCount`, but putting the token in the header is the more robust + self-documenting fix.)

## 2. PRISM WSL Memory Guard — REGISTERED (was MISSING)
`& install-wsl-memory-guard-task.ps1 -RunNow` → Ready, S4U autonomous, every 15 min + AtStartup, +390s phase offset, **advise-only** (no `--enforce`). First run `LastResult=0x2` = OVERRUN verdict (correct: live WSL commit 95.34 GB vs cap 16 GB, cap NOT enforced because no `wsl --shutdown` since `.wslconfig` was set). This is the durable structural backstop for the recurring commit-pressure crisis fought all session ([[reference_ollama_keepalive_commit_leak_2026_06_08]]).
- **Did NOT auto-reclaim** (`wsl --shutdown`): 5 healthy live PRISM containers were up (qdrant/postgres/grafana/prometheus/nim-llama32-3b). A blind shutdown = self-inflicted infra outage. The guard's advise-only default + docker-active gate is exactly right. Manual reclaim is operator-gated when containers are idle.
- **Ollama keep-alive fix confirmed working:** `/api/ps` now shows BOUNDED `expires_at` (minutes out, e.g. 3:53 PM) instead of the far-future `2318` pin. The 30m TTL took effect; idle models self-evict. No manual unload needed.

## 3. MCP server silently DOWN — task "Running", wire refused (recurring class)
`Get-ScheduledTask "PRISM MCP Server"` showed **State=Running** with HRESULT `0x800710E0` — but `:3100` **actively refused** connections, NO listener, NO server node process (only tsserver LSPs), real `LastTaskResult=0x1`. The task state lied; the wire was the truth.
- **Fix:** `Start-ScheduledTask "PRISM MCP Server"` → UP in ~3s, HTTP 200 healthy (v2.10.0). `MCP Priority Guardian` LastResult cleared 0x41301→0x0 once the server was healthy.
- **Doctrine (R12):** NEVER trust a scheduled-task `State=Running` / HRESULT for a network service. Hit the actual endpoint (`Invoke-WebRequest :3100/health`). Task-process-alive ≠ service-serving. This is the 2nd MCP-down catch this session — the watchdog + priority guardian exist but a wire-check is the only ground truth.
- **RECURRENCE (3rd catch, ~3:45 PM):** MCP server crashed AGAIN, surfaced by the `consolidate-graph: mcp-down (fetch failed)` Stop-hook hint (an honest detector — trust it, then wire-verify). Watchdog ran 3:43 clean, server died before its 3:48 next-run → it crashes in the ~5-min gap between watchdog polls. Restart via task → UP in 3s every time. **Pattern: the MCP server is OOM/commit-crash-looping (~3×/session), NOT a one-off.** Restart is the band-aid; the durable fix is the server's own heap/restart-on-RSS-pressure tuning (watchdog already bumps NODE_OPTIONS heap per `8cbd06cf5`/`ee8be4fd2` — may need a tighter RSS preempt threshold or a shorter watchdog interval). Root-cause crash diagnosis = MCP-server-internals work (kilo/owner), beyond golf restart-hygiene. The `consolidate-graph mcp-down` hint is the cheapest live down-detector in the fleet — keep heeding it.

[[reference_ollama_keepalive_commit_leak_2026_06_08]] · [[reference_golf_session_lookback_2026_06_08]] · [[reference_mcp_sdk_single_transport_invariant_2026_05_25]] · [[feedback_golf_owns_reaper]] · [[feedback_verify_actual_contract_not_proxy]]
