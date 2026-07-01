# mill session e0aa14eb (2026-06-24, 3.7MB, spine 48KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Slot binding logic for `/checkin-golf` updated (force‑take golf, run fleet‑reaper).  
- Added `claude-desktop-instance.ps1` launcher using `--user-data-dir`.  
- Converted 7 interactive scheduled tasks to S4U: Tribal Drain, Tribal Embed, Ollama Wedge Guard, SFC Closed Loop, SFC Per‑Machine Sweep, Hermes Vault Digest, Launch Readiness.  
- Created `enforce-hidden-tasks.ps1` and backup XML for drain task.  
- Registered MCP Singleton Guard task (PT10M, S4U) to reap duplicate daemons.  
- Removed 30‑min PC‑health cron (`3809e2f0`).  

**DECISIONS**  
- Use `--user-data-dir` to run multiple Claude Desktop instances; no need separate SSD or Windows instance.  
- Convert interactive tasks to S4U for hidden execution, avoiding popups while keeping Conhost Janitor interactive (needs session 1).  
- Reap orphan `llama-server.exe` processes manually and schedule guard; fleet‑reaper handles node orphans only.  
- Stop 30‑min PC‑health cron to reduce hook flashes.  

**OPERATOR DIRECTIVES**  
- “dont worry about it for now, if possible can you make it so the node and git exe windows that randomly pop up do not pop up over current windows…”  
- “node terminals keep popping up, is there a way to prevent them from showing on screen?”  
- “fix whatever is causing themcp server to drop again”  
- “build it” (launcher script).  

**FINDINGS/BUGS**  
- GPU VRAM 100% due to orphan `llama-server.exe` processes; reaping freed ~18 GB.  
- Physical RAM never >85%; system RAM fine.  
- Conhost Janitor only closes dead‑parent windows; live hook flashes remain.  
- Git‑bash shim for hooks allocates console windows that cannot be hidden (`windowsHide` ineffective).  
- Scheduled tasks were interactive → popups; S4U conversion solved.  
- MCP server had duplicate daemons from racing reconnects; added Singleton Guard to reap them.  
- 30‑min PC‑health cron contributed to hook flashes; removed.  

**DOMAIN SPECIFICS**  
- Slot binding via `chat-slots.mjs` (reclaim/claim).  
- Fleet‑reaper sweep (`fleet-reaper-sweep.mjs`).  
- Hook execution through `portable-node` shim → `node.exe`.  
- Conhost Janitor script.  
- MCP daemon, supervisor, watchdog; singleton guard task.  
- Claude Desktop instance launch with `--user-data-dir`.  
- Windows scheduled tasks (S4U vs interactive).  
- GPU metrics via `nvidia-smi`; RAM via `Get-CimInstance Win32_OperatingSystem`.  

**TOOLS USED**  
- `chat-slots.mjs`, `fleet-reaper-sweep.mjs`, `drain-resources-tribal.mjs`.  
- PowerShell scripts: `enforce-hidden-tasks.ps1`, `claude-desktop-instance.ps1`, scheduled‑task registration.  
- `nvidia-smi`, `Get-CimInstance`.  
- Conhost Janitor, MCP singleton-service-guard.mjs.  

**OPEN THREADS**  
- Submit Anthropic feature request for `windowsHide` on hook‑shell spawns (Git‑bash limitation).  
- Evaluate feasibility of repointing hooks to a Windows‑native `.cmd` shim (currently blocked by exit‑code bug).  
- Deferred MCP core leak fix (`U-MCP-FACTORY-REFACTOR`).  
- Consider re‑enabling or adjusting PC‑health cron frequency.  
- Ensure scheduled tasks persist across re‑provisioning (install script for MCP guard).
