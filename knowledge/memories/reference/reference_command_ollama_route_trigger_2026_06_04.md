---
name: reference_command_ollama_route_trigger_2026_06_04
description: "Executable command→Ollama route registry + trigger runner — converts the advisory ollama-pipeline-injector (0.6% take-rate) into a one-Bash-call offload that runs a high-ROI slash command's mechanical LLM step on a LOCAL model for free."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.525Z
aliases: reference_command_ollama_route_trigger_2026_06_04
---


**BLACKWELL-TOKEN-SYNERGY-MS0 / U-CMD-OLLAMA-ROUTE (slot:bravo, 2026-06-04).**

**The problem it closes:** `ollama-pipeline-injector.mjs` (UserPromptSubmit hook) only *suggests* Ollama routes as advisory prose in the prompt context. Live telemetry proves that fails — take-rate **38/5945 = 0.6%** (the chat reads "consider calling qwen2.5-coder" and ignores it). Meanwhile `scripts/ask-ollama.mjs` is a real, working local-LLM execution surface (modes viz/summarize/explain/triage/ask) that nothing routed high-ROI commands to.

**The bridge (2 files + test, 28/28 green):**
- `scripts/lib/command-ollama-routes.mjs` — frozen registry mapping high-ROI commands → `{ backing script (verified on disk), ollamaSteps[], claudeKeeps }`. Pure lookups: `getRoute` (command/alias/leading-slash/case-insensitive), `listRoutes` (ranked by est savings desc), `routeSavings`, `routableCommands`. `OLLAMA_MODES` is asserted == ask-ollama's real `ALL_MODES` by the test (anti-drift).
- `scripts/trigger-command-pipeline.mjs` — CLI runner. `--list` (ranked), `--plan <cmd> [arg]` (dry, shows backing script + exact ask-ollama call + claudeKeeps), `<cmd> [arg]` (executes the offload via `node ask-ollama.mjs` with injected execFile). Pure `planPipeline`/`buildStepArgv`/`resolveStepInput` + impure `runStep`. Fail-loud: any step failure → exit 3; broken plan (missing cli-arg) → exit 2 before any run.

**Routes shipped (ranked):** find/deep-search/master-index/connection-finder/nav (viz — **FREE, no model**, ~4000 tok) · weekly-synthesis (summarize, 3000) · close-out-audit (summarize the CLOSE-OUT-CANDIDATES.md report, 2500) · diagnose-fix/troubleshooting-guide (triage, 2500) · distill-tribal (summarize, 2000) · explain/cad-explain/program-audit (explain, 2000) · de-sloppify (summarize, 1500) · skill-lint (explain, 1500).

**Live-validated (R15):** `node scripts/trigger-command-pipeline.mjs find "kienzle force"` returned 12 real graph hits — zero Claude tokens, zero GPU inference (viz is a pure local keyword search). A chat that would've pulled the multi-MB system graph into context now gets compact hits via one Bash call.

**Honesty (R12):** every route separates `ollamaSteps` (mechanical work a local model does well) from `claudeKeeps` (judgment/safety/synthesis). A route NEVER claims to fully execute a command — it offloads only the token-heavy mechanical step.

**Boundary vs the injector (no drift):** the injector keeps its advisory-prose role for *pipeline* commands (forge-audit/rgs/scrutinize/dedup/precompact/pdf-learn); this registry is the *executable* offload for *mechanical-step* commands. Overlap is only `close-out` and the step shapes differ. Single-sourcing the two route tables is a P2 cleanup, not a near-term hazard.

**Scrutiny:** silent-failure-hunter PASS (0 P0/P1 — traced all 8 ask-ollama output shapes to correct ok/fail); independent code-reviewer second pass. Related: [[reference_hermes_local_model_autonomy_2026_06_04]] · [[reference_ollama_expand_ms0]] · ask-ollama.mjs · ollama-pipeline-injector.mjs.
