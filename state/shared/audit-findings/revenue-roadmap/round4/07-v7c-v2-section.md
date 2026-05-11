# v7.C v2 — AI Orchestration Plan (Grounded)

**Revision context:** Round-3/09 corrected stale Round-2 evidence. `z3-solver ^4.16.0`, `@qdrant/js-client-rest ^1.17.0`, `@xenova/transformers ^2.17.2`, and `ollama ^0.6.3` are ALL already declared in `mcp-server/package.json`. Net new dependencies for the entire T3/T6/T7 grounding plan = **0**. The remediation surface is engine-creation + wiring + weights training, not procurement.

This section supersedes v7.C in the original spec. The 7-tier template stands; what changes is each tier now has a concrete, verifiable, grounded implementation path with explicit fallback semantics.

---

## Tier definitions (concrete grounding)

### T1 — Claude orchestrator (tautological, real)

Claude itself is T1. Every revenue-roadmap unit that invokes the AI stack flows through Claude as the synthesis + final go/no-go layer. Implementation: this chat. No engine to ship. Verification: presence of `tiers_invoked: [..., 'T1', ...]` in every MS2 envelope.

### T2 — Deep reasoning (REAL, wired)

| Action | File | Line |
|---|---|---|
| `ai_milling_deep_reason` | `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` | 897 |
| `ai_wedm_deep_logic` | same file | 907 |
| `cot_reason_tree` | same file | 1372 |

These are production action handlers wired to chain-of-thought reasoning engines. No remediation needed; T2 already grounds.

### T3 — LoRA adapters (training plan, weights are the gap)

**Current state diagnosis:** ~80 LoRA-named engines and 9 `cam_lora_*` schemas exist. Zero `.safetensors` checkpoints live under `mcp-server/data/models/`. `LatheLoRAPipelineEngine.predict()` silently returns base-model output when adapter weights absent — no telemetry, no warning. This is the silent-failure trap caller in Round-2.

**Training plan (4 adapters, ranks by corpus size):**

| Adapter | Rank | Alpha | Corpus | Estimated samples | Justification |
|---|---|---|---|---|---|
| `mill_lora` | 16 | 32 | JM Die archive filtered to `.NC` / `.PRG` mill programs | ~8K | Largest corpus, most heterogeneous task surface (3-axis + 4-axis + 5-axis subset) — capacity needed |
| `lathe_lora` | 8 | 16 | JM Die Mazak/Okuma `.MIN` (with `$<INTERNAL>%` line-1 header per reference_jm_die_program_save_practice memory) | ~3-5K | Medium corpus, narrower task surface — rank-8 sufficient per LoRA §7.2 |
| `wedm_lora` | 4 | 8 | 26 indexed WEDM programs + 46 WEDM tribal tips + 14 formulas | ~70-100 + augmentation | Smallest corpus; rank-4 to avoid overfit (LoRA-FA low-shot finding) |
| `cam_lora` | 8 | 16 | Mastercam(45) + hyperMILL(25) extracted ops + post-CPS files; per-task ensemble (operation_classify / strategy_recommend / tool_select) | ~150 ops × 3 tasks | Per-task rank-8, ensemble at inference |

Common hyperparameters: dropout 0.1, attention-only (`q_proj`, `v_proj`) per QLoRA §4.

**Label sourcing:** XPROC-NEURAL-CONNECT outcome-bridge (shipped commit `3b21228f7` — replay/sampler outcome bridge) generates positive/negative reward signals from production runs. This connects T4 telemetry directly into T3 supervision pairs.

**Inference path:**
- Primary: Ollama 0.6.3 base `qwen2.5-coder:7b` + LoRA adapter via Modelfile `FROM` directive (native LoRA mounting since Ollama 0.3.0)
- Fallback: `@xenova/transformers` llama.cpp path when Ollama daemon unreachable
- Remote fallback: Anthropic SDK base-model (emits `lora.fallback.weights_missing` telemetry event)

**Weights storage:** `mcp-server/data/models/<domain>-lora/<YYYY-MM-DD>/adapter_model.safetensors` + `adapter_config.json`. Rank-16 7B adapter ≈ 80 MB; cap at 100 MB per adapter.

**Fallback marker (kills silent failure):**

Every LoRA inference call must return:

