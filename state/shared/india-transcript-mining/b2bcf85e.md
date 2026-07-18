# india session b2bcf85e (2026-05-26, 38.4MB, spine 199KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `8ad9044f3e`: GPU‑OFFLOAD‑MAXIMIZE‑MS0 envelope v1.0.1 (4 units, 2‑round scrutiny) – completed.  
- `29708e0128`: Hook patch for `.claude/hooks/ollama-route-pretooluse.mjs`, config `ollama-route-config.json`, +35 tests; U1 shipped.  
- Envelope close‑out commit: updated `completed_units: 0 → 1` in `GPU‑OFFLOAD‑MAXIMIZE‑MS0.json`.  
- `3151aba8e7`: Added telemetry & CLI gate to `glob-narrow-path.mjs` (U‑GLOB‑TELEMETRY).  
- `7a6a9e0438`: U‑CONTAINER‑SKILLS‑BATCH1 (4 skills: `/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`).  
- `1a2fdc7e2d`: U‑CONTAINER‑SKILLS‑BATCH2 (4 skills).  
- `0763e315ea`: U‑CONTAINER‑SKILLS‑BATCH3 (4 skills).  
- `4314880d67`: U‑SVIZ‑AUTO‑REGEN self‑heal Stop hook – 12/12 tests.  
- `just‑committed`: U‑SVIZ‑SYNERGY‑BATCH – `/agent-factory` skill + `SPEC-MEMORY-ENTITY-ONTOLOGY-2026‑05‑25.md`.  
- `3426272a04`: `scripts/feature-utilization-meter.mjs` (primary meter, 14 tests).  
- `a97415271f`: U‑HOOK‑TELEMETRY‑LIB – shared `recordHookFire()` primitive (10 tests).  
- `ecebb1a38a`: U‑FEATURE‑UTIL‑METER‑SECONDARY – file‑mtime fallback reader (18 tests).

**DECISIONS**  
- Keep `ollama-route-pretooluse.mjs` in **suggest** mode; enable **auto** after telemetry row `byHook.ollama-route-pretooluse.fired > 0`.  
- Unify telemetry into `ollama-offload-stats.json`; drop legacy `hook‑telemetry.jsonl`.  
- Defer adding perf knobs (`KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4`) to `docker-compose.yml` until peer lock cleared.  
- Default model: **Qwen2.5‑coder:7b** (Q4_K_M, 4.7 GB). Optional switch to **14B (~10 GB)** or **32B** if VRAM <16 GB permits.  
- Defer stopping NIM chat containers until VRAM headroom stable and offload target ≥30% achieved.  
- Ship `glob‑narrow-path` telemetry hook & CLI gate; build 12 high‑ROI container skills wrapping MCP actions.  
- Adopt self‑heal Stop hook that regenerates system‑viz when `system-graph.json >12 h`; lock to prevent duplicate spawns.  
- Formalize `/agent-factory` skill for research→spec→backend pipeline.  
- Build Pydantic-style memory ontology spec (iter 7).  
- Implement feature‑utilization meter; use secondary readers (file mtime, counts) to drop UNKNOWN features.

**OPERATOR DIRECTIVES**  
- User authorized GPU/Ollama offload optimization plan; `/startup‑sierra /loop [5m] /goal` invoked – loop continues autonomously.  
- Run `/compact` before proceeding (completed).  
- Commit units, update `.gitignore` to allow `.claude/commands/*`.  
- After telemetry row populates flip config from `"suggest"` → `"auto"`.  
- Continue `/loop [5m]` immediately; do not pause for confirmation.  
- Goal: session‑scoped Stop hook condition requiring deep dive of 18 systems, assessment of recent articles, full synergy of all features, complete functional state.

**FINDINGS/BUGS**  
- Offload rate ~7–8 % (routing classifier); target ≥30 %.  
- GPU VRAM usage 27 %; compute idle ~7 %.  
- Telemetry previously split between `hook‑telemetry.jsonl` and `ollama-offload-stats.json`; merged atomically.  
- `docker-compose.yml` locked by peer (`claude-a0a74c41`) → U2 blocked.  
- Some hooks lacked CLI gate & `recordTelemetry`; fixed in `glob-narrow-path.mjs`.  
- R12 – `regen-viz.mjs --fast` exits 255 OOM at merge‑augmentations; self‑heal triggered correctly.  
- Cross‑tree collision: `glob-narrow-path.mjs` reverted to pre‑iter2 state (commit `3151aba8e7`).  
- Bug: lazy-load `require('fs')` off‑by‑one in `take_rate` accumulation.  
- Path bug: `ollama-offload-stats.json` resides in `mcp-server/data/state/`, not `state/shared/dashboards/`.  
- Unknown feature count reduced 16→10→7 after secondary readers.  
- WikiInject low‑tier: `wiki/log.md` mtime >5 days stale; Ollama backend timing out.

**AI‑SYSTEM SPECIFICS**  

| Engine / Action | Details | Metrics |
|-----------------|---------|---------|
| `.claude/hooks/ollama-route-pretooluse.mjs` | PreToolUse:Read, mode auto → deny raw Read, inject Ollama summary; telemetry to `ollama-offload-stats.json` | Offload rate 8 % (row fired 177) vs target ≥30 % |
| `ollama-route-config.json` | `{mode:"suggest"}` | Flips to `"auto"` after dashboard confirmation |
| `docker-compose.yml` (Ollama container) | Perf knobs: `KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4` | Pending deployment |
| Model swap | Qwen2.5‑coder:7b (Q4_K_M, 4.7 GB); optional Qwen2.5‑coder:14b (~10 GB) or 32B | VRAM <16 GB; target to increase offload rate |
| Feature-utilization meter | Primary meter `scripts/feature-utilization-meter.mjs`; secondary readers file‑mtime fallback | Unknown features reduced from 16→7 |
| `/hook-cost-now` | F1 ≈ 3,420 tok/fire baseline | – |
| `/subagent-triage` | F4 (Opus inheritance on 26‑chat fleet) | – |
| `/read-large` | F7 spirit (MEMORY.md ceiling, generalized) | – |
| SystemViz, Docker, MemoryInject, Obsidian, CLAUDE_md | MEDIUM telemetry coverage | 5 features now have telemetry |
| WikiInject | LOW; stale log | – |

**OPEN THREADS**  
- **U2:** Add perf knobs to `docker-compose.yml` once peer lock cleared.  
- **U3:** Conditional model swap to Qwen2.5‑coder:14b/32B when VRAM permits; monitor offload rate.  
- **U4:** Stop NIM chat containers after confirming VRAM headroom and offload target achieved.  
- Flip config to `"auto"` after telemetry row populates; monitor offload rate ≥30 % before proceeding.  
- Wire remaining hooks (`psn-leg-state-inject`, `memory-relevance-inject`, `tribal-by-domain-inject`) to drop UNKNOWN further.  
- Resolve cross‑tree collision for `glob-narrow-path.mjs`.  
- Investigate wiki‑cron / wiki‑bootstrap stale log and Ollama backend outages.  
- Add telemetry sources or secondary readers for remaining 3 unknown features (NN_GNN, RAG_Qdrant, DeepLearning).  
- Continue loop iterations until UNKNOWN count reaches zero; Stop‑hook will block until satisfied.
