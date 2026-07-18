# AI Training Galaxy — slot:india
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = ai-training domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** GraphSAGE GNN tier-5 wiring-inference · LoRA adapter stacks (lathe/mill/cam/wedm/5axis/laser/grinding/blueprint) · RAG corpus pipelines · deep reasoning engines · self-improvement feedback loops · retrain lifecycle orchestration · calibration/conformal/drift stacks.

**EXCLUDES:** G-code emission → echo; toolpath strategy → kilo; blueprint OCR → xray; tribal-tip storage → fleet-tribal; CMM/SPC → quality galaxy; corpus PDF extraction → pdf-corpus/lima.

**Slot:** india · Worktree: `H:/prism-slot-india` · Branch: `slot/india`
**Commit format:** `[<SCOPE>]/U-ID: title (slot:india)` — never commit to the shared main tree.
**SYNC GATE:** rebase `slot/india` from the live tip BEFORE building; a stale branch missing the live substrate orphans new code.

---

## §2 — Verified engines

| Role | Engine file (verified) |
|---|---|
| GNN trainer | `scripts/lib/graphsage-trainer.mjs` |
| GNN predictor | `scripts/lib/graphsage-predictor.mjs` |
| GNN train pipeline | `scripts/lib/graphsage-train-pipeline.mjs` |
| GNN checkpoint | `scripts/lib/graphsage-checkpoint.mjs` |
| GNN model | `scripts/lib/graphsage-model.mjs` |
| Retrain lifecycle | `scripts/nn-graph-retrain-lifecycle.mjs` |
| Active-pool selector | `scripts/lib/gnn-active-pool-select.mjs` |
| Node embedding bridge | `scripts/lib/graph-node-embedding-bridge.mjs` |
| RAG hybrid retrieval | `scripts/lib/hybrid-retrieval.mjs` (4-substrate RRF) |
| CAG router | `scripts/lib/cag-router.mjs` |
| MetaLearning optimizer | `MetaLearningOptimizerEngine.ts` (threshold: 2848 outcomes) |
| Adaptive threshold | `AdaptiveThresholdEngine.ts` |
| Hook efficiency | `HookEfficiencyEngine.ts` |
| Outcome feedback bus | `OutcomeFeedbackBusEngine.ts` |
| LoRA stacks (~95 engines) | `*LoRA*Engine.ts` — Glob FIRST before creating any new LoRA engine |

---

## §3 — Dispatcher quick-ref

| Dispatcher | MCP name | Key action prefixes |
|---|---|---|
| `aiReasoningDispatcher.ts` | `prism_ai` | `xproc_neural_*`, `xproc_outcome_*`, `lora_*`, `neural_*`, `consensus_*` |
| `intelligenceDispatcher.ts` | `prism_intelligence` | `xproc_neural_*`, `digital_twin_*`, `ai_orchestrate_*` |
| `outcomeDispatcher.ts` | `prism_outcome` | `capture_bus_*`, `outcome_*`, `replay_*`, `rl_bridge_*`, `drift_*` |
| `mlDispatcher.ts` | `prism_ml` | `adalora_*`, `continual_lora_*`, `fedlora_*`, `lora_compose`, `lora_gate`, `loramoe`, `olora_*` |

**MCP-down fallback:** `node scripts/nn-graph-retrain-lifecycle.mjs --status` · `node scripts/nn-eval-refresh.mjs`

> Action prefix lists sourced from TOOLBELT.md §prism_* dispatcher actions + PATHS.md §Dispatchers. Verify individual action names against dispatcher source before use.

---

## §4 — Canonical constants + data paths

- **NEVER inline physics/ML constants** — import from `mcp-server/src/physics/constants.ts`.
- **Ollama capability oracle** (single source of truth): `OllamaCapabilityProbeEngine.getBestReasoningModel()` / `getBestChatModel()` — verified `c1b40183c1`. NEVER hardcode a model tag.
- **Retired tags (2026-06-04 Blackwell migration):** `:3b` · `:7b` · `:14b` · `deepseek-r1:14b` — all gone.