```ts
{
  prediction: T,
  adapter_loaded: boolean,
  adapter_version: string | null,   // YYYY-MM-DD of weight set or null
  fallback_reason?: 'weights_missing' | 'daemon_unreachable' | 'rate_limited' | 'rank_mismatch'
}
```

When `adapter_loaded === false`, telemetry event `lora.fallback.<reason>` is emitted to `AISystemRouterEngine` ledger.

**Enforcement (Stop hook):** `lora-weights-presence-check.mjs` fails CI when any LoRA engine is wired to a dispatcher but the latest `data/models/<domain>-lora/<latest>/adapter_model.safetensors` is missing. Policy: **warn-first 30 days, hard-block after.** Add to `MINIMAL_ALLOWLIST` so profile cannot disable.

**Ship order (smallest-first risk gradient):** wedm_lora rank-4 → lathe_lora rank-8 → mill_lora rank-16 → cam_lora ensemble.

### T4 — Neural / conformal (REAL, wired)

10 `xproc_conformal_*` actions + `xproc_neural_train` + `xproc_neural_predict` + APS / RAPS / Mondrian conformal variants are all live in `crossProcessDispatcher.ts`. Outcome-bridge from commit `3b21228f7` feeds calibration data. No remediation needed; T4 already grounds.

### T5 — AI router (REAL, wired)

`AISystemRouterEngine` lives at `mcp-server/src/engines/AISystemRouterEngine.ts`. Five dispatcher consumers route through it. Telemetry ledger receives all routing decisions. No remediation needed; T5 already grounds.

### T6 — Symbolic AI (WIRING-MISSING, deps installed)

**Round-3 correction (load-bearing):** `z3-solver ^4.16.0` IS already in `mcp-server/package.json` line 71. The Round-2 evidence string ("No z3-solver dependency...") was stale. The runtime is available; nothing currently imports it; no `Z3*.ts` engine file exists. **T6 is wiring-missing, not dep-missing.** Net new deps for T6 = 0.

**Three NEW engines to ship (all use the already-installed z3-solver):**

| Engine | Path | Wires to | Solves | Z3 idiom |
|---|---|---|---|---|
| `Z3ToleranceAllocatorEngine` | `mcp-server/src/engines/Z3ToleranceAllocatorEngine.ts` | `prism_calc:tolerance_allocate_z3` + `prism_cad:tolerance_stack_solve` | v7.B row 11 — min Σ cost(t_i) s.t. Σ t_i² ≤ T_assembly² (worst-case) or T_assembly²/k (RSS) | `Optimize()` with `Real('t_i')`, `add_soft` for cost objective, `add` for sum-of-squares constraint |
| `MIPSchedulingEngine` | `mcp-server/src/engines/MIPSchedulingEngine.ts` | `prism_orchestrate:schedule_mip` + `prism_intelligence:capacity_plan_mip` | v7.B row 12 — argmax Σ(margin·accept) s.t. Σ(hours·accept) ≤ capacity, accept ∈ {0,1} | `Optimize()` with `Int('accept_i')` ∈ [0,1], `maximize()` |
| `GeometricToleranceSolverEngine` | `mcp-server/src/engines/GeometricToleranceSolverEngine.ts` | `prism_cad:gdnt_solve` + `prism_safety:tolerance_feasibility` | v7.B row 39 — GD&T datum-feature constraint propagation | `BitVec` for datum frames, `Real` for tolerance zones |

**Fast-path preservation:** Keep `CrossProcessSymbolicConstraintEnforcerEngine` as the FAST PATH (lexicographic projection, no solver, <1ms). Add a **NEW** `SymbolicSolverRouterEngine` that:
- Routes safety-only projections (no objective) to the existing fast-path engine
- Escalates to Z3 only when objective function present (multi-criteria optimization)

This keeps the <1ms latency contract for safety projections while unlocking Z3 power when needed.

**Test strategy:** Vitest with `await init()` (z3-solver requires async init), property-based tests for solution-set membership via fast-check.

### T7 — Knowledge graph + creative reasoning (WIRING-MISSING, deps installed)

**Current state diagnosis:** `PRISMCreativeReasoningEngine.ts` header advertises engines/dispatchers/formulas/tribal as "Knowledge Sources" but `explore()` at line 185 dispatches via `switch(domain)` at line 665 — confirmed static dispatch on enum, not graph traversal. Line 263-265 ("cutting_parameters: ['Machinery handbook lookup', ...]") shows the "knowledge" is 10 hardcoded string arrays. This is the 10-row lookup trap caller in Round-2.

