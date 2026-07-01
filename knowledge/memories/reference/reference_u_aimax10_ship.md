---
name: reference-u-aimax10-ship
description: "U-AIMAX10 (AI-MAX-MS0) — 46 AI capability/resource/training actions wired to prism_ai dispatcher in commits eb0a8ca60 + 935e8c8ae (2026-05-14, slot charlie). Snake/camel remap pattern + dispatcher-merge recipe for future xMAX wiring units."
aliases: reference_u_aimax10_ship
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.232Z
---


# U-AIMAX10 — 46 AI capability/resource/training actions wired to prism_ai

**Shipped:** 2026-05-14 by claude-c56f23b2 / slot charlie. Commits `eb0a8ca60` (ship) + `935e8c8ae` (close-out). 3-of-3 PASS at scrutiny session `aimax10-1778726384`. 108 tests green. Unblocks U-AIMAX11 (skills) + U-AIMAX12 (protective hook).

## Engines wired

| Engine | Actions | Prior coverage |
|--------|---------|----------------|
| AICapabilityMaximizerEngine | 9 `ai_capability_*` | 1 (dev_capability_metrics, kept in devDispatcher) |
| AIResourceLearningEngine | 14 `ai_resource_*` | 1 (legacy `ai_material_lookup`, preserved) |
| MasterAITrainingLedgerEngine | 8 `ai_training_master_*` | unwired |
| LatheAITrainingEngine | 7 `ai_training_lathe_*` | 1 (legacy `ai_lathe_train`, preserved) |
| TrainingLedgerEngine | 8 `ai_training_ledger_*` | unwired |

## Files
- NEW `mcp-server/src/schemas/aiCapabilityActionSchemas.ts` (574 LOC, 46 schemas + 9 enum tuples)
- MODIFIED `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` (+341 LOC, 46 new cases)
- NEW `mcp-server/src/__tests__/aiReasoningDispatcher.uaimax10.test.ts` (1301 LOC, 108 tests)

## Dispatcher merge recipe (used here, reusable for future xMAX units)

When adding a separate-file action surface (per a spec saying "files_created: src/schemas/<X>ActionSchemas.ts" + "files_modified: existing dispatcher"), merge at the dispatcher level rather than mixing into the legacy schema:

```ts
import { AI_REASONING_ACTIONS, ACTION_AI_REASONING_SCHEMAS, type AIReasoningAction } from "../../schemas/aiReasoningActionSchemas.js";
import { AI_CAPABILITY_ACTIONS, ACTION_AI_CAPABILITY_SCHEMAS, type AICapabilityAction } from "../../schemas/aiCapabilityActionSchemas.js";

const ALL_AI_ACTIONS = [...AI_REASONING_ACTIONS, ...AI_CAPABILITY_ACTIONS] as const;
const ALL_AI_SCHEMAS = { ...ACTION_AI_REASONING_SCHEMAS, ...ACTION_AI_CAPABILITY_SCHEMAS } as const;
type AIAction = AIReasoningAction | AICapabilityAction;
```

Then:
1. `inputSchema.action` uses `z.enum(ALL_AI_ACTIONS)`
2. `executeAIReasoningAction(action: AIAction, ...)` (covariance-safe widening at input position)
3. `validateActionParams(action, params, ALL_AI_SCHEMAS)` — merged map
4. New cases inserted before the `default: const _exhaustive: never = action` block — the never-assignment forces compile-time exhaustiveness for the wider union
5. `registerAIReasoningDispatcher` handler arg typed as `AIAction`

**Prefix-discipline rule:** all 46 new action names use unique prefixes (`ai_capability_*` / `ai_resource_*` / `ai_training_*`) that don't collide with any of the ~370 existing AI_REASONING_ACTIONS — verified by grep before merging. Spread-merge order has the new map second; collisions would silently overwrite legacy, so the no-overlap check is load-bearing.

## Snake_case ↔ camelCase remap rule

