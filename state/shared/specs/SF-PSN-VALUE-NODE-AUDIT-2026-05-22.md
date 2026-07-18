# SF × PSN Value-Node Audit — 2026-05-22

**Scope (Phase 1).** I am auditing the **speed-and-feed calculation engines + decisioning pipeline**, looking for **every system-viz / PSN node that can add value to SF accuracy and cost-efficiency but is not currently composed**, and the verification channel is **`scripts/sf-psn-leverage-rank.mjs`** (re-runnable; baseline captured this session).

**PSN** (operator's term) = **P**RISM **S**ystem **N**etwork = Obsidian brain (cross-session memory) + PRISM OS + neural network/GNN + system-viz + wiki + tribal knowledge.

**Method.** `/forge-audit-v2` 7-phase loop. Surfaces enumerated by reading every `*SpeedFeed*` engine import graph + `src/algorithms/` directory + system-viz `master_index_query`. Baseline measured by the META artifact below — not estimated.

---

## Measured baseline (Phase 0)

`node scripts/sf-psn-leverage-rank.mjs` → `state/shared/sf-psn-leverage-rank.json`:

| Metric | Value |
|---|---|
| SF engines scanned | 17 |
| `src/algorithms/` modules **composed** by any SF engine | **2 of 59** (GeneticOptimizer, ParticleSwarm) |
| Composition gap | **96.6%** |
| PSN surfaces connected | neural/ai, playbook, tribal |
| PSN surfaces **missing** | obsidian-brain/memory, wiki, system-viz |
| High-leverage physics modules dormant | **15 of 15** |

---

## What IS already wired (the positive baseline — do not rebuild)

The SF calculator is genuinely strong on the **data + knowledge + AI** layers:

- ✅ **Canonical physics constants** — `CANONICAL_KIENZLE / _TAYLOR / _MATERIAL_DB / _TOOL_MODULUS` (system-viz reports `core.physics` / `CANONICAL_KIENZLE` among PRISM's most-utilized nodes, ~0.49).
- ✅ **Tribal knowledge** — `tribalKnowledgeEngine` (3,700+ tips) composed in `SpeedFeedOrchestratorEngine`.
- ✅ **Playbook** — `machiningPlaybookEngine` (296 rules), category-routed per operation.
- ✅ **Neural/AI ladder** — `SpeedFeedDeepLearningEngine` (SF-AI-L1) ← `SpeedFeedAdvancedAIEngine` (L2) ← `SpeedFeedUltimateAIEngine` (L3), all chained; orchestrator also calls `crossProcessNeuralLearningEngine.predictFromRecord`.
- ✅ **Statistics** — `MonteCarloEngine`, `StochasticToolLifeEngine` (Weibull), `SVDEngine`.
- ✅ **Optimizers** — GeneticOptimizer + ParticleSwarm (lazy `require` in `UltimateSpeedFeedEngine`).

The gap is **not** knowledge — it is **physics-module composition** and **3 missing PSN surfaces**.

---

## Findings (Phase 2-3) — each with a verification channel

### F1 — 96.6% algorithm-module composition gap *(P1, leverage: HIGH)*
The SF engines compose only 2 of 59 `src/algorithms/` modules. Every physics model (Kienzle force, Taylor life, thermal, chatter, deflection) is **re-implemented inline** rather than composed from the canonical algorithm module. Inline code shares the canonical *constants* but not the canonical *model* — so a future improvement to `KienzleForceModel` (size-effect, edge-ploughing) or `ExtendedTaylorModel` (3-term Taylor) does **not** propagate to the SF calc.
- **verifies_via:** `node scripts/sf-psn-leverage-rank.mjs` → `summary.compositionGapPct`
- **baseline:** 96.6% · **target after MS0:** < 75%

### F2 — Doc/reality drift: false "Loewen-Shaw thermal" + "Stability lobe" claims *(P0, REGRESSION)*
`SpeedFeedOrchestratorEngine.ts:6-7` header states it "delegat[es] to physics engines (Kienzle force, Taylor life, **Loewen-Shaw thermal**, etc.)". `SpeedFeedDeepLearningEngine.ts:43-45` claims "**Loewen-Shaw thermal model** / Chip thinning compensation / **Stability lobe integration**". Neither engine imports `JaegerTempField` (the Loewen-Shaw moving-heat-source module), `StabilityLobeDiagram`, or `FRFStabilityLobe`. The headers describe capability the code does not compose — an R12 fail-loud violation.
- **verifies_via:** `grep -lE "JaegerTempField|StabilityLobeDiagram|FRFStabilityLobe" mcp-server/src/engines/SpeedFeed*.ts`
- **baseline:** 0 hits (headers claim 3 modules, 0 imported) → **regression, flowed to CLAUDE.md**

### F3 — Obsidian brain / cross-session memory: zero connection *(P2, leverage: HIGH)*
No SF engine imports any memory surface (`prism_memory`, `MemoryGraph`, `memory_search`, Qdrant). The Obsidian brain holds shop-calibrated SF outcomes (actual-vs-predicted from prior jobs) that should be a **decision prior** — the calc re-derives from scratch every time instead of recalling "what worked on this material+tool+machine last time."
- **verifies_via:** `sf-psn-leverage-rank.mjs` → `summary.psnSurfacesMissing` contains `obsidian-brain/memory`
- **baseline:** missing

### F4 — Wiki: zero connection *(P2, leverage: MEDIUM)*
No SF engine consults `knowledge/wiki/` at decision time. The wiki holds material-machinability and cutting-physics entries that could surface as decision evidence + provenance.
- **verifies_via:** `sf-psn-leverage-rank.mjs` → `psnSurfacesMissing` contains `wiki`
- **baseline:** missing

### F5 — GNN clarification: not a cutting-parameter predictor *(P0, SCOPE CORRECTION — R7)*
The operator's brief says "wire it into the neural network / GNN." **Surfacing the conflict rather than averaging it:** PRISM's GraphSAGE GNN is a **wiring-inference** tier (UNKNOWN ghost-node → dispatcher classification), currently **DORMANT** (AUROC 0.096, gate ≥0.78). It does **not** predict feeds and speeds — wiring the SF calc "into the GraphSAGE GNN" literally is a category error. The SF calc's real neural layer is the **SF-AI L1-L3 ladder + `CrossProcessNeuralLearningEngine`**. "Wire into the neural network" is therefore implemented as **closing the outcome-feedback loop on that ladder** (F8), not by touching GraphSAGE.
- **verifies_via:** `state/shared/nn-graph/NN-EVAL.json` (AUROC field) + `ENGINE_DIGEST.md` SF-AI-L1/L2/L3 lines
- **baseline:** GNN AUROC 0.096, dormant — confirmed not SF-relevant

### F6 — Economic speed computed inline, not module-composed *(P2, leverage: MEDIUM — corrected by peer review)*
**Original claim overstated; corrected after Phase-4B peer review.** `UltimateSpeedFeedEngine.gilbertOptimalSpeed()` (line 1518, Gilbert 1950) already computes and emits `gilbert_economics{V_min_cost, V_max_prod, cost_per_part_optimal}` at STEP 14P — the cost-efficiency dimension **exists**. The genuine gap is narrower (a specific case of F1): the canonical `GilbertMRRModel` algorithm module is composed by zero SF engines; the economic speed is an inline re-implementation. Leverage downgraded to MEDIUM — a dedup/consistency fix, not new capability.
- **verifies_via:** `grep -n gilbertOptimalSpeed mcp-server/src/engines/UltimateSpeedFeedEngine.ts` (confirms inline impl) + `sf-psn-leverage-rank.mjs` → `highLeverageDormant` contains `GilbertMRRModel`
- **baseline:** economic speed present inline (line 1518); `GilbertMRRModel` module dormant

### F7 — RPM output not guaranteed chatter-stable *(P1, leverage: HIGH)*
`StabilityLobeDiagram` + `FRFStabilityLobe` + `RCSA` (receptance-coupling tool-tip FRF) are built, composed by zero SF engines. The SF calc's RPM is not selected from a real stability-lobe diagram — it cannot guarantee a chatter-stable spindle speed for a given stickout/holder.
- **verifies_via:** `sf-psn-leverage-rank.mjs` → `highLeverageDormant` ⊇ {StabilityLobeDiagram, FRFStabilityLobe, RCSA}
- **baseline:** 3 dormant

### F8 — SpeedFeedMinerEngine not fed into decisioning; Proven aggregator already wired *(P2, leverage: MEDIUM — corrected by peer review)*
**The original F8 was FALSE and is corrected.** It asserted "baseline: 0 hits" for the proven-prior grep — that baseline was written **without running the command** (an R12/R8 violation, caught by Phase-4B peer review). The truth, confirmed by running the grep: `SpeedFeedOrchestratorEngine.queryProvenParameters()` already lazy-requires `ProvenSpeedFeedAggregatorEngine` and applies a confidence-scaled proven prior (~0.88) inside `compute()` — **6 grep hits, not 0**. The **genuine remaining gap**: `SpeedFeedMinerEngine` (raw NC-program mining, upstream of the aggregator) is composed by zero SF engines — confirmed `grep -cE "SpeedFeedMiner" SpeedFeedOrchestratorEngine.ts` → **0**. So the shop-proven *aggregate* is consulted; the raw-program *miner* is not.
- **verifies_via:** `grep -cE "SpeedFeedMiner" mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` → expect 0 (Miner absent); proven-aggregator path already present (6 hits)
- **baseline:** SpeedFeedMiner 0 hits (genuine gap) · ProvenSpeedFeedAggregator 6 hits (already wired)

### F9 — Outcome-feedback loop is half-built *(P3, leverage: HIGH — added by peer review)*
`sfcOutcomeWire.ts` middleware is imported by 5 SF engines (`UltimateSpeedFeed`, `AutoSpeedFeedCalculator`, `MachineAwareSpeedFeed`, `SFCCalculate`, `LatheSpeedFeedCalculatorFacade`) — but **not** by `SpeedFeedDeepLearningEngine` (SF-AI-L1), which holds the `calibrationFactors` self-learning state. Outcomes are captured at the calculator layer and discarded before they reach the AI-ladder calibration sink. The "self-learning feedback" the engine header advertises is a dangling wire.
- **verifies_via:** `grep -c "sfcOutcomeWire\|captureSFC" mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts` → expect 0
- **baseline:** 0 hits (confirmed)

---

## Karpathy anti-drift checkpoint (Phase 5) + peer-review correction

On brief? **Yes** — every finding maps to a value-add node and a measurable gap. Actionable, not a catalog — 9 findings → 10 milestone units, ranked by leverage. F5 deliberately *corrects* the brief rather than blindly executing it (R7).

**Phase-4B peer review caught 2 defective findings** (the gate working as designed): the original F6 overstated ("no economic dimension" — false, it exists inline at `UltimateSpeedFeedEngine.ts:1518`), and the original F8 was outright wrong ("baseline: 0 hits" asserted without running the grep — actually 6 hits; the proven-aggregator prior is already wired). Both are corrected above with executed evidence; F9 was added by the reviewer. **Lesson recorded:** a verification channel must be *executed*, not *asserted*, before a baseline is written into an audit.

---

## Recommendation — milestone `SF-PSN-WIRE-MS0`

10 units, domain `speedfeed` (routes to slot juliett), high-ROI ordered:
P0 correctness (U-01) → P1 physics-module composition (U-02..05) → P2 PSN knowledge surfaces (U-06..08) → P3 neural loop-closure + provenance (U-09..10). Full envelope: `mcp-server/data/milestones/SF-PSN-WIRE-MS0.json`.

**Net effect when MS0 ships:** the SF calc resolves a cutting parameter from canonical physics *modules* (not inline), selects a chatter-stable RPM from a real lobe diagram, emits an economic (min-cost) speed, consults shop-proven priors + Obsidian-brain memory + wiki as decision evidence, and feeds every actual-vs-predicted outcome back into the SF-AI ladder — i.e. PSN and the AI systems are properly utilized for accurate **and** cost-efficient cutting parameters.

---

## META artifact (compounding-gains tax)

`scripts/sf-psn-leverage-rank.mjs` — re-runnable; baseline `state/shared/sf-psn-leverage-rank.json`. Re-run after every MS0 unit to confirm `compositionGapPct` falls and `psnSurfacesMissing` shrinks.