| Data store | Path | Access rule |
|---|---|---|
| GNN eval state | `state/shared/nn-graph/NN-EVAL.md` | Read via `node scripts/nn-eval-refresh.mjs` |
| Node embeddings | `state/shared/nn-graph/node-embeddings-768d.jsonl` | Stream only — NEVER load 372K nodes into memory |
| GNN checkpoint | `state/shared/nn-graph/graphsage-checkpoint.json` | Read only; promote `.candidate.json` after gate pass |
| Outcome bus | `state/shared/outcome-bus.jsonl` | Append via `prism_outcome:capture_bus_*`; never direct write |
| AI fleet state | `knowledge/memories/patterns/ai-systems-fleet-state.md` | Regenerate: `node scripts/ai-systems-fleet-state.mjs` |
| India context ledger | `state/shared/INDIA-CONTEXT-LEDGER.md` | Read on session start (ROI-ordered regain) |

---

## §5 — Domain gotchas / safety rails

1. **AUROC is selective-deploy, not full-coverage.** Live holdout (2026-06-06, 62-ghost): AUROC 0.808 (PASS), macro-F1 0.439 (FAIL), Brier 0.179 (FAIL). Tier-5 operates at τ=0.7 — 32% coverage, abstains below gate. Full-coverage is blocked on reference-pool growth, not more epochs.
2. **Calibration is a measured dead end for the Brier gate.** Murphy reliability/miscalibration = 0.0197 of 0.179 Brier; best density-matched LOO-CV calibrator = 0.178. The residual is refinement loss. Do not pursue calibration to fix Brier — get more labeled examples.
3. **Heterophily collapse on unstratified training.** Training on the full graph without `positiveTypeMarginal` stratification collapses to the majority class. MS1 root cause. Always stratify.
4. **372K-node OOM trap.** Never load the full node-embedding corpus in-memory. Use `build-node-embeddings.mjs` streaming JSONL reader.
5. **NaN gradient / all-zero feature row.** NN/ML training edge cases: empty embedding hits, single-node graph, schema-version drift. Run `runAssessment` after every retrain — promote IFF all 3 gates clear.
6. **`slot/india` branch sync gate.** The slot branch must be rebased to live tip before any build. A stale branch missing the live `scripts/lib/` substrate will produce broken imports silently.
7. **Checkpoint write discipline.** NEVER write directly to `graphsage-checkpoint.json`. Always write to `.candidate.json` and promote only after `runAssessment` clears all gates.

---

## §6 — What NOT to do (domain refuses)

- **DO NOT lower the AUROC gate (< 0.78) to force full-coverage deploy.** Selective deploy at τ=0.7 is the correct posture until reference-pool grows naturally.
- **DO NOT train without `positiveTypeMarginal` stratification** — heterophily collapse (NN-GRAPH MS1 root cause).
- **DO NOT overwrite `graphsage-checkpoint.json` directly** — always `.candidate.json` → `runAssessment` → promote.
- **DO NOT embed the full 372K-node corpus in-memory** — streaming JSONL reader only.
- **DO NOT wire NN inference through any dispatcher** — R12 invariant: only DATA/stats/provenance actions are dispatcher-safe.
- **DO NOT report a single-seed AUROC lift** — multi-seed before any AUROC claim (heterophily + link-pred AUROC on capped subgraphs is high-variance per `feedback_multiseed_before_auroc_claim.md`).
- **DO NOT rebuild the calibration pipeline to fix the Brier gate** — calibration contributes only 0.0197 of 0.179 Brier.
- **DO NOT rebuild existing stacks before Glob-checking:** LoRA (~95 engines via `*LoRA*Engine.ts`), calibration/conformal/drift (`*{Calibration,Conformal,Drift,Reward}*.ts`), RAG (`hybrid-retrieval.mjs`), CAG (`cag-router.mjs`), active-learning selector (`gnn-active-pool-select.mjs`) — all exist.
- **`outcome-bus-auto-tap.mjs` DOES exist** (`.claude/hooks/outcome-bus-auto-tap.mjs`, live — last wrote 2026-07-02). It writes the SEPARATE dev-telemetry `state/shared/outcome-bus.jsonl` shell bus (tool-use log), which is NOT the manufacturing-outcome ledger (`CrossProcessOutcomeStore`/`feedbackBus:"outcome.recorded"`). Do not conflate the two streams. _(Corrected 2026-07-02: the prior "verified absent / fabricated name" note was itself wrong — verified in-code. See [[reference_india_closed_loop_state_2026_07_02]].)_