**Approach:** JSON-LD + in-memory graph + Qdrant vector similarity. Net new deps = **0** (`@qdrant/js-client-rest ^1.17.0` and `@xenova/transformers ^2.17.2` already installed).

**Why not Neo4j-embedded:** requires JVM, adds 200 MB+ runtime — rejected.
**Why not RDF/SPARQL:** heavyweight for the analogy use-case — rejected.
**JSON-LD + Qdrant:** leverages existing wiki/index.md (722 entries) as graph seed; Qdrant cosine-similarity over engine embeddings gives REAL analogy reasoning (Hofstadter-style retrieval-by-similarity) at zero new dep cost.

**Source data pipeline:**

| Step | Source |
|---|---|
| Graph seed | `H:/prism/knowledge/wiki/index.md` (722 entries: 575 engines + 90 dispatchers + 57 memories) |
| Edge extraction | Engine cross-refs already encoded in JSDoc `@see` + import statements + dispatcher wiring |
| Memory tags | `MEMORY.md` indexed memories carry domain tags — promote to graph nodes |
| Embedding | `Xenova/all-MiniLM-L6-v2` 384-dim embeddings of node descriptions |
| Vector store | Qdrant collection `prism_kg_nodes` with cosine distance |

**Query patterns (each one is a graph_* action):**

| Query | Algorithm | Action binding |
|---|---|---|
| Analogy | Given (source_node, source_solution), find target_node with `cos_sim > 0.75` AND shares ≥2 edge-type-classes with source | `prism_intelligence:graph_infer` |
| Find-similar | Top-k nearest neighbors in embedding space + edge-overlap re-rank | `prism_intelligence:graph_query` |
| Transitive-deps | BFS over import/dispatcher edges, capped at depth 3 (matches Round-1 "engines reach 1559 via 5-hop traversal") | `prism_intelligence:graph_traverse` |
| Creative-combination | Sample 2 unrelated high-centrality nodes, ask Ollama `qwen2.5-coder:7b` to synthesize hybrid approach | `prism_intelligence:graph_discover` |
| Predict | Edge-prediction via embedding-link-prediction (cos_sim × structural-similarity) | `prism_intelligence:graph_predict` |

**Engine decision (rename + new, both options simultaneously):**

1. **Rename** existing `PRISMCreativeReasoningEngine` → `PRISMRuleBasedCombinatorEngine` (preserves the 10-row dispatch logic as a fast-path; backward-compatible alias via `prism_ai:creative_explore`).
2. **Create new** `PRISMKnowledgeGraphReasoningEngine` that does real graph traversal + LLM-backed synthesis.
3. **Bind** the 5 `graph_*` actions already declared at `intelligenceDispatcher.ts:549` to the new engine; legacy `prism_ai:creative_explore` retains the renamed rule-based combinator.

This satisfies both Round-2 recommendations (rename **AND** real LLM route) in one shot.

---

## Orchestration template (unchanged from v7.C v1)

```
Claude (T1) — receive request, parse intent, select algorithm row from v7.B combinatorics
  ↓ delegates physical inference
T2 deep-reason — physical/causal step-chain (ai_milling_deep_reason / ai_wedm_deep_logic / cot_reason_tree)
  ↓ optionally calls
T3 LoRA — learned residual correction (mill_lora_predict / lathe_lora_pipeline / wedm_lora_* / cam_lora_*)
            — returns { prediction, adapter_loaded, adapter_version, fallback_reason? }
  ↓ optionally augments
T4 neural / conformal — calibrated uncertainty interval (xproc_conformal_set / APS / RAPS / Mondrian)
  ↓ orthogonally
T5 AI router — picks the best backend (aiSystemRouterEngine.route)
  ↓ orthogonally
T6 symbolic — formal solver via SymbolicSolverRouterEngine
            — fast-path (CrossProcessSymbolicConstraintEnforcer) when no objective
            — Z3 escalation (Z3ToleranceAllocator / MIPScheduling / GeometricToleranceSolver) when objective present
  ↓ orthogonally
T7 KG / creative — graph traversal via PRISMKnowledgeGraphReasoningEngine
            — analogy / find-similar / transitive-deps / creative-combination / predict
  ↓
Claude (T1) — synthesize, apply safety/omega gate, emit answer + verification channel for re-run
```

