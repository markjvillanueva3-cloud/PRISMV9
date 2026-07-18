# LATHE AI Discovery Brief — DB reuse + india master-AI clone map
**Slot:** whiskey (lathe) · **Date:** 2026-05-29 · **Source:** Workflow `wf_a0c9001c-ce1` (juliett-dbs + machining-domain-dbs + india-master-ai discovery agents; synthesis hand-written after the 4th agent hit the API session limit).
**Trees:** discovery read on integration `H:/prism` (most complete; slot/whiskey is ~1543 commits behind). **All "lathe doesn't wire X" / "exists" claims must be re-verified against the SLOT before acting** — the recurring divergence trap.

---

## 1. India master-AI — the self-improving loop is ALREADY wireable in-slot

**Doctrine (`ai-training/CLAUDE.md`, read on `H:/prism`):** india *owns the substrate*; other slots **wire TO india, india does not wire to them.** The 4 closed-loop surfaces every domain consumes: OutcomeFeedbackBus · NN-GRAPH+retrain · RAG/Tribal · Calibration/conformal.

### The shared singletons + how lathe wires (ALL verified EXISTS in `H:/prism-slot-whiskey`)
| Singleton (mcp-server/src/engines/) | Lathe wire | Slot |
|---|---|---|
| `FeedbackBusEngine.ts` → `feedbackBusEngine` | `subscribe("outcome.recorded", cb)` / `publish(topic,payload)`; topics: `outcome.recorded`/`outcome.completed`/`neural.train.tick`; `"*"` catch-all (can't publish to it) | ✅ EXISTS |
| `CrossProcessOutcomeStore.ts` → `crossProcessOutcomeStore` | `record({process:"lathe", bridge, ...})` (auto-publishes `outcome.recorded`); `recordOutcome(id,outcome)` pending→terminal; `query/retrieveSimilar/stats`. **`lathe` ∈ `OUTCOME_PROCESSES` (L55) — passes the gate, ZERO edit.** store path is caller-set via `configureStorePath()`, NOT a hardcoded jsonl | ✅ EXISTS |
| `CrossProcessNeuralLearningEngine.ts` | `enableAutoTrain()` subscribes to `outcome.recorded`, buffers labeled rows, at threshold(16) `buildReplayMixedBatch()`→`train()`→`neural.train.tick` (EWC anti-forget). **`lathe` ∈ `REPLAY_PROCESSES` (L1368) + one-hot encodes `lathe:1` — ZERO edit.** | ✅ EXISTS |
| `aiReasoningDispatcher.ts` (`prism_ai`) | `xproc_outcome_record` / `xproc_outcome_record_outcome` / `xproc_outcome_query` / `xproc_rag_features` / `xproc_calibration_monitor_record` / `xproc_neural_train`/`predict` / `xproc_conformal_*` — **process-agnostic, invoke with `process:"lathe"`** | ✅ EXISTS |
| `scripts/lib/graphsage-train-pipeline.mjs` (GNN tier-5; graph-wide, NOT lathe-partitioned) | lathe contributes via outcome rows + per-domain LoRA, not a separate GNN | ✅ EXISTS |
| `scripts/nn-graph-retrain-lifecycle.mjs` | **PROMOTE-GATE INVARIANT** `promoteDecision()` → promote IFF `assessment.deferred===false && assessment.grade.pass===true` (else promote:false; preserves prior `.prev`; live never touched by training). Reuse as-is + mirror for lathe LoRA cadence. | ✅ EXISTS |
| `.claude/hooks/outcome-bus-auto-tap.mjs` (auto-instruments every Edit/Write/Bash → labeled JSONL; `whiskey:"lathe"` already in SLOT_GALAXY_MAP) | auto-tags lathe rows once present | ⚠️ **MISSING in slot — BLOCKED-UNTIL-SYNC** |

### Verdict (the plan-changing finding)
**Every TypeScript closed-loop edge is wireable in-slot NOW; lathe is already a first-class process — ZERO edits to india's shared singletons.** The original LATHE-SELFIMPROVE-AI-PLAN over-scoped: lathe does NOT build a parallel feedback-bus / outcome-ledger / auto-train / retrain-lifecycle. It **records outcomes with `process:"lathe"` → they flow into the shared auto-train + replay + GNN for free.** The 8 `LatheLoRA*` engines remain as the *domain composition tier* (knowledge extraction → fusion → context → ensemble/meta inference), but the closed loop = **calls to india's surfaces**, not new infra. Only the `outcome-bus-auto-tap` hook is absent → until the slot syncs, record outcomes EXPLICITLY via `xproc_outcome_record` / `crossProcessOutcomeStore.record({process:"lathe"})`.

---

## 2. DB additions for the lathe galaxy (juliett + machining-domains)

> **Highest-value win flagged by BOTH agents:** alarm DBs. Lathe has ZERO alarm path; `controller-alarm-database.json` carries **845 Okuma + 1104 Fanuc** codes + `alarm-fix-procedures.json` + `AlarmRegistry`/`AlarmDiagnosticsEngine`. This is exactly the `lathe_alarm_lookup`/`lathe_alarm_diagnose` action I deferred last session — the data + engine both exist in-slot (`AlarmDiagnosticsEngine.lookupAlarm("OKUMA", code)` verified). **Revisit as P0.**

| DB / catalog | Path | Owner | Lathe action to add | Priority |
|---|---|---|---|---|
| `controller-alarm-database.json` + `alarm-fix-procedures.json` + `AlarmDiagnosticsEngine` | `data/` + `engines/AlarmDiagnosticsEngine.ts` | post/echo+controller | `lathe_alarm_lookup` / `lathe_alarm_diagnose` (default OKUMA) | **P0** |
| `CatalogConsumerAdapterEngine` / `CatalogUnifiedQueryEngine` (material→tooling resolver) | `engines/` | juliett | call `catalogConsumerAdapter.resolve({consumer:"lathe_wizard", material})` from `LatheSpeedFeedCalculatorFacadeEngine` — **specced but DEFERRED** (no lathe engine calls it yet; CONSUMER-WIRES-JULIETT-DB-BRIDGE.md §5) | **P0** |
| `MonolithSurfaceFinishDatabaseEngine` (ISO 1302 Ra/N grades + `getRecommendedProcess()`) | `engines/` | juliett | `lathe_surface_finish_lookup` (finish-pass targets / DfM; pairs with Ra=f²/32rε) | P1 |
| `MonolithToolTypesDatabaseEngine` (drill/boring/reamer/tap/threadmill subset) | `engines/` | juliett | reference in `lathe_toolholder_lookup`/tooling — UNWIRED | P1 |
| `MonolithHyperMillFixtureDatabaseEngine` (7 chucks/collets + auto-select) | `engines/` | juliett | chuck/collet auto-select — complements `lathe_workholding_*` | P1 |
| `MachineRegistry` (17 lathe + Okuma/Mazak/Doosan turning) | `registries/MachineRegistry.ts` | mill/shop | **DEDUP**: `lathe_kinematics_get_machine_specs` should source this, not a lathe-local copy | P1 |
| `MaterialRegistry` (kc1.1/mc/ISO) + `CoolantRegistry` + `CoatingRegistry` + `ToolGeometryDefaults` | `registries/` | mill/tooling | inline-constant risk in `LatheCoolantAdvisorEngine`/chemistry — reference, never inline (soul refuse) | P1 |
| `ControllerDialectEngine` / `ControllerKnowledgeDBEngine` (Okuma OSP/Fanuc) | `engines/` | post/echo | lathe post-emit + `lathe_ai_ultra_*controller*` should source these | P2 |
| SFC vendor turning catalogs (Sandvik/Kennametal/iscar + HSMAdvisor/G-Wizard parity) | `data/` | sfc/oscar | wire into `auto-speed-feed-lathe` — turning subsets unreferenced by name | P2 |
| JM real-shop catalogs `jm-die-{tooling,stock-material}-catalog.json` | `data/jm-die-database/` | juliett/JM | reference for shop-specific stock + turning tooling (R8 — no re-OCR) | P2 |
| `MonolithControllerDatabaseEngine` (Okuma OSP-P300/P500 + alarm refs) | `engines/` | juliett | `OkumaB250LatheMasterPostEngine` should pull dialect/macro/alarm from here — already WIRED via `prism_intelligence` | ref |

**Juliett write-discipline lathe state-writers MUST adopt** (lathe LoRA training-data, tribal-corpus, shop-aware-tuning state): `atomicWriteJson` (scripts/lib/atomic-json.mjs) + `schemaVersion` + migration on bump + JSONL append-only (rotate-never-delete) + R12 fail-loud (abort on count-shrink). Lathe is a *consumer* of juliett's stores, never a parallel-store author. NOTE the `tribal-embed-index.json.*.tmp` orphan hazard (atomicWrite needs `finally`-unlink).

---

## 3. Refined task #15 build order (india-substrate-aware)
1. **`LatheLoRAExperienceLedgerEngine` (#2)** → thin wrapper that `crossProcessOutcomeStore.record({process:"lathe", bridge, predicted, actual, reward})` + reads back via `query({process:"lathe"})`. NOT a parallel ledger — the shared store is the substrate.
2. **`LatheLoRAKnowledgeExtractorEngine` (#1)** + **`...SemanticContextEngine` (#3)** + **`...KnowledgeFusionEngine` (#4)** → domain signal producers (corpus/tribal/outcomes → records; RAG via `xproc_rag_features`; physics-anchored fusion on `CANONICAL_KIENZLE`/`CANONICAL_TAYLOR`).
3. **`...UncertaintyQuantifierEngine` (#5)** → wrap `xproc_calibration_monitor_record` + conformal; gate auto/review/reject.
4. **`...ModelSelectionEngine` (#6)** + **`...EnsembleInferenceEngine` (#7)** → decision/composition tier (delegate aggregation to existing `LatheLoRAEnsembleVoterEngine`).
5. **`...MetaAdaptationEngine` (#8)** → meta-learn over `crossProcessOutcomeStore.query` history; gate on measured lift.
6. **Lifecycle:** reuse `nn-graph-retrain-lifecycle.mjs`'s `promoteDecision` gate (promote IFF `deferred===false && grade.pass===true`) for any lathe LoRA cadence — do NOT roll a new gate. `enableAutoTrain()` already pulls lathe rows via replay; no new trainer.
**Boundary:** record explicitly (auto-tap hook absent in-slot) until sync. Each engine: dedup-check (THROWS) + real test + dispatcher wire + per-file scrutiny.

---
*Specs to read on `H:/prism`: `CONSUMER-WIRES-JULIETT-DB-BRIDGE.md`, `PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`, `ai-training/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`.*
