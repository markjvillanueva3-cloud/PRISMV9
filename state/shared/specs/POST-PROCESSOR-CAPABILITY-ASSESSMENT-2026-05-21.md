# Post-Processor Capability Assessment — 2026-05-21

**Scope:** PRISM's post-processor generator surface — engines, dispatcher
actions, the JM Die production `.cps` files, the recent "enhanced" posts, and
the AI/neural/tribal wiring behind them. Asked: what do we have, what works,
and what improvements bring real value.

**Method:** ENGINE_DIGEST enumeration + Explore-agent sweep + direct `git log`
+ direct filesystem inspection of `JM DIE/PRISM MODIFIED POST PROCESSORS/`.
Every finding below carries a re-measurement command so it can be re-audited.

---

## 1. Capability inventory (verified counts)

| Surface | Count | Source |
|---|---|---|
| Post-processor engines in ENGINE_DIGEST | **101** | `grep -ci masterpost\|post.proc... ENGINE_DIGEST.md` |
| Post-engine files on disk (Post/PPG/Master patterns) | ~170 | Explore sweep of `src/engines/` |
| JM Die PRISM-enhanced `.cps` files | **12** | `ls "JM DIE/PRISM MODIFIED POST PROCESSORS/"` |
| Confirmed post-processor commits, last 4 weeks | **1** | `git log --since=2026-04-23` (U-WIRE-BACKLOG-WEDM-POST-ROUTER) |

**Engine families (representative, not exhaustive):**
- **Pipeline core:** PostProcessorPipelineEngine (218 KB, 38-stage), MasterPostProcessorEngine ("Unified Cross-CAM Post Processing Orchestrator"), PostProcessorGeneratorEngine, AdvancedPostProcessorEngine.
- **"Master" engines (≥9 distinct):** MasterPostProcessorEngine, MasterPostGeneratorEngine, MasterPostFineTuningEngine, MasterPostProcessorAGIOrchestrationEngine, MasterPostProcessorGeniusEngine, MasterPostProcessorUnifiedAGIEngine, PostProcessorAGIMasterRegistryEngine, HurcoV11MillMasterPostEngine, + 7× LatheMasterPost* engines.
- **AI/neural (≥5):** PostProcessorVideoKnowledgeNeuralEngine, PostProcessorNeuralNetworkEngine, PostProcessorDeepLearningEngine, PostProcessorDeepIntelligenceEngine, PostProcessorMetaLearningEngine, RLPostProcessorEngine.
- **Knowledge/tribal (≥5):** PostProcessorKnowledgeEngine, PostProcessorKnowledgeGraphEngine, PostProcessorComprehensiveKnowledgeEngine, PostProcessorHyperMillKnowledgeEngine, PostProcessorTribalKnowledgeIntegrationEngine.
- **Machine-specific masters:** HurcoV11MillMasterPost, OkumaB250LatheMasterPost, OkumaOSPMillMasterPost, MitsubishiMV1200RWireEDMMasterPost.

**Dispatcher actions:** post-processor actions span at least `prism_cam`
(`post_*`, `master_post_*`, `pp_*`, `lathe_post*`, `lathe_masterpost_*`) and
`prism_product` (`ppg_*`, ~10 actions). The Explore agent reported much larger
totals (an "801-action ppDispatcher") — **unverified; no `prism_pp` dispatcher
is exposed in the live tool surface.** Treat the exact action count as unknown
pending `prism_session:dispatcher_map_compact`.

## 2. The 12 JM Die enhanced posts ("the ones from a few weeks ago")

`JM DIE/PRISM MODIFIED POST PROCESSORS/`:
- HAAS VF2 Ai-Enhanced (iMachining) — 176 KB
- HURCO VM30i PRISM Enhanced **v8.9.153** — 181 KB (+ identical ` 2.cps` copy)
- HURCO VM30i PRISM **v10_9 DRILLFIX** — 863 KB
- HURCO VM30i PRISM **v11** — 792 KB
- OKUMA M460V-5AX Ai-Enhanced (iMachining) — 171 KB
- OKUMA Genos L400II P300LA Ai-Enhanced — 142 KB
- OKUMA Lathe LB3000 Ai-Enhanced — 148 KB (+ ` 2.cps` copy)
- OKUMA Multus B250IIW PRISM Enhanced **v5_2_7** — 228 KB (+ identical ` 2.cps` copy)
- PRISM-Master-Hurco-VM30i — 28 KB
- Roku-Roku Ai-Enhanced — 210 KB

