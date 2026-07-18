# Deep-Learning + Deep-Reasoning Substrate Audit
**Slot:** india · **Date:** 2026-05-26 · **Scope:** `prism_ai` dispatcher + DeepAI/Cognitive/Meta-Learning/CoT/Moonshot/PPAGI surface
**Audit method:** read `aiReasoningDispatcher.ts` (4053 lines, 538 cases) + schemas + engine internals + Grep callsites across hooks/scripts/skills + ledger file sizes

---

## Deep-reasoning action inventory (count by family + % with prod callsite)

| Family | Action count (in dispatcher + schema enum) | Schema validated | Engine method body | Production callsite | Production %  |
|---|---|---|---|---|---|
| `deep_ai_*` (reason/learn/logic/extended_thinking) | 4 | YES (4/4) | REAL (returns multi-step ReasoningStep[]) | 0 prod callers; only hooks `prism-intelligence-briefing` / `optimal-context-inject` / `neural-ai-optimizer` / `extended-thinking-auto` reference the engine name — **all UNWIRED in `H:/prism/.claude/settings.json`** | **0%** |
| `deep_logic_trace` | 1 | YES | REAL (`deepLogicTraceEngine.getSummary/getStats`) | 0 grep hits outside dispatcher | **0%** |
| `ai_mill_agi_reason` / `ai_milling_deep_reason` / `ai_lathe_reason` / `ai_lathe_train` / `ai_wedm_deep_logic` / `ai_wedm_deep_neural` / `ai_wedm_advanced_neural` | 7 | YES (literal entries) | REAL (delegate to MillingAIUnification/WireEDMAGI/LatheOpus/etc.) | 0 grep hits in `scripts/` or `.claude/hooks/` for the **action name**; engine files invoked directly by CAM tests | **0% via dispatcher** (engines used directly) |
| `cognitive_*` (mfg_reason, multi_asset_reason, learning_*, neural_*, meta_orchestrate, tot_create_tree, budget_allocate, ensemble_*, lora_drift_*, +~25 more) | ~30 | YES | REAL | 0 grep hits in scripts/hooks/skills | **0%** |
| `creative_solve` / `causal_analyze` / `counterfactual_predict` / `scientific_reason` | 4 | YES | REAL (P5-U01..U04 wiring) | 0 grep hits outside dispatcher/tests/schemas/wiki | **0%** |
| `belief_set` / `belief_update` / `belief_query` / `belief_list` / `belief_delete` | 5 | YES (U-WIRE20) | REAL singleton with persistence | 0 grep hits outside dispatcher | **0%** |
| `cot_reason` / `cot_reason_tree` / `cot_explain` / `cot_apply_heuristics` | 4 | YES (U-WIRE21) | REAL (linear + tree-of-thought beam search) | 1 grep hit: `.claude/helpers/prism-awareness-bundle.mjs` mentions name in doc-string only; no actual MCP call | **0%** |
| `reasoning_chain_register` / `reasoning_chain_query` / `reasoning_explain` | 3 | YES | REAL | 0 callsites | **0%** |
| `meta_learning_record` / `meta_learning_recommend` / `meta_learning_stats` / `meta_learning_list` | 4 | YES (U-WIRE25) | REAL (Wilson lower-bound recommender, in-memory) | **1 candidate hook (`.claude/hooks/meta-learning-trigger.mjs`)** but **DISABLED** in `H:/prism/.claude/settings.json` (commented-out passthrough; comment cites "moved to /learn-batch agent dispatch 2026-05-10"). `META_LEARNING_LEDGER.jsonl` = **338 bytes** (effectively empty). | **0% live** |
| `moonshot_invoke` | 1 | YES | **REAL** — actual HTTPS POST to `api.moonshot.ai/v1/chat/completions` with retry/backoff/SSE streaming. NOT a stub. | 0 hook/script callers — only consensus pipelines via `consensus_decide` may invoke indirectly | **0% direct** |
| `moa_aggregate` | 1 | YES | REAL (MoaLayer2Engine.aggregate) | 0 callsites | **0%** |
| `chain_executor_execute` | 1 | YES | **PARTIAL** — `(chainExecutorEngine as any).execute?.(params) ?? { note: "method not callable" }` — uses optional-chain fallback masking missing method | 0 callsites | **0% — STUB-LIKE FALLBACK** |
| `inference_chain_run` | 1 | YES | **STUB-LIKE** — comment: *"no callable singleton — use CHAIN_ACTIONS list"*; returns `listChainTypes()` instead of running a chain | 0 callsites | **0% — DOCUMENTED NON-OP** |
| `unified_ppagi_orchestrate` / `unified_ppagi_stats` | 2 | YES | REAL (UnifiedPPAGIOrchestrationEngine with DAG, lock manager, event bus) — but `engines-unwired/unifiedppagiorchestrationengine.md` exists in wiki = engine has no production consumers | 0 grep hits outside dispatcher | **0%** |
| **TOTAL deep-reasoning surface** | **~68** | **100% schema-validated** | **~62 REAL / 4 partial / 2 documented-no-op** | **~0 production callsites via the prism_ai action names** | **~0%** |

