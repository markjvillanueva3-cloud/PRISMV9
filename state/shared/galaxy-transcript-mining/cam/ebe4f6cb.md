# cam session ebe4f6cb (2026-06-25, 13.4MB, spine 119KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `69bd13c824` – U‑ALPHA‑OLLAMA‑ROSTER‑SYNC: full roster matrix, wedge‑safe load/unload (`num_ctx=8192`).  
- `c243f01414` – CHEAPEST‑MODEL‑SELECT & MoE‑HARDEN routing policy.  
- `2d4b7f4e72` – MOE‑HARDEN: multiplier handling, slice guard test, docstring precision.  
- `85d50fd661` – COVERAGE‑GUARD: `audit-probe-roster-coverage.mjs`.  
- `69b31cbfbf` – stress‑frontier report (`state/shared/ollama-stress-frontier.md`) + merge tool (`stress-frontier-report.mjs`).  
- `b2d527b126` – `excludeNoSignalModels` guard (prevents false‑0 models).  
- `81ad651188` – final matrix artifact (`state/shared/canonical-matrix.json`).  

**DECISIONS**  
- Shift fleet‑reaper ownership from alpha to golf; use `/checkin-alpha` wrapper with `--force true --confirmRecent true`.  
- Expand matrix generator to all 9 installed models; make probe wedge‑safe by unloading between runs and bounding `num_ctx`.  
- Replace static first‑in‑order model selection with param‑ranked cheapest proven choice.  
- Add coverage guard to prevent blind‑graph drift.  
- Do not alter ask‑ollama’s loaded‑first behavior; defer executor‑level cheapest‑warm audit until next session.  
- Use per‑model subprocess probe to avoid multi‑model orchestration bug that caused false‑0 for 32b/30b/gpt‑oss:20b.  
- Keep cost‑router unchanged; verify `qwen3-coder:30b` is best mechanical model, reasoning models isolated.  
- Implement `excludeNoSignalModels` guard to clean matrix of generation failures.  
- Plan full big‑model measurement when a truly idle GPU (65 GB free) is available; 120b remains unmeasured.

**OPERATOR DIRECTIVES**  
- `/goal [ improve hermes cli, hermes agent, obsidian vault, psn, /system-viz, ollama offloading and octopus utilization throughout the entire system… ]`  
- Pause peers → “try again” after GPU idle.  
- Run stress test to find each LLM’s frontier before diminishing returns.  
- Free the GPU and invite further testing.

**FINDINGS/BUGS**  
- Matrix blind to 6 of 9 routing‑relevant models; probe would wedge on full roster.  
- Static `routeModelForTask` ignored measured matrix → potential misrouting.  
- Stale balanced tier listed non‑installed tags → forced escalation to gpt‑oss:20b.  
- `qwen2.5-coder:32b` resident at ~55 GB VRAM; fleet contention wedges mixed sweeps.  
- Prewarm hook kept 32b warm with no `num_ctx`, causing chronic VRAM starvation.  
- Ask‑ollama’s loaded‑first prefers largest warm model, not cheapest proven one.  
- Multi‑model probe bug: unload‑between‑models poisoned subsequent cold‑loads → all‑0 for 32b/30b/gpt‑oss:20b.  
- VRAM contention not root cause; single‑model calls succeed (gpt‑oss:20b loads fine with 32b resident).  
- Reasoning models (`deepseek-r1`) score 0/36 on mechanical tasks → never routed to them.  
- `qwen3-coder:30b` achieves 27/36 mechanical, beating `qwen2.5-coder:32b` (26/36) and cheaper.  
- 120b cannot load with current 41 GB free; requires ~65 GB.

**DOMAIN SPECIFICS**  
- Engines/actions & paths:  
  - `chat-slots.mjs` (`node H:/prism/.claude/helpers/chat-slots.mjs`) – slot binding.  
  - `checkin.md` pipeline (`node H:/prism/.claude/commands/checkin.md`).  
  - `ollama-capability-probe.mjs` – probe & matrix generator.  
  - `model-tier-advisor.mjs`.  
  - `routeModelForTask` in `ollama-cost-router.mjs`.  
  - `ask-ollama.mjs`.  
  - Stress batteries: `ollama-stress-test.mjs`, `stress-battery-codegen.mjs`.  
  - Frontier utilities: `hermes-frontier-utils.mjs`, `pareto-frontier-emit.mjs`.  
- Metrics: VRAM usage via `ollama ps`; probe output JSON (`ollama-capability-matrix.json`); frontier.smallestPassing per task; mechanical vs reasoning performance.

**TOOLS USED**  
- PRISM CLI helpers (`chat-slots.mjs`), checkin pipeline, scripts: `ollama-capability-probe.mjs`, `model-tier-advisor.mjs`, `ollama-safe-class-models.js`, coverage guard script.  
- Testing harnesses: 3‑of‑3 scrutiny gate, mutation tests for MoE and coverage guard.  
- GPU monitoring via `ollama ps`.  
- Stress tools: `stress-frontier-report.mjs`, `excludeNoSignalModels.js`, per‑model orchestrator script.

**OPEN THREADS**  
- Full 9‑model probe on fleet‑idle window to regenerate canonical matrix.  
- Executor‑level cheapest‑warm audit (ask‑ollama loaded‑first vs cheapest proven).  
- Octopus utilization integration; verify octopus/hyper usage, coordinate with bravo/sierra slots.  
- Hermes CLI/agent, Obsidian vault, PSN, system‑viz enhancements per original goal.  
- Stress tests for codegen vs reasoning to determine hard limits before diminishing returns.  
- Measure 120b when a clean GPU (65 GB free) is available; finalize executor cheapest‑warm unit if quality gate permits.  
- Monitor VRAM residency of 32b after chat shutdown to ensure no hidden leaks.