Controllers in JM Die production: **Okuma (OSP), Haas, Hurco, Mitsubishi,
Roku-Roku.** All posts are Fusion 360 `.cps` derivatives (consistent with the
"base Fusion post + PRISM layer, never write CPS from scratch" doctrine).

---

## 3. Findings — ranked by leverage

### F1 — Engine sprawl is the dominant problem (HIGH)
101 digest entries / ~170 files for one capability domain, with ≥9 "master"
engines and ≥5 each of AI and knowledge engines that visibly overlap in
purpose. `MasterPostProcessorEngine` is already labelled the "Unified
Cross-CAM Post Processing Orchestrator" — yet eight sibling masters exist.
This is the most over-built domain surveyed.
*Verify:* `grep -ci masterpost mcp-server/data/docs/ENGINE_DIGEST.md` → baseline 101.

### F2 — No single canonical entry point (HIGH)
With ≥9 masters and actions split across `prism_cam` + `prism_product`, a
caller cannot tell which engine is authoritative. Fragmentation, not missing
capability, is the gap.
*Verify:* `prism_session:dispatcher_map_compact` — count post/ppg/master_post action owners.

### F3 — AI/neural/tribal synergy already EXISTS but is scattered (MEDIUM)
The goal asked to "synergize with AI/neural/tribal" — that wiring is already
present (PostProcessorVideoKnowledgeNeuralEngine, RLPostProcessorEngine,
PostProcessorTribalKnowledgeIntegrationEngine, `pp_ai_*`/`pp_tribal_*`/
`pp_neural_*` families). The work is not *building* synergy — it is
*consolidating* synergy that is spread thin across many engines.
*Verify:* `grep -l "TribalKnowledge\|NeuralNetwork" src/engines/PostProcessor*.ts`.

### F4 — Enhancement velocity is low relative to surface size (MEDIUM)
101 engines, but only **1** confirmed post-processor commit in the last 4
weeks. A large surface that is not actively maintained accumulates dead code.
*Verify:* `git log --oneline --since=<4wk> -- "*Post*"` → baseline 1.

### F5 — JM Die `.cps` files are hand-versioned with copy-drift (MEDIUM)
Hurco VM30i exists at v8.9.153 / v10_9 / v11; Multus B250IIW and LB3000 each
have byte-identical ` 2.cps` duplicate copies. Versions are advanced by hand,
and there is no visible programmatic regen path (PRISM-layer → `.cps` output).
Hand-versioning is how `v8.9.153` and `v8.9.153 2` diverge silently.
*Verify:* `ls "JM DIE/PRISM MODIFIED POST PROCESSORS/"` — 12 files, 3 dup copies.

---

## 4. Improvement ideas — ranked by value

### I1 — Post-processor capability census (HIGHEST leverage, ~1 unit)
Run a census of all 101/170 engines: live (dispatcher-wired + tested) vs
dormant vs dead. Output a ranked retire/merge/keep list. Without this, every
other improvement is guesswork. This is the compounding-gains artifact — a
re-runnable `post-processor-census.mjs`.
*Value:* turns 170 unknowns into a 3-bucket decision list.

### I2 — Declare ONE canonical MasterPost facade (~1 unit)
`MasterPostProcessorEngine` already self-describes as the unified orchestrator.
Make it the single documented entry; tag the other 8 masters `// SUPERSEDED-BY`
or fold them in. One entry point, not nine.
*Value:* callers stop guessing; new post work has one home.

### I3 — Programmatic `.cps` regen + version ledger (~2 units, HIGH value)
Close the loop the goal implies: PRISM-layer config → emit `.cps` →
content-hashed version stamp → write to `PRISM MODIFIED POST PROCESSORS/`.
Kills the hand-versioning copy-drift (F5) and makes "enhance the Hurco post"
a reproducible operation instead of a manual file edit.
*Value:* every future post enhancement becomes auditable + reproducible.

