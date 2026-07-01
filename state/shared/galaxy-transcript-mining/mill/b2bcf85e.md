# mill session b2bcf85e (2026-05-26, 38.4MB, spine 199KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `8ad9044f3e`: Milestone envelope `GPU‑OFFLOAD‑MAXIMIZE‑MS0.json` v1.0.1 (4‑unit envelope, 2‑round scrutiny).  
- `29708e0128`: Hook patch `ollama-route-pretooluse.mjs`, config `ollama-route-config.json`, 35 unit tests – U1.  
- `5eb9545d43`: GPU‑OFFLOAD‑MAXIMIZE‑MS0 – U2 (perf knobs, offload config).  
- `3151aba8e7`: Telemetry added to `glob-narrow-path.mjs`; 9/9 tests pass.  
- `7a6a9e0438`, `1a2fdc7e2d`, `0763e315ea`: Container‑skill batches 1–3 shipped (12 skills total).  
- `4314880d67`: U‑SVIZ‑AUTO‑REGEN self‑heal Stop hook (regen on >12h staleness, lock file).  
- Commit slot‑sierra: U‑SVIZ‑SYNERGY‑BATCH – `/agent-factory` skill + `SPEC-MEMORY-ENTITY-ONTOLOGY-2026-05-25.md`.  
- `3426272a04`: `scripts/feature-utilization-meter.mjs` (primary meter, 14 tests).  
- `a97415271f`: U‑HOOK‑TELEMETRY‑LIB (`recordHookFire()` shared primitive).  
- `ecebb1a38a`: U‑FEATURE‑UTIL‑METER‑SECONDARY (secondary readers for wiki/log.md, Docker state, etc.).

**DECISIONS**  
- Merge auto‑mode activation with telemetry unification into single unit (U1).  
- Default to `mode:suggest` in prod; flip to `auto` after dashboard confirms hook firing.  
- Exempt critical state files (`EXEMPT_BASENAMES`) from substitution.  
- Cascade short‑circuit: if `/api/tags` fails or model not allowlisted, fall back to raw read.  
- Defer U2 (perf knobs) until peer release of `docker-compose.yml`.  
- Defer U3 (Q8 model pull) pending U1 confirmation and VRAM availability.  
- Defer U4 (NIM stop) until VRAM headroom is no longer sufficient or policy change.  
- Adopt self‑heal Stop hook for system‑viz auto‑regen; prevent duplicate spawns.

**OPERATOR DIRECTIVES**  
- Continue `/loop [5m] /goal` after `/startup-sierra`.  
- Schedule recurring prompt via `CronCreate` (`1m`, `/goal`).  
- Resolve `docker-compose.yml` conflict or wait for peer release before shipping U2.  
- After telemetry row appears in `ollama-offload-stats.json`, flip `mode` to `"auto"` and monitor offload rate.  
- Investigate wiki‑cron / wiki‑bootstrap (Ollama timeout).  
- Finalize Prism awareness, Octopus, NVIDIA Nim integrations.

**FINDINGS/BUGS**  
- GPU at 27 % VRAM / 48 % compute – not VRAM‑bound.  
- Offload rate ≈ 7 % vs target 30 %; routing is bottleneck.  
- `docker-compose.yml` locked by peer `claude-a0a74c41`; cannot edit until released.  
- NIM activation milestone ghost – containers run but routing not activated.  
- Telemetry for `glob-narrow-path` missing initially; hook unmodified until committed.  
- Offload telemetry writes separate from main stats file (`ollama-offload-stats.json`).  
- `regen‑viz.mjs` exits 255 at merge‑augmentations (OOM); self‑heal triggers correctly.  
- 16 of 18 features UNKNOWN in telemetry; only Ollama & GrepGlobIndex high, others missing.  
- WikiInject low‑tier finding: `wiki/log.md` stale >5 days; Ollama backend timing out.  
- NN_EVAL.json stale 9 days; tribal/.md count 1258; specs/*.html 129 files → HTMLOverMD adoption signal.

**DOMAIN SPECIFICS**  
- System‑viz auto‑regen with staleness detection and lock file.  
- PSN state injection, telemetry still missing for many legs (memory relevance, tribal by domain).  
- Ollama high fire count; backend timeouts affecting wiki & other features.  
- Docker stack: `prism‑ollama`, `nim‑llama32‑3b`, `nim‑embed-e5`, qdrant, postgres, grafana, prometheus.  
- Milestone envelope format in `mcp-server/data/milestones`.  
- Feature‑utilization meter quantifies per‑feature telemetry; drives data‑driven optimizations.  
- Shared telemetry lib (`recordHookFire()`) avoids duplicate code across hooks.

**TOOLS USED**  
- Hooks: `ollama-route-pretooluse.mjs`, `glob-narrow-path.mjs`, `U‑SVIZ‑AUTO‑REGEN`.  
- Scripts: `feature-utilization-meter.mjs`, secondary readers (wiki/log.md, Docker state, NN_EVAL.json).  
- Docker compose (`docker-compose.yml`).  
- CronCreate skill for recurring prompts.  
- `/startup-sierra` wrapper (slot‑binding + handoff).  
- `/loop` skill.  
- Node scripts (`chat-slots.mjs`) for slot claim/reclaim.  
- Atomic‑RMW pattern via temp file rename for telemetry writes.

**OPEN THREADS**  
- U2: add `KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4` to `docker-compose.yml`.  
- Mode flip to auto after telemetry row appears in `ollama-offload-stats.json`.  
- U3: conditional model swap to Qwen2.5‑Coder 7b Q8 or 14b after telemetry confirms benefit.  
- U4: decision on stopping NIM containers once VRAM headroom is sufficient.  
- Offload rate monitoring – achieve >30 % offload once routing fully activated.  
- Reduce UNKNOWN features from 16→0; adopt remaining hooks (`psn-leg-state-inject`, `memory-relevance-inject`, `tribal-by-domain-inject`).  
- Investigate wiki‑cron / wiki‑bootstrap (Ollama timeout).  
- Complete LoRA inference instrumentation and integration.  
- Wire RAG/Qdrant telemetry and functionality.  
- Finalize Prism awareness, Octopus, NVIDIA Nim integrations.  
- Expand secondary source readers (NN_EVAL.json, tribal/.md, specs/*.html) to drop more UNKNOWNs.
