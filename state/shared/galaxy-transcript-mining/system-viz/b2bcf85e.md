# system-viz session b2bcf85e (2026-05-26, 38.4MB, spine 199KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- 8ad9044f3e – GPU‑OFFLOAD‑MAXIMIZE‑MS0 v1.0.1 (U1 activation + telemetry merge).  
- 29708e0128 – hook patch `/claude/hooks/ollama-route-pretooluse.mjs`, config `ollama‑route‑config.json`, 35 unit tests.  
- da66c05c89 – FS‑COVERAGE‑MS1 close‑out (re‑walk task registered, stale statuses reconciled).  
- e85f55b96c – BRAIN‑MS0 close‑out (conflict‑superseded SQLite unit).  
- ca0840b4d0 / 42ad655bc4 – MS‑VIZ‑ROADMAP‑BIND implementation (resolver, reconciler, tests).  
- 5eb9545d43 – U2: Ollama perf‑knob commit (docker‑compose env vars).  
- 3151aba8e7 – U‑GLOB‑TELEMETRY: telemetry sink & CLI gate added to `glob-narrow-path.mjs`.  
- 7a6a9e0438 – U‑CONTAINER‑SKILLS‑BATCH1 (`/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`).  
- 1a2fdc7e2d – U‑CONTAINER‑SKILLS‑BATCH2 (`/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`).  
- 0763e315ea – U‑CONTAINER‑SKILLS‑BATCH3 (`/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`).  
- 4314880d67 – U‑SVIZ‑AUTO‑REGEN: self‑heal Stop hook for stale system‑viz (>12 h).  
- U‑SVIZ‑SYNERGY‑BATCH: `/agent‑factory` skill + `SPEC‑MEMORY‑ENTITY‑ONTOLOGY‑2026‑05‑25.md`.  
- 3426272a04 – `feature-utilization-meter.mjs` (primary per‑feature telemetry, 14 tests).  
- a97415271f – U‑HOOK‑TELEMETRY‑LIB: shared `recordHookFire()` primitive.  
- ecebb1a38a – secondary source reader for meter (`file‑mtime`, `dir‑count`, `HTMLOverMD`), 18 tests.

**DECISIONS**  
- Keep system‑viz and GNN as separate consumers of the same graph; no merge.  
- Split GPU‑OFFLOAD‑MAXIMIZE‑MS0 into U1–U4: hook activation+telemetry, perf knobs, Q8 model swap, NIM stop.  
- Activate `ollama-route-pretooluse.mjs` in “suggest” mode until telemetry confirms auto‑mode; flip to “auto” after dashboard row appears.  
- Unify all hook telemetry into single file `ollama-offload-stats.json`; use shared lib (`recordHookFire()`).  
- Drop llama‑3.2‑3b NIM (~6 GB VRAM); keep nv‑embedqa‑e5 for RAG; enable Qwen2.5‑coder:7b (Q8) as primary local model, optional 14 B if VRAM permits.  
- Apply Ollama perf knobs (`KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4`) after container restart.  
- Auto‑regen Stop hook to heal stale system‑viz (>12 h) and prevent duplicate fleet spawns.  
- Adopt `/agent‑factory` skill to formalize Researcher→Story→Spec pipeline; ship Pydantic‑typed memory ontology spec.  
- Instrument all wired dispatchers with `last_invoked_at`; expose dormant capabilities dashboard.

**OPERATOR DIRECTIVES**  
- `/startup-sierra /loop [5m] /goal`.  
- “lets do your suggestions then”.  
- “continue next loop”.  
- “high priority on token saving skills”.  
- Session‑scoped Stop hook active: condition to assess submitted articles, synergize features, ensure full token‑saving synergy.  
- “what's the verdict on all the x articles I submitted?”  
- “assess whether or not we're actually using things that prism already has. we have an issue of building and never implementing.”

