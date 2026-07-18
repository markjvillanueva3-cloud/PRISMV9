# cad session b2bcf85e (2026-05-26, 38.4MB, spine 199KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED (builds/commits)**  
- `8ad9044f3e` – milestone envelope GPU‑OFFLOAD‑MAXIMIZE‑MS0 v1.0.1 (U1 activation + telemetry)  
- `29708e0128` – hook patch & 35 tests for `ollama-route-pretooluse.mjs`  
- `da66c05c89` – FS‑COVERAGE‑MS1 closed out  
- `e85f55b96c` – BRAIN‑MS0 closed out  
- `ca0840b4d0 / 42ad655bc4` – MS‑VIZ‑ROADMAP‑BIND built & verified  
- `5eb9545d43` – GPU‑OFFLOAD‑MAXIMIZE‑MS0 unit U2 (perf env vars)  
- `c0446ab1f2` – PSN‑SYNERGIZE iter 2 (glob‑narrow‑path telemetry wire)  
- `3151aba8e7` – U‑GLOB‑TELEMETRY (hook + CLI gate, 9/9 tests)  
- `7a6a9e0438` – U‑CONTAINER‑SKILLS‑BATCH1 (`/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`)  
- `1a2fdc7e2d` – U‑CONTAINER‑SKILLS‑BATCH2 (`/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`)  
- `0763e315ea` – U‑CONTAINER‑SKILLS‑BATCH3 (`/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`)  
- `4314880d67` – U‑SVIZ‑AUTO‑REGEN (self‑heal Stop hook)  
- `U‑SVIZ‑SYNERGY‑BATCH` – `/agent‑factory` skill + `SPEC‑MEMORY‑ENTITY‑ONTOLOGY‑2026‑05‑25.md`  
- `3426272a04` – `feature-utilization-meter.mjs` (primary telemetry)  
- `a97415271f` – shared `recordHookFire()` primitive  
- `ecebb1a38a` – secondary source reader for meter  

**DECISIONS**  
- Keep system‑viz and GNN separate consumers of the same graph.  
- Activate `ollama-route-pretooluse.mjs` in auto mode only after telemetry confirms a dashboard row.  
- Defer stopping NIM containers until VRAM headroom confirmed; pull Qwen‑2.5‑Coder 7B (Q8) before dropping chat NIM.  
- Ship perf knobs (`KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4`) on Docker Compose to raise offload rate from ~8 % to ≥30 %.  
- Unify telemetry into `ollama-offload-stats.json` for dashboard visibility and automated gating.  
- Wrap MCP actions in container‑skills (`/route-take`, `/dispatcher-search`, etc.) to expose high‑ROI dispatchers as CLI commands.  
- Add `!` exceptions in `.gitignore` for `.claude/commands/*` so container skills become fleet‑wide visible.  

**OPERATOR DIRECTIVES**  
- `/startup-sierra /loop [5m] /goal`.  
- After telemetry confirms, flip `ollama-route-config.json` from `"suggest"` → `"auto"`.  
- Apply perf knobs to prism‑ollama container and restart.  
- Continue autonomous loop until GPU/Ollama offload plan completes.  
- Stop hook active: require all 18 features functional with token‑saving synergy; loop every 5 min.  
- Iter 6 re‑fire: verify take‑rate lift in `mcp-route-takerate-audit.json` or ship batch 4 (`/mcp-route-best`, `/chat-bus-summary`, `/handoff-quick`).  
- High priority on token‑saving skills (`/hook-cost-now`, `/subagent-triage`, `/read-large`).  

**FINDINGS / BUGS**  
- GPU VRAM 27 % used; compute idle → routing bottleneck.  
- Offload rate low because `ollama-route-pretooluse.mjs` remains in “suggest” mode.  
- Telemetry for PreToolUse hooks lives in `.claude/cache/hook‑telemetry.jsonl`; must merge into `ollama-offload-stats.json`.  
- Stats.json corruption claim false (valid JSON).  
- Hook leak: hook fires in suggest mode, no substitution; telemetry in `hook‑telemetry.jsonl`.  
- Dashboard shows 6.9 % offload rate; 32 “unknown” keeps are correct Claude orchestration directives.  
- NIM containers consume ~12 GB VRAM; dropping chat NIM frees space for larger Qwen model.  
- Peer lock contention on `docker-compose.yml` prevented U2 perf‑knob commit.  
- R12: `regen-viz.mjs --fast` exits 255 (OOM at merge‑augmentations).  
- R12: `glob-narrow-path.mjs` reverted to pre‑iter2 state; cross‑tree collision.  
- Bugs in ESM `require('fs')`, wrong math in `take_rate`.  
- UNKNOWN feature count dropped from 16→10→7 after secondary readers.  

**DOMAIN SPECIFICS**  
Engines/Dispatchers:  
- `ollama-route-pretooluse.mjs`  
- `glob-narrow-path.mjs`  
- Container‑skills: `/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`, `/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`, `/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`  
- `feature-utilization-meter.mjs`  
- `recordHookFire()` telemetry lib  
- `/agent‑factory` orchestration skill  

Metrics/paths:  
- `ollama-offload-stats.json` (telemetry)  
- `hook‑telemetry.jsonl`  
- `system-graph.json`  
- `mcp-route-takerate-audit.json`  
- `mcp-server/data/milestones/GPU-OFFLOAD-MAXIMIZE-MS0.json`  
- `mcp-server/data/state/ollama-route-config.json`  
- `docker-compose.yml`  
- `.claude/hooks/*.mjs`, `.claude/commands/*`  
- `SPEC‑MEMORY‑ENTITY‑ONTOLOGY‑2026‑05‑25.md`  

**TOOLS USED**  
PRISM tooling: chat‑slots.mjs, hooks, container‑skill generator, agent‑factory skill, telemetry lib.  
Docker & Docker Compose (`docker-compose.yml`).  
Ollama CLI, NVIDIA NIM containers.  
Git (commit, diff, lock‑retry).  
Playwright (scrape X.com URLs).  
Tailscale + Chrome Remote Desktop.  
Qdrant, Lora, RAG (Qdrant), wiki generation/injection, memory injection, HTML‑over‑MD, Obsidian second brain.  

**OPEN THREADS**  
1. Apply perf knobs to Docker Compose and restart prism‑ollama; resolve peer lock.  
2. Conditional model swap to Qwen‑2.5‑Coder 7B→Q8 after VRAM headroom confirmed.  
3. Stop NIM chat container if VRAM freed; decide on dropping both NIMs.  
4. Wait for populated row in `ollama-offload-stats.json`; then flip config to `"auto"`.  
5. Re‑compact repo before next loop iteration (`/compact run`).  
6. Finalize PSN synergy: wire all high‑ROI container skills fleet‑wide; close deferrable units in GPU‑OFFLOAD‑MAXIMIZE‑MS0.  
7. Refine token‑saving skills (`/hook-cost-now`, `/subagent-triage`, `/read-large`) to reduce usage.  
8. Wire remaining UNKNOWN hooks (PSN, system‑viz, docker, memory inject, obsidian, claude.md, octopus, NVIDIA NIM).  
9. Investigate/fix wiki‑cron / wiki‑bootstrap (WikiInject low tier).  
10. Resolve `glob-narrow-path` revert and propagate lib to main.  
11. Iter 8 plan: adopt 3 highest‑value hooks + 4 secondary readers → reduce UNKNOWN from 7→3.