**Karpathy R12 fail-loud findings (documented "deep" actions returning hardcoded stubs):**
- `chain_executor_execute`: uses `?.execute?.(params) ?? { note: "method not callable" }` — silent fall-through if the engine's method is missing, returning a fake-success envelope. **Fail-loud violation: should throw or return `ok: false`** per `cascade_calibrate`'s pattern (which the dispatcher author chose to do correctly elsewhere).
- `inference_chain_run`: same anti-pattern. Comment is honest ("no callable singleton"), but the response shape mimics success (`success: true, data: ...`).
- 26+ other actions in this dispatcher use the same `(engine as any).method?.(params) ?? { engine: "X", note: "method not callable" }` pattern — they pretend to call something but silently degrade. Grep `note: "method not callable"` in the dispatcher = **26 hits**, all in the AI surface.

---

## Genuine model-escalation vs ceremony actions

**Genuine escalation (calls a different model / process):**
- `moonshot_invoke` — HTTPS to Kimi-K2 (~1T MoE, external API). REAL escalation.
- `consensus_decide` — multi-model fan-out (claude + codex + ollama + grok + gemini). REAL escalation.
- `deep_ai_extended_thinking` — calls `DeepAIIntelligenceEngine.extendedThinking()` which internally chains `deepReason → deepLogic`. NO model swap, but multi-pass reasoning structure.

**Ceremony around the same call (no model escalation, just structured prompting/state):**
- `deep_ai_reason` / `deep_ai_learn` / `deep_ai_logic`: build a 5-step ReasoningStep[] internally via `prismSelfAwarenessEngine.proactiveReason()` + `applyDomainReasoning()` + `synthesizeConclusion()`. These are pure-TS reasoning *structures* — no LLM call, no model swap.
- `ai_mill_agi_reason` / `ai_wedm_deep_logic` / `ai_lathe_reason`: delegate to per-domain "Deep AI" engines (MillingAIUnification, WireEDMAGI, LatheOpus) — these are TS reasoning pipelines with hardcoded heuristics, not Opus-vs-Sonnet routing.
- `cot_reason` / `cot_reason_tree`: ChainOfThoughtEngine runs in-process beam search over a `ReasoningStep[]` tree — no LLM call.
- `belief_*` actions: in-memory Bayesian distribution updates — pure math, no model.
- `meta_learning_*`: Wilson lower-bound bookkeeping — pure stats, no model.
- `unified_ppagi_orchestrate`: in-process DAG executor over PP-AGI engine entries — no LLM.
- `cognitive_*` family: orchestration/registration over neural-weight/MoA/ensemble registries — no LLM swap, just registry dispatch.

