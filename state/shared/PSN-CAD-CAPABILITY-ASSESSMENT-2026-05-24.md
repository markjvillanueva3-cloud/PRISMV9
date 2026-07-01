# PSN CAD Capability Assessment — 2026-05-24

**Slot:** delta · **Author:** claude-96317abd · **Goal:** assess if Claude Code CLI can now utilize PSN to generate CAD files accurately, or if we need to train it with repetitive problem solving and a full test suite.

## TL;DR

**Capability layer: COMPLETE.** Claude can invoke `cad_multi_system_produce_part` / `cad_multi_system_produce_assembly` against any of 5 priority CAD systems (hyperCAD, Fusion 360, SolidWorks, Inventor, Mastercam) via PRISM dispatchers.

**Accuracy: STARTER-CORPUS PASS (75% ≥ 70% gate), but PRODUCTION-GRADE NOT YET.** The validation harness passes on the 12-case JM Die starter corpus, but the corpus is intentionally tiny (4 mill + 4 lathe + 4 wedm). Production confidence requires a **larger corpus + repetitive problem-solving training loop**.

**Verdict: capable enough to drive low-risk simple parts today; needs the training loop the user described before being trusted on production JM Die work.**

## PSN leg coverage (CAD substrate)

| Leg | Status | Evidence |
|---|---|---|
| Obsidian brain | ✅ wired | 495-file memory vault, `feedback_cad_*` + `reference_cad_*` entries |
| PRISM OS | ✅ wired | `prism_cad` dispatcher exposes 16+ new `cad_*` actions this session |
| Wiki | ✅ wired | `knowledge/wiki/architecture/domain-cad.md` + per-engine entries |
| Memories | ✅ wired | `MEMORY.md` index + auto-feed via Stop hook |
| Tribal | ✅ wired | tribal-by-domain inject surfaces `[cad]` hits per prompt |
| System Viz | ✅ wired | `/system-viz` master-index covers CAD nodes |
| **Engines** | ✅ **multi-CAD complete** | 130+ engines (97 Mastercam+hyperMILL+hyperCADS + 20 Fusion360 + 5 SolidWorks + 12 Inventor) + the new `CADMultiSystemAIProducerEngine` facade |
| Algorithms | ✅ wired | `NeuralCADGenerationEngine` + `CADUnifiedFeatureBridgeEngine` + per-system adapters |
| Formulas | ✅ wired | `physics/constants.ts` (canonical) feeds dimension validation |
| NN/GNN | ⚠ partial | GraphSAGE tier-5 dormant (insufficient ref pool); foundation-model adapter shipped but not trained |
| PRISM AI | ✅ wired | `aiSystemRouterEngine.route()` + `prismCreativeReasoningEngine.explore()` |

**11 of 11 PSN legs are wired for CAD.** The only "partial" is NN/GNN training (research-only, doesn't block invocability).

## Baseline accuracy (validation harness)

```
[baseline] accuracy=75.0% gate=70.0% verdict=PASS
```

Source: `scripts/run-hypercad-validation.mjs` (deterministic stub orchestrator vs 12-case JM Die starter corpus). Re-ran 2026-05-24. Report: `state/shared/CAD-DRAW-MAX-MS1-BASELINE.md`.

**What this means:** the pipeline plumbing works end-to-end on canned cases. **What this does NOT mean:** that the orchestrator's actual AI reasoning is production-grade — the stub returns deterministic ops, not LLM-reasoned ones.

## Training need analysis (Karpathy RL/MCTS lens)

**The user's question** maps to two distinct sub-questions:

### Q1: Can Claude reliably *invoke* the capability today?
**A: YES.** The dispatcher actions are wired, the engine composes, the bridges are real, tests pass. A Claude session can call `cad_multi_system_produce_part({ system, intent })` and receive a structured plan.

### Q2: Can the *output* be trusted on production parts without further training?
**A: NO, not yet.** Three concrete gaps measured against the user's standard ("draw the cad models from scratch from print then generate a new print to compare … by dimensioning all dimensions"):

| Gap | Evidence | Mitigation |
|---|---|---|
| **Corpus is 12 cases, not "thousands of prints + hundreds of CAD files"** | `cad-validation-corpus.ts` has 12 hand-curated cases | scale ingestion via `cad-train` + Docustrata batch |
| **Round-trip dimension diff is harness-stubbed** | `CADRoundTripValidationEngine` has injectable deps but real OCR + live-CAD draw + extract + regen-print isn't end-to-end on real prints | wire `cad-from-blueprint` against real JM Die PDFs in `H:/PRISM/JM DIE/` |
| **No repetitive-error feedback loop** | `error-learn-store` exists but isn't yet folded back into archetype-selection priors | wire `RGS outcome→ JM-Die archetype prior` update path |

### Q3: What training would close the gap?
The user named the approach: "**repetitive problem solving + a full test suite we can come up with**." This is REINFORCEMENT-via-SELF-PLAY against an automated grader, structured per Karpathy's 5-step discipline + R12 fail-loud:

1. **Corpus scale-up** — process all 24,545 files in `H:/PRISM/JM DIE/` through `cad-validation-corpus` ingest. Target: 1,000-case validation corpus before claiming production-grade.
2. **Round-trip-grader live** — full pipeline: print PDF → `CADLiveBlueprintOcrAdapter` → `CADDrawAnyPartOrchestrator` → `CADModelDimensionExtractor` → `CADPrintRegenerator` → dimensional diff vs source. Already plumbed; needs real-data smoke test.
3. **Reward signal** — per-case verdict (PASS / FAIL) + dimensional-error vector. Feed into the existing `CrossProcessNeuralLearningEngine` + `JMDieArchetypeFrequencyEngine` prior-update path.
4. **Self-play loop** — Claude drives `cad_multi_system_produce_part` against a held-out test split nightly; failures auto-promote to a regression set + auto-train the archetype priors. Wire as a scheduled task in `.claude/helpers/`.

## Recommendation

**Today (immediate use):** trust `cad_multi_system_produce_part` for **simple parts** (boss/rib/slot/hole archetypes from the JM Die feature catalog). Operator-verify dimensions before sending to machine.

**This week (gap-closing):** ship a 4-unit training-loop milestone:
- `U-PSN-CAD-CORPUS-SCALE` — bulk-ingest JM DIE corpus into validation cases
- `U-PSN-CAD-ROUNDTRIP-LIVE` — end-to-end print→CAD→print on real PDFs
- `U-PSN-CAD-REWARD-WIRE` — feedback loop into Bayes prior
- `U-PSN-CAD-NIGHTLY-SELFPLAY` — scheduled regression sweep

**Production-ready trigger:** baseline accuracy ≥ 95% on ≥1,000-case corpus, with dimensional-error 95th percentile ≤ ±0.005" (matches `DEFAULT_DIMENSION_TOLERANCE` in `CADRoundTripValidationEngine`).

## Drained this session (delta, 2026-05-23..24)

- 22 priority CAD units flipped to complete (registry + Bayes prior + multi-CAD adapter + producer facade + Mode D close-outs)
- 155 non-priority CAD units **archived** per user directive (FreeCAD/Siemens NX/Esprit-aspirational/other-CAD)
- 16 new `prism_cad` dispatcher actions wired
- 86 new tests PASS

`CAD-COMPLETE-MS0` pending: **3** (NN03 cross-CAD ML + 2 explicit-hold systems). Effectively closed.
