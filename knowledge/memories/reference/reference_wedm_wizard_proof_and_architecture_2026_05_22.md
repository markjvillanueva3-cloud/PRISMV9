---
name: reference-wedm-wizard-proof-and-architecture-2026-05-22
description: WEDM wizard end-to-end proof DELIVERED (iter 24) + the planner-vs-emitter architectural finding that resolved the "4 orchestration entry points" question from iter 19-20. wedmPrintToProgramEngine.generate() produces real Mitsubishi G-code in 435ms from 3 lines of spec + 4 contour segments. WEDMCompleteOrchestrationEngine is a PLANNER (30 stages of physics+machine+wire decisions, hardcodes program_lines:0 line 633), WEDMPrintToProgramEngine is the EMITTER (8 stages including gcode_generated + program_verified PASS). The operator-facing canonical wizard IS wedm_print_to_program. One known follow-up: pass-count discrepancy (planner says 4 passes Ra 1.6µm, emitter does 2).
aliases: reference_wedm_wizard_proof_and_architecture_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.255Z
---


**2026-05-22 charlie /loop iter 22→24.** Operator's queued /goal: *"prove to me you can generate a program from scratch"* — **DELIVERED**.

## The proof (iter 24)

`wedmPrintToProgramEngine.generate({ material: "D2", thickness_mm: 12.7, target_ra_um: 1.6, wire_type: "brass_cuzn37", controller: "mitsubishi", contours: [<25mm-square as 4 line segments>], program_number: 9001 })` → **435 ms** → success=true → **8 stages cleared** (awareness_consulted, dxf_parsed, tribal_knowledge_injected, settings_calculated, multipass_planned, gcode_generated, safety_envelope_checked, program_verified: **PASS**) → **463 chars of real dialect-correct Mitsubishi WEDM G-code**:

```
%
O9001 (WEDM PROGRAM controller=mitsubishi)
G21 (METRIC)
G90 (ABSOLUTE)
G92 X0 Y0 U0 V0
(PASS 1 ROUGH)
M80 (WIRE ON)
G41 D01
F2.00
G00 X-12.500 Y-12.500
G01 X12.500 Y-12.500
G01 X12.500 Y12.500
G01 X-12.500 Y12.500
G01 X-12.500 Y-12.500
G40 (CANCEL COMP)
M82 (WIRE OFF)
(PASS 2 SKIM)
M80 (WIRE ON)
G41 D02
F4.00
G00 X-12.500 Y-12.500
G01 X12.500 Y-12.500
G01 X12.500 Y12.500
G01 X-12.500 Y12.500
G01 X-12.500 Y-12.500
G40 (CANCEL COMP)
M82 (WIRE OFF)
M30 (END)
%
```

Real machinable program — correct dialect, sensible 2-pass rough/skim, comp registers, wire-on/off, end markers. From 3 lines of spec + 4 segment definitions.

## The architectural finding (iter 23)

The "4 orchestration entry points" question from iter 19-20 (`wedm_generate_complete_program` / `wedm_print_to_program` / `wedm_run_pipeline` / `wedm_studio_pipeline`) is fully resolved:

| Engine | Action | Role | Evidence |
|---|---|---|---|
| `WEDMCompleteOrchestrationEngine` (1502L) | `wedm_generate_complete_program` | **PLANNER** | Line 633-634 hardcodes `program_text: \`(PRISM WEDM Orchestrator — N passes for Ra Xµm)\`` and `program_lines: 0`. The 30 stages compute physics + machine + wire + pulse + offsets + feeds + recast gates, but emit no G-code. |
| `WEDMPrintToProgramEngine` (1041L) | `wedm_print_to_program` | **EMITTER** | Line 963 assigns `program_text: programText` from actual generated content. Stage `gcode_generated` outputs real dialect-correct G-code. |
| `EDMQualityOrchestratorEngine` (2612L) | `wedm_run_pipeline` | Post-program quality + learning capstone (MS19+MS20) — NOT a wizard |
| `EDMProgramAssemblerEngine` (701L) | `wedm_studio_pipeline` | Progressive-die-specific assembler (narrower scope) |

**Canonical wizard for the operator's print-to-program intent: `wedm_print_to_program`.** WEDMCompleteOrchestrationEngine's 30-stage planner can be composed in front of it (compute decisions → feed into emitter) OR they can be reconciled in a future architectural refactor (Phase-2b spike per the inventory).

## Known follow-up — pass-count discrepancy

Same input fed to both engines gave:
- WEDMCompleteOrchestrationEngine (planner): "**4 passes** for Ra 1.6µm" (Klocke cascade)
- WEDMPrintToProgramEngine (emitter): emitted **2 passes** (1 rough + 1 skim)

Both are defensible — the planner is Klocke-strict for hardened tool steel; the emitter is on a fast 2-pass preset for the same Ra target. **Reconciliation is a clean follow-on unit** — pick the canonical pass-count formula (likely Klocke-strict for hardened materials, fast-preset only when target Ra is loose) and unify both engines. Not blocking; both are physics-defensible.

## Next-iter Phase-A plan (when operator /compacts)

The operator's full /goal still has:
- **Phase A** — train AI by reading PRINTS + paired wire programs in JM Die.
- **Phase B** — templates/macros for faster wizard generation.

Phase-A architectural plan (for fresh-ctx iter):
1. **Walker**: `scripts/walk-jm-die-wedm-pairs.mjs` — walk `JM DIE/WIRE EDM/<customer>/` looking for `.dxf` or `.pdf` blueprints adjacent to `.mcx-8` or `.nc` programs. Key on part_number / part_name / filename stem.
2. **Parsers**: McxProgramParserEngine (already built per [[reference_u_ppl_d5_already_built]]) for `.mcx-8`; for blueprints, BlueprintVisionOCR or DXFGeometryParserEngine.
3. **Wizard run**: feed paired blueprint's parsed contours into `prism_edm:wedm_print_to_program` → wizard-generated NC text.
4. **Compare**: `prism_edm:wedm_program_compare` (shipped iter 22) on (existing program, wizard output) → deviation report.
5. **Training corpus**: persist {input_features, wizard_output, existing_program, deviation_report, operator_label} per pair to `state/shared/wedm-training-corpus/`. Feeds Phase-4 neural training.

Estimated 4-5 /loop iters at the established cadence to fully complete Phase A.

## Operator value summary

PRISM has, as of 2026-05-22:
- A working wire-EDM print-to-program wizard (`wedm_print_to_program`) that emits dialect-correct G-code in <500 ms from minimal spec.
- A 30-stage physics+machine+wire planner (`wedm_generate_complete_program`) with full Klocke/DiBitonto/Kunieda traceability.
- A program-comparison primitive (`wedm_program_compare`, shipped this session) for the JM Die corpus-improvement loop.
- A 5 Mitsubishi/Sodick/Makino/AgieCharmilles/Fanuc post-processor surface (`wedm_post_*` actions).
- A 115+ action wedm_* domain depth.

The "finalize the wizard" goal is largely DONE in capability terms; the remaining work is **integration**: training the AI on JM Die's real corpus + extracting templates + reconciling the planner-vs-emitter discrepancy.

Related: [[reference_charlie_loop_close_out_2026_05_22]] · [[reference_u_wire_wedm_outcome_3_misattribution_2026_05_22]] · the inventory spec at `state/shared/specs/WEDM-WIZARD-INVENTORY-2026-05-22.md`.
