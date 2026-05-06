# CAM AI — LoRA training

The CAM AI LoRA training loop is fed by `CAMFeedbackLoopEngine`. Shop-
floor outcomes and operator corrections accumulate in a ring buffer;
`loraTrainingExport()` projects that buffer into a stream of
`LoRATrainingPair` records that downstream per-CAM adapter training
scripts (units U-CAM108..U-CAM111) consume.

## Inputs — what becomes a training pair

Two events feed the buffer:

### 1. Operator correction

The shop-floor operator overrides the AI's recommendation. The
override carries the same `decisionId` (and therefore the same
`chainId`) as the original recommendation, so the resulting training
pair points at the chain that was wrong.

```ts
import { CAMFeedbackLoopEngine } from "mcp-server/src/engines/CAMFeedbackLoopEngine.js";

CAMFeedbackLoopEngine.recordCorrection({
  decisionId: "dec_abc123",
  task: "strategy_recommend",
  originalValue: { strategy: "adaptive_clearing", stepover_pct: 65 },
  correctedValue: { strategy: "trochoidal", stepover_pct: 25 },
  originalSource: "ollama",
  originalConfidence: 0.72,
  reason: "operator override — chatter on thin wall",
  operatorId: "op-jane",
  prompt: "thin-wall finish, ti-6al-4v, 25mm depth",
  recordedAt: Date.now(),
});
```

For decisions that flowed through the reasoning chain you can use the
DecisionRecord overload, which copies `chainId` automatically:

```ts
CAMFeedbackLoopEngine.recordCorrectionFromDecision(decideResult, {
  correctedValue: operatorOverride,
  reason: "operator override",
});
```

### 2. Shop-floor outcome

The cycle ran; the part measured in spec, or scrapped, or chatter
dialed in. This goes in as a separate event so confirmations (the AI
got it right) and corrections (the AI got it wrong) accumulate
independently:

```ts
CAMFeedbackLoopEngine.recordOutcome({
  decisionId: "dec_abc123",
  task: "strategy_recommend",
  wasCorrect: true,
  predictedConfidence: 0.82,
  recordedAt: Date.now(),
});
```

The buffer caps at `setBufferCap(cap)` (default ~10k records). Old
records evict FIFO.

## Output — `loraTrainingExport()`

```ts
const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
  task: "strategy_recommend",
  includeConfirmed: true,   // include weight=0.5 confirmation pairs alongside weight=1.0 corrections
  limit: 5000,              // cap on emitted pairs (default unlimited)
});
// pairs: LoRATrainingPair[]
```

Each `LoRATrainingPair` carries an input/output pair plus a `weight`
and the originating `decisionId`. The weighting convention is fixed
and load-bearing for downstream training:

| Source event | weight |
|--------------|-------:|
| Correction (`recordCorrection`) | 1.0 |
| Confirmation (`recordOutcome { success: true }`) | 0.5 |

This bias toward corrections is intentional: corrections carry signal
the model lacked, confirmations only reinforce what the model already
got right. Per-CAM trainers can override the weighting via their own
sampler, but the export contract is fixed.

The mapping is asserted in
`mcp-server/src/__tests__/cam-ai/feedback-to-lora-export.test.ts`.

## Drift telemetry — when to retrain

`accuracyDrift()` runs Mann-Kendall over a sliding window of outcomes
keyed on `task`. The verdict drives whether downstream trainers
should kick off a new LoRA cycle.

```ts
const drift = CAMFeedbackLoopEngine.accuracyDrift({
  task: "strategy_recommend",
  windowSize: 200,
});
// drift.verdict: "insufficient_data" | "degrading" | "improving" | "no_trend"
// drift.S, drift.Z: Mann-Kendall test statistics
```

| Verdict | Action |
|---------|--------|
| `insufficient_data` | Wait for more outcomes (default threshold 50). |
| `improving` | Skip retrain — current model is gaining on shop-floor distribution. |
| `no_trend` (S=0) | Skip retrain — model is at steady state. |
| `degrading` | Trigger a new LoRA training cycle for this `task` × `cam_system` pair. |

## Pattern mining — what's the model getting wrong

`correctionPatterns()` clusters corrections to surface recurring
failure modes:

```ts
const patterns = CAMFeedbackLoopEngine.correctionPatterns({
  task: "strategy_recommend",
  minOccurrences: 3,
});
// patterns.report.patterns: CorrectionPattern[]
//   each with { signature, count, sample_decisionIds, last_seen }
```

This output is what an engineer reviews before promoting a freshly
trained LoRA adapter — if the same correction pattern is climbing,
the new adapter must dent it.

## Downstream — per-CAM adapters (planned)

Per-CAM adapter training (units `U-CAM108` hyperMILL,
`U-CAM109` Mastercam, `U-CAM110` Fusion 360, `U-CAM111` Inventor HSM)
is **not yet implemented**. When those units land, they will read the
`LoRATrainingPair[]` stream emitted by `loraTrainingExport()` and emit
trained adapter checkpoints to disk; the model-serving layer will pick
them up via `registerModel` and the canary pipeline.

Until those units land:

- `loraTrainingExport()` still works — it is the seam between this
  arc and the per-CAM trainers.
- The drift verdict is the canonical retrain trigger; per-CAM trainers
  should not retrain on a fixed cadence.
- Cross-CAM transfer (using a hyperMILL adapter to seed a Mastercam
  one) goes through `CAMTransferLearningEngine.bestSourceCAM()`.

## Stats endpoint

`feedbackStats()` returns a snapshot for monitoring. The dashboard's
Overview tab consumes a derived view of this.

```ts
const s = CAMFeedbackLoopEngine.feedbackStats();
// { total_corrections, total_outcomes, by_task, by_cam_system, last_correction_ts, last_outcome_ts }
```
