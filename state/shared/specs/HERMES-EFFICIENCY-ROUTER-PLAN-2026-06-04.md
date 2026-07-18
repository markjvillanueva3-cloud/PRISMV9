# HERMES EFFICIENCY-ROUTER — BUILD PLAN (2026-06-04)

> **Operator goal:** keyword-triggered skills/scripts/hooks/slash-command pipelines (for Hermes) that use Ollama/local-LLMs to do as much work as possible **without degraded quality**; an agent reviews their work then **enhances + gap-fills**; full autonomous work; **Hermes knows the optimal `{tool, skill, memory, tribal, llm-model, prism-feature}` for ANY task.**
>
> **Hard constraint:** LOCAL ONLY. No cloud models touch manufacturing IP. Cloud Claude is the *reviewer/escalation* tier (it already sees the repo); it never receives a raw drawing/program/customer corpus that a local model couldn't have processed. Local-LLM = the *worker*; Claude = the *judge/finisher*.
>
> Synthesis of 5 discovery lenses (A routing engines · B Ollama offload + dead-offloader · C knowledge selection · D Hermes + reviewer pattern · E gap + proposal). Every unit REUSES proven, dispatcher-wired infrastructure; only connective tissue is new.

---

## 0. LIVE-VERIFIED FACTS (this build rests on these — re-confirmed 2026-06-04)

| Fact | Evidence (live) |
|------|-----------------|
| Read-route offloader is DEAD | `ollama-offload-stats.json byHook["ollama-route-pretooluse"]` = **fired 5589 / offloaded 0 / kept 5547 / suggested 42 / tokensSaved 0** |
| Root cause = stale config tag | `mcp-server/data/state/ollama-route-config.json` `mode:"auto"`, `model:"qwen2.5-coder:7b"` |
| `qwen2.5-coder:7b` is DELETED from host | `/api/tags` = `qwen3-vl:8b-instruct, qwen3-vl:8b, qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text, qwen2.5-coder:32b` — **no 7b** |
| Prompt-level offloader WORKS (the real lever) | `byHook["ollama-task-offloader"]` = **fired 3930 / offloaded 377 / suggested 691 / tokensSaved 347929** |
| Overall take-rate ~11.7%, target ≥30% | offloaded 379 / (379 + ~2862 kept) |
| Route-NUDGE conversion is ~0.8% | `mcp-route-suggest` 38/4731 actioned — **advisory text alone does not convert** |

**Two doctrines fall out of the facts and shape the whole plan:**
1. **The Read-route is a near-dead lever even when fixed** (Lens B). Source `.ts/.mjs` are never consumable; `.json/.md` digests are exact-value (`isGistSafe` correctly excludes them). Fixing it is cheap + correct (kills 5589 wasted fires + a live stale-model bug), but the **volume lever is the prompt-level offloader + a quality-gated execution wrapper**, not Read-substitution.
2. **Advisory nudges fail (0.8%).** Every unit that wants Ollama to "do more" must **convert routing decisions into action** (auto-invoke / executable directive), never another ignorable suggestion.

---

## 1. REUSE MAP — what already exists (DO NOT rebuild)

