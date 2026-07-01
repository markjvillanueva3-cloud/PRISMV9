# DEEP-REASONING-BRIDGE — cross-domain unification spec (charlie /goal-19, 2026-05-25)

**Author:** slot charlie (`claude-2d29d422`), session continuing U-QT10 (5/25 02:22 CST).
**Status:** architecture spec + **pivot to R3-pick-5 CoV-first build** this iter; full Router/Dispatcher/Integrator stack queued.
**Closes:** U-QT11 follow-up named in `[[reference_quoting_calibration_u_qt10_2026_05_25]]` — generalized cross-domain per operator directive *"synergize with the whole ecosystem not just quoting portion of the app"*.

## ★ R3/R4 reconciliation (Karpathy R8 read-before-write + R7 surface-don't-blend)

Pre-build search surfaced papa slot's 2026-05-25 deliverables:
- `[[reference_psn_training_substrate_2026_05_25]]` — data-side substrate + `scripts/build-psn-training-corpus.mjs` (9-leg JSONL extraction)
- `[[reference_psn_r4_deep_stack_2026_05_25]]` — R4 net-new systems including **R4 pick #6 PRISMVerifiedReasoningEngine (CoV+RAG+PoT composite)** and **R3 pick #5 CoV inside `wedm_safety_gate_evaluate`** (1-day, charlie home)

**Conflict surfaced:** the Router architecture below (cross-domain envelope synthesizer) partly overlaps R4 pick #6's planned `PRISMVerifiedReasoningEngine`. Building the Router from scratch when papa's R4 spec already designs the composite would be reinvention per `[[feedback_high_roi_backend_first_slot_queue]]`.

