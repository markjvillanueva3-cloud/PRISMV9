---
name: reference_hermes_dynamic_workflow_planner_2026_06_04
description: "Hermes Dynamic-Workflow planner (scripts/lib/hermes-workflow-planner.mjs) — encodes 0xCodez's 6-patterns/14-steps article as executable plan logic; plus the octopus power-LLM upgrade + a host GEMINI_API_KEY exposure note."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.139Z
aliases: reference_hermes_dynamic_workflow_planner_2026_06_04
---


Three things shipped 2026-06-04 (slot:bravo, hermes-zulu galaxy):

**1. Hermes Dynamic-Workflow planner** — `scripts/lib/hermes-workflow-planner.mjs` (pure, 37 node:tests). Makes Hermes (and any chat) "behave like the coder" in [0xCodez "How to master Dynamic Workflows in Claude Code: 6 patterns and 14 steps"](https://x.com/0xCodez/status/2062127385923776831). Encodes the doctrine as EXECUTABLE planning logic:
- `detectFailureModes(task)` → the 3 failure modes that SIGNAL a workflow (agentic-laziness, self-preferential-bias, goal-drift) + open-ended/hard-to-score/untrusted shapes (explicit hints win over text heuristics).
- `FAILURE_TO_PATTERN` (verbatim): **drift→fan-out · self-preference→adversarial-verify · open-ended→loop-until-done · hard-to-score→tournament**.
- `selectPatterns` + `USE_CASE_MATRIX` (step-11 compositions: migration=Bun Zig→Rust shape, deep-research, sorting, triage, root-cause, exploration-taste, evals…).
- `shouldUseWorkflow` = the step-12 gate ("if a regular session finishes in 5 min, you don't need one" — anti-pattern #1).
- `planWorkflow(task)` → full plan: patterns, per-stage {kind parallel(barrier)/pipeline(stream)/agent/loop, model haiku/sonnet/opus, isolation worktree/remote/none}, quarantine reader for untrusted input (step 13), token budget + /goal on loops + /loop when recurring, separate worker≠verifier, + the 8 token-wasting anti-patterns it avoids. Stages map 1:1 onto PRISM's **Workflow tool** (agent/parallel/pipeline).
- CLI `node scripts/lib/hermes-workflow-planner.mjs "<task>" [--json]` — the Hermes Python backend shells out + parses JSON to shape kanban dispatch. Skill `/hermes-workflow` (disk-only, gitignored per `.gitignore:67 .claude/commands/*` — same as dedup/scrutinize/octopus). Doc-reflected into `hermes-zulu/TOOLBELT.md`. Committed (absorbed into peer `0f178c6370`; code live in HEAD).

**2. Octopus → more powerful LLMs** (`856c417d2b`, MultiModelConsensusEngine.ts). Local Ollama defaults pointed at RETIRED models (deepseek-r1:14b/qwen2.5-coder:14b were `ollama rm`'d by alpha's BLACKWELL-MODEL-UPGRADE) → re-pointed primary `gpt-oss:120b` (resolveOllamaModels substitutes the installed `qwen2.5-coder:32b` floor where not pulled) + secondary `qwen2.5-coder:32b`. Added `isVisionOllamaModel` exclusion (else pickBestOllamaModel could seat a 1.8B vision model as a text reasoner — latent bug exposed by the purge). Cloud reasoning effort medium→high for Grok+Gemini (Codex already xhigh). Fixed 11 pre-existing consensus-test failures en route: vendor-key env-isolation leak (host GEMINI/GOOGLE/XAI keys spawned an unstubbed 3rd voice → confidence misread), stale injector markers (`=== PRISM CONTEXT ===` → live `### Relevant PRISM context`), env-fragile contextBudgets test (now mocks the injector). 56/56 green.

**3. SECURITY — host `GEMINI_API_KEY` is exported in the shell env** (surfaced when its leak broke consensus tests; a mis-written check briefly echoed the value to the session transcript 2026-06-04). **Recommend rotating that Gemini API key.** The fix (vendor-key env-isolation in MultiModelConsensusEngine.test.ts) prevents the leak from breaking tests, but the exposure stands.

Related: [[reference_hermes_on_claude_subscription_opus48_2026_06_04]] · ZULU-ACCOUNT-CYCLE-MS0 (U2 swap `a679e455c1` + U6 auto-swap wiring live in HEAD). [[feedback_bravo_launches_hermes_obsidian_apps]].
