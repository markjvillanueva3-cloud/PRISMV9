# FORGE AUDIT REPORT — 2026-04-17

**Scope:** Full codebase (engines + dispatchers + algorithms + hooks + safety + tests + roadmaps)
**Files scanned:** 2,145 engines · 87 dispatchers · 53 algorithms · 170 hook files · 69 state files
**Mode:** READ-ONLY (no auto-fixes)
**Agents:** 4 parallel subagents (engines, dispatchers+algorithms+hooks, safety+tests, roadmaps)

---

## HEADLINE NUMBERS

| Subsystem | CRITICAL | MAJOR | MINOR | Score* |
|---|---|---|---|---|
| Engines (2,145) | 9 classes (~680 files tainted) | 9 classes (1,641 untested + stubs) | large | **~10/100** |
| Dispatchers (87) | 5 classes (86 files) | 4 classes (74 files) | moderate | **~15/100** |
| Algorithms (53) | 2 classes (48 files) | 3 classes | 2 classes | **~60/100** |
| Hooks (170) | 3 classes (17 files) | 3 classes (60+ files) | moderate | **~45/100** |
| Safety subset (68) | 7 engines fully violating | 22 grouped | — | **~5/100** |

*Score = 100 − (CRITICAL·10 + MAJOR·3 + MINOR·1), capped at 0.

**Overall quality: severe — fleet-wide physics drift + 76% test-coverage gap + unvalidated dispatcher surface.**

---

## CRITICAL FINDINGS (deploy-blockers)

### 1. Physics value drift across ~23 engines
Canonical `src/physics/constants.ts` defines `kc1.1 P-group = 1800 N/mm²`. Engines inline competing values (1780, 1800, **2100** in 9 engines). Result: two engines on the same pipeline, same material, return different force predictions. **Directly invalidates Kienzle math.**
- Worst offenders: `ConstraintSatisfactionEngine:81`, `DOETaguchEngine:78`, `MonteCarloProcessEngine:124`, `MultiObjectiveParetoEngine:73`, `ProcessDigitalTwinEngine:88`, `StochasticRoutingEngine:29`, `StochasticToolLifeEngine:132`, `RunoutEffectEngine:61`, `ToolpathSegmentOptimizerEngine:81`.
- Fix: consolidate to `import { MATERIALS } from "../physics/constants.js"` fleet-wide; add lint rule banning literal `kc1_1:` / `taylor_C:` / `E_GPa:` outside constants.ts.

### 2. RCE surface in `NLHookEngine.ts:76,927,938`
Executes user-authored hook code via `new Function()` with regex-based identifier blocklist at `:921`. Bypassable via Unicode escapes (`\u0065val`). Fix: restricted AST interpreter, or forbid user code entirely.

### 3. 595 unguarded division sites across 37 physics engines
Confirmed in `KienzleForceModelEngine.ts:428, 495, 669, 705` — `depth / sin(kappa)` with no κ=0 check, `2π/flutes` with no flutes=0 check, `Σ/count` with no empty-filter check. Produces `Infinity`/`NaN` forces that propagate into safety decisions.

### 4. 40 engines begin with `@ts-nocheck`
Includes safety-critical orchestrators: `PredictionFeedbackOrchestratorEngine`, `AdaptiveCalibrationEngine`, `AnomalyDetectionEngine`, `PhysicsMLHybridEngine`, `CrossPhysicsCouplingEngine`, `BatchCAMSafetyEngines`. File-level type-checker bypass hides null/undefined bugs.

### 5. 658 `as any` + 287 `as unknown as T` casts
`QuoteToShipOrchestratorEngine.ts` alone has **97 `as any` casts** across a 5,450-LOC 26-stage safety-gated business pipeline. Type safety non-existent.

### 6. 43 non-atomic `writeFileSync` on safety state
`SystemVariabilityIndexEngine.ts:646,647,931,967` (the SVI coupling file CLAUDE.md depends on), `AnomalyDetectionEngine.ts:492`, `FeedbackPersistenceEngine.ts:257`, `QualityScoreEngine.ts:506,507`, etc. Crash mid-write corrupts irreplaceable state.