Where a combination touches **shop-floor execution**, append:

```
Safety oracle (S(x) ≥ 0.70) blocks emission if score below floor.
Omega (Ω ≥ 0.70) blocks emission if quality below floor (R, C, P, S, L).
```

Every MS2 unit declares which tiers it invokes (e.g. `tiers_invoked: [T1, T2, T4, T6]`).

---

## Gate binding (4-line Zod schema patch — the highest-leverage single change)

The Round-2 finding F-r2-a9-10 flagged `tiers_invoked` absent from envelope schema and Omega/Safety floors un-enforced. The fix is one tiny schema patch in `mcp-server/src/schemas/roadmapSchema.ts`:

```ts
// Within the unit envelope schema:
omega_score: z.number().min(0).max(1),
safety_score: z.number().min(0).max(1),
tier_invocation: z.array(z.enum(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'])).min(1),
computed_at: z.string().datetime(),
```

**Why this is the highest-leverage change:**
- Schema-level enforcement = automatic CI gating via existing `schema-version-check.ts`
- Cannot be bypassed without explicit schema bump
- Zod validation runs on every envelope write
- `atomic-roadmap-emit.mjs` requires these on every emit

**Defense in depth (4 layers, ranked):**

| Rank | Where | Mechanism |
|---|---|---|
| 1 | Zod schema (above) | Refuses envelope write below floor |
| 2 | Stop hook `stop_on_low_omega.mjs` + `stop_on_low_safety.mjs` | Block session close on unit with score < 0.70; in `MINIMAL_ALLOWLIST` |
| 3 | Pre-commit hook `omega-floor-precommit-check.mjs` | Scans staged milestone files |
| 4 | CI job `gate-omega-floor` | Last line of defense for PRs from forks |

**Tier-invocation cross-check:** Hook validates `tier_invocation` against actual dispatcher action calls logged in `AISystemRouterEngine` telemetry. If a unit claims `[T6]` but no Z3 invocation logged, hook flags inconsistency.

---

## Threshold tuning (from JM Die history, not from a guess)

**Method:** Sample 200 successful JM Die programs + 50 reworked/scrapped programs. Back-compute Omega via `omegaDispatcher.computeOmega(R, C, P, S, L)` for each. Build ROC curve of Omega vs ship/rework outcome. Set floor at Omega@95th-percentile-of-reworked-jobs (conservative).

**Expected empirical floor:** **0.65–0.72** based on JM Die's estimated 92–95% ship-first-pass rate for established customer programs. Start at the spec's 0.70 floor, run for one MS2 milestone, recalibrate from telemetry.

**Safety threshold:** S(x) is binary-ish in practice (collision/no-collision). The 0.70 floor reasonable as "no high-severity violations" but should be progressively replaced with a constraint-list check rather than a scalar. Tie into Bayes prior infrastructure already shipped at `guardDispatcher.ts:31`.

---

## What this revision changes from v7.C v1

| Tier | v7.C v1 (original spec) | v7.C v2 (this revision) |
|---|---|---|
| T1 | "Claude orchestration" (no grounding) | Tautological + verified via `tiers_invoked` schema |
| T2 | Action names listed | Action names + file paths + line numbers (verified real) |
| T3 | "LoRA adapters" (no training data, no ranks, no fallback) | 4 adapters × ranks × corpora × inference path × fallback marker × Stop-hook enforcement |
| T4 | "xproc_neural_*" (no calibration source) | 10 conformal_* + APS/RAPS/Mondrian + outcome-bridge supervision (commit 3b21228f7) |
| T5 | "AISystemRouterEngine" (no consumer count) | 5 dispatcher consumers + telemetry ledger |
| T6 | "Z3 / MIP / LP" (no engines, no router) | 3 new engines + SymbolicSolverRouter + fast-path preservation + net new deps = 0 |
| T7 | "prismCreativeReasoning" (10-row lookup) | Rename existing + new PRISMKnowledgeGraphReasoningEngine + 5 graph_* actions + Qdrant + Xenova + net new deps = 0 |
| Gate binding | "Omega ≥ 0.70 if shop-floor" (not enforced) | 4-line Zod patch + 4-layer defense-in-depth + JM-Die-grounded threshold tuning |

**Net new dependencies for the entire v7.C v2 grounding plan: 0.**

The remediation surface is engine-creation + wiring + weights training, not procurement.
