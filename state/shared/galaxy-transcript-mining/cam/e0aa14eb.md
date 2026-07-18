# cam session e0aa14eb (2026-06-24, 3.7MB, spine 48KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `H:\Tools\claude-desktop-instance.ps1` – launcher for isolated Claude Desktop instances (`--user-data-dir`).  
- `H:\Tools\enforce-hidden-tasks.ps1` – idempotent script to convert interactive scheduled tasks to S4U (hidden).  
- `H:\Tools\drain-task-backup.xml` – backup of the original PRISM Tribal Resources Drain task.  

**DECISIONS**  
- Use Electron’s `--user-data-dir` flag to run multiple Claude Desktop instances; single‑instance lock is keyed to data dir, not install slot.  
- Convert all interactive console‑app scheduled tasks (Tribal Drain, Embed, Ollama Guard, SFC loops, Hermes Vault, Launch Readiness) to **S4U** so they run in session 0 with no visible window.  
- Keep the Conhost Janitor task interactive (needs to close orphan windows).  
- Add a **MCP Singleton Guard** scheduled task (every 10 min, S4U) to reap duplicate MCP daemons that were causing intermittent drops.  
- Do not repoint hooks from `portable-node` bash shim to `portable-node.cmd`; git‑bash console windows cannot be suppressed and the cmd version has an exit‑code bug.  
- Draft a feature request to Anthropic for `windowsHide` support on Windows hook shells; no current workaround exists.  

**OPERATOR DIRECTIVES**  
- “dont worry about it for now, if possible can you make it so the node and git exe windows that randomly pop up do not pop up over current windows, it keeps interrupting everything I try to do.”  
- “fix whatever is causing themcp server to drop again.”  
- “build it” (launcher script).  
- “node terminals keep popping up, is there a way to prevent them from showing on screen?”  

**FINDINGS/BUGS**  
- GPU VRAM leak caused by orphaned `llama‑server.exe` processes; reaping freed ~18 GB.  
- Persistent console windows from scheduled tasks (Tribal Drain etc.) – fixed by S4U conversion.  
- Per‑turn hook console flashes due to git‑bash shim; cannot be suppressed without Anthropic change.  
- MCP server duplicate daemons caused intermittent drops; resolved by adding the Singleton Guard task.  
- `portable-node.cmd` had an exit‑code bug (fixed in script).  

**DOMAIN SPECIFICS**  
- Scripts: `fleet-reaper-sweep.mjs`, `singleton-service-guard.mjs`, `chat-slots.mjs`.  
- Scheduled tasks: PRISM Tribal Resources Drain, PRISM MCP Singleton Guard, Conhost Janitor.  
- Metrics collected: OS RAM usage (% & GB), GPU memory used/free/utilization, orphan process count, reaped counts from fleet‑reaper sweep.  
- Hooks: `portable-node` (bash shim) and its Windows‑native counterpart; `golf-slot-write-allowlist.mjs`, `golf-slot-reaper-guardian.mjs`.  

**TOOLS USED**  
- PowerShell for task management (`Get-ScheduledTask`, `Register-ScheduledTask`).  
- Node.js scripts (`node H:/prism/scripts/fleet-reaper-sweep.mjs`).  
- Git for version control (commits like `feedback_golf_owns_reaper`).  
- Windows APIs: Win32_OperatingSystem, Win32_Process.  
- NVIDIA SMI for GPU metrics.  

**OPEN THREADS**  
- Submit Anthropic feature request for `windowsHide` on hook shells to eliminate per‑turn console flashes.  
- Ensure MCP Singleton Guard persists across re‑provisioning (create installer script).  
- Monitor for future GPU VRAM leaks; consider server‑core refactor (`U-MCP-FACTORY-REFACTOR`) if leak resurfaces.  
- Evaluate whether to reduce or stop the 30‑min health cron (currently removed, but monitoring remains via Fleet Reaper and Memory Monitor).
