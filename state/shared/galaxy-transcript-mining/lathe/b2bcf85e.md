# lathe session b2bcf85e (2026-05-26, 38.4MB, spine 199KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `8ad9044f3e`: Milestone envelope `GPU‑OFFLOAD‑MAXIMIZE‑MS0.json` v1.0.1 – mcp-server/data/milestones/GPU‑OFFLOAD‑MAXIMIZE‑MS0.json  
- `29708e0128`: Hook patch `ollama-route-pretooluse.mjs`, config `ollama-route-config.json`, 35 unit tests, telemetry unification  
- `5eb9545d43`: U2 – add Ollama perf env vars (`KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4`) to docker‑compose.yml  
- `c0446ab1f2`: PSN‑SYNERGIZE U‑GREP‑GRAPH‑WIRE – wire grep hook to system‑graph and offload dashboard  
- `3151aba8e7`: U‑GLOB‑TELEMETRY – add telemetry sink to `glob-narrow-path.mjs`  
- `7a6a9e0438`: U‑CONTAINER‑SKILLS‑BATCH1 (`/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`)  
- `1a2fdc7e2d`: U‑CONTAINER‑SKILLS‑BATCH2 (`/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`)  
- `0763e315ea`: U‑CONTAINER‑SKILLS‑BATCH3 (`/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`)  
- `4314880d67`: U‑SVIZ‑AUTO‑REGEN – self‑heal Stop hook fires when system‑graph.json >12 h  
- `commit (just‑committed)`: U‑SVIZ‑SYNERGY‑BATCH – `/agent‑factory` skill + spec ontology (`SPEC-MEMORY-ENTITY-ONTOLOGY-2026‑05‑25.md`)  
- `3426272a04`: `scripts/feature-utilization-meter.mjs` (primary per‑feature telemetry)  
- `a97415271f`: U‑HOOK‑TELEMETRY‑LIB – shared `recordHookFire()` primitive  
- `ecebb1a38a`: U‑FEATURE‑UTIL‑METER‑SECONDARY – secondary source readers for wiki, memory, Docker, Qdrant  

**DECISIONS**  
- Keep system‑viz separate from GNN; use same graph but not as neural network.  
- Ship `ollama-route-config.json` with `mode:"suggest"`; flip to `"auto"` after dashboard row appears.  
- Defer NIM stop until VRAM headroom >12 GB; consider stopping `nim‑llama32‑3b`.  
- Drop chat NIM, keep embedding NIM (`nim‑embed‑e5`) and Ollama embed model for RAG.  
- Wire PSN synergy (grep‑index‑first, glob‑narrow‑path) before container skills.  
- Add `.gitignore` exceptions so 12 new container skills become fleet‑wide usable.  
- Use Docker‑compose knobs (`KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4`) once U2 shipped.  
- Replace duplicate telemetry code with shared lib `recordHookFire`.  
- Extend feature meter to read secondary sources (wiki/log.md, MEMORY.md, Docker state, Qdrant probe) to reduce UNKNOWN features.  
- Prioritize wiring top‑value hooks: `psn-leg-state-inject`, `memory-relevance-inject`, `tribal-by-domain-inject`.  

**OPERATOR DIRECTIVES**  
- `/startup-sierra /loop [5m] /goal` – run autonomous loop until all GPU‑OFFLOAD units shipped and PSN synergy complete.  
- `/compact` when rate‑limited; re‑invoke `/startup-sierra /loop [5m] /goal`.  
- After telemetry row appears, flip `ollama-route-config.json` to `"auto"` and restart Ollama.  
- Verify take‑rate lift in `mcp-route-takerate-audit.json`; ship batch 4 (`/mcp-route-best`, `/chat-bus-summary`, `/handoff-quick`) or `/pick-dev` next backend dev unit.  
- Authorised execution of GPU‑offload plan (U1–U4); stop hook condition: complete current task queue for sierra, add generate claude code cli container skills.  

