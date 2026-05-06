# CAM AI — architecture

The CAM AI subsystem is five static-method-singleton TypeScript engines
plus one upstream orchestrator. Each engine owns one concern; data
flows in identity-propagated chains so every shop-floor outcome can be
traced back to the originating reasoning step.

## The five engines

| Engine | File | Concern |
|--------|------|---------|
| `CAMReasoningChainEngine` | `mcp-server/src/engines/CAMReasoningChainEngine.ts` | Captures per-decision step chains, supports `whyDecision()` and `compareAlternatives()` queries |
| `CAMConfidenceCalibrationEngine` | `mcp-server/src/engines/CAMConfidenceCalibrationEngine.ts` | Per-task isotonic / histogram / Platt calibration of raw confidence into reliability-corrected scores |
| `CAMFeedbackLoopEngine` | `mcp-server/src/engines/CAMFeedbackLoopEngine.ts` | Records operator corrections and shop-floor outcomes; emits LoRA training pairs and Mann-Kendall accuracy drift |
| `CAMTransferLearningEngine` | `mcp-server/src/engines/CAMTransferLearningEngine.ts` | Cross-CAM domain similarity (Gaussian kernel + Hamming categorical), source-CAM ranking, transfer outcome tracking |
| `CAMModelServingEngine` | `mcp-server/src/engines/CAMModelServingEngine.ts` | Model registry, FSM (`pending → shadow → canary → active`), Hoeffding promotion gate, weighted/canary/shadow routing, batched ingest, rate limiting |

The upstream orchestrator is `CAMDeepLearningOrchestratorEngine`. The
reasoning-chain engine accepts an `OrchestratorAdapter` via
`setOrchestrator()` so production wires the real orchestrator and tests
inject a deterministic fake.

## Identity propagation

Every CAM AI decision carries a chain of stable identifiers; this is
what lets a shop-floor scrap event ten weeks later still be traced
back to the model that recommended the parameters.

```
chain.chainId
  → calibration.decisionId  (CAMConfidenceCalibrationEngine.recordOutcome)
    → feedback.decisionId   (CAMFeedbackLoopEngine.recordCorrection / recordOutcome)
      → model.metadata.derived_from_chain  (CAMModelServingEngine.registerModel)
```

This invariant is asserted in
`mcp-server/src/__tests__/cam-ai/end-to-end.test.ts`. Any new engine
that observes a CAM AI decision must propagate `chainId` (or accept
`decisionId` referencing one), or it cannot participate in the trace.

## Decision flow (one shop-floor recommendation)

```
operator request
  └→ CAMReasoningChainEngine.decide<V>(task, request, opts)
       │  builds chain via OrchestratorAdapter.decide()
       │  emits DecideAndChainResult<V> { chainId, value, confidence, ... }
       │
       ├→ CAMConfidenceCalibrationEngine.calibrateDecision(decideResult, opts)
       │    returns calibrated { confidence, method, decisionId }
       │
       ├→ CAMModelServingEngine.routeRequest({ cam_system, task, request_key })
       │    returns { model_id, mode } (active | canary | shadow)
       │
       └→ (later, asynchronously)
          ├→ CAMFeedbackLoopEngine.recordCorrectionFromDecision(decideResult, opts)
          │    when operator overrides the recommendation
          │
          └→ CAMFeedbackLoopEngine.recordOutcome({ decisionId, success, ... })
               when shop-floor outcome arrives
```

## State-reset hooks (canonical)

Every engine is a static-method-singleton holding in-memory state
(per-process). Tests reset state per `beforeEach`; operators rarely
need these, but production diagnostic flows do.

| Engine | Reset hook | Notes |
|--------|-----------|-------|
| `CAMReasoningChainEngine` | `clearChains()` | Also: `setOrchestrator(adapter)` / `resetOrchestrator()` for DI |
| `CAMConfidenceCalibrationEngine` | `clearOutcomes()` | Per-task buckets keyed by `AGIDecisionTask` |
| `CAMFeedbackLoopEngine` | `clearAll()` | FIFO ring buffers for corrections + outcomes |
| `CAMTransferLearningEngine` | `clearAll()` | Preserves the six default tier-1 CAM domain registry entries |
| `CAMModelServingEngine` | `clearAll()` | Wipes models + policies + metrics + batch queues + rate buckets |

vitest runs each test file in its own worker process by default
(`pool: 'forks'`) so static state is per-process — but within a
single test file, `beforeEach` MUST call all relevant reset hooks to
keep tests order-independent.

## Default tier-1 CAM domains

`CAMTransferLearningEngine` ships six default domain vectors. They
load lazily on first call and are preserved through `clearAll()`.

| Slug | Architecture | Post language | Notes |
|------|--------------|---------------|-------|
| `hypermill` | proprietary | proprietary | Tier-1 reference for European 5-axis |
| `mastercam` | proprietary | proprietary | Largest installed base |
| `fusion360` | cloud | javascript | Reference for adaptive clearing parameters |
| `inventor-hsm` | proprietary | javascript | Same kernel family as fusion360 |
| `solidcam` | proprietary | proprietary | iMachining reference |
| `nx` | proprietary | proprietary | Reference for high-end aerospace 5-axis |

`registerCAMDomain(features)` adds or overrides a domain.
`domainSimilarity(a, b)` computes a Gaussian kernel over numeric
features plus Hamming categorical agreement (α = 0.4 categorical
weight). `bestSourceCAM(target, observations)` ranks candidates.

## Why static-method singletons

Three reasons drove this choice over instance singletons:

1. **Trivial DI for tests.** `CAMReasoningChainEngine.setOrchestrator()`
   replaces a single field, no factory plumbing.
