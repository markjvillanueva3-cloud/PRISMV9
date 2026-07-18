# cam session 2bb2ef8a (2026-06-17, 9.9MB, spine 55KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Night‑batch tree‑kill fix (async `spawn` + wall‑clock kill) – 2 commits (`925a1dc172`, `c6c30cad82`).  
- Host‑facts doc updated to list all 16 Ollama models.  
- CC settings: phantom medium‑model tag `qwen3-coder:32b → :30b`.  
- Hermes config: `pre_update_backup:true` (auto‑backup before CLI update).  

**DECISIONS**  
- Keep Hermes CLI at current 312‑commit gap; defer update until backup verified.  
- Use async tree‑kill for all MCP jobs to prevent runaway GPU usage.  
- Enable auto‑offload via `PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1` and `ROUTE_AUTO=1`.  
- Require a SendKeys actuator (to be built in Bravo) for automatic `/mcp` reconnection; needs WT tab naming `"PRISM <slot>"`.  

**OPERATOR DIRECTIVES**  
- Set up Windows Terminal tab names as `"PRISM <slot>"` so the future actuator can target the correct chat.  
- Build and deploy the auto‑reconnect actuator in Bravo once tab naming is enabled.  
- Verify that all four substrates (Hermes, Obsidian vault, Ollama, Claude Code CLI) are fully operational without manual invocation.  

**FINDINGS/BUGS**  
- Night‑batch runaway: 13.6 h job due to `spawnSync` blocking on orphaned grandchild; fixed by async tree‑kill.  
- Phantom model tag caused silent Claude fallback; corrected in CC settings and routing config.  
- Stale host‑facts doc misreported missing models; updated to reflect actual roster.  
- MCP bridge drops because the Claude Code harness kills the stdio child; no PRISM auto‑reconnect exists yet.  

**DOMAIN SPECIFICS**  
- **Night‑batch runner**: `spawnJob` → async spawn + tree‑kill, timeoutMs applied per job.  
- **Hermes proxy**: listens on :8645 (grok‑4.20), uses `ask-hermes.mjs` & `hermes-proxy-ensure.mjs`.  
- **MCP server**: HTTP at :3100 (`mcp-http-bridge.mjs`), monitored by `monitor-mcp-and-reaper.mjs`.  
- **Ollama**: daemon on H:/Tools/ollama/models, 16 models (196 GB).  
- **Obsidian vault**: synced via Hermes‑Obsidian Bridge every 15 min; writes to `H:/prism/knowledge`.  

**TOOLS USED**  
- PRISM tools: `U-NIGHT-TREEKILL`, `hermes-proxy-ensure.mjs`, `chat-slots.mjs`, `slot-bind-enforce.mjs`, `runJobs`, `main`.  
- Hermes CLI (nous hermes binary v0.16.0).  
- Hermes app (Electron+Python desktop, config.yaml).  
- Claude Code CLI (`npm` 2.1.179).  
- OLLAMA server (`ollama.exe serve`).  
- MCP server (`mcp-http-bridge.mjs`, :3100).  

**OPEN THREADS**  
- Build and deploy the SendKeys actuator for automatic `/mcp` reconnection (requires WT tab naming).  
- Final verification that all four substrates auto‑start and auto‑use without manual commands.  
- Optional: schedule Hermes CLI 312‑commit update after backup is confirmed.
