# ai-training session b2bcf85e (2026-05-26, 38.4MB, spine 199KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Milestone envelope `GPU‑OFFLOAD‑MAXIMIZE‑MS0 v1.0.1` (commit 8ad9044f3e) – 4 units, R2/R12 hardening.  
- Hook patch `ollama‑route‑pretooluse.mjs` + config + 35 unit tests (commit 29708e0128).  
- Envelope close‑out for U1 (single‑file commit).  
- System‑viz milestones: VIZ‑COVERAGE‑MS0, SYSTEM‑VIZ‑FS‑COVERAGE‑MS0, SYSTEM‑VIZ‑FS‑COVERAGE‑MS1 (`da66c05c89`), SYSTEM‑VIZ‑BRAIN‑MS0 (`e85f55b96c`), MS‑VIZ‑ROADMAP‑BIND (`ca0840b4d0 + 42ad655bc4`).  
- Telemetry hook `glob‑narrow‑path.mjs` (commit 3151aba8e7) – recordTelemetry, CLI gate.  
- Container‑skill batch 1 (`/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`) – commit 7a6a9e0438.  
- Container‑skill batch 2 (`/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`) – commit 1a2fdc7e2d.  
- Container‑skill batch 3 (`/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`) – commit 0763e315ea.  
- Self‑heal Stop hook `U‑SVIZ‑AUTO‑REGEN` (fires when system‑graph.json >12 h).  
- `/agent-factory` skill containerized.  
- Schema `SPEC‑MEMORY‑ENTITY‑ONTOLOGY‑2026‑05‑25.md` (Pydantic).  
- Feature‑utilization meter (`feature-utilization-meter.mjs`) + `recordHookFire` lib + secondary source reader.

**DECISIONS**  
- Keep system‑viz and GNN as separate consumers of graph artifact.  
- Activate `ollama‑route‑pretooluse.mjs` in auto‑mode only after telemetry row appears in `ollama-offload-stats.json`.  
- Defer U2 perf knobs (`KEEP_ALIVE`, `FLASH_ATTENTION`, `KV_CACHE_TYPE`, `NUM_PARALLEL`) until `docker-compose.yml` unlocked.  
- Drop NIM containers if VRAM headroom allows; currently deferred.  
- Switch to Qwen 2.5‑coder:7b (Q8_0) for local offload, replacing chat‑NIM.  
- Use atomic‑RMW telemetry writes; add `EXEMPT_BASENAMES` list to protect critical files.

**OPERATOR DIRECTIVES**  
- Authorize GPU/Ollama offload plan (“lets do your suggestions then”).  
- `/startup-sierra /loop [5m] /goal` – start autonomous loop.  
- Continue `/loop` iterations; tick after each commit.  
- After U1, monitor `ollama-offload-stats.json` for `"byHook.ollama-route-pretooluse.fired"` and flip config to `"auto"`.  
- Once `docker-compose.yml` free, ship U2 perf knobs env vars and restart `prism‑ollama`.

**FINDINGS/BUGS**  
- Offload rate ~8 % due to suggest mode; auto‑mode not triggered.  
- Telemetry unification: stats written to `.claude/cache/hook-telemetry.jsonl` instead of `ollama-offload-stats.json`.  
- Peer lock on `docker-compose.yml` blocks U2 perf knobs changes.  
- GPU usage 27 % VRAM / 48 % compute – not bottleneck.  
- Offload telemetry row missing until auto‑mode enabled; must verify before flipping mode.  
- Dead code `minBytes` removed from hook patch.  
- Missing self-exemption for critical files; added `EXEMPT_BASENAMES`.  
- OOM in `regen-viz.mjs` during merge augmentations; self-heal triggered correctly.  
- Features UNKNOWN: 16/18 → 7 after secondary readers.  
- WikiInject low tier stale (`wiki/log.md` mtime > 5 days) – Ollama backend timing out.  
- NN‑Eval.json stale (9 days) → AUROC not finite.  
- Cross-tree collision: `glob-narrow-path.mjs` reverted; U-GLOB-TELEMETRY commit lost.

**DOMAIN SPECIFICS**  
- Engines/actions: slot binding, claim, startup pipeline, loop iteration, envelope close‑out, hook execution (`ollama-route-pretooluse.mjs`).  
- Dispatchers/skills: `/startup`, `/checkin-sierra`, `/loop`, `/goal`, `chat-slots.mjs`, handoff writer.  
- Metrics/paths: `ollama-offload-stats.json`, `.claude/cache/hook-telemetry.jsonl`, GPU/VRAM stats, `docker-compose.yml`.  
- Unique paths: `H:/prism/.claude/hooks/ollama-route-pretooluse.mjs`, `mcp-server/data/milestones/GPU-OFFLOAD-MAXIMIZE-MS0.json`.  
- PSN synergy network components: system‑viz, Docker runtime, NN/GraphSAGE, LoRA, RAG/Qdrant, deep learning inference, wiki generation & injection, automatic memory injection, HTML-over-MD, tribal knowledge generation, Obsidian second brain, PRISM awareness, Claude.md, Octopus orchestration, NVIDIA NIM.

**TOOLS USED**  
- Git (commit, lock handling).  
- Docker Compose (`docker compose up -d`, `stop`).  
- Node scripts (.claude/helpers/chat-slots.mjs, hook files).  
- Tests via `node:test`.  
- CronCreate for `/loop` scheduling.  
- Hand‑off writer (`/handoff` skill with `--source live-chat`).  
- PRISM hook telemetry lib `recordHookFire`.  
- Self-heal Stop hook `U-SVIZ-AUTO-REGEN`.  
- `/agent-factory` skill container.  
- Spec memory ontology schema.  
- Feature-utilization meter + secondary source reader scripts.  
- Subagent deep-dive (Playwright fetch of X.com articles).

**OPEN THREADS**  
1. Wire telemetry for remaining UNKNOWN features: PSN, system‑viz, Docker, LoRA, RAG/Qdrant, DeepLearning, MemoryInject, HTMLOverMD, TribalInject, Obsidian, PRISMAwareness, CLAUDE_md, Octopus, NVIDIA_NIM.  
2. Resolve U2 perf knobs after `docker-compose.yml` unlock; ship env vars and restart `prism‑ollama`.  
3. Auto-mode flip: monitor telemetry row before operator flips config to `"auto"`.  
4. Model swap: stop chat NIM, pull Qwen 2.5‑coder:7b (Q8_0), restart `prism‑ollama`.  
5. Offload rate monitoring post-activation; adjust routing if needed.  
6. Investigate and fix wiki-cron / Ollama timeout (WikiInject low).  
7. Resolve cross-tree collision for `glob-narrow-path.mjs`.  
8. Address OOM in `regen-viz`; consider incremental regeneration or memory limits.  
9. Complete hook adoption sweep in iter 8 to reduce UNKNOWN count toward 0.