2. **Stable identity across imports.** A static class survives the
   ESM import-graph guarantees better than a `new Engine()` exported
   const, particularly under vitest's parallel forks.
3. **Per-process state matches deployment topology.** Each k8s pod is
   a single process; we do not share calibration state across pods —
   the model-serving layer handles cross-pod consensus via the
   metric-driven Hoeffding gate.

The `export const camFooEngine = CAMFooEngine;` aliases at the bottom
of each file exist purely so call sites can write
`camFooEngine.method()` instead of `CAMFooEngine.method()` if they
prefer; both reference the same static class.

## Public API (stable surface)

These signatures are what the documentation, dispatcher, and
end-to-end tests rely on. Changing them requires bumping the
dispatcher action contract and the docs validation test.

```ts
// CAMReasoningChainEngine
static async decide<V>(task: AGIDecisionTask, request: AGIRequest, opts?: DecideOptions): Promise<DecideAndChainResult<V>>
static buildFromDecision<V>(decision: AGIDecision<V>, opts?: BuildOptions): CAMReasoningChain
static getChain(chainId: string): CAMReasoningChain | null
static whyDecision(chainId: string, query: string): WhyDecisionResult
static compareAlternatives(chainId: string): AlternativesResult
static clearChains(): void
static setOrchestrator(adapter: OrchestratorAdapter): void
static resetOrchestrator(): void

// CAMConfidenceCalibrationEngine
static recordOutcome(args: { decisionId: string; task: AGIDecisionTask; rawConfidence: number; correct: boolean; ts?: number }): CalibrationOutcome
static calibrate(rawConfidence: number, opts?: CalibrationOptions): CalibrateResult
static calibrateDecision<V>(decision: AGIDecision<V>, opts?: CalibrationOptions): CalibrateResult
static metrics(opts?: { task?: AGIDecisionTask; binCount?: number }): CalibrationMetrics
static recommendMethod(task?: AGIDecisionTask): CalibrationMethod
static clearOutcomes(): void

// CAMFeedbackLoopEngine
static recordCorrection(input: RecordCorrectionInput): CorrectionRecord
static recordOutcome(input: RecordOutcomeInput): OutcomeRecord
static accuracyDrift(opts?: DriftOptions): AccuracyDriftReport
static correctionPatterns(opts?: PatternsOptions): CorrectionPatternsReport
static loraTrainingExport(opts?: LoRAExportOptions): LoRATrainingPair[]
static feedbackStats(): FeedbackStats
static clearAll(): void

// CAMTransferLearningEngine
static registerCAMDomain(features: CAMDomainFeatures): CAMDomainFeatures
static getDomain(slug: string): CAMDomainFeatures | undefined
static listSupportedCAMs(): string[]
static domainSimilarity(a: CAMDomainFeatures, b: CAMDomainFeatures): number
static recordObservation(obs: CAMSourceObservation): CAMSourceObservation
static transfer(req: CAMTransferRequest): CAMTransferResult
static bestSourceCAM(target: string, observations: CAMSourceObservation[]): { slug: string; score: number }[]
static recordTransferOutcome(outcome: CAMTransferOutcome): CAMTransferOutcome
static transferAccuracy(target: string): CAMTransferAccuracy
static clearAll(): void

// CAMModelServingEngine
static registerModel(spec: ModelSpec): Model
static deregisterModel(id: string): void
static listModels(filter?: { status?: ModelStatus; cam_system?: string; task?: string }): Model[]
static getModel(id: string): Model | null
static deployShadow(modelId: string): ConfirmationEnvelope
static promoteToCanary(modelId: string, weight: number): ConfirmationEnvelope
static promoteToActive(modelId: string): ConfirmationEnvelope
static demoteFromActive(modelId: string, reason: string): ConfirmationEnvelope
static rollbackCanary(modelId: string, reason: string): ConfirmationEnvelope
static retireModel(modelId: string): ConfirmationEnvelope
static setRoutingPolicy(camSystem: string, task: string, kind: RoutingPolicyKind, overrides?: Partial<RoutingPolicy>): RoutingPolicy
static routeRequest(req: RouteRequest): RouteDecision
static recordMetric(modelId: string, sample: Omit<MetricSample, "ts"> & { ts?: number }): void
static getModelHealth(modelId: string): ModelHealth
static listAllHealth(): ModelHealth[]
static clearAll(): void
```

A `ModelSpec` requires `{ id, name, version, backend, endpoint_url, cam_systems: string[], tasks: string[] }` plus optional weight / rate-limit / batching knobs (`weight`, `rate_capacity`, `rate_refill_per_sec`, `max_batch_size`, `max_batch_wait_ms`, `metadata`). A `RouteDecision` returns `{ primary_model_id, shadow_model_ids, fallback_model_ids, bucket, policy_kind, rationale }`. A `MetricSample` uses `{ latency_ms, success, error_class? }` — note `latency_ms`, not `duration_ms`.

The full `static` API surface is broader (batching, rate limiting,
confirmation listing, configuration knobs) — see each engine's source
file for the complete list.

## Determinism notes

- `routeRequest()` keys consistent-hash buckets on FNV-1a over
  `request_key`. Same key → same bucket on every call (asserted in
  `transfer-to-serving.test.ts`).
- `decide()` with all upstream sources disabled returns
  `confidence=0, escalateToHuman=true, value=null` — this is the
  deterministic test fixture. Tests that need a non-trivial chain
  must inject an orchestrator adapter.
- `loraTrainingExport()` weights corrections at `1.0` and confirmations
  at `0.5`.
- Mann-Kendall S statistic in `accuracyDrift()` returns `S=0` for the
  `no_trend` regime; the verdict ladder is
  `insufficient_data | degrading | improving | no_trend`.