### Routing brains (4 disjoint — the keystone COMPOSES them, forks none)
| Asset | File | Role | Status |
|-------|------|------|--------|
| `routeModelForTask({category,available,hardware})` | `.claude/hooks/lib/ollama-cost-router.mjs` | **CANONICAL model-tier picker.** 4 tiers, escalate-up-only, returns only an INSTALLED model. Blackwell-tuned 2026-06-04. | WORKING (current) |
| `resolveSynthesisModel` / `fetchInstalledModels` | `scripts/lib/host-aware-synthesis-model.mjs` | host→installed-model glue; guarantees a live tag | WORKING |
| `detectHostClass` | `.claude/hooks/lib/host-class.mjs` | host classifier | WORKING |
| `aiSystemRouterEngine.classify/route` | `mcp-server/src/engines/AISystemRouterEngine.ts` → `prism_intelligence:ai_route_task` | task→BACKEND class, 12 classes, health-probe, ledger | **WORKING but STALE backend names** (`ollama-codellama/deepseek`) |
| `modelRoutingEngine.route` | `mcp-server/src/engines/ModelRoutingEngine.ts` → `prism_orchestrate:local_model_route` | **strongest router** — features→model, cost/latency/**safety** gates (safety_critical → never local; embed stays local) | WORKING |
| `multi-provider-router` (`classifyTask`,`recordOutcome`,`recommendProviderFromHistory`) | `scripts/lib/multi-provider-router.mjs` | provider tier + **the only outcome-learning loop** (`multi-provider-outcomes.jsonl`) | WORKING |
| `costAwareRouterEngine` | `mcp-server/src/engines/CostAwareRouterEngine.ts` | cheapest **TOOL** (Glob/Grep/Read/Agent) per query intent | WORKING (tool-economy only) |

### Ollama execution substrate (do-the-work layer)
| Asset | File | Role |
|-------|------|------|
| `ask-ollama.mjs` (`viz/summarize/explain/triage/ask`) | `scripts/ask-ollama.mjs` | host-aware single-shot; default `qwen2.5-coder:32b`; only compact answer returns | WORKING (current) |
| `ollama-prism-bridge.mjs` (`runAgentLoop`) | `scripts/ollama-prism-bridge.mjs` | L2 local agent loop, 3 read-only tools |
| `ollama-l3-agent.mjs` (`runL3`) | `scripts/ollama-l3-agent.mjs` | **L3 goal-loop** — self-continuation gate, maxSteps/wall-timeout. *The substrate for "Ollama does as much as possible."* |
| `OllamaHookBridgeEngine` (`query`,`getModelForHook`) | `mcp-server/src/engines/OllamaHookBridgeEngine.ts` | fast hook-grade calls | **WORKING but STALE** (`modelOverrides` name retired 7b/14b) |
| `ollama-hook-bridge.mjs` (`queryOllama`,`isOllamaAvailable`) | `.claude/hooks/lib/ollama-hook-bridge.mjs` | hook-grade client; all `HOOK_MODELS`→`32b` (current) | WORKING |

### Reviewer / second-opinion (partial — extend, don't fork)
| Asset | File | Role |
|-------|------|------|
| `ollama-reviewer-second-opinion.mjs` + `parseOllamaReviewVerdict`/`decideOllamaReviewSecondOpinion` | `.claude/hooks/ollama-reviewer-second-opinion.mjs` + `lib/autonomous-foolproof-logic.mjs` | reviews **git commits** `{PASS/CONCERN/FAIL}`; ledger `REVIEWER_VERDICTS.json` | WORKING (reviews commits, not arbitrary output) |
| `reviewer` / `code-analyzer` / `verifier` / `implementer` agents | `.claude/agents/{core/reviewer.md, analysis/code-analyzer.md, verifier.md, implementer.md, safety-physics.md}` | report-only reviewers + the one FIXER (`implementer`) | WORKING |
| `scrutiny-3way.mjs` | `.claude/scripts/scrutiny-3way.mjs` | 3-of-3 gate prompt emitter + ledger | WORKING |
| `brainstorm-path-forward` Workflow | `knowledge/wiki/architecture/crossroad-brainstorm-workflow.md` | 5-lens fan-out → synthesis (schema-less, plain-text) | WORKING pattern |

### Hermes orchestration primitives (all pure, dispatcher-wired, but loop is DARK)
| Asset | File → action | Role |
|-------|---------------|------|
| `hermesParallelFanoutPlannerEngine.{assessAutoTrigger,plan}` | `HermesParallelFanoutPlannerEngine.ts` → `prism_session:hermes_auto_fanout_gate / hermes_fanout_plan` | prompt→domains→slot candidates + DAG fan-out |
| `zuluTaskAuctionEngine.auction` | `ZuluTaskAuctionEngine.ts` → `prism_session:zulu_task_auction` | sealed-bid slot selection |
| `zuluAwarenessReader.{rankSlotsForTaskDescriptor,bestSlotForTask}` | `mcp-server/src/engines/lib/zuluAwarenessReader.ts` | slot ranking from fingerprints |
| `hermesParallelVerdictAggregatorEngine.aggregate` | `HermesParallelVerdictAggregatorEngine.ts` → `prism_session:hermes_verdict_aggregate` | merge N verdicts + flag file-conflicts + consensus + best-agent |
| `hermesSelfCorrectionEngine.propose` | `HermesSelfCorrectionEngine.ts` → `prism_session:hermes_self_correct` | failure→corrected-approach steps + escalate-at-3 |
| `slotBriefEngine` | `SlotBriefEngine.ts` → `prism_context:slot_brief_write/list` | targeted consume-once work-order to a slot |
| `slot-brief-inject.mjs` | `.claude/hooks/slot-brief-inject.mjs` | at-most-once brief delivery into slot's next prompt |

### Knowledge-selection surfaces (the six axes — exist separately, never composed)
| Axis | Existing surface |
|------|------------------|
| **tool** | `costAwareRouterEngine` / `prism_session:dispatcher_map_compact` (0.8% take-rate) |
| **skill** | `skill-auto-trigger.mjs` + extractor `_skill-triggers.jsonl` (INVOKE_NOW allowlist ≥0.85 = the only path that converts) |
| **memory** | `prism_session:master_index_query` · `memory-index-precheck-inject` · `prism_memory:semantic_search` |
| **tribal** | `tribal-by-domain-inject.mjs` · `prismSelfAwarenessEngine.searchTribalKnowledge` |
| **llm-model** | `routeModelForTask` (canonical) |
| **prism-feature** | `prismSelfAwarenessEngine.{findCapabilities,recommendAIFeatures}` → `.fullAction` (ready-to-invoke `dispatcher:action`) |
| **fuse all** | `scripts/unit-knowledge-pack.mjs composePack()` fuses master-index+tribal+commits — **BUILT but UNWIRED**; the natural seed for the bundle |

### TOP-3 REUSE-NOT-REBUILD CALLOUTS (would be duplication — route to existing)
1. **Do NOT build a new model/tier selector.** `routeModelForTask` (`ollama-cost-router.mjs`) is canonical, current, Blackwell-tuned, install-truthful. The keystone DELEGATES model choice to it and retires the two stale hardcodes (`OllamaHookBridgeEngine.modelOverrides`, `AISystemRouterEngine` `ollama-codellama/deepseek`) onto it. Forking a router re-creates the exact "two routing brains that disagree" disease Lens A/E flagged.
2. **Do NOT build a new reviewer agent type.** Reuse the existing `reviewer` / `code-analyzer` subagents + the `parseOllamaReviewVerdict`/`decideOllamaReviewSecondOpinion` verdict logic + `REVIEWER_VERDICTS.json` ledger. The only new thing is the **grade→enhance/gap-fill** decision (vs the existing grade→block), and the FIXER is the existing `implementer` agent.
3. **Do NOT build a new per-task knowledge bundler from scratch.** `unit-knowledge-pack.mjs composePack()` already fuses graph+tribal+commits — it is the seed of the asset bundle; extend + wire it rather than writing a parallel fusion. Likewise reuse `master-index-search-lib.mjs` (the shared BM25 engine every injector already routes through) — extend the lib, not N hooks.

---

## 2. KEYSTONE — U1 (build first, highest leverage)

### U1 — `LocalLLMTaskRouterEngine` + `prism_ai:route_task` (the single unified routing brain) — bundled with the dead-offloader config fix
**What it builds:** ONE composer engine that, given any task string + light context, returns a single verdict:
```
{ taskClass, category, runLocal:boolean, ollamaModel, escalateTo:"claude"|null,
  qualityBar:0..1, tool, dispatcherAction, fallbackChain[], reason[] }
```
It is a **COMPOSER**, not a new policy: it delegates model-tier to `routeModelForTask`, backend-class to `aiSystemRouterEngine.classify`, safety gate to `modelRoutingEngine` semantics (safety_critical / requireSafety → `runLocal:false, escalateTo:"claude"` — never local), tool-economy to `costAwareRouterEngine`, provider-history to `recommendProviderFromHistory`, install-truth to `fetchInstalledModels`/`detectHostClass`. **Genuinely new** = the merged verdict object + the consolidated outcome ledger.

**Bundled config fix (do in U1, it directly serves "use Ollama as much as possible"):**
- Edit `mcp-server/data/state/ollama-route-config.json` `model` → `"qwen2.5-coder:32b"` (kills 100% of `cascade_model_missing` short-circuits — the live 5589/0 bug).
- Better/permanent: make `ollama-route-pretooluse.mjs` `runRoute()` resolve its model through `resolveSynthesisModel` / `routeModelForTask` (never trust a static config tag again). **This is the dead-offloader `decideRoute` fix the operator named — early, in the keystone.**
- **Honesty note (Lens B):** even fixed, the Read-route reroutes near-zero real traffic (`isGistSafe` correctly excludes exact-value `.json/.md`; `.ts/.mjs` never consumable). So U1 fixes it for correctness + stops the wasted fires, but the volume comes from U2/U3/U6 (prompt-level execution), **not** Read-substitution. Do NOT widen `isGistSafe` (design owners closed it after ~0% take-rate).
- Retire stale tags: rewire `OllamaHookBridgeEngine.modelOverrides` + `AISystemRouterEngine` ollama backend names to resolve via `routeModelForTask` (a LIVE silent quality bug — they point at deleted 7b/14b/codellama/deepseek).

**Files:**
- NEW `mcp-server/src/engines/LocalLLMTaskRouterEngine.ts` (header MUST carry `// composes: ollama-cost-router + aiSystemRouterEngine + modelRoutingEngine + costAwareRouterEngine + multi-provider-router` so the duplication-hard-block fuzzy-match — which WILL hit the four `*Router*Engine` files at ~70% — sees the justified composition role).
- NEW `mcp-server/src/__tests__/LocalLLMTaskRouterEngine.test.ts`
- MOD `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` (`prism_ai`) — add action `route_task`
- MOD `mcp-server/data/state/ollama-route-config.json` (model→32b)
- MOD `.claude/hooks/ollama-route-pretooluse.mjs` (`runRoute` model via resolver)
- MOD `mcp-server/src/engines/OllamaHookBridgeEngine.ts` + `AISystemRouterEngine.ts` (retire stale tags → resolver)
- NEW unified ledger `mcp-server/data/state/local-llm-router-outcomes.jsonl` (consolidates `routing-decisions.jsonl` + `multi-provider-outcomes.jsonl` + reviewer verdicts — the learning loop sees full history)

**Reuses:** all 4 routing brains + host-aware resolver + `costAwareRouterEngine` (zero new routing logic).

**Acceptance (real reference-value / invariant):**
- `route_task("summarize this 30KB build log")` → `runLocal:true`, `ollamaModel ∈ /api/tags` (assert membership against live `fetchInstalledModels`, NEVER a hardcoded tag — the anti-drift invariant).
- `route_task("validate cutting parameters for Ti-6Al-4V, S(x) gate")` → `runLocal:false, escalateTo:"claude"` (safety invariant — manufacturing-safety NEVER local).
- `route_task("extract dims from this customer print PDF")` → `runLocal:true` (IP-stays-local invariant — never routes a customer drawing to cloud).
- Post-fix invariant: re-run config → `ollama-route-pretooluse` emits ≥1 `reroute` (not `pass`) on a synthetic 30KB `.log`, and `byHook["ollama-route-pretooluse"].offloaded` increments from 0.
- Drift guard: a test that FAILS if any router emits a model not in the live `/api/tags` set (catches the next retirement).

**Wiring:** `prism_ai:route_task` (dispatcher). Every downstream unit calls THIS, not the four sub-routers.

---

## 3. DEPENDENCY-ORDERED UNITS

### U2 — `local-first-execute` script + `/local-do` skill (keyword-triggered execution)
**Builds:** `scripts/local-first-execute.mjs` — given a task: call `prism_ai:route_task`; if `runLocal`, drive `ollama-l3-agent.runL3` (multi-step goals) or `ask-ollama` (single-shot) on the routed model; return `{product, qualityBar, model, taskClass}` for the reviewer. `/local-do <task>` slash command = the keyword front door (matched for Hermes — see U5/U7).
**Files:** NEW `scripts/local-first-execute.mjs`; NEW `.claude/commands/local-do.md`; NEW `scripts/lib/local-first-execute.test.mjs`.
**Reuses:** U1 router · `ollama-l3-agent.runL3` · `ask-ollama` · `host-aware-synthesis-model`. Zero new Ollama client.
**Acceptance:** `/local-do "list TODO comments in scripts/"` runs entirely on local model, returns product + qualityBar; with Ollama unreachable, fails soft to a Claude-handles directive (no silent drop). Invariant: a `safety_critical` task short-circuits to escalate WITHOUT calling Ollama.
**Wiring:** slash command → script; depends U1.

### U3 — `local-output-reviewer` + `ollama-work-review.mjs` (the reviewer → enhance/gap-fill loop — operator's CORE ask)
**Builds:** the closed loop. The hook/driver takes U2's local product, dispatches a `reviewer`-type agent (REUSE existing `reviewer`/`code-analyzer`, NOT a new subagent_type) that GRADES against `qualityBar` and emits `{grade:0..1, gaps[], enhancement, verdict:PASS/ENHANCE/REDO}`. Decision:
- `grade ≥ qualityBar` → **accept** local product (cheap path — Claude never touched it).
- `qualityBar > grade ≥ floor` → **ENHANCE**: dispatch `implementer` agent to gap-fill the local draft (far cheaper than Claude-from-scratch — Claude edits, doesn't author).
- `grade < floor` → **REDO** on Claude from scratch (degraded-quality guard — nothing below bar ever ships).
**Quality-gate (no degraded output ships):** the verdict gate is the safety net; ENHANCE/REDO are logged to the unified ledger so the take-rate + quality are measurable. Optionally chain `scrutiny-3way.mjs` for build-class outputs.
**Files:** NEW `.claude/hooks/ollama-work-review.mjs`; NEW `.claude/agents/analysis/local-output-reviewer.md` (a prompt variant of `reviewer`, grades-then-routes); MOD `local-first-execute.mjs` to call it; reuse `REVIEWER_VERDICTS.json`.
**Reuses:** `reviewer`+`implementer` agents · `parseOllamaReviewVerdict`/`decideOllamaReviewSecondOpinion` decision pattern · `REVIEWER_VERDICTS.json`. New = grade-then-enhance (vs grade-then-block).
**Acceptance:** feed a deliberately-incomplete local draft (e.g. a docstring missing edge cases) → reviewer returns `ENHANCE`, `implementer` fills the gap, re-grade ≥ bar. Feed a hallucinated/wrong draft → `REDO`, Claude authors, verdict PASS. Invariant: no path emits an accepted product with `grade < qualityBar` (assert on the ledger).
**Wiring:** hook driven by U2; depends U1, U2.

### U4 — `HermesAssetBundleEngine` + `prism_ai:asset_bundle` + `/optimal-assets` skill (Hermes knows the optimal `{tool,skill,memory,tribal,llm,feature}`)
**Builds:** the single "what should I use for task X" advisor. Composes the six axes into ONE answer:
```
asset_bundle(task) → { tool, skill[], memory[], tribal[], llmModel, prismFeature[]/dispatcherAction, reason }
```
**Files:** NEW `mcp-server/src/engines/HermesAssetBundleEngine.ts` (header `// composes: unit-knowledge-pack + prismSelfAwarenessEngine + master-index-search-lib + skill-triggers + LocalLLMTaskRouter`); NEW test; MOD `aiReasoningDispatcher.ts` add `asset_bundle`; NEW `.claude/commands/optimal-assets.md`.
**Reuses:** `unit-knowledge-pack.composePack()` (memory+tribal+commits seed — finally wired) · `prismSelfAwarenessEngine.{findCapabilities,recommendAIFeatures,searchTribalKnowledge}` (feature+tribal+`.fullAction`) · `master-index-search-lib` (memory/graph) · `_skill-triggers.jsonl` extractor (skill) · U1 `route_task` (llm-model + tool). New = the assembler + per-axis ranking.
**Acceptance:** `asset_bundle("optimize WEDM 7-pass for D2 die")` returns tribal hits from the wedm corpus, `skill ∈ {/wedm, /wedm-program}`, a `prism_*:*` fullAction, and an installed `llmModel`. Invariant: every axis returns ≥1 item or an explicit `null` with reason (no silent empty axis); `prismFeature.fullAction` is a parseable `dispatcher:action`.
**Wiring:** `prism_ai:asset_bundle`; this is the call Hermes invokes per-task. Depends U1.

### U5 — `hermes-asset-brief-inject` (teach Hermes the routing at DISPATCH time — close the Lens C/D integration gap)
**Builds:** the fold of U4 into the Hermes work-order channel. Today `SlotBriefEngine` dispatches work orders but calls NONE of the knowledge surfaces. This unit makes `slot_brief_write` (or a thin pre-pack step) call `asset_bundle(task)` + `route_task(task)` and embed the result in the brief, so the receiving slot gets the optimal asset set folded into its brief — not just injected at prompt time.
**Files:** MOD `mcp-server/src/engines/SlotBriefEngine.ts` (optional `assetBundle` field, populated via `prism_ai:asset_bundle`); MOD `.claude/hooks/slot-brief-inject.mjs` (render the asset block); NEW test.
**Reuses:** `SlotBriefEngine` · `slot-brief-inject` · U4 · U1. New = the dispatch-time pre-pack.
**Acceptance:** `slot_brief_write(slot:"mike", task:"WEDM die")` produces a brief whose rendered block contains the asset bundle; `slot-brief-inject` delivers it once and consumes it. Invariant: at-most-once delivery preserved (existing 21/21 tests stay green).
**Wiring:** `prism_context:slot_brief_write` enriched; delivery via existing hook. Depends U4.

### U6 — `route-conversion-loop` (close the 0.8% take-rate gap — convert routes to ACTION)
**Builds:** high-confidence routes stop being ignorable nudges. Extend `ollama-task-offloader.mjs` / `ollama-pipeline-injector.mjs`: when `route_task` (U1) returns `runLocal:true` at confidence ≥0.90, emit a `/local-do`-ready **executable directive** via the SAME mandatory-directive mechanism `skill-auto-trigger` already uses for the INVOKE_NOW allowlist (≥0.85). Below 0.90 → stays advisory (back-compat).
**Files:** MOD `.claude/hooks/ollama-task-offloader.mjs`; MOD `scripts/extract-skill-triggers.mjs` INVOKE_NOW set (add `local-do`); MOD `.claude/hooks/skill-auto-trigger.mjs` consumer if needed; telemetry to unified ledger.
**Reuses:** `ollama-task-offloader` (the WORKING 377-offload lever) · `skill-auto-trigger` Layer-2 mandatory-directive pattern · offload-stats telemetry. New = wiring high-conf routes to auto-invoke.
**Acceptance:** a prompt classified high-conf-local emits the `🚨 SKILL AUTO-INVOKE: /local-do` block; over a measurement window `byHook["ollama-task-offloader"].offloaded / fired` rises (target: overall take-rate 11.7% → ≥30%). Invariant: a `safety_critical`/IP-sensitive route NEVER auto-invokes local (it escalates).
**Wiring:** UserPromptSubmit hooks; depends U1–U4.

### U7 — `HermesAutonomousDriver` (the missing driver — chains decompose→route→execute→review→aggregate→self-correct)
**Builds:** the autonomous loop Lens D proved is MISSING. A driver (script + `prism_orchestrate:hermes_autonomous_run` action, or a Workflow) that chains the existing pure functions end-to-end:
`assessAutoTrigger → plan → (per leaf) zulu auction/rankSlots → local-first-execute (U2) → local-output-reviewer (U3) → hermes_verdict_aggregate → on FAIL hermes_self_correct → re-dispatch` until verdicts pass or `escalate_to_human` (≥3 attempts).
**Files:** NEW `scripts/hermes-autonomous-driver.mjs` (or Workflow doc); MOD `orchestrationDispatcher.ts` add `hermes_autonomous_run`; NEW test (mocked leaves).
**Reuses:** `hermesParallelFanoutPlannerEngine` · `zuluTaskAuctionEngine` · `zuluAwarenessReader` · `hermesParallelVerdictAggregatorEngine` · `hermesSelfCorrectionEngine` · U2 · U3. **100% existing primitives — this is pure connective tissue (the operator's "full autonomous work").**
**Acceptance:** a 3-subtask fan-out runs to aggregated PASS verdict autonomously; an injected failure triggers `hermes_self_correct` re-dispatch; 3 failures → `escalate_to_human`. Invariant: aggregator flags any file-conflict before commit; no degraded leaf (U3 grade<floor) is aggregated as PASS.
**Wiring:** `prism_orchestrate:hermes_autonomous_run`; depends U2, U3 (and U1 transitively). Use the `brainstorm-path-forward` plain-text-agent discipline (NO JSON schema on subagents — Lens D gotcha).

---

## 4. REVIEWER / GAP-FILL AGENT DESIGN (operator's core requirement, detailed)

**Pattern: local draft → grade → enhance/gap-fill → re-verify (nothing degraded ships).**
1. **Draft (local):** U2 runs the task on the routed Ollama model (`runL3`/`ask-ollama`). Local-only; manufacturing IP never leaves the box.
2. **Grade (Claude reviewer, cheap):** U3 dispatches the existing `reviewer`/`code-analyzer` subagent with the task spec + the local draft + the `qualityBar`. It emits `{grade, gaps[], enhancement, verdict}`. Report-only — it does NOT edit (matches the existing agent contract).
3. **Route on grade:**
   - PASS (`grade≥bar`) → accept local product. **Claude spent only review tokens, not authoring tokens** — the savings.
   - ENHANCE (`bar>grade≥floor`) → dispatch the existing `implementer` agent to gap-fill the local draft (edit, not author). Re-grade.
   - REDO (`grade<floor`) → Claude authors from scratch; the local draft is discarded. The degraded-quality firewall.
4. **Autonomous invocation:** U6 converts a high-confidence route into an auto-invoked `/local-do` (mandatory-directive, not advisory) → U2 runs → U3's hook auto-fires the reviewer on the product. U7 wraps the whole thing in the fan-out/aggregate/self-correct loop so it runs without a human at each step. `hermesSelfCorrectionEngine.propose` supplies the corrected approach on FAIL; `escalate_to_human` at 3 attempts is the final stop.
5. **Quality gate (no degraded output):** the verdict gate (step 3) + the ledger assertion (U3 acceptance invariant: no accepted product with `grade<qualityBar`) + optional `scrutiny-3way.mjs` for build-class outputs. For anything safety- or IP-sensitive, U1 forces `runLocal:false` so it never enters the local-draft path at all.

---

## 5. HOW HERMES IS TAUGHT THE ROUTING

- **Single advisor surface:** `prism_ai:asset_bundle(task)` (U4) is the one "what should I use for task X" call — returns `{tool, skill, memory, tribal, llm-model, prism-feature}` in one verdict. Hermes (and any slot) calls this instead of hitting 6 separate surfaces.
- **At dispatch time:** U5 folds `asset_bundle` + `route_task` into `SlotBriefEngine` so the optimal asset set rides inside the work-order brief (fixes the Lens C/D gap where Hermes dispatches but consumes no knowledge surface).
- **Keyword triggers (for Hermes + slots):** `/optimal-assets` and `/local-do` are the slash front doors; U6 wires high-confidence routes to the INVOKE_NOW auto-invoke mechanism so the routing decision converts to action (not a 0.8%-ignored nudge). `skill-auto-trigger`'s extractor JSONL is the keyword source of truth.

---

## 6. LOCAL-ONLY GUARANTEE (manufacturing IP never leaves the box)
- U1's safety/IP invariants force `runLocal:false → escalateTo:"claude"` ONLY for tasks where Claude already has repo context (code review, safety validation) — never by shipping a raw drawing/program/customer corpus outward. Customer prints, NC programs, tribal corpus → always `runLocal:true` (local Ollama) or stay in-repo for Claude.
- No cloud Ollama, no gemini/gpt providers in the local-worker path. `multi-provider-router`'s cloud tiers are reachable only as a Claude-rate-limit fallback, gated separately and out of scope for the IP-bearing worker path.
- Every routed model is asserted ∈ live `/api/tags` (U1 drift guard) — local, installed, no silent cloud substitution.

---

## 7. DEPENDENCY GRAPH
```
U1 (keystone: unified router + dead-offloader fix + stale-tag retire)
 ├─ U2 (local-first-execute + /local-do)
 │   └─ U3 (reviewer → enhance/gap-fill loop)
 │       └─ U7 (autonomous driver: fanout→exec→review→aggregate→self-correct)
 ├─ U4 (asset_bundle advisor)
 │   └─ U5 (fold into Hermes slot-briefs at dispatch)
 └─ U6 (route-conversion: nudge → auto-invoke action)  [needs U1–U4]
```
Build order: **U1 → U2 → U3 → U4 → U5 → U6 → U7.**

## 8. RISK FLAGS
- **Stale-tag drift is a LIVE bug** (not debt): `OllamaHookBridgeEngine` + `AISystemRouterEngine` route to retired 7b/14b/codellama/deepseek. U1 must retire these onto `routeModelForTask` or they silently degrade.
- **Duplication-hard-block will fuzzy-hit** the two new `*Engine` files at ~70% against the four existing routers — each MUST carry an explicit `// composes:` header naming what it wraps, or the gate fires.
- **Advisory ≠ action:** any unit that only nudges repeats the 0.8% dead pattern — U6 is mandatory, not optional.
- **Read-route fix yields near-zero volume:** set expectations — it kills a wasted-fire + live bug, but the offload volume lever is the prompt-level execution path (U2/U3/U6), not Read-substitution. Do NOT widen `isGistSafe`.
- **Hermes app is quota-blocked** (shares the saturated Opus pool) and **0 slots have `zuluOptIn`** — U7's driver must work as a slot-run script/Workflow, not depend on the dark Zulu daemon.
- **Subagents can't emit reliable JSON schema** (Lens D) — U7 reviewers/synthesis use plain-text markdown, re-pass args on resume.
