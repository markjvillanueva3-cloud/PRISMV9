---
name: reference-whiskey-india-ai-substrate-2026-05-29
description: "India's self-improving-AI substrate is ALREADY wireable in the whiskey slot — lathe is a first-class process in the shared outcome store + neural learner; lathe wires TO india, doesn't build a parallel loop. Refines LATHE-SELFIMPROVE-AI-PLAN."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:11.041Z
aliases: reference_whiskey_india_ai_substrate_2026_05_29
---


Discovery (Workflow `wf_a0c9001c-ce1`, india-master-ai agent) checked india's full-system AI substrate against the whiskey slot worktree. **The plan-changing finding:** the entire closed-loop substrate EXISTS in `H:/prism-slot-whiskey` and **lathe is already a first-class `process`** — so the original LATHE-SELFIMPROVE-AI-PLAN over-scoped (it assumed lathe builds a parallel bus/ledger/auto-train/lifecycle).

**India doctrine:** india OWNS the substrate; other slots WIRE TO india, india does not wire to them. The 4 surfaces every domain consumes: OutcomeFeedbackBus · NN-GRAPH+retrain · RAG/Tribal · Calibration/conformal.

**Shared singletons + lathe wire (ALL verified EXISTS in slot, ZERO edits needed):**
- `FeedbackBusEngine.ts` → `feedbackBusEngine` — `subscribe("outcome.recorded", cb)` / `publish(topic,payload)`; topics `outcome.recorded`/`outcome.completed`/`neural.train.tick`; can't publish to `"*"`.
- `CrossProcessOutcomeStore.ts` → `crossProcessOutcomeStore` — **`lathe` ∈ `OUTCOME_PROCESSES` (L55)** (record() passes the gate, no edit). `record({process:"lathe", bridge∈[sf,post,feature,ai,router], predicted, actual, reward})` auto-publishes `outcome.recorded`; `recordOutcome(id,outcome)` pending→terminal; store path caller-set via `configureStorePath()` (NOT a hardcoded jsonl).
- `CrossProcessNeuralLearningEngine.ts` — **`lathe` ∈ `REPLAY_PROCESSES` (L1368)** + one-hot `lathe:1`. `enableAutoTrain()` subscribes to the bus, buffers labeled rows, at threshold(16) `buildReplayMixedBatch()` (pulls lathe rows) → `train()` (EWC anti-forget) → `neural.train.tick`. **Once lathe records outcomes they flow into training+replay FOR FREE.**
- `prism_ai` (`aiReasoningDispatcher.ts`) `xproc_*` surface — process-agnostic; invoke with `process:"lathe"`: `xproc_outcome_record`/`_record_outcome`/`_query`/`xproc_rag_features`/`xproc_calibration_monitor_record`/`xproc_neural_train`/`predict`/`xproc_conformal_*`.
- `scripts/nn-graph-retrain-lifecycle.mjs` — **PROMOTE-GATE INVARIANT** `promoteDecision()` → promote IFF `assessment.deferred===false && assessment.grade.pass===true` (else promote:false; preserves prior `.prev`; live never touched by training). Reuse as-is for lathe LoRA cadence — do NOT roll a new gate.

**BLOCKED-UNTIL-SYNC (1 edge):** `.claude/hooks/outcome-bus-auto-tap.mjs` (auto-instruments Edit/Write/Bash → labeled JSONL; `whiskey:"lathe"` already in its SLOT_GALAXY_MAP) is MISSING in-slot (1543 commits behind). Until the slot syncs OR the hook is copied+wired, **record lathe outcomes EXPLICITLY** via `xproc_outcome_record {process:"lathe"}` / `crossProcessOutcomeStore.record(...)`. India docs (`ai-training/{CLAUDE,MEMORY}.md`) + `PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md` are doc-only-missing-in-slot (read on `H:/prism`).

**Refined task #15:** the 8 `LatheLoRA*` engines = the domain composition tier (knowledge extract → fuse → context → uncertainty → selection → ensemble → meta); the closed loop = CALLS to india's surfaces, not parallel infra. `LatheLoRAExperienceLedgerEngine` should be a thin wrapper over `crossProcessOutcomeStore` (process:lathe), not a parallel ledger. Full map: [[LATHE-AI-DISCOVERY-BRIEF]] (`state/shared/specs/`). Related: [[feedback_domains_own_ai_training_systems]] · [[domain-self-improving-ai-template]].
