# mill session ebe4f6cb (2026-06-25, 13.4MB, spine 119KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `69bd13c824` – U‑ALPHA‑OLLAMA‑ROSTER‑SYNC: expanded nightly capability matrix 3 → 9 models, added wedge‑safe sequential load/unload & per‑model `num_ctx=8192`.  
- `c243f01414` – CHEAPEST‑MODEL‑SELECT: rewrote `ollamaSafeClassModels` to use param‑size ranking for cheapest matrix‑proven model.  
- `2d4b7f4e72` – MOE‑HARDEN: added MoE multiplier handling & regression oracle tests.  
- `69b31cbfbf` – full 9‑model graded stress test; merge tool `stress-frontier-report.mjs`.  
- `b2d527b126` + `81ad651188` – `excludeNoSignalModels` guard and updated capability matrix.  
- Artifacts: `state/shared/ollama-stress-frontier.md`, `stress-frontier-report.mjs`, `excludeNoSignalModels.js`.

**DECISIONS**  
- Expand capability matrix to all live Ollama models (qwen3‑coder, deepseek‑r1, etc.).  
- Make probe wedge‑safe: sequential load/unload, larger `num_ctx`, longer timeout.  
- Replace static first‑in‑order model selection with param‑size ranking for cheapest proven model.  
- Restore dead `balanced` tier by re‑adding `qwen2.5‑coder:7b`; correct stale “retired” list.  
- Do not ship prewarm `num_ctx` change (no VRAM reduction).  
- Defer full 9‑model probe until fleet‑idle window to avoid active‑peer contention.  
- Switch to per‑model harness for multi‑model probe (fixes all‑or‑nothing output bug).  
- Exclude no‑signal models from capability matrix (`excludeNoSignalModels`).  
- Verify routing graph: `qwen3‑coder:30b` best mechanical, 7b sweet spot; reasoners 0/36.  
- Do not reorder executor cheapest‑warm list (quality gate preserved).  
- Fix probe orchestration bug with per‑model subprocesses; integrate into nightly batch.

**OPERATOR DIRECTIVES**  
- `/goal [ improve hermes cli, hermes agent, obsidian vault, psn, /system-viz, ollama offloading and octopus utilization throughout the entire system… ]`.  
- Free GPU for full 9‑model probe after chats stopped; run clean probe to regenerate canonical matrix.  
- Validate big‑model measurements post‑fix.  
- Operator command: “try again” after pausing peers – indicates willingness to run full probe when GPU idle.

**FINDINGS/BUGS**  
- Capability matrix generator missed 6 of 9 routable models; router used static tier list only.  
- `balanced` tier contained only non‑installed tags → all balanced tasks escalated to `gpt‑oss:20 B`.  
- Probe co‑loaded big models, causing ~55 GB VRAM usage and wedge on RTX 6000.  
- `ask‑ollama` executor uses loaded‑first policy; always picks resident 32 B model (no matrix‑based selection).  
- Prewarm `num_ctx` tweak failed live validation (no VRAM reduction).  
- `runTierSweep` writes only at end → all‑or‑nothing loss on timeout/hang.  
- Multi‑model probe fails for 6/9 models (false‑0) due to VRAM contention & unload logic.  
- 32 B remains resident after explicit unload; 120 B cannot load (65 GB > ~41 GB free).  
- Reasoners (`deepseek‑r1`) 0/36 mechanical tasks → never routed for mechanical work.  
- `qwen3‑coder:30b` beats `qwen2.5‑coder:32b` on mechanical tasks and is cheaper.  
- `excludeNoSignalModels` guard removes false‑0 rows; matrix remains routing‑neutral.

**DOMAIN SPECIFICS**  
- Engines/Actions: `ollama-capability-probe.mjs`, `model-tier-advisor.mjs`, `ollama-cost-router.mjs`, `ask‑ollama.mjs`, `hermes-cron-prewarm.mjs`.  
- Dispatchers: chat‑slots dispatcher, audit‑roadmap‑drift, nightly batch (`ollama-night-batch.mjs`).  
- Metrics/Paths: VRAM usage per model (e.g., `qwen2.5‑coder:32 B ≈55 GB`), `OLLAMA_CONTEXT_LENGTH`, `OLLAMA_NUM_PARALLEL`.  
- Stress batteries: `ollama-stress-test.mjs`, `stress-battery-codegen.mjs`.  
- Frontier utilities: `hermes-frontier-utils.mjs`, `pareto-frontier-emit.mjs`.  
- Cost‑router tier preferences (best tier, mechanical categories).  
- Capability probe orchestration bug specific to this galaxy’s multi‑model runner.

**TOOLS USED**  
- PRISM `/checkin-alpha` with slot binding; chat‑slots helpers; audit‑roadmap‑drift.  
- Test harness (`__tests__/`) for 3‑of‑3 scrutiny gate, mutation tests.  
- Git hooks: `PRISM_GIT_ADD_LANE_DISABLE`, `[MAIN-FORCE]`.  
- Runtime scripts: `ollama-capability-probe.mjs`, `model-tier-advisor.mjs`, `ollama-cost-router.mjs`, `ask‑ollama.mjs`.  
- PRISM stress harnesses (`ollama-stress-test.mjs`, `stress-battery-codegen.mjs`).  
- Merge tool: `stress-frontier-report.mjs`.  
- Guard: `excludeNoSignalModels.js`.  
- GPU monitoring utilities (VRAM usage checks).

**OPEN THREADS**  
- Full 9‑model capability probe – run in fleet‑idle window to regenerate canonical matrix & validate cheapest‑select.  
- Executor‑level cheapest‑warm selection – evaluate tuning of `ask‑ollama` loaded‑first policy.  
- Octopus utilization integration – confirm voice selection aligns with new cost‑aware router.  
- Hermes CLI/Agent, Obsidian vault, PSN, System‑Viz enhancements (pending).  
- Stress test for codegen vs reasoning models.  
- Measure `gpt‑oss:120b` (requires >65 GB VRAM; currently blocked).  
- Final nightly sweep to regenerate frontier after GPU free.  
- Executor cheapest‑warm unit remains deferred.
