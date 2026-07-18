# SPEC — Lathe Quality Testing Pipeline (whiskey iter6 / 2026-05-26)

> **Status:** design spec — orchestrator skeleton ships in same commit at
> `scripts/lathe-quality-pipeline.mjs`. Wiring into the
> `prism_lathe` dispatcher is a P0 follow-up.
> **Slot:** whiskey · **Milestone:** WHISKEY-ACADEMY-LATHE-BRIDGE-MS0

## Purpose

Audit the JM-Die `.MIN` lathe-program corpus (~15,251 files across 119+ customer folders) by running each program through a **10-stage quality pipeline** that combines:

1. The **14-vendor master tribal index** (87+ grades) shipped iter3
2. The **academy course-5 priors** (6 turning ToolTypes) shipped iter1
3. The **186 page-anchored lathe records** shipped iter5
4. The existing 40+ `Lathe*` engines (`LatheAITrainingEngine`, `LatheCSSOptimizerEngine`, `LatheChipMechanicsEngine`, `LathePrintSequencePlannerEngine`, `LathePostProcessor`, `BoringBarDeflectionEngine`, etc.)

The pipeline compares **3 program versions per part** and emits a delta:

| Version | Source | Quality expectation |
|---|---|---|
| **A** Amateur original | `JM DIE/CNC LATHE/<cust>/<part>/<orig>.MIN` | known-amateur (operator feedback: see `feedback_box_programs_amateur`) |
| **B** Box-upgraded | Previous AI pass over A | also-amateur (per operator: "you made upgraded version… need to double check now that we have more knowledge") |
| **C** Whiskey-iter-N AI | This session's AI using the 14-vendor index + course-5 priors + 186 lathe pages | hypothesis: net-quality wins over both A and B |

## Pipeline stages

| # | Stage | Engine / data source | Output |
|---|---|---|---|
| 1 | **PROGRAM PARSE** | `LatheAITrainingEngine.parseProgram(minPath)` | `ParsedProgram{tool_blocks, operation_sequence, params}` |
| 2 | **TOOL VALIDATION** | per `tool_block`: lookup `insert_code` in master tribal index → expected `ISO range × Vc × DOC × feed` | `ValidationIssue[]` flagging out-of-range params |
| 3 | **MATERIAL × TOOL × OP CONSISTENCY** | `wizard_query_records` recommends first-choice insert family for (material ISO, operation); program's actual choice → match score | `ConsistencyDelta{expected, actual, score}` |
| 4 | **SPEED/FEED PHYSICS** | `UltimateSpeedFeedEngine` + `LatheCSSOptimizerEngine` recompute optimal `(Vc, fz, ap)` for (material, tool, op) | `PhysicsDelta{Δ_Vc, Δ_fz, Δ_ap, %_change}` |
| 5 | **CHATTER STABILITY** | `ChatterStabilityLobe` for (tool, holder, spindle) tuple; program's `(Vc, ap)` plotted against stability lobe | `StabilityFlag{stable | unstable | marginal}` |
| 6 | **TOOL DEFLECTION** | `BoringBarDeflectionEngine` for boring ops (L/d > 4 triggers); `LatheAuxAxisTimingEngine` for live-tool moves | `DeflectionFlag{ok | excessive_LD | mitigation_needed}` |
| 7 | **CHIP CONTROL** | `LatheChipMechanicsEngine` + chipformer geometry from vendor index (-GN/-PP/-NR/-VL suffix) | `ChipFlag{controlled | stringy_risk | break_risk}` |
| 8 | **OPERATION SEQUENCE** | `LathePrintSequencePlannerEngine` proposes ideal sequence; compare against program's actual sequence | `SequenceScore` + ordering delta |
| 9 | **POST-PROCESSOR** | `LathePostProcessor` re-emits the program from the AI's plan in controller dialect (Fanuc/Okuma/Haas/Mazak); diff vs source | `PostDelta{line-by-line diff, controller_correctness}` |
| 10 | **AGGREGATE QUALITY SCORE** | weighted sum across stages 2-9; weights: tool-validation 20%, physics 20%, sequence 15%, stability 15%, chip 10%, deflection 10%, post 10% | `QualityScore ∈ [0, 100]` |

## Comparison output

For each part the pipeline emits a `LatheQualityReport`:

```json
{
  "part_id": "...",
  "material": "M2 tool steel",
  "iso_group": "H",
  "versions": {
    "A_amateur":  { "quality_score": 42, "flags": [...] },
    "B_upgraded": { "quality_score": 58, "flags": [...] },
    "C_iter6_ai": { "quality_score": 81, "flags": [...] }
  },
  "delta_A_to_C": +39,
  "delta_B_to_C": +23,
  "operator_review_required": true | false
}
```

## Operator gate

Per `feedback_box_programs_amateur` doctrine, the AI is NOT trusted to auto-promote C over A/B. Every report goes to operator review. The pipeline's job is to **surface the deltas with citations** so the operator can validate the AI's reasoning (every flag carries a `physics_basis` pointing to a vendor URL or wiki entry).

## Wiring into existing surfaces

| Surface | How |
|---|---|
| `prism_lathe:run_quality_pipeline` | new dispatcher action (follow-up: `U-LATHE-QUALITY-PIPELINE-DISPATCHER`) |
| `/lathe-quality-audit` skill | invokes the orchestrator against a directory or single file |
| `/system-viz` `ghost.lathe_quality_pipeline` | renders each part's quality score as a colored node (red = score < 50, yellow 50-75, green 75+) |
| `LatheActiveLearningEngine` | every operator-confirmed correction feeds the next training round |

## Smoke test target

Iter6 ships:
- `scripts/lathe-quality-pipeline.mjs` — orchestrator skeleton (pure-fn stage runners + CLI)
- `scripts/lathe-quality-pipeline.test.mjs` — stage-by-stage tests against synthetic + real `.MIN` snippets

Follow-up units:
- `U-LATHE-QUALITY-PIPELINE-DISPATCHER` (P0) — wire into `prism_lathe` MCP action
- `U-LATHE-QUALITY-FULL-CORPUS-RUN` (P1) — run against all 15,251 JM-Die `.MIN` files (long-running batch)
- `U-LATHE-QUALITY-SYSTEM-VIZ-ROOST` (P2) — `/system-viz` ghost roost for live quality dashboard
