# cam session f6b6d9da (2026-06-14, 23.9MB, spine 134KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `54a7183de0`: agent‑fanout‑pressure‑gate now denies mechanical fan‑outs → `ollama‑fanout`.  
- `U‑SFLC‑NOTE‑CORRECT`: removed stale “not fixed” note on loop auto‑continuation.  
- `ask-hermes.mjs` wired to task‑substrate router; 20/20 unit tests, live E2E (`PRISM_BRIDGE_OK`) against Hermes proxy (`:8645`).  
- `hermes-proxy-ensure.mjs` + `install-hermes-proxy-task.ps1`: 12/12 unit tests, idempotent scheduled task “PRISM Hermes Proxy” (every 5 min + AtStartup).  
- `/ask‑hermes` slash command committed to `.claude/commands/`.  
- `hermes-config-hybrid-ollama.py`: repoints all Hermes profiles (root + 21 slots) to local Ollama (`gpt‑oss:120b`, `qwen2.5-coder:32b`, `qwen2.5vl:32b`).  
- Desktop app launch verified; Hermes desktop running on hybrid config.

**DECISIONS**  
- Keep three dashboard PKCE backups + six Claude Code accounts → 9‑entry pool.  
- Set `credential_pool_strategies.anthropic: round_robin` in `config.yaml`.  
- Use PRISM capture+sync for OAuth, not single token flow.  
- Bridge Hermes via `/v1`, default to local Ollama on third‑party token failure.  
- Enforce mechanical fan‑out denial at agent‑fanout gate; main‑loop reads advisory.  
- Hybrid: Claude Code CLI + Hermes (Ollama) offload to avoid paid costs.  
- Persist proxy with scheduled task “PRISM Hermes Proxy” instead of manual start.  
- Repoint all model blocks in Hermes profiles from Anthropic/xAI to local Ollama; set `base_url: http://127.0.0.1:11434/v1`.  
- Keep self‑improvement loop active but note edit risk; option to disable.  
- After any `hermes update`, re‑run hybrid config script.

**OPERATOR DIRECTIVES**  
- Launch Hermes desktop for live testing; core work complete.  
- “Synergy” keyword triggers all systems (implement via `synergy-definition-inject.mjs`).  
- Wire proxy as durable scheduled task.  
- Run `/mcp` to reconnect per‑chat MCP bridge.  
- Optional: close echo discoverability gap.

**FINDINGS/BUGS**  
- `toolsets.py` SyntaxError caused backend crash 0.15.1→0.16.0; resolved by git pull.  
- `.update‑incomplete` marker & orphan uv temp dirs cleared without killing agents.  
- Hermes proxy defaults to port **8645** (not 9120).  
- Anthropic billing rejects third‑party app requests (HTTP 400); fallback to free models required.  
- Proxy persistence issue fixed by scheduled task installation.  
- `hermes-proxy-ensure` spawned 58 `bash.exe`; all exited after cleanup.  
- Empty `base_url` caused Ollama cloud default; fixed with explicit local URL.  
- Desktop app crash due to self‑improvement loop source corruption; rebuilt and running.  
- Self‑improvement agent can edit its own source – risk of future crashes.

**DOMAIN SPECIFICS**  
- Hermes: credential pool (`auth.json`), provider strategy (`config.yaml`), proxy `/v1`, `hermes_cli.main`.  
- PRISM hooks: `agent‑fanout‑pressure‑gate.mjs`, `subagent‑model‑enforce.mjs`; offload stack: `ollama‑fanout.mjs`, `smart‑fanout.mjs`; vault‑write enforcement saturated.  
- Offloading classification via `routeClaudeTier` & `isExpensiveModel`.  
- Hermes agent loop, per‑slot profiles (`profiles/<slot>/config.yaml`) with `model`, `fallback_model`, `vision`.  
- Scheduled task “PRISM Hermes Proxy” (S4U principal).  
- `/ask‑hermes` slash command, `hermes-proxy-ensure.mjs`.  
- Task‑substrate router injection point (`scripts/lib/task-substrate-router.mjs`).  
- MCP server tools, PSN, system‑viz, Obsidian vault, skills, scripts, hooks, claude.mds, souls.md, memories, wikis, tribal knowledge injections.  
- Token‑savings measures, precompaction/compaction, session handoff, auto‑startup, checkin system, stop hook, git tree commit organizing.  
- AI learning systems: LoRA, NN, GNN, CAG, RAG; engines/pipelines/formulas/databases.

**TOOLS USED**  
- Hermes CLI (`hermes chat`, `hermes proxy`).  
- PRISM scripts: `capture‑claude‑credentials.mjs`, `sync‑claude‑accounts‑to‑hermes.mjs`, `ask-hermes.mjs`.  
- Node.js, Python (syntax checks), Git.  
- `hermes-proxy-ensure.mjs`, `install-hermes-proxy-task.ps1`.  
- `scripts/hermes-config-hybrid-ollama.py` (ruamel.yaml).  
- PRISM command framework (`.claude/commands/*.md`).  
- Chat‑slot helper scripts (`chat-slots.mjs`), checkin pipeline (`checkin.md`), desktop app launcher.

**OPEN THREADS**  
1. Optional: disable Hermes self‑improvement loop to prevent source edits.  
2. After any `hermes update`, re‑run `python scripts/hermes-config-hybrid-ollama.py --apply`.  
3. Verify MCP per‑chat bridge (`/mcp`) fully functional.  
4. Confirm all slots have `/ask‑hermes` command and routing correct.  
5. Test “synergy” keyword injection (`synergy-definition-inject.mjs`).  
6. Monitor desktop app & scheduled proxy task stability across reboots.
