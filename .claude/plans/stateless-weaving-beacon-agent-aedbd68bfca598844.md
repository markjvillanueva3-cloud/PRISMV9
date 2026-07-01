# Research: Production Multi-Agent / Autonomous-Coding Patterns for PRISM Roadmap Generation

Research-only deliverable. ~800 words across 6 areas with concrete fit recommendations for PRISM's stack (3,165 engines, 6 concurrent chats, telemetry already wired, Codex/Gemini CLIs absent).

---

## 1. LLM cascade / model routing

**Sources:** FrugalGPT (Chen et al., TMLR 2024), RouteLLM (LMSYS, NeurIPS 2024), Cascade-Routing (ETH Zurich, ICLR 2025).

**Technique.** FrugalGPT runs a fixed cheap-to-expensive LLM sequence, stops when a learned scoring function exceeds a per-stage threshold; saves up to 98% cost while matching GPT-4 quality. RouteLLM trains a binary router from preference data (BERT/causal LLM classifier or matrix-factorization) to dispatch each query *once* to either weak or strong model — 85% cost cut on MT-Bench. Cascade-Routing (ICLR 2025) unifies both into one framework where the router both picks the model and decides whether to escalate.

**PRISM fit.** Smart-router beats blanket cascade *only when* you have ≥1k labeled queries to train the classifier — PRISM does (`pipeline-telemetry.jsonl` is exactly that data). Recommended pattern: **two-stage hybrid** — RouteLLM-style upfront classifier on `ai-priority-rank.mjs` features routes ~70% of units directly to Ollama mid-tier, escalating only the residual to Opus. Cascade only the residual to avoid 3×-budget worst case.

**Gotchas.** FrugalGPT cascades fail catastrophically when the scoring head is mis-calibrated — every query pays the full chain. Threshold drift over 30 days is documented. **With Codex/Gemini absent, blanket-cascade silently degrades to "Ollama → Opus" anyway** — fix by detecting CLI absence and skipping that rung explicitly, not silent-failing.

---

## 2. Multi-agent code generation orchestration

**Sources:** SWE-bench Verified leaderboard, AdaptOrch (2026), OpenHands CodeAct, multi-agent failure taxonomy (AutoGen/CrewAI/LangGraph 2025).

**Technique.** Top SWE-bench Verified scorers converge on **plan → implement → verify → reflect** with a *single* implementer (not a debate). AdaptOrch dynamically selects topology (62% hybrid, 24% parallel, 14% hierarchical) and beats best-fixed-baseline by 22.9%. CodeAct unifies tool calls as executable Python instead of JSON — closes ~15% gap from plan-vs-execution skew. MetaGPT's role-SOPs (PM/Architect/Engineer/QA) are the strongest planner→reviewer pattern at the *planning* phase specifically.

**PRISM fit.** PRISM already has the planner/reviewer/implementer triad via `forge-team`. Add: **adaptive topology selector** keyed on `conflict-predict.mjs` output (HIGH collision → hierarchical/serialized; LOW → parallel across 6 lanes). Also: **CodeAct-style executable plans** — emit roadmap units as runnable `.mjs` instead of JSON when the unit is a wiring task. Adopt MetaGPT SOPs for the roadmap-gen phase only.

**Gotchas.** Multi-agent uses **15× tokens** vs single chat. Coordination failures are 36.94% of all multi-agent failures across surveyed frameworks. PRISM's 6-chat fan-out is already at the danger zone — do not add more agents per lane, add *better routing* of which lane handles what.

---

## 3. Roadmap / planning generation (long-horizon)

**Sources:** Tree of Thoughts (Yao et al., NeurIPS 2023), ReCAP recursive context-aware planning (Stanford 2024), MAKER million-step zero-error system (2026).

**Technique.** ToT generates *k* candidate next-steps per node, self-evaluates, BFS/DFS the tree — Game-of-24 went 4% → 74% vs CoT. ReCAP adds a *dynamic context tree* tracking evolving subtask hierarchy and supports backtracking when execution feedback contradicts the plan. MAKER scaled to **1M LLM steps with zero errors** through extreme atomic decomposition + per-step multi-agent voting — only published system in this regime.

**PRISM fit.** PRISM's `atomic-roadmap-emit.mjs` is already MAKER-aligned (atomic-first, lane-split). Missing piece: **ToT at the planning rung specifically** — generate 3-5 candidate roadmap-orderings, score each with a heuristic blending `ai-priority-rank` + `conflict-predict`, pick best. ReCAP's backtracking maps onto PRISM's milestone-envelope drift — when `MILESTONE_PROGRESS.md` shows envelope says "not_started" but units shipped, that's the trigger to re-plan that subtree, not the whole roadmap.

**Gotchas.** ToT is 5-100× more expensive than CoT — gate it to *only* the top-level roadmap structure, not every unit. Decomposition depth: stop when subtasks become "atomic" (single-engine wiring) — over-decomposing PRISM units past atomic creates coordination tax with no quality gain.

---