**Net assessment:** Of ~68 deep-reasoning actions, only **`moonshot_invoke` + `consensus_decide`** genuinely escalate to a different model. The other ~66 are *reasoning ceremony* — they structure the response, run beam search, update beliefs, or invoke a domain-specific TS pipeline. They are NOT Opus → Sonnet routers.

---

## Closed-loop reasoning (which actions feed outcomes back to learning?)

**Designed to close the loop:**
1. `meta_learning_record` — explicit outcome capture (scenario/strategy/success/durationMs) → `MetaLearningOptimizerEngine.record()` → Wilson lower-bound update.
2. `meta_learning_recommend` — reads the accumulated stats and returns the best strategy.
3. `deep_logic_trace` — DeepLogicTraceEngine maintains a stats store of proof traces.
4. `reasoning_chain_register` + `reasoning_chain_query` — ReasoningChainSharingEngine persists chains for cross-session replay.
5. `cognitive_neural_synthesize` / `cognitive_learning_loop_stats` / `cognitive_learning_incremental_list_jobs` — neural-weight + learning-loop telemetry.

**Actually feeding outcomes today:**
- **NONE via Stop-hook or auto-trigger.** `meta-learning-trigger.mjs` exists and is well-written (reads `dev-outcomes.jsonl`, gates on thresholds, suggests `meta_learning_record`), but is **DISABLED in `H:/prism/.claude/settings.json`** (commented-out passthrough since 2026-05-10 — moved to `/learn-batch` agent dispatch but no settings entry confirms the agent is auto-invoked either).
- `dev-outcomes.jsonl` accumulates (587 KB) — outcome data IS being captured somewhere upstream.
- `META_LEARNING_LEDGER.jsonl` = **338 BYTES** — effectively empty. The downstream learning side is **dark**.
- `extended-thinking-log.json` (40 KB) is being written by `extended-thinking-auto.mjs` — but that hook is also **NOT wired** in `H:/prism/.claude/settings.json` (zero grep matches there). State file is stale or written from elsewhere.

**Conclusion: The closed-loop is one-way today.** Outcomes accumulate in `dev-outcomes.jsonl`, but no scheduled task or Stop-hook calls `meta_learning_record` on them. The meta-learning side is essentially in cold-storage.

---

## Article incorporation candidates (≤4 concrete units — esp. Layer-4 dreaming → meta-learning loop)

**Article: dunik's Layer-4 consolidator framing** (transcript-level dreaming → memory promotion → meta-learning).

PRISM's closest analog is the **`meta_learning_record` → `meta_learning_recommend` pair backed by `MetaLearningOptimizerEngine`** — the engine exposes exactly the Layer-4 contract: record (scenario, strategy, success, duration), aggregate via Wilson lower-bound, recommend best-performing strategy for new scenarios. The shape is right; the wiring is dead.

### Concrete units to incorporate (highest-leverage first):

1. **U-INDIA-META-LEARN-WIRE-STOP** (P0, 1-2 hrs) — Re-wire `meta-learning-trigger.mjs` as a Stop hook (NOT the disabled PostToolUse it was). On every Stop:
   - Tail `dev-outcomes.jsonl` for the session's new entries.
   - For each (scenario, strategy, outcome) triple, call `prism_ai:meta_learning_record` via in-process import (NO MCP round-trip).
   - Append a JSONL line to `META_LEARNING_LEDGER.jsonl` so cross-session state survives.
   - Threshold gate: only fire if ≥1 new outcome since last run (avoid no-op fires).
   - **Acceptance:** `META_LEARNING_LEDGER.jsonl` grows past 338 bytes; `meta_learning_recommend` returns non-null for at least one scenario after one /loop iteration.