### 7. 250 bare `JSON.parse` calls across 143 files
Worst: `MemoryGraphEngine` (8), `DuplicationGuardEngine` (8), `SystemVariabilityIndexEngine` (7), `KnowledgeGraphEngine` (7), `SelfImprovementPatternEngine` (7). Malformed state file = process crash.

### 8. `aiReasoningDispatcher` wiring drift
- 5 enum entries with NO case handler → silent failure for `mill_harvest_tribal`, `mill_agi_analyze`, `mill_agi_quick`, `mill_agi_optimal`, `mill_agi_awareness`.
- 8 case statements with NO enum → dead code.
- `ppDispatcher`: symmetric 19+19 drift.

### 9. 41 of 87 dispatchers missing `default:` in switch
Silent `undefined` return to MCP clients when unknown action received.

### 10. Only 3/87 dispatchers use `validateActionParams` schema gate
`businessDispatcher`, `awarenessMiddleware`, `gsdDispatcher` only. 84 dispatchers pass `z.record(z.string(), z.any())` raw to engines — no field validation, no type coercion.

### 11. Zero dispatchers use `DistributedLockManager`
CLAUDE.md §46–51 mandates it for orchestration dispatchers. `grep "acquireLock|withLock|DistributedLockManager"` across `src/tools/dispatchers/**` returns zero. Multi-agent orchestration state is race-prone.

### 12. Safety analyzer `GCodeSafetyAnalyzerEngine.ts` has 67 `return null` paths
The engine whose job is detecting collision/envelope/rapid-limit violations silently returns null on edge cases. Missed conditions ship unsafe G-code.

### 13. `ThreadTurningEngine.ts:542` emits "not implemented" as G-code comment
Ships a literal placeholder to the machine. Similarly `EndToEndPipelineEngine.ts:552` emits `S0 M03` (zero-RPM spindle command — fault on prove-out).

### 14. `LatheOrchestrationEngine.ts` has 25 stub methods
Including `:610` (Kienzle/Taylor wiring stubbed), `:946` (program safety scan stubbed), `:950` (collision engine wiring stubbed), `:992` (FAI stubbed). Advertised as production orchestrator — functions as skeleton.

### 15. 14 `.mjs` hooks use `writeFileSync` without atomic pattern
`ai-session-sync`, `bash-result-cache`, `capability-reminder`, `doc-freshness-check`, `extraction-to-tribal`, `file-read-cache`, `grep-result-cache`, `inventory-refresh`, `json-read-summarizer`, `node-process-janitor`, `periodic-checkin`, `post-extract-sync`, `session-cost-summary`, `session-write-tracker`. Concurrent hook fires → torn writes.

### 16. `CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md` appears **corrupted**
File contains garbled JSON + HTTP header fragments per roadmap agent. Directive-freshness check cannot parse it. **Requires manual inspection.**

### 17. 20 of 69 state files missing `schemaVersion` field
Includes `BASELINE_INVENTORY.json`, `HEALTH_CHECK_REPORT.json`, `schema-baseline.json` — the very files other code treats as authoritative. Cannot be migrated via `src/migrations/`.

---

## MAJOR FINDINGS (grouped)

### Test coverage
- **1,684 of 2,145 engines (78.5%) have no companion test.**
- **59 of 68 safety-keyword-named engines (87%) have no test** — Collision (6), Thermal (11), Deflection (6), WEDM Safety (4), stochastic physics.

### Stubs / placeholders (36+ across 7 files)
- `LatheOrchestrationEngine.ts` — 25 stubs
- `CodingCopilotEngine.ts:399` — emits `// TODO: implement` in generated code (propagates debt by construction)
- `HyperMillMaterialPhysicsBridge.ts:127` — `iso_group: "P" // placeholder, not valid`
- `HyperMillThreadStandardEngine.ts:142` — thread DB empty
- `SolidEditingEngine.ts:180-190` — CSG boolean unimplemented
- `FixtureCadIngesterEngine.ts:223` — Inventor bridge stub

