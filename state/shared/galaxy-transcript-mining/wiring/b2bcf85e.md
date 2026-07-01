# wiring session b2bcf85e (2026-05-26, 38.4MB, spine 199KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `8ad9044f3e`: Milestone envelope `GPU-OFFLOAD-MAXIMIZE-MS0.json` v1.0.1 (U1 activation + telemetry merge).  
- `29708e0128`: Hook patch `/claude/hooks/ollama-route-pretooluse.mjs`, config `ollama‑route-config.json` (`mode:"suggest"`), 35 tests, EXEMPT_BASENAMES added.  
- `5eb9545d43`: U2 of **GPU‑OFFLOAD‑MAXIMIZE‑MS0** – 4 Ollama perf env vars, container restart, telemetry verified.  
- `c0446ab1f2`: U‑GREP‑GRAPH‑WIRE – system‑graph lookup added to grep-index-first hook, telemetry sink, 16/16 tests.  
- `3151aba8e7`: U‑GLOB‑TELEMETRY – glob‑narrow-path hook records telemetry, CLI gate; 9/9 tests.  
- `7a6a9e0438`: U‑CONTAINER‑SKILLS‑BATCH1 – `/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`.  
- `1a2fdc7e2d`: U‑CONTAINER‑SKILLS‑BATCH2 – `/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`.  
- `0763e315ea`: U‑CONTAINER‑SKILLS‑BATCH3 – `/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`.  
- `4314880d67`: U‑SVIZ‑AUTO‑REGEN – self‑heal Stop hook, 12/12 tests.  
- `a8cf6e27` (Iter 6): fetched 5 X.com URLs → Pydantic ontology spec, `/agent-factory` skill, and `U‑SVIZ‑AUTO‑REGEN`.  
- `3426272a04`: `scripts/feature-utilization-meter.mjs` – primary meter.  
- `a97415271f`: shared telemetry lib (`recordHookFire`).  
- `ecebb1a38a`: secondary‑source reader for feature meter.

**DECISIONS**  
- Keep PreToolUse:Read hook in `mode:suggest`; switch to `"auto"` only after dashboard row `byHook.ollama-route-pretooluse.fired` appears.  
- Merge U1 (activation+telemetry) and U5 (routing activation) into one unit to avoid split‑commit risk.  
- Apply atomic‑RMW (`PID-temp → rename`) for all telemetry writes.  
- Defer Ollama perf knobs until `docker-compose.yml` released; plan: `KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4`.  
- Drop `nim‑llama32‑3b`; free ~6 GB VRAM for Qwen2.5‑coder:7B‑Q8; keep `nim‑embed‑e5`.  
- Conditional swap to Qwen 7b‑Q8 or 14b‑Q5 only if auto‑mode stable and VRAM headroom confirmed.  
- Defer NIM stop (U4) until GPU usage stabilizes; monitor impact on offload rate.  
- Adopt `EXEMPT_BASENAMES` to protect core state files from accidental substitution.

**OPERATOR DIRECTIVES**  
- `/loop [5m] /goal` – start autonomous loop, tick every 5 min.  
- `continue` – resume current iteration without pause.  
- “lets do your suggestions then” – authorize GPU‑offload optimization plan.  
- Stop hook goal: deep‑dive 18 systems, assess state, synergize features, ensure token‑saving synergy.

**FINDINGS/BUGS**  
- Offload rate ~8 % (suggest mode); target 30 % not met; auto‑mode pending telemetry confirmation.  
- GPU usage compute‑bound (~48 %) with VRAM at 27 %; earlier snapshot showed 73 % VRAM saturation.  
- Peer conflict on `docker-compose.yml` blocked U2 perf knobs.  
- Telemetry for file‑read substitution written to `.claude/cache/hook‑telemetry.jsonl`, not merged into `ollama-offload-stats.json`.  
- Git index lock contention resolved by `git commit -- <files>` + retry loop.  
- API rate‑limit errors from Claude Code during large edits (policy classifier triggered).  
- `regen-viz.mjs --fast` exited 255 (OOM at merge‑augmentations); self‑heal correctly triggered.  
- ESM bug: `require('fs')` in ES module; take_rate math off by division placement.  
- Cross‑tree collision: `glob-narrow-path.mjs` reverted to pre‑iter2 state, lost U‑GLOB‑TELEMETRY commit (`3151aba8e7`).  
- 16 of 18 features unknown utilization; secondary readers reduced UNKNOWN to 7.  
- WikiInject stale >5 days; Ollama backend timing out → wiki cron broken.

**DOMAIN SPECIFICS**  
- **Engines/Actions:** PreToolUse:Read hook (`ollama-route-pretooluse.mjs`), glob‑narrow-path, U‑GREP‑GRAPH‑WIRE, container‑skill batches (1–3), self‑heal Stop hook, `/agent-factory`, feature-utilization-meter, telemetry lib.  
- **Dispatchers/Skills:** `/startup-sierra`, `/loop`, `/goal`, `/route-take`, `/dispatcher-search`, `/doctrine-lookup`, `/cutting-force-quick`, `/svi-pick`, `/atcs-tick`, `/psk-call`, `/memory-recent`, `/rtk-suggest`, `/hook-cost-now`, `/subagent-triage`, `/read-large`.  
- **Metrics/Paths:** `ollama-offload-stats.json`, `.claude/cache/hook‑telemetry.jsonl`, `system-graph.json`, `GPU-OFFLOAD-MAXIMIZE-MS0.json`, `feature-utilization-meter` outputs, telemetry lib.  
- **Special Contexts:** PSN synergy network (11‑leg), NIM containers (`nim‑llama32‑3b`, `nim‑embed‑e5`), GPU‑offload milestone, container‑skill wrappers for MCP.

**TOOLS USED**  
- PRISM CLI skills: `/startup-sierra`, `/loop`, `/goal`.  
- Hook scripts: `ollama-route-pretooluse.mjs`, `glob-narrow-path.mjs`, `grep-index-first.mjs`.  
- Docker CLI for container management.  
- Git commands (`git commit -- <files>`, retry loop).  
- CronCreate for recurring `/loop`.  
- Scripts/hooks: `feature-utilization-meter.mjs`, `recordHookFire` lib, secondary‑source reader.

**OPEN THREADS**  
1. **U3:** Deploy Qwen2.5‑coder:7B‑Q8 model; update `docker-compose.yml`.  
2. **U4:** Stop `nim‑llama32‑3b` container once VRAM headroom confirmed.  
3. **U5:** Activate routing (`mode:auto`) after telemetry row appears; monitor offload rate.  
4. **Telemetry Confirmation:** Verify dashboard row `byHook.ollama-route-pretooluse.fired`.  
5. **Offload Rate Monitoring:** Post‑deployment check of 30 % target; adjust routing if needed.  
6. **Unknown Feature Closure:** Implement telemetry for remaining 7 unknown features (PSN, SystemViz, Docker, NN_GNN, LoRA, RAG_Qdrant, WikiInject).  
7. **Wiki Cron Fix:** Resolve Ollama backend timeout and restart wiki cron.  
8. **Cross‑tree Collision Resolution:** Restore `glob-narrow-path.mjs` to include U‑GLOB‑TELEMETRY commit (`3151aba8e7`).  
9. **PSN Synergy Metrics:** Monitor and close deferred units after 7‑day window.  
10. **Token‑Saving Skill Expansion:** Add additional container skills beyond current batches.