## 4. Consensus / scrutiny patterns

**Sources:** Multi-agent debate (Du et al., 2023), Voting vs Consensus in MAD (2025), "The Cost of Consensus" (2026).

**Technique.** Self-consistency = sample N times, majority vote — beats single-shot 8-15% on reasoning. Multi-agent debate = N agents critique each other across rounds. ReConcile = confidence-weighted hybrid voting+consensus.

**PRISM fit.** PRISM's 3-CLI scrutiny (Codex+Gemini+Opus) is exactly N-of-M=3 with heterogeneous models — the *correct* configuration per the literature. **Critical finding:** "The Cost of Consensus" (2026) shows **isolated self-correction *beats* unguided homogeneous debate** — i.e. 3 *different* models > 3 instances of same model, validating PRISM's heterogeneous design over a "3 Claude agents" alternative. Optimal N for code review per literature is **3-5**; beyond 5, sycophantic conformity dominates.

**Gotchas.** Documented MAD failures: **sycophantic conformity** (agents adopt majority even when wrong), **contextual fragility** (correct answer destabilized by peer rationale), **consensus collapse** (plurality voting discards a correct minority answer). **Mitigation:** confidence-weighted voting over equal-vote — if Opus says PASS with high confidence and Gemini says FAIL with low, weight Opus. With Codex/Gemini absent today, the gate degrades silently to single-Claude — alarming and should be detected and surfaced, not silent-failed.

---

## 5. Telemetry-driven planning improvement

**Sources:** RLEF — RL from execution feedback (ICLR 2025), RAHL — retrieval-augmented hierarchical RL (2024), long-horizon LLM agent RL (2025).

**Technique.** RLEF trains the LLM via PPO to *use* execution feedback, not just receive it — closes gap between "saw test fail" and "fixed the right thing." RAHL retrieves summaries of prior subtasks as in-context augmentation for new planning — +9-42% on ALFWorld/WebShop/HotpotQA. Self-Reflective Execution Agents archive *episodic correction rules* keyed by failure signature, retrieved on similar future failures.

**PRISM fit.** **Highest-leverage fit of all six.** PRISM has `pipeline-telemetry.jsonl` (the data) and `tribal embed-index` (the retrieval). Concrete next move: at roadmap-gen time, embed each candidate unit, retrieve top-5 historical units with similar embeddings, inject *their actual outcomes* (shipped clean / hooks blocked / scrutiny failed) into the planner prompt. RAHL pattern, no fine-tuning needed, fits today's stack.

**Gotchas.** Retrieval poisons planning if corpus is small or biased — PRISM's 381 tribal entries is borderline. Mitigation: weight retrievals by recency and outcome (only retrieve units that *shipped*, not stuck WIP). Reweight against negative-outcome units to learn what to avoid.

---

## 6. Structured outputs for plan generation

**Sources:** OpenAI Structured Outputs (Aug 2024), structured-output benchmark (Tang et al. 2025), constrained-decoding survey (2025).

**Technique.** Constrained decoding masks invalid tokens at sample time so output *cannot* violate JSON schema. Now standard at every major provider since Aug 2024.

**PRISM fit.** Roadmap envelope JSON is exactly this use case. **Recommended:** define milestone-envelope as a strict JSON-schema, use Anthropic's tool-use mode (constrained decoding) for the final emission step, free-form for the upstream brainstorm/ToT phases.

**Gotchas.** Six documented failure modes: (1) every required field becomes a hallucination vector — make optional fields nullable, not required-with-default; (2) **field ordering matters** — put reasoning fields *before* outcome fields so chain-of-thought happens inside the JSON; (3) over-constrained schema degrades quality because the model is forced into low-prob tokens; (4) the model is *unaware* of constraints during next-token-prob computation; (5) syntactic correctness ≠ semantic — schema-valid garbage still ships; (6) retry rate ≥2× is the canary that the schema or prompt is wrong. PRISM milestone-envelope schema should be reviewed for over-constraint — count required fields, make non-load-bearing ones optional.

---

## Net recommendation, ranked by expected value for PRISM

1. **RAHL retrieval at planning time** (§5) — uses telemetry already collected, no new infra, +10-40% in literature.
2. **Detect Codex/Gemini absence** in 3-CLI scrutiny (§4) — silent degradation to 1-of-1 today; install CLIs OR weight Opus 1.0 and explicitly skip absent rungs with surfaced warning.
3. **RouteLLM-style classifier on `ai-priority-rank` features** (§1) — replaces blanket cascade; PRISM has labeled data.
4. **ToT at top-level roadmap structure only** (§3) — gate by depth=1, don't recurse.
5. **Constrained-decoding emission of milestone envelope** (§6) — fix field ordering (reasoning before outcome).
6. **Adaptive topology keyed on `conflict-predict.mjs`** (§2) — collision-HIGH serialize, LOW parallel-6.

**Avoid:** more agents per lane (already 15× token tax); homogeneous N-Claude voting (literature says heterogeneous beats homogeneous — keep 3-CLI design).
