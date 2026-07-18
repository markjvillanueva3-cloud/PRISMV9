---
name: reference_gitbash_schtasks_slash_flag_mangle_2026_06_10
description: git-bash mangles schtasks /run /tn flags into paths; use powershell Start-ScheduledTask to restart PRISM tasks
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.587Z
aliases: reference_gitbash_schtasks_slash_flag_mangle_2026_06_10
---


Restarting a PRISM scheduled task (e.g. `PRISM MCP Server` when `:3100` is down) from the **Bash tool** with `schtasks /run /tn "PRISM MCP Server"` FAILS: git-bash (MSYS) rewrites the leading-slash flag into a Windows path — observed error `ERROR: Invalid argument/option - 'C:/Program Files/Git/run'`. The `/run` and `/tn` get treated as paths, not flags.

**Use instead (git-bash-safe):**
```
powershell -NoProfile -Command "Start-ScheduledTask -TaskName 'PRISM MCP Server'"
```
Or, if you must use schtasks, double the slashes so MSYS leaves them alone: `schtasks //run //tn "PRISM MCP Server"`.

Verify recovery by polling `:3100` initialize (POST `/mcp` with `accept: application/json, text/event-stream`) until 200 — the supervised server takes ~15s to bind. NOTE: a watchdog/`singleton-service-guard --fix` will often auto-restart `:3100` independently, so a 200 after a failed `/run` may be the watchdog, not your command (R12 — don't claim the restart if your command errored). Observed live 2026-06-10 (slot:zulu): `:3100` went 200→000 mid-session, recovered to 200 at t+15s while the `schtasks /run` invocation had errored out. Related: [[reference_mcp_sdk_single_transport_invariant_2026_05_25]].
