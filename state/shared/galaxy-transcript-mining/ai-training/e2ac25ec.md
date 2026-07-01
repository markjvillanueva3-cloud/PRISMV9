# ai-training session e2ac25ec (2026-06-06, 24.1MB, spine 94KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `416acfe8cd` – anti‑revert guard hardened (`no-retired‑llm‑refs.test.mjs`).  
- `0a86b1cf7d` – MultiModelConsensusEngine now supports N‑family panel `[gpt‑oss:120b, gemma4:31b, qwen2.5‑coder:32b]`.  
- `348f97c0f8` – Catalog wiring for `gpt‑oss:120b/20b`, `gemma4:31b` into all four routing engines (install‑gated).  
- Kimi K2.6 cloud free tier answer documented (`reference_kimi_k26_ollama_cloud_free_verdict_2026_06`).  
- Pull‑monitoring lesson captured with poison‑partial mechanism (`feedback_ollama_pull_monitoring_discipline`).  
- Integration plan scoped, handoff written (PRECOMPACT).

**DECISIONS**  
- Models auto‑activate when present; no manual re‑routing.  
- Use a single clean driver for all `ollama pull`s; never kill healthy pulls or start concurrent drivers.  
- Network‑limited pulls via user terminal; avoid `ollama list` during active pull.  
- Phase 3 NIM/Docker wiring deferred until operator supplies `NGC_API_KEY` and starts Docker.

**OPERATOR DIRECTIVES**  
1. In a dedicated terminal run:  
   ```
   ollama pull gpt‑oss:120b
   ollama pull gemma4:31b
   ```  
2. Let any existing PID finish; if it hard‑exits, resume with one `ollama pull` from the partial.  
3. After a model lands in `/api/tags`, trigger `U-BW-CATALOG-REALIGN` for auto‑promotion.  
4. If `NGC_API_KEY` and Docker are available, wire Phase 3 NIM SessionStart hook (no‑op until ready).

**FINDINGS/BUGS**  
- Disk‑byte “stall” metric misleading; use exit code or `/api/pull` completed field instead.  
- `ollama list` during active pull hangs – removed from retry loops.  
- Network drops every ~2 s; run pulls in a dedicated terminal.  
- Concurrent driver kill leaves `‑partial` files → 21 GB layer discarded, download restarts.  
- Error string “remove …‑partial‑0: cannot find file” logged in `feedback_ollama_pull_monitoring_discipline`.  
- Scheduled‑task WARN benign.

**DOMAIN SPECIFICS**  
- Engines: MultiModelConsensusEngine, ModelRoutingEngine, AISystemRouterEngine, OLLAMA hook bridge/offloader engines.  
- Dispatchers/engines: feedback_ollama_pull_monitoring_discipline, pull‑discipline lesson, handoff +3 memories, U‑BW‑CATALOG‑REALIGN, Phase 3 NIM/Docker gating.  
- Metrics: install‑gated tier preferences, auto‑promotion via resolveSynthesisModel, anti‑revert guard coverage; `/api/tags` triggers activation (ETA ~2h17m at 7.9 MB/s).  
- Paths: `H:/prism/.claude/helpers/*`, `H:/prism/mcp-server/src/engines/*`, `H:/Tools/ollama/*`.

**TOOLS USED**  
- PRISM workflow orchestration (ultracode), per‑agent handoff helper, milestone tracker, stable-session-id.mjs.  
- Scripts/hooks: anti‑revert guard test, octopus panel code, OLLAMA pull loop (`bw-pull-loop.ps1`), NIM launcher script.  
- Dispatchers: OLLAMA API, Docker/NVIDIA NIM client.  
- External CLI: `ollama pull`.

**OPEN THREADS**  
- Complete download of `gpt‑oss:120b` and `gemma4:31b` (network‑dependent).  
- Trigger U‑BW‑CATALOG‑REALIGN auto‑promotion once models land.  
- Wire Phase 3 NIM/Docker operator‑gated tasks (`setx NGC_API_KEY …`, Docker setup).  
- Monitor gemma4:31b pull for health; watch for failures.  
- Final close‑out after models land: verify auto‑promotion, catalog realign, resolve low‑priority edge fixes.