**Pivot adopted (R7 — pick the more-vetted one, name the alternative):**
1. **This iter ships `ChainOfVerificationEngine`** — the generic CoV substrate primitive (R3 pick #5 substrate-side), wired to `WEDMProgramSafetyGateEngine` first (charlie home), reusable across all safety gates (mill / lathe / cad / cam / quoting).
2. **The Router architecture below remains the canonical long-term design** but defers to R4 pick #6 (`PRISMVerifiedReasoningEngine`) for the composite-engine layer when papa's R4 ranks it for execution.
3. **Why CoV-first synergizes "with the whole ecosystem"**: CoV is a verification primitive at the substrate layer. It plugs into ANY safety/accuracy gate that needs claim-verification (WEDM safety, mill chatter prediction, lathe Cpk, quoting calibration, CAD regen). The cross-ecosystem fan-out is automatic once the primitive ships.
4. **PSN leg surfaces hit this iter**: #1 Obsidian (memory pointer) + #3 Wiki (entry) + #6 System Viz (ghost.cov_verification on next regen) + #7 Engines (CoV engine + WEDM wrapper) + slot-soul charlie behavior #2 (CoV becomes a step inside `wedm_safety_gate_evaluate`). Remaining 6 legs hit as cross-domain wiring lands.

## Problem

Six **domain-specific** deep-reasoning engines already exist:

| Engine | LOC | Domain |
|---|---|---|
| `WireEDMDeepReasoningEngine` | 33.6K | wire EDM (charlie home) |
| `LatheDeepReasoningEngine` | 54.6K | turning |
| `LatheMasterPostDeepReasoningEngine` | 38.5K | lathe post |
| `MillingDeepReasoningEngine` | 26.3K | mill |
| `PostProcessorDeepReasoningEngine` | 31.7K | post-processor |
| `PostProcessorUnifiedDeepReasoningEngine` | 41.5K | post unified |
| `QuotingDeepReasoningBridgeEngine` | 11.2K | quoting (envelope-builder only — does not dispatch) |

Each engine has its OWN reasoning-mode taxonomy, its OWN substrate routing assumptions, and its OWN output shape. There is no **router** that lets a question routed at the AI layer pick the right domain engine + the right AI substrate + close the learning loop back to PSN. The U-QT10 calibration memo explicitly named this gap as `U-QT11`: *"invoke the 5 deep-reasoning prompts through the AI router (currently we BUILD them but don't dispatch them)."* The operator generalized the scope: this bridge serves all domains, not quoting.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Domain Report (any)                                                 │
│    quoting:   AccuracyReport (from QuotingTrainingLoopEngine)        │
│    wedm:      WireEDMOutcomeReport (wire-break/recast/MAPE)          │
│    mill:      MillCAMAccuracyReport                                  │
│    lathe:     LatheOutcomeReport                                     │
│    cad:       CADRegenAccuracyReport                                 │
│    safety:    SafetyInvestigationReport (Ω drops)                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DeepReasoningRouterEngine                            [THIS ITER]    │
│    - normalizes any domain report → DeepReasoningEnvelope[]          │
│    - question_class × ai_substrate routing table (domain-aware)      │
│    - citation injection via OutsideKnowledgeSourceCatalogEngine      │
│    - registerDomainAdapter(domain, adapter) for extensibility        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DeepReasoningDispatcherEngine                        [NEXT ITER]    │
│    - 4 substrate adapters:                                           │
│        prism-creative-reasoning  → prismCreativeReasoningEngine      │
│        psn-nn-gnn                → PSNAutonomyLoop / GraphSAGE       │
│        claude-deep-reasoning     → Anthropic API (R12: deferred)     │
│        tribal-rag                → CAMTribalRAGEngine / TribalRAG    │
│    - timeout discipline, hallucinated-citation validation            │
│    - returns DeepReasoningResult { answer, confidence, citations,    │
│              traceback, substrate_used, latency_ms }                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DeepReasoningOutcomeIntegratorEngine                 [NEXT ITER]    │
│    Fan-out to 6 PSN legs:                                            │
│      #1 Obsidian Brain      → memory note per result (durable)       │
│      #3 Wiki                → reasoning-chain entry (durable)        │
│      #4 Memories            → cross-link to source domain report     │
│      #5 Tribal              → tribal tip candidate (gated)           │
│      #6 System Viz          → ghost.deep_reasoning roost node        │
│     #10 NN/GNN              → psnAutonomyLoopEngine.scoreEvent({     │
│                                  type:'psi_delta', delta: f(result)  │
│                                })                                    │
│      #7 Engines (loop close) → calibration factor refinement /       │
│                                tribal-tip injection / rate adjust    │
└─────────────────────────────────────────────────────────────────────┘
```

## Why a router (not a sixth domain engine)

The 6 domain reasoners do **causal/abductive/analogical/temporal reasoning over domain primitives** (e.g., `WireEDMDeepReasoningEngine` reasons over Kunieda MRR cascades, recast μm, wire-break causal chains). They are physics-first.

The router is a **layer above** — it takes domain accuracy/outcome reports and asks the AI layer: *"explain this bias / find this pattern / suggest this adjustment / investigate this outlier / transfer this learning."* Different question shape. Same routing primitive across all domains. Composes (not duplicates) the existing reasoners.

## Domain adapter interface

```ts
export interface DeepReasoningDomainAdapter<TReport> {
  domain: ReasoningDomain;  // "quoting" | "wedm" | "mill" | "lathe" | "cad" | "safety"
  reportName: string;
  /** Extract the standardized fact set the router needs. */
  extractFacts(report: TReport): DomainFacts;
  /** Domain-specific question classes (extends the base 5 with domain ones). */
  questionClasses(): DeepReasoningQuestionClass[];
  /** Domain-specific citation tokens (steered to relevant sources). */
  citationTokens(questionClass: DeepReasoningQuestionClass): string[];
}
```

Adapters for `quoting` (wraps existing `QuotingDeepReasoningBridgeEngine`) ship in this iter. Adapters for `wedm`, `mill`, `lathe`, `cad`, `safety` queued — each wraps the existing domain reasoner's outcome shape.

## DeepReasoningEnvelope schema (unified)

```ts
export interface DeepReasoningEnvelope {
  envelope_id: string;                            // stable hash for dedup
  domain: ReasoningDomain;
  question_class: DeepReasoningQuestionClass;
  ai_substrate: AISubstrate;
  prompt_text: string;
  context_facts: string[];                        // structured "key=value"
  citations: string;                              // OutsideKnowledgeSourceCatalog rendering
  citation_source_ids: string[];                  // for hallucination validation
  expected_output_shape: string;
  reason_for_substrate: string;
  domain_facts: DomainFacts;                      // raw structured input
  built_at: string;                               // ISO
  built_by: string;                               // engine id
}
```

Backward-compat with existing `DeepReasoningPrompt` from `QuotingDeepReasoningBridgeEngine` — the quoting adapter wraps each `build*` method's output into `DeepReasoningEnvelope` by attaching `domain="quoting"` + `envelope_id` + `citation_source_ids` (extracted from the rendered citations string).

## Question classes (base 5 + extensible)

Base 5 (universal):
- `explain-bias` — why is X systematically off?
- `find-pattern` — what features correlate with high error?
- `suggest-rate-adjust` — what default would minimize MAPE/error?
- `cross-customer-rec` — can A's learning transfer to B?
- `outlier-investigate` — top-K worst — probable causes?

Domain extensions (declared per adapter):
- wedm: `wire-break-root-cause`, `recast-bound-investigate`, `flush-adequacy-explain`
- mill: `chatter-source-investigate`, `tool-life-deviation-explain`
- safety: `omega-drop-investigate`, `s-of-x-margin-explain`

## Cross-ecosystem integration points (the user directive)

| PSN Leg | Integration | When fires |
|---|---|---|
| #1 Obsidian Brain | Auto-feed result as `reference_dr_<domain>_<question>_<date>.md` | Every successful dispatch |
| #2 PRISM OS | `prism_quoting:deep_reasoning_*` + `prism_edm:deep_reasoning_*` (this iter) + mill/lathe (next) | Dispatcher reg |
| #3 Wiki | Reasoning-chain entry at `knowledge/wiki/architecture/deep-reasoning-chains/` | Confidence ≥ 0.75 |
| #4 Memories | Cross-link `[[<source-report-memo>]]` ↔ `[[<reasoning-result-memo>]]` | Always |
| #5 Tribal | New tip candidate routed through TribalKnowledgeEngine gate | When `tribal-rag` substrate produces a confident shop-tip |
| #6 System Viz | `ghost.deep_reasoning` roost — one node per envelope + child node per result | On regen |
| #7 Engines | Calibration delta → `QuotingCalibrationEngine` (or `MillCalibration`, `WEDMCalibration`) | When substrate suggests rate adjust / parameter shift |
| #8 Algorithms | Domain reasoner's internal algorithm gets the result as feedback | Domain-specific |
| #9 Formulas | If the result challenges a formula assumption, route to `formula-accuracy.mjs` | Manual review (R12) |
| #10 NN/GNN | `psnAutonomyLoopEngine.scoreEvent({type:'psi_delta', delta: confidence-0.5})` | Always — closes the learning loop |
| #11 PRISM AI | The dispatcher IS the PRISM AI surface for this question class — its decisions train the AI router | Always |

## Test plan (per build-enforce floor)

For each of 3 engines:
- ≥3 failure modes: empty report, malformed substrate response, citation hallucination (id not in catalog)
- ≥2 adversarial: NaN in facts, oversized context (>10K facts), unicode in customer names
- Variability: 3 domain adapters minimum (quoting + wedm + mill)
- Round-trip E2E: dispatcher invoke → result → integrator → PSN leg side-effect verified

## Files this iter (THIS COMMIT)

- `mcp-server/src/engines/DeepReasoningRouterEngine.ts` (NEW)
- `mcp-server/src/__tests__/DeepReasoningRouterEngine.test.ts` (NEW)
- `state/shared/specs/DEEP-REASONING-BRIDGE-2026-05-25.md` (this spec)
- `C:/Users/wompu/.claude/projects/H--prism/memory/reference_deep_reasoning_bridge_2026_05_25.md` (memory pointer)
- `knowledge/wiki/architecture/deep-reasoning-bridge.md` (wiki entry)

## Files queued (NEXT /loop ticks)

- `mcp-server/src/engines/DeepReasoningDispatcherEngine.ts` + test
- `mcp-server/src/engines/DeepReasoningOutcomeIntegratorEngine.ts` + test
- Wiring: `quotingDispatcher.ts`, `edmDispatcher.ts` (charlie home), `millDispatcher.ts`, `turningDispatcher.ts` — 3 actions each
- Schemas: extend each dispatcher's `Schemas.ts`
- E2E: `mcp-server/src/__tests__/DeepReasoningBridge.e2e.test.ts`
- Runner: `scripts/run-deep-reasoning-cycle.mjs` (operator entry)
- WireEDM domain adapter (charlie's home domain — first non-quoting)

## R12 fail-loud declarations

- **Claude-deep-reasoning substrate**: deferred until Anthropic API adapter wired — dispatcher returns `{substrate_unavailable: true, reason: 'anthropic-api-adapter-pending'}` (NOT a fake answer).
- **Ollama-fast-classify substrate**: deferred when Ollama health check reports `/api/chat` down (top-of-session banner shows it currently is).
- **Citation hallucination guard**: every cited `[N]` reference must resolve to an `id` in `OutsideKnowledgeSourceCatalogEngine`. Unresolved citations FAIL the result (returned with `validation_failed: true`), they do not get silently passed through.
- **psi_delta wire to NN/GNN**: today the AUROC is ungraded (system reminder on this session). The integrator still calls `scoreEvent({type:'psi_delta'})` because the autonomy loop accumulates the signal regardless; downstream NN/GNN promotion remains gated on its existing 0.78 AUROC threshold.

## Attribution forward-fix

U-QT10 was absorbed into peer commit `060e0189a1` (foxtrot iter57) per `[[feedback_commit_to_slot_worktree]]`. This iter ships on `slot/charlie` branch via the slot worktree (per `[[reference_slot_worktree_activation_2026_05_16]]`) to retain attribution. If the slot worktree is not yet activated for this chat, commit to a sibling worktree (`H:/prism-DR-BRIDGE`) per `[[feedback_conflict_fork_rule]]` before retry.

## Cross-references

- [[reference_quoting_calibration_u_qt10_2026_05_25]] — U-QT10 calibration loop (the loop-closer this generalizes)
- [[reference_quoting_pipeline_ms0_shipped_2026_05_24]] — QUOTING-PIPELINE-MS0 (the wiring foundation)
- [[feedback_psn_definition]] — 11-leg PSN taxonomy (the integration surface)
- [[deep-reasoning-doctrine]] — Opus vs Sonnet vs Haiku vs Ollama routing (the AI-side complement)