Wire-level snake_case is the canonical convention; engine internal types may be camelCase (e.g. `LedgerEntry` is camel because that's how the engine declares it). The dispatcher case is where the remap lives.

In this PR, 5 master-ledger actions need remap:
- `ai_training_master_ingest`: 10 fields snake→camel (`run_id`→`runId`, `pipeline_type`→`pipelineType`, `dataset_fingerprint`→`datasetFingerprint`, `training_metrics`→`trainingMetrics`, `deployment_status`→`deploymentStatus`, `slo_targets`→`sloTargets`, `actual_vs_predicted`→`actualVsPredicted`, `created_at`→`createdAt`, `promoted_at`→`promotedAt`, `notes` unchanged)
- `ai_training_master_query`: 5 fields, conditional remap (only assign filter field when `!== undefined`)
- `ai_training_master_replay`: `run_id` → `runId`
- `ai_training_master_pipeline_stability`: `pipeline_type` → engine arg 0
- `ai_training_master_compare`: `pipeline_a`→arg 0, `pipeline_b`→arg 1

TrainingLedgerEngine uses snake_case interface fields natively (`TrainingRunStart`, `TrainingRunClose`), so no remap needed for the 8 `ai_training_ledger_*` actions — passes the params object straight through.

## Defensive numerics: `.finite()` on training metrics

Per-file scrutiny review caught (P2): naive `z.number()` accepts `NaN` and `±Infinity`, which would poison ledger queries silently. Closed out before commit by adding `.finite()` to all 9 numeric fields in `slo_targets_schema` (minEvalScore, maxLoss), `training_metrics_schema` (loss, accuracy, mae, evalScore), `actual_vs_predicted_schema` (predictedDrift, observedDrift, absoluteDelta). Test asserts `ai_training_master_ingest` with `loss: NaN` returns `r.ok===false` AND `totalRuns()===0` (proves rejection before engine mutated state).

## Test fixtures that bit us

- `TrainingLedgerEngine.openRun` validates `trainer_commit_sha` via `^[a-f0-9]{7,40}$` — strings with dashes like `"sha-1"` fail. Use `"abc1234"`.
- `closeRun` with `status: "completed"` requires `final_weight_sha256` (64-hex). Initially omitted, then engine threw. Provide both `final_weight_sha256: "d".repeat(64)` and `eval_metrics_sha256: "e".repeat(64)`.
- `capability_score` is NOT bounded in (0,1] — engine math is `log10(K+1)*conf*log10(B+1)*(1-err)` and can exceed 1 for high knowledge_coverage. Assert positive + finite, not ≤1.
- `getCodeQualityRecommendations(lang, ctx)` returns `{structure, mandatory, anti_patterns, examples}` (single object), NOT an array of `{category, rules}`. The `{category, rules}` shape comes from `getAITrainingData().codeQuality[]`, a different method.
- `TrainingLedgerEngine.getStats()` returns `total_runs` not `run_count`.

## Companion to existing patterns

- Cousin of [[reference_aimax_07_08_shipped]] (U-AIMAX07+08, BRAVO 2026-05-13, ContextCompression + ContextCheckpoint into prism_context). Same milestone (AI-MAX-MS0), different dispatcher.
- Follows [[reference_skill_tier_wire_pattern]] 5-file recipe (schema + dispatcher + engine-direct test + round-trip wire test + verify tsc + vitest).
- Honors [[feedback_roadmap_close_out]]: 4 surfaces updated (envelope flip + MILESTONE_PROGRESS + BUILD_STATE + chat-bus).
- Honors [[feedback_parallel_scrutiny_per_file]]: 2-agent per-file scrutiny ran on schema (PASS, P2 findings closed in same commit) and dispatcher (PASS).
- Honors [[feedback_always_close_out]]: P2 findings (.finite, RESOURCE_SPEED_FEED_OPERATIONS tuple, RUN_STATUSES tuple, list_runs.status enum) all addressed before commit, not deferred.

## When to re-derive this memory

If a future xMAX wiring unit (U-AIMAX11/12, or the next milestone's analogue) follows the same merge pattern, this entry is the canonical recipe — read it before building. If you see a 4th or 5th dispatcher growing through spread-merge, consider extracting the merge helper into a shared utility.
