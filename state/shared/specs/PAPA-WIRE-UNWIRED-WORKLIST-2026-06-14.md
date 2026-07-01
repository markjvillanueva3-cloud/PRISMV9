# PAPA WIRE-UNWIRED + H-DRIVE-VAULT — autonomous loop worklist (2026-06-14)

> Operator directive: "run harnessed loops and crons using hermes. utilize obsidian vault and ollama strategically. run loops until all papa tasks are complete."
> ALL-MEANS-ALL enumerated population (slot:papa, this session): papa slot queue **0** · unwired engines **25** (18 CLEAN / 7 DEFERRED) · H-DRIVE-VAULT backlog **5** (U-3/U-4/U-6/U-7/U-8) + deferred agent-scrutiny on U-1/U-2/U-5.
> Triage by a Hermes Explore agent (sonnet) reading each engine's actual API. Loop: pick → wire (add dispatcher actions + schemas + round-trip test) → tsc-clean check (no NEW errors attributable to my symbols) → vitest → per-file 2-reviewer scrutiny → commit `[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-<NAME>` → loop-state tick → repeat.

## CLEAN wireable engines (18) — grouped by target dispatcher (group-serial to avoid same-file conflict)

### prism_dev (papa home; ACTIONS array + z.enum + switch + devActionSchemas)
- [x] ERPImportEngine — DONE iter1 (be8b48e265): 6 actions, 13 tests, 3-of-3 PASS
- [ ] PactContractTestEngine — verify(contract,interaction,actual) + checkCompat(old,new) (pure JSON) [complex 7-matcher schema; LAST]

### prism_safety (Set + passthrough + safetyActionSchemas; READ-ONLY actions, mutations operator-gated)
- [x] WetRunStateMachineEngine — DONE iter2 (a7df22c9ca): 8 actions, FSM escalation
- [x] WetRunChangeFreezeEngine — DONE iter3 (d9bdfb0079): 8 actions, window/override/40-char-reason
- [x] WetRunRetentionPolicyEngine — DONE iter4 (0575ee5964): 9 actions, 17 tests, retention/legal-hold

### prism_ai (= aiReasoningDispatcher.ts, NOT the unwired aiDispatcher stub; ALL_AI_ACTIONS/ALL_AI_SCHEMAS spread + lazy switch; .data-nested response)
- [x] TransferLearningAdapterEngine — DONE iter5 (52eb8d3dfc): 10 actions (XFER_LEARN), 16 tests, dual-PASS
- [x] AttractorDetectionEngine — DONE iter6 (c9a5f270bc): 13 actions (ATTR_DETECT), 20 tests; detectBifurcations excluded (closure)
- [x] TPEHyperparameterSearchEngine — DONE iter7 (ed1cb3d066): 9 actions (TPE_SEARCH), 18 tests; tpe_clear surfaced (budget-exhaust reset)

### prism_cam
- [~] CounterfactualMillEngine — RECLASSIFIED CLEAN -> DEFERRED iter9 (2026-06-15): engine INLINES 12 DIVERGENT (wrong) Kienzle mc + Taylor C/n constants vs CANONICAL_KIENZLE/CANONICAL_TAYLOR (physics-correctness bug, NOT just no-inline violation). Refused to wire atop unsound foundation (R13) + refused unauthorized mill-domain physics edit (papa soul). Fix unit U-FIX-CFMILL-CANONICAL-CONSTANTS (import canonical + physics-review + downstream-impact check) -> route foxtrot/kilo. See [[reference_counterfactual_mill_divergent_constants_2026_06_15]].
- [x] SubprogramExtractionEngine — DONE iter8 (877dabec9e): 3 actions (subprogram_*), 14-test shared suite, dual-PASS
- [x] SyncCodeVerificationEngine — DONE iter8 (877dabec9e): 3 actions (synccode_*), shared suite, dual-PASS

### prism_turning
- [x] SwissTypeDecisionEngine — DONE iter10 (ccc1fed2d8): swiss_decide + swiss_decide_batch, dual-PASS
- [x] TurretLayoutEngine — DONE iter10 (ccc1fed2d8): 6 turret_* via executeAction, dual-PASS

### prism_cad
- [x] CreoAddinRibbonEngine — DONE iter11 (681e036b37): 6 creo_ribbon_* actions, 11 tests, dual-PASS (0 P0/P1/P2)
- [ ] CATIAAddinPluginEngine — getSpec/allCommands/resolve/dispatchEvent/getTip [NEXT; cadDispatcher recipe proven iter11: MERGED_CAD_SCHEMAS@584, ACTIONS@106, cases before default@5676, top-level slimResponse wrap]

### prism_calc
- [ ] MeasureSummaryEngine — addMeasurement/generateSummary (static, scalars)

### prism_intelligence
- [ ] MITCourseIntegrationEngine — listCourses/searchCourses/getCourse/getAlgorithmsFromCourse/applyToManufacturing
- [ ] MITCourseExpansionEngine — expandCourses/getFormulas

## DEFERRED (7) — cannot cross a JSON dispatcher boundary; need a different surface
- PlaywrightAutomationEngine (ExtractedAction[] closures) → prism_automation, focused unit
- EmbeddingGuardEngine (injected GuardEmbedder) — needs a live-embedder factory shim
- SemanticAssetIndexEngine (injected Qdrant+embedder) — singleton-wrap or factory
- AcquisitionRecommendationEngine (module-singleton deps) — singleton-wrap
- CreoToolkitBridgeEngine / CATIACAAV5BridgeEngine (live IPC transports) — transport factory
- CreoIntegrationTestSuiteEngine (ScenarioDriver closure) — test-harness surface, not a dispatcher

## Doctrine for this loop
- Group-serial: wire ALL engines for one dispatcher, build-check, commit, then next dispatcher (one dispatcher file edited at a time — no conflict).
- prism_cam/turning/calc engines that compute physics: route formula correctness to a physics-review agent; NEVER inline Kienzle/Taylor/material constants (import from src/physics/constants.ts).
- Each wire: happy + ≥3 failure + round-trip-through-dispatcher test (R15); clear singleton in beforeEach.
- tsc honesty: `npx tsc --noEmit` then grep for MY new symbols — 0 NEW errors attributable to my wires (peer in-flight errors are not mine; R12).
- Ollama: route engine-API summarization / classification to local Ollama where useful; Claude for the wiring judgment.
- Continuation: loop-state ticks per wire; CronCreate re-fires the loop if idle; handoff carries the worklist across compaction.

Memory: [[reference_papa_wire_unwired_loki_tenant_sbom_2026_06_13]] · [[reference_papa_hdrive_vault_synergy_2026_06_14]].
