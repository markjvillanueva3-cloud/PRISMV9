# ai-training session db2a6ecd (2026-06-06, 14.4MB, spine 66KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Commit `ab2ccf42a4`: Hermes system‑viz roost (`generate-hermes-features.mjs`) wired to PRISM MCP, 32 b model `qwen2.5-coder:32b`, pinned warm, 51 tok/s on RTX 6000 Blackwell.  
- Commit `e6713584e2`: Wiki entry `[[hermes-app-viz-roost]]`, memory‑reflection notes, and bridge re‑enable documentation.  

**DECISIONS**  
- **LLM tiering**: local primary = `qwen2.5-coder:32b`; fallback = Claude Opus 4.8 (`xhigh`) once extra‑usage credits are added.  
- **Ollama maintenance**: upgrade to 0.30.6, disable CPU‑throttle task, set `OLLAMA_KEEP_ALIVE=-1` and `OLLAMA_MAX_LOADED_MODELS=4` so the 32 b stays resident alongside fleet vision models.  
- **Credential strategy**: use Claude‑Code OAuth for Opus; keep local OpenAI‑compat key for Ollama (no auth needed).  
- **Bridge status**: re‑enabled `PRISM Hermes‑Obsidian Bridge`; no memories yet but functional.  

**OPERATOR DIRECTIVES**  
- Verify all credentials are configured and Hermes is synergized with PRISM/Claude Code settings.  
- Ensure Claude Code runs on Hermes with Opus 4.8 at `xhigh`.  
- Continue remaining tasks (pre‑warm hook, review gate).  
- Double‑check local LLM wiring after RTX 6000 upgrade.  

**FINDINGS / BUGS**  
- Anthropic 400 error: third‑party apps cannot use plan credits; Opus requires extra‑usage credits.  
- Ollama instance contention & wedged `ollama serve` (multiple :11434 bindings).  
- Orphaned `llama-server.exe` GPU runners evicting models.  
- Ollama 0.30.3 memory‑fit bug on Blackwell for >8 GB models; fixed in 0.30.6.  
- Partial download of `qwen2.5-coder:32b`; resolved with full pull.  
- Cold‑load time (~208 s) from slow H: disk caused message timeout before model warmed.  

**DOMAIN SPECIFICS**  
- **Engines/Actions**: Hermes agent, PRISM MCP (`tr.mcp`), Ollama server (port 11434), Obsidian vault (`H:\prism\knowledge`).  
- **Dispatchers**: `hermes-obsidian-memory-bridge.mjs`, `ollama-cpu-throttle.ps1`.  
- **Metrics**: tokens/s (51 tok/s 32 b, 181 tok/s 8 b), VRAM usage (~47.8 GB/96 GB), OLLAMA_KEEP_ALIVE, OLLAMA_MAX_LOADED_MODELS.  
- **Paths**: `scripts/generate-hermes-features.mjs`, `scripts/hermes-obsidian-memory-bridge.mjs`, `scripts/ollama-cpu-throttle.ps1`.  

**TOOLS USED**  
- PRISM CLI: `/checkin-bravo`, chat‑slot helpers, audit‑roadmap‑drift.mjs, system‑viz ping, local‑compute health.  
- Node scripts: `wire-hermes-local-backend.mjs`, `patchModelBlock`, `hermes-obsidian-memory-bridge.mjs`.  
- Ollama CLI (`ollama serve`, `ollama pull`).  
- Windows task scheduler scripts (`PRISM Ollama Serve`, `PRISM Ollama CPU Throttle`).  

**OPEN THREADS**  
1. **Pre‑warm hook** – add a scheduled task to auto‑load `qwen2.5-coder:32b` on Ollama restart so Hermes never hits the 208 s cold‑load again.  
2. **Hermes‑outputs review gate** – implement PRISM scrutiny gate for local‑model outputs before they become authoritative.  
3. **Opus credit activation** – once extra‑usage credits are added, switch Hermes primary to Claude Opus 4.8 (`xhigh`).  
4. **Optional 70B upgrade** – evaluate pulling a 70 b model (e.g., `qwen2.5:72b`) if higher capacity is desired.  

---