### I4 — Tribal feedback loop: shop-floor edit → tribal tip → next gen (~2 units)
When an operator hand-edits generated G-code on the machine, capture the
delta as a tribal tip keyed by `controller+operation`; feed it into the next
post generation. The tribal + neural engines to do this already exist (F3) —
this just wires the *outcome* side.
*Value:* the post-processor learns from the shop floor instead of from corpora only.

### I5 — Neural dialect-mismatch pre-flight gate (~1 unit)
Controller-dialect mismatch (Fanuc M-code emitted for an Okuma OSP control,
G93/G94/G95 feed-mode confusion) is the classic post bug. A neural classifier
that flags "this G-code body does not match the declared controller" before
DNC transfer is a cheap, high-safety win. PostProcessorNeuralNetworkEngine
can host the classifier.
*Value:* catches the #1 class of "post needs edits on the machine" failures.

---

## 5. Recommended next unit

**I1 — post-processor capability census.** It is the prerequisite for I2 and
de-risks the entire domain: you cannot consolidate 170 engines safely without
first knowing which are live. It also emits a re-runnable measurement tool,
so the assessment compounds instead of going stale.

*Re-audit this whole document:* re-run the four §1 verify commands; any count
moving materially is a signal to refresh.

---

## 6. Census (I1) — wired vs unwired, verified 2026-05-21

Sourced from canonical tooling (`scripts/audit-unwired-engines.mjs`, run
2026-05-21 → `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json`), then each
hit spot-checked against `camDispatcher.ts` to strip false positives.

**Audit raw:** 17 of 633 unwired engines name-match the post-processor pattern.
**After false-positive strip:** 6 are actually wired, **11 are genuinely dark.**

### False positives — audit missed the wiring (6)
`LatheMasterPost{API,DeepReasoning,EnsembleCrossCheck,RegressionMatrix,Router,
UnifiedOutput}Engine` — `camDispatcher.ts` carries **104 references** to
LatheMasterPost engines via the `lathe_masterpost_*` action family. The
audit's table-driven detection does not follow the lazy dynamic-import string
pattern these use. *Secondary finding:* `audit-unwired-engines.mjs` under-
reports wiring for lazy-imported engines — worth a detector patch.
*Verify:* `grep -oE "LatheMasterPost[A-Za-z]+" mcp-server/src/tools/dispatchers/camDispatcher.ts | sort -u`.

### Genuinely UNWIRED — built but invokable nowhere (11)
| Engine | Size | Note |
|---|---|---|
| WEDMPostMitsubishiEngine | 12K | WEDM controller dialect — dark |
| WEDMPostSodickEngine | 10K | WEDM controller dialect — dark |
| WEDMPostMakinoEngine | 10K | WEDM controller dialect — dark |
| WEDMPostAgieEngine | 10K | WEDM controller dialect — dark |
| WEDMPostFanucEngine | 10K | WEDM controller dialect — dark |
| WEDMPostTypes | 4K | types file — likely `// WIRE-EXEMPT` candidate |
| LathePostProcessorAIEngine | 73K | largest dark engine — lathe AI post |
| LathePostGeneratorActiveLearningEngine | 18K | active-learning post gen |
| LatheMasterPostSelfAwarenessEngine | 29K | the one LatheMasterPost sibling NOT wired |
| JMDiePostProcessorLearningEngine | 21K | JM-Die-specific post learning — dark |
| PostProcessorUnificationEngine | 4K | unification orchestrator — dark |

### Census finding (HIGH)
The **5 WEDM controller-dialect post engines** (Mitsubishi, Sodick, Makino,
Agie, Fanuc) are the standout: an entire WEDM post-processor controller matrix
is built and tested but reachable from no dispatcher. Wiring those 5 + the
73K LathePostProcessorAIEngine + JMDiePostProcessorLearningEngine is the
concrete, low-risk follow-on to I1 — capability already exists, only the
dispatcher case + schema + enum are missing.
*Verify:* `node scripts/audit-unwired-engines.mjs` then filter the JSON for the post pattern.