### Silent error swallowing (200+ occurrences)
- `MillTurnSwissPipelineEngine.ts:1412` — "Tool life estimation is advisory — never block assembly" (tool life IS safety-critical for breakage)
- `LectureNoteExtractionEngine.ts:247-249,287-289` — "Silently skip malformed resources"
- Pervasive `catch { /* non-fatal */ }` in orchestrators that swallows upstream failure context.

### God files (violate decomposition convention)
- Dispatchers: `calcDispatcher` 8,888 LOC, `camDispatcher` 7,877, `aiReasoningDispatcher` 5,606, `ppDispatcher` 4,382.
- Engines: `QuoteToShipOrchestrator` 5,450 LOC, `PostProcessorPipeline` 4,421, `MachiningKnowledgeBase` 3,667.

### ML reproducibility
- 548 `Math.random()` sites across 201 files, many inside "deterministic physics" engines.
- `ElectrodeDeepLearningEngine.ts` — NN weights initialized with `(Math.random()-0.5)*0.5` on every import → non-reproducible predictions.

### Hook drift risk
- `wedm-physics-constants-gate.mjs:73-82` hard-codes numeric values (`K1|k_ra|eta|alpha_mm2s = 7.0|4.0|69.0|24.2|2.9|3.1|112.3`). If `constants.ts` updates, hook detection list silently goes stale. **HIGH.**
- `ai-duplication-guard.mjs` / `always-build-guard.mjs` — re-implement TS engine semantics. **MEDIUM.**

### Roadmap confusion
- `ULTIMATE-PRISM-ROADMAP-v25.md` lives alongside authoritative `PRISM-UNIFIED-ROADMAP-v2.md`.
- 100 session plans in `plans-archive/claude-plans/` (generically named) + 114 roadmap docs (38 active at root, 72 archived).
- `ACTIVE_CLAIM.json` is empty `{}` — no cross-session claim coordination currently happening.

### Hooks without error boundary
- 21 of 43 TS hooks have zero `try/catch` at top level — sync throw kills the cadence runner.
- `EnforcementHooks.ts` has 5 `process.exit(1)` calls (OK for CLI, deadly if imported in-process).

### Algorithms missing constants import
- Only 5/53 algorithms import from `src/physics/constants.ts`.
- `KalmanFilter.ts:218` singular-matrix divisor unchecked.
- `SurfaceFinishPredictor.ts:213` R=0 unguarded in non-validated call paths.
- `SurfaceFinishPredictor.ts:239` — `const barrelR = 250` inline magic.

---

## WORST 5 FILES (by risk × density)

1. **`QuoteToShipOrchestratorEngine.ts`** — 5,450 LOC · 97 `as any` · non-atomic writes · 26-stage safety-gated pipeline with erased types. **Highest blast radius.**
2. **`NLHookEngine.ts`** — `new Function()` × 3 + regex-only blocklist (bypassable) + 8 `return null`. **RCE surface.**
3. **`GCodeSafetyAnalyzerEngine.ts`** — 1,997 LOC · 67 `return null` paths · zero companion tests · THE safety analyzer.
4. **`LatheOrchestrationEngine.ts`** — 25 stub methods on runtime paths (physics, collision, safety, FAI).
5. **`KienzleForceModelEngine.ts`** — inlines 10+ material rows instead of importing canonical constants · no companion test · no literature reference · no AtomicValue return type. Named the canonical Kienzle engine yet violates every rule.

---

## POSITIVE FINDINGS

- All 87 dispatchers follow lazy-import pattern.
- `gsdDispatcher`, `businessDispatcher`, `awarenessMiddleware` are reference-implementation-quality.
- No hardcoded credentials in source (env-gated `getAnthropicApiKey`, salted PBKDF2 in `AuthEngine`).
- Directives are mostly fresh (≤4d); governance model works.
- CPP-MS5 pipeline-integrity infrastructure (verifyChain, PIPELINE_INTEGRITY.json, PIPELINE_METRICS.json) is a clean reference for the engine↔hook parity anti-drift pattern.

---

## FULL SUBAGENT REPORTS

Preserved verbatim in session transcript under agent IDs. Summary above consolidates ~14,000 words of raw findings into the top ~50 CRITICAL/MAJOR signals.