---

## §7 — Domain workflow / pipeline contract

**GNN retrain cycle (6h cadence, scheduled task):**
1. `nn-graph-retrain-lifecycle.mjs` triggers → pre-retrain embedding bridge (`graph-node-embedding-bridge.mjs`) → fresh `node-embeddings-768d.jsonl`
2. `graphsage-train-pipeline.mjs` → checkpoint written to `.candidate.json`
3. `runAssessment` → gate check (AUROC ≥ 0.78 + macro-F1 ≥ 0.55 + Brier ≤ 0.15)
4. All 3 pass → promote `.candidate.json` → `graphsage-checkpoint.json`; any fail → candidate discarded, gate status logged to `NN-EVAL.md`

**Coverage growth lever:** More labeled examples = better full-coverage scores; epochs alone do not move the gate. **VERIFIED 2026-07-02 (do not repeat the stale "producers dark" read):** domain producers ARE already wired — mill/lathe/wedm/coordinator/quoting/CAM/shop-floor all publish to `feedbackBus:"outcome.recorded"` (via `domainAGIAdapterKit.publishOutcomeToFeedbackBus`), and `CrossProcessNeuralLearningEngine.enableAutoTrain()` auto-fires at boot (`index.ts:482`, `PRISM_XPROC_AUTOFIRE`) to train the in-memory net. The REAL open lever is **durable persistence**: `PRISM_XPROC_LEDGER_DURABLE` is unset → `xproc-outcome-ledger.jsonl` never persists → no cross-session corpus for GNN-refpool/LoRA. Operator-gated. Full state map: `state/shared/specs/OUTCOME-EMISSION-WIRE-QUEUE-2026-07-02.md` · [[reference_india_closed_loop_state_2026_07_02]].

---

## §8 — Tribal + corpus pointers

**Wiki entries (all verified in PATHS.md):**
- `[[architecture/nn-graph-ms0]]` · `[[architecture/nn-graph-ms1]]` · `[[architecture/nn-graph-ms2]]`
- `[[architecture/rag-upgrade-ms0]]` · `[[architecture/lora-cadence-orchestration]]`
- `[[lessons/heterophily-collapse-class]]` · `[[lessons/checkpoint-promotion-discipline]]`
- `[[architecture/gnn-selective-deploy]]`

**AI fleet state:** `knowledge/memories/patterns/ai-systems-fleet-state.md` — query before re-deriving (`prism_memory:semantic_search query="ai training" topK=20`).

**Tribal write rule:** `prism_knowledge:tribal_capture slot=india` — NEVER write `knowledge/tribal/*.md` directly (auto-overwritten).

**JM Die corpus:** access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob the 24K-file tree.

---

## §9 — Cross-galaxy edges (PSN)

| Partner | Direction | Bridge |
|---|---|---|
| system-viz (sierra) | ← CONSUMES | `system-graph.json` as GNN input; sierra's regen sequence affects india's eval |
| cam (kilo) | ← CONSUMES | transfer-domain strategy embeddings → GNN ref-pool |
| speed-feed (oscar) | ↔ | LoRA-trained SFC models per-material |
| mill (foxtrot) | ↔ | mill LoRA per-domain models (`MillLoRA*Engine.ts`) |
| lathe (whiskey) | ↔ | lathe LoRA per-domain models (`LatheLoRA*Engine.ts`) |
| wedm (mike) | ↔ | wedm LoRA per-domain models |
| quoting (charlie) | ← CONSUMES | quote-vs-actual reconciliation → learning signal |
| knowledge-conversion | ← CONSUMES | ported algorithms/formulas → training input |
| corpus-aggregation | ← CONSUMES | aggregated corpus → training input |
| academy (lima) | ↔ | academy outcomes ↔ training feedback |
| agent-orchestration | ← CONSUMES | per-task model routing |

**India owns the learning substrate — other slots wire to india, not the reverse.**

---

## §10 — Closed-loop integration (india)