2. **U-INDIA-DREAM-CONSOLIDATOR-STOP** (P0, 2-3 hrs) — Layer-4 dreaming hook. On every Stop with ≥30s idle since last user turn:
   - Pull last N=20 entries from `dev-outcomes.jsonl` + the session's ATCS state + recent `agent-update-log.json` deltas.
   - Call `cot_reason` (now actually used!) with the prompt: *"What strategy patterns are emerging? Which scenarios are under-attempted? What should be tried next?"*
   - Persist the resulting `ReasoningChain` via `reasoning_chain_register` (also actually used).
   - Inject the top-1 recommendation into the next `UserPromptSubmit` as a hint.
   - **Acceptance:** `ReasoningChainSharingEngine` accumulates ≥1 chain per active /loop session; subsequent prompts surface a "previously found pattern" advisory.

3. **U-INDIA-FAIL-LOUD-STUB-PURGE** (P1, 30 min) — Karpathy R12 enforcement. Grep `note: "method not callable"` in `aiReasoningDispatcher.ts` (26 hits). For each, either:
   - The method actually exists → remove the `?.` optional-chain and let it throw on missing engine state, OR
   - The method genuinely doesn't exist → return `{ ok: false, error: "engine X has no method Y over MCP", in_process_api: "..." }` per the `cascade_calibrate` pattern.
   - **Acceptance:** `note: "method not callable"` returns 0 grep hits; one new test per converted case asserts `ok:false` on missing method.

4. **U-INDIA-COT-FOR-PICK-UNIT** (P1, 1 hr) — Pull `cot_reason_tree` (beam search) into `/pick-unit` decision-making. Today the picker is deterministic priority-queue. Add an opt-in mode (`--reason`) that:
   - Builds a `ReasoningProblem` from the top-K candidate units.
   - Beam-searches over (build vs defer vs split) decisions.
   - Records the chain via `reasoning_chain_register` so the next chat can see the rationale.
   - **Acceptance:** `/pick-unit --reason` emits a chain id + best-path commentary; ReasoningChainSharingEngine has ≥1 chain per slot per session.

---

## Appendix — dispatcher case-count breakdown

- `aiReasoningDispatcher.ts`: 4053 lines, **538 `case "..."` statements** (full prism_ai surface, far broader than the audited deep-reasoning subset).
- Audited deep-reasoning subset above: ~68 actions.
- Of the audited 68, 100% are schema-validated, ~92% have real engine method bodies, ~38% (26 cases) use the silent-degrade `?? { note: "method not callable" }` anti-pattern (fail-loud violation).
- **Zero** of the audited 68 have a documented production callsite (hooks/scripts/skills/cron) — they exist purely as on-demand MCP actions with no auto-fire path.

## Appendix — files inspected
- `H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` (4053 lines)
- `H:/prism/mcp-server/src/schemas/aiReasoningActionSchemas.ts` (2806 lines)
- `H:/prism/mcp-server/src/engines/DeepAIIntelligenceEngine.ts`
- `H:/prism/mcp-server/src/engines/MetaLearningOptimizerEngine.ts`
- `H:/prism/mcp-server/src/engines/UnifiedPPAGIOrchestrationEngine.ts`
- `H:/prism/mcp-server/src/engines/MoonshotClientEngine.ts`
- `H:/prism/.claude/hooks/meta-learning-trigger.mjs` (DISABLED in settings)
- `H:/prism/.claude/hooks/extended-thinking-auto.mjs` (NOT wired)
- `H:/prism/.claude/hooks/ai-system-activate.mjs` (NOT wired)
- `H:/prism/.claude/hooks/neural-ai-optimizer.mjs` (NOT wired)
- `H:/prism/.claude/hooks/prism-intelligence-briefing.mjs` (NOT wired)
- `H:/prism/.claude/hooks/self-improvement-activate.mjs` (NOT wired)
- `H:/prism/mcp-server/data/state/{dev-outcomes.jsonl=587KB, META_LEARNING_LEDGER.jsonl=338B, extended-thinking-log.json=40KB, meta-learning-trigger-state.json=189B}`