**FINDINGS/BUGS**  
- GPU not VRAM‑bound: 27 % VRAM used, 48 % compute; compute idle ~7 %.  
- Offload rate stuck at ~8 % due to `ollama-route-pretooluse.mjs` default `"suggest"` mode.  
- Telemetry written to `.claude/cache/hook-telemetry.jsonl`; unification needed into `ollama-offload-stats.json`.  
- False “unknown keeps” claim; stats.json corruption false positive flagged by Reviewer B.  
- Dead `minBytes` helper removed without affecting logic.  
- Cascade short‑circuit bypasses auto‑mode when `/api/tags` fails or model not allowlisted.  
- Docker‑compose held by peer lock (`claude-a0a74c41`) – U2 pending.  
- Rate‑limit errors from Claude Code API mitigated by retry/backoff.  
- `regen-viz.mjs --fast` exits 255 (OOM at merge‑augmentations).  
- `glob-narrow-path.mjs` reverted causing cross‑tree collision.  
- Bug: `require('fs')` lazy‑load wrong in ESM file; take_rate accumulation math bug.  
- Feature utilization unknown features reduced from 16 → 7 after secondary readers; wiki/log.md stale >5 days, NN_EVAL.json stale 9 days.  

**DOMAIN SPECIFICS**  
- **Engines/Actions/Dispatchers**: `ollama-route-pretooluse.mjs` (PreToolUse:Read hook), `glob-narrow-path.mjs`, container skills (`/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`, `/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`, `/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`), system‑viz, PSN nodes, Docker runtime state, NN_GNN, LoRA, RAG_Qdrant, deep learning, wiki injection, memory injection, HTMLOverMD, tribal inject, Obsidian, PRISMAwareness, CLAUDE_md, Octopus, NVIDIA_NIM.  
- **Metrics**: `ollama-offload-stats.json` dashboard rows (`byHook.ollama‑route‑pretooluse.fired`), hook‑telemetry JSONL, Docker container stats, take‑rate, RTK miss‑rate, feature‑utilization meter outputs.  
- **Paths**:  
  - `H:/prism/.claude/hooks/ollama-route-pretooluse.mjs`  
  - `H:/prism/.claude/hooks/glob-narrow-path.mjs`  
  - `mcp-server/data/milestones/GPU-OFFLOAD-MAXIMIZE-MS0.json`  
  - `mcp-server/data/state/ollama-route-config.json`  
  - `scripts/feature-utilization-meter.mjs`  
  - `mcp-server/data/state/system-graph.json`  

**TOOLS USED**  
- PRISM CLI: `/startup-sierra`, `/loop`, `/goal`, `/compact`, handoff writer.  
- Git: commit, lock‑retry background pattern, conflict‑fork rule.  
- Docker Compose: `docker compose up -d`, `restart`.  
- Node.js scripts: `chat-slots.mjs`, hook test harness (`node:test`), telemetry lib.  
- Ollama CLI: `ollama pull`, `ollama serve`.  
- GPU probe utilities.  
- Playwright (scraping X.com URLs).  
- fs module in ESM, Docker runtime state JSON, Qdrant probe.  

**OPEN THREADS**  
1. Wire remaining 16 unknown features (PSN, SystemViz, Docker, NN_GNN, LoRA, RAG_Qdrant, DeepLearning, WikiInject, MemoryInject, HTMLOverMD, TribalInject, Obsidian, PRISMAwareness, CLAUDE_md, Octopus, NVIDIA_NIM).  
2. Resolve cross‑tree collision of `glob-narrow-path.mjs`; adopt telemetry lib into main repo.  
3. Extend secondary source readers to drop UNKNOWN count toward 0 (goal gate).  
4. U2 perf knobs – retry once peer lock released; verify performance after restart.  
5. Auto‑mode flip: change `ollama-route-config.json` to `"auto"` after dashboard confirms `byHook.ollama-route-pretooluse.fired`.  
6. Conditional Q8 model pull (U3) after telemetry row confirmed.  
7. NIM stop evaluation (U4) once VRAM headroom >12 GB; consider combining with U3 if needed.  
8. Continue PSN synergy: pick remaining units via `/pick-unit`, wire outstanding nodes.