India **owns** the 4 surfaces other galaxies call into (action names VERIFIED in-code 2026-07-02):
- **OutcomeFeedbackBus (capture bus):** `prism_outcome:{capture_bus_record,capture_bus_query,capture_bus_stats,capture_bus_flush,outcome_publish}` (`outcomeDispatcher.ts:94-111,290-360`). NOTE: the manufacturing-outcome LEARNING loop rides `feedbackBus:"outcome.recorded"` → `CrossProcessOutcomeStore`, which is SEPARATE from the dev-telemetry `state/shared/outcome-bus.jsonl` shell bus — do not conflate the two streams ([[reference_india_closed_loop_state_2026_07_02]]).
- **NN-GRAPH lifecycle:** `prism_ai:xproc_neural_{train,predict,evaluate,save,load,metrics,reset,ewc_status,ewc_clear,ewc_consolidate,consult_speedfeed}` (`aiReasoningDispatcher.ts:2931-3197`) + `scripts/nn-graph-retrain-lifecycle.mjs`.
- **RAG/tribal corpus:** `prism_knowledge:tribal_*` + `scripts/lib/hybrid-retrieval.mjs`.
- **Calibration/conformal:** in-engine — `ConformalCalibrationMonitorEngine` subscribes `feedbackBus:"outcome.completed"` (no dispatcher call on the hot path). The previously-cited `prism_ai:xproc_calibration_monitor_*` action was NOT found by grep 2026-07-02 — treat as unconfirmed, verify before use.

Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`

---

## §11 — Test commands

```bash
# Domain-filtered GNN + LoRA tests
cd mcp-server && rtk npx vitest run -t "graphsage|nn-graph|lora|retrain|calibration|conformal"

# GNN eval refresh (no port needed)
node H:/prism/scripts/nn-eval-refresh.mjs

# Retrain lifecycle status
node H:/prism/scripts/nn-graph-retrain-lifecycle.mjs --status

# Galaxy verify
node H:/prism/scripts/lib/galaxy-reasoning-bridge.mjs ai-training "status"
```

---

## §12 — Known bugs / open threads

**Open orphan wires (6 WIRE_SAFE_DATA actions — verified `state/shared/specs/INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md`):**
`IntentClassifier` · `PolicyExperienceLedger` · `TransferLearning` · `TemporalReasoning` · `RealTimeAnomalyDetection` · `KnowledgeIngestion`
Rule: wire DATA/stats/provenance actions only — NEVER wire NN inference through a dispatcher.
`ConsensusModelPerformanceEngine` is a STUB — do NOT wire until real impl lands.

**Deploy gate:** AUROC PASS (0.808) but macro-F1 FAIL (0.439) + Brier FAIL (0.179). Selective deploy at τ=0.7 is active. Full-coverage unblocked only by reference-pool growth.

**Context ledger:** `state/shared/INDIA-CONTEXT-LEDGER.md` (ROI-ordered; read on session start).

---

## §13 — AI / reasoning surface

```bash
node H:/prism/scripts/lib/galaxy-reasoning-bridge.mjs ai-training "<question>"
```

**India-specific Ollama routing:**
- Deep reasoning + training hypotheses: `gpt-oss:120b` (65GB, fits Blackwell 96GB resident)
- Trainer / engine / test code: `qwen2.5-coder:32b`
- Trivial classification: `qwen2.5-coder:1.5b`
- RAG embeddings: `nomic-embed-text`
- Model selection oracle: `OllamaCapabilityProbeEngine.getBestReasoningModel()` — never hardcode tags.

**Session startup fast path:**
1. `per-agent-handoff.mjs read --terminal <STABLE>` (prior session state)
2. Read `state/shared/INDIA-CONTEXT-LEDGER.md` (ROI-ordered regain)
3. Read `state/shared/nn-graph/NN-EVAL.md` (current gate state)
4. Check `state/shared/specs/INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md` (6 open wires)
5. `node scripts/nn-graph-retrain-lifecycle.mjs --status` (cadence)
6. Pick tasks from context ledger in ROI order.

## AI Synergy (PSN leg #10)

This galaxy is a first-class AI-substrate **participant** -- it OWNS 24 AI engine(s) (e.g. `AdaLoRARankAllocatorEngine`, `ContinualLoRAEngine`, `CrossDisciplinaryDeepLearningEngine`).
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs ai-training "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/ai-training_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