**FINDINGS/BUGS**  
- GPU 27 % VRAM / 48 % compute; routing bottleneck, offload rate ~7–8 %.  
- `ollama-route-pretooluse.mjs` defaults to “suggest”; auto‑mode must be enabled after telemetry row appears.  
- Telemetry for file‑read hook writes to separate `.claude/cache/hook‑telemetry.jsonl`; unify with `ollama-offload-stats.json`.  
- NIM containers occupy ~6 GB VRAM; dropping chat NIM frees room for 7B‑Q8 model; NIM‑ACTIVATION‑MS0 incomplete.  
- System‑graph.json lost fsCoverage namespaces (drift bug); requires full re‑walk.  
- `docker-compose.yml` claimed by peer; cannot edit until released.  
- Dead code (`minBytes`) and TS inference warnings in hook, but functional.  
- OOM at `regen‑viz.mjs --fast` during merge‑augmentations; self‑heal triggered correctly, lock cleaned for retry.  
- Cross‑tree collision: `glob-narrow-path.mjs` reverted to pre‑iter2 state (commit 3151aba8e7).  
- Feature‑utilization meter shows 16/18 features UNKNOWN → reduced to 10 after secondary readers → 7 with additional sources.  
- WikiInject low‑tier finding: stale `wiki/log.md` (>5 days); Ollama backend timing out.

**DOMAIN SPECIFICS**  
- Engines/actions: system‑viz regen, ghost‑roost generators, node‑card cheap reads, canvas rendering, cross‑substrate edges, fleet search substrate; PSN, Docker, NN/GNN, LoRA, RAG (Qdrant), wiki generation/injection, automatic memory injection, HTML‑over‑MD, tribal knowledge injection, Obsidian second brain, Prism awareness, Claude.md, Octopus, NVIDIA NIM.  
- Paths: `system-graph.json`, `mcp-server/data/state/ollama-route-config.json`, `docker-compose.yml`, `glob-narrow-path.mjs`, `feature-utilization-meter.mjs`, `U‑HOOK‑TELEMETRY‑LIB`, `SPEC‑MEMORY‑ENTITY‑ONTOLOGY‑2026‑05‑25.md`.  
- Metrics: `ollama-offload-stats.json` (byHook counts, latency), system‑graph.json fsCoverage namespaces, `mcp-route-takerate-audit.json` take‑rate lift, route‑take‑rate, RTK miss rate, feature‑utilization meter.

**TOOLS USED**  
- PRISM CLI skills: `/startup-sierra`, `/checkin-sierra`, `/loop`, `/goal`, `/compact`, `/precompact-sierra`, `/handoff`, `/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`, `/system-viz`, `/chat-bus-summary`, `/handoff-quick`, `/pick-dev`, `/forge-audit-v2`, `/forge7 deep dive`, `/yolo-mode`.  
- Hook scripts: `ollama-route-pretooluse.mjs`, `glob-narrow-path.mjs`, `U‑SVIZ‑AUTO‑REGEN`, `U‑HOOK‑TELEMETRY‑LIB`, `feature-utilization-meter.mjs`.  
- Docker Compose (prism‑ollama, nim containers); Ollama CLI (`pull`, `serve`).  
- Git operations: commit pathspec, lock‑retry pattern, `.gitignore` edits; PRISM envelope management.  
- Node.js test harness (`node:test`) for hook tests.  
- Libraries/technologies: Pydantic (entity ontology), Playwright (subagent scraping), Zod (schema design), Docker runtime state JSON, Qdrant probe, NN‑EVAL.json, tribal markdown repo.

**OPEN THREADS**  
1. Apply Ollama perf knobs in `docker-compose.yml` once claim released; restart container; verify telemetry row.  
2. After U1 flip to auto‑mode, pull Qwen2.5‑coder:7b-instruct-q8_0; test summary quality and latency (U3).  
3. Once VRAM headroom confirmed, stop `nim-llama32-3b` container; update routing to use only embedding NIM (U4).  
4. Unify hook telemetry: ensure file‑read hook writes to `ollama-offload-stats.json`; add atomic‑RMW if needed.  
5. Flip `ollama-route-config.json` from `"suggest"` to `"auto"` after dashboard row appears; monitor for fallback short‑circuit.  
6. Schedule full fsCoverage re‑walk (`expand-system-viz-l12-files.mjs`) and regenerate graph (system-graph drift fix).  
7. Wire telemetry lib into main branch; adopt 3 highest‑value unknown hooks (`psn-leg-state-inject`, `memory-relevance-inject`, `tribal-by-domain-inject`).  
8. Resolve OOM in `regen‑viz.mjs` merge‑augmentations (iter‑7 scope).  
9. Investigate and fix wiki‑cron / wiki‑bootstrap; address stale `wiki/log.md`.  
10. Complete remaining 3 unknown feature telemetry via secondary readers (NN_GNN, RAG_Qdrant, etc.).  
11. Resolve cross‑tree collision of `glob-narrow-path.mjs` revert.  
12. Coordinate with `claude-a0a74c41` to claim and edit `docker-compose.yml`.
