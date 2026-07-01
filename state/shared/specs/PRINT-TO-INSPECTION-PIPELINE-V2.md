# Print-to-Inspection Pipeline V2 — operator-facing 9-stage spec (AMENDED post peer-review + ACServer audit)

> Companion to `CAD-PIPELINE-AUDIT-2026-05-20.md` and `ACSERVER-BRIDGE-AUDIT-2026-05-20.md`.
> Specializes the broader DOMAIN-PIPELINE-MS0 18-stage canonical pipeline onto
> the user's specific brief: print upload → CAD → hyperMILL → setup → CAM →
> sim → post → setup-sheet → inspection.
>
> **TWO ROUTES** per the operator's design-in-setup-assembly insight:
> - **Route A — hyperCAD-S setup-first** (preferred when target CAM is hyperMILL): model the part directly in an assembly that already holds the stock + fixture + machine envelope. No STEP round-trip. No GD&T propagation gap. Stages 2–3 collapse into one. **Gated on the ACServer bridge build (~2 sessions of work — see ACSERVER-BRIDGE-AUDIT for details).**
> - **Route B — Fusion 360 → STEP → hyperMILL** (works TODAY): the original V2 flow with Stage 2.5 GD&T side-channel. Ships now; works without any new bridge work.
>
> **Status: AMENDED 2026-05-20** post peer-review. Four composition bugs
> resolved:
> 1. GD&T side-channel between Stage 2 and Stage 3 (STEP AP203/AP214 doesn't
>    carry GD&T; Fusion 360's default export doesn't write AP242).
> 2. HARD BLOCK at Stage 4 on machine-envelope mismatch (was warning).
> 3. Inspection routing table expanded — surface plate + height gauge +
>    optical comparator added (standard metrology for a die/mold job shop).
> 4. V2 delta re-labeled "net-new orchestration" not "composition only" —
>    the conditional branching and side-channel handoffs are real new logic.

## Route selector

The orchestrator picks Route A or Route B based on (a) target CAM platform and
(b) whether the OPEN MIND ACServer bridge is available on the host.

```
IF target CAM == "hypermill" AND ACServer bridge healthy:
   → Route A (setup-first in hyperCAD-S)
ELSE IF target CAM == "hypermill" AND ACServer bridge NOT healthy:
   → Route B with cadPlatform="fusion360"   (today's only working path)
ELSE IF customer requires native .f3d / .sldprt / .ipt file:
   → Route B with the matching cadPlatform
ELSE IF batch-headless / no-UI workflow:
   → Route B with cadPlatform="cadquery"   (Python → STEP, no app)
ELSE:
   → Route B with cadPlatform="fusion360"   (PRISM default, deepest substrate)
```

The orchestrator MUST emit a `routeChosen: "A" | "B"` field with the
selection rationale so the operator can override if needed.

## Route A — hyperCAD-S setup-first (preferred when ACServer bridge ships)

### What changes vs Route B

| Aspect | Route B (Fusion → STEP → hyperMILL) | Route A (hyperCAD-S setup-first) |
|---|---|---|
| Stage 2 (CAD_GEN) location | Fusion 360 Design workspace | hyperCAD-S, inside the assembly that becomes the hyperMILL setup |
| Stage 2.5 (GD&T handoff) | Required (STEP doesn't carry GD&T) | **Eliminated** — assembly carries all semantics |
| Stage 3 (CAM_TRANSFER) | Real handoff step (STEP + side-channel) | **Collapsed into Stage 2** — same document, no transfer |
| Stage 4 (SETUP_GEN) | Defined after the model exists | Defined BEFORE the model (assembly is the setup) — modeling is constrained by the fixture/stock from the start |
| Coordinate system | Set at STEP import; risk of drift between CAD WCS and CAM WCS | Single WCS owned by the assembly — no drift possible |
| Operator UX | Two apps, two coordinate systems, two file formats | One app, one assembly, one coordinate system |

### Route A stage map

| # | Stage | Where it happens | Engines |
|---|---|---|---|
| 0 (new) | SETUP_FRAME | Operator opens or composes the assembly: machine envelope + fixture + stock placed first | `ShopConfigurationEngine`, `MachineEnvelopeGuardEngine`, `WorkholdingViabilityEngine` (informs the placed-fixture choice) |
| 1 | PRINT_INTAKE | Same as Route B | `BlueprintVisionOCREngine`, `PrintReadingEngine`, etc. |
| 2 | **CAD_GEN_IN_SETUP** | Model the part as a body inside the SETUP_FRAME assembly. Constraints reference the stock and fixture directly — designed-for-machining from the first sketch. | `HyperCADSAutomationEngine` (generates AC Python), `PrintToHyperCADSBridge` (composes import + heal + workpiece-assign), pending `HyperMillAutomationBridge` (Track 1 of ACSERVER-BRIDGE-AUDIT) |
| ~~2.5~~ | ~~GDT_HANDOFF~~ | **Eliminated under Route A** — GD&T lives in the assembly natively | — |
| ~~3~~ | ~~CAM_TRANSFER~~ | **Collapsed into Stage 2** — already in the same hyperMILL document | — |
| 4 | SETUP_GEN | Already done at Stage 0; here this stage validates and locks the setup | Same as Route B (HARD BLOCK on envelope/fixture mismatch) |
| 5 | CAM_PROG | hyperMILL CAM operations run against the assembly directly. PRISM toolpath injection still available via `MillingPrintToProgramEngine` etc. | Same as Route B |
| 6 | SIMULATE | hyperMILL Virtual Machining in-place | Same as Route B |
| 7 | POST_PROCESS | Same as Route B | Same as Route B |
| 8 | SETUP_SHEET | Same as Route B; `HyperMillSetupSheetBridge` renders the OPEN MIND native format | Same as Route B |
| 9 | INSPECTION | Same as Route B (expanded routing table for surface plate, height gauge, optical comparator) | Same as Route B |

### Route A prerequisites (not yet built — see ACSERVER-BRIDGE-AUDIT)

| Prerequisite | Status today | Cost to ship |
|---|---|---|
| TS-side AC HTTP server (HyperMillACBridgeEngine, E1144) | **MISSING** — config exists, server doesn't | ~300 LOC |
| HyperMillAutomationBridge orchestrator | **MISSING** | ~200 LOC |
| Real AC session handshake (beyond TCP probe) | **MISSING** | ~50 LOC patch |
| Host-side `prism_ac` Python module | **NOT IN PRISM REPO** — must be installed per hyperMILL workstation | ~150 LOC + installer |
| Live round-trip E2E test | **MISSING** | ~150 LOC |
| `prism_cam:hypermill_drive` dispatcher action | **MISSING** | ~50 LOC |

**Total: ~900-1100 LOC + one host-side Python install per workstation. ~2 focused sessions with per-file scrutiny gates.**

### Route A failure modes (additional to Route B's)

| Failure | Detect at | Surface as |
|---|---|---|
| ACServer not reachable on `:18365` | Stage 0 / route-selector | Fall through to Route B with `cadPlatform=fusion360`; emit a warning |
| hyperMILL license missing or expired | Stage 0 | Abort with license-renewal pointer |
| `prism_ac` Python module missing on host | first script execution | Surface install instructions + fall through to Route B |
| AC version mismatch (TS expects v33.0, host has v32.x) | first script execution | Block with compat-matrix link |
| Operator manually edited the assembly during Stage 5–7 | Stage 6/7 reads stale assembly state | Re-snapshot the assembly, warn operator, continue OR HARD BLOCK if structural change |

## Stage map (Route B — works TODAY)

| # | Stage | Default platform | Engines that compose it |
|---|---|---|---|
| 1 | PRINT_INTAKE | n/a | `BlueprintVisionOCREngine`, `PrintReadingEngine`, `PrintLibraryEngine`, `PrintToGeometryEngine` |
| 2 | CAD_GEN | **Fusion 360** | `PrintToFusion360Bridge`, `Fusion360LiveBridgeEngine`, `Fusion360CADGeneratorAdapter`, `CADClassFeatureLibraryEngine`, `CADSystemRouterEngine` |
| 2.5 | **GD&T_HANDOFF** (new) | orchestrator-internal | side-channel payload (see §GD&T propagation) |
| 3 | CAM_TRANSFER | **hyperMILL** | `PrintToHyperMillBridge`, `HyperMillSchemaUnifier`, `HyperMillCycleParameterPipeline`, `HyperMillPPPInputAdapter` |
| 4 | SETUP_GEN | machine-driven | `ShopConfigurationEngine` (21-machine fleet), `MachineEnvelopeGuardEngine`, `MachineCapabilityEngine`, `WorkholdingViabilityEngine`, `LathePrintSetupSelectionEngine` |
| 5 | CAM_PROG | **hyperMILL + PRISM toolpath injection** | `HyperMillStrategyEngine`, `HyperMillCycleDefaultsEngine`, `HyperMillMultiAxisEngine`, `CrossCamRecommenderEngine`, `MillingPrintToProgramEngine`, `TurningPrintToProgramEngine`, `MultiAxisPrintToProgramEngine`, `WEDMPrintToProgramEngine` |
| 6 | SIMULATE | **hyperMILL** | `HyperMillSafetyHooks`, `Fusion360SafetyHooksEngine`, `CollisionCheckFull` (`prism_safety:collision_check_full`) |
| 7 | POST_PROCESS | per-machine | `MasterPostProcessorEngine`, `MasterPostProcessorAGIOrchestrationEngine`, `OkumaOSPMillMasterPostEngine`, `OkumaB250LatheMasterPostEngine`, `HurcoV11MillMasterPostEngine`, `MitsubishiMV1200RWireEDMMasterPostEngine`, `LatheMasterPostRouterEngine` |
| 8 | SETUP_SHEET | platform-agnostic | `SetupSheetEngine`, `SetupSheetFromGCodeEngine`, `SetupSheetLibraryEngine`, `SetupSheetPipelineEngine`, `HyperMillSetupSheetBridge` |
| 9 | INSPECTION | metrology-driven | `FirstArticleInspectionPipelineEngine`, `TurningInspectionPlanEngine`, `WetRunSampleInspectionPlanEngine`, `CMMPathPlanningEngine`, `ProbeRoutineGeneratorEngine` |

## GD&T propagation (peer-review composition bug — addressed via new Stage 2.5)

**The bug:** STEP AP203 and AP214 (Fusion 360's default export formats)
carry geometry only — they do NOT embed semantic GD&T (datums, feature
control frames, tolerance values). STEP AP242 does, but Fusion 360 does
not natively export AP242 in all configurations. So if Stage 3
(CAM_TRANSFER) receives only the STEP file from Stage 2, hyperMILL gets
geometry with no tolerance semantics — and Stage 7 (POST_PROCESS) can't
know which features need tight-tolerance feeds or which surfaces need a
finish pass.

**Resolution:** Stage 2.5 is an orchestrator-internal side-channel handoff
that propagates the Stage 1 OCR payload (GD&T, surface finish, material
spec, tolerance budget) directly into the Stage 3 input alongside the
STEP. The orchestrator owns this transfer; the STEP is the geometry
carrier, the side-channel is the semantics carrier.

```typescript
interface GDTSideChannel {
  source: "stage_1_ocr";
  dimensions: Array<{ id: string; nominal: number; tol: { upper: number; lower: number; itGrade?: string } }>;
  gdt: Array<{ featureId: string; symbol: string; tolerance: number; datums: string[] }>;
  surfaceFinish: Array<{ featureId: string; ra: number; rz?: number; lay?: string }>;
  materialSpec: { uns?: string; aisi?: string; iso?: string; heatTreat?: string };
  attachToStageInputs: ["stage_3", "stage_5", "stage_7", "stage_9"];
  // Survives across stages — Stage 9 (INSPECTION) needs the full dimensions
  // list to generate the per-feature inspection card.
}
```

**Acceptance:** the orchestrator's result includes `gdtSideChannel` echoed
at Stages 3, 5, 7, and 9 with field-by-field consistency check between
Stage 1 source and Stage N consumer. Any drop = R12 fail-loud.

**Alternative considered + rejected:** export STEP AP242 from Fusion 360
via plugin extension. Rejected because (a) Fusion's AP242 support is
intermittent across versions, (b) downstream hyperMILL AP242 ingestion is
also uneven, (c) keeping the side-channel orchestrator-owned isolates the
risk to one place we control.

## Glue spec — the missing piece

A single composition engine is needed to chain these stages with operator
visibility per stage and Karpathy R12 fail-loud at every boundary. Proposed
name (subject to `duplicationGuardEngine.mustCheckBeforeCreating()`):
`PrintToInspectionOrchestratorEngine`. The duplication guard will likely
route the work into the existing `PrintToProgramPipelineEngine` instead —
that engine already does stages 1–4 + 7 in its 5-stage flow; the V2
extension adds stages 5–6 and 8–9 as named, per-stage `StageResult`
objects in its output payload, plus the Stage 2.5 side-channel.

### Operator API (target)

```typescript
const result = await printToInspectionOrchestrator.run({
  printPath: "H:/prism/JM DIE/CNC LATHE/ALCOA/part-2475-037.pdf",
  cadPlatform: "fusion360",         // default
  camPlatform: "hypermill",         // default
  targetMachine: "okuma-osp-mill",  // resolved from ShopConfigurationEngine
  injectPRISMToolpaths: true,       // user brief
  inspectionTools: ["mitutoyo-mic", "starrett-caliper", "cmm-zeiss", "surface-plate", "height-gauge", "optical-comparator"],
});
// result.stages[1..9].{ok, ms, payload, warnings, hardFail}
// result.gdtSideChannel — Stage 2.5 payload, echoed at consumer stages
// result.outputs: { stepFile, hyperMillProject, gCode, setupSheet, inspectionReport }
```

### Per-stage contract (each stage MUST emit)

```typescript
interface StageResult<T> {
  stage: 1 | 2 | "2.5" | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  stageName: string;       // "CAD_GEN", "GDT_HANDOFF", etc.
  ok: boolean;
  ms: number;              // duration
  payload?: T;             // stage-specific
  warnings: string[];
  hardFail?: { reason: string; reproduce: string };
  // hardFail propagates upstream — Karpathy R12 — never silent
}
```

## Stage-by-stage best practices

### Stage 1 — PRINT_INTAKE
- Accept PDF, PNG, JPG, TIFF.
- OCR via `BlueprintVisionOCREngine` (multi-vendor: eDOCr2 / vision-LLM / Tesseract).
- Title-block fields, dimensions, GD&T, surface finish, material spec → structured payload.
- Confidence per extracted field; below 0.7 → operator-confirm dialog with the visual region highlighted.

### Stage 2 — CAD_GEN (Fusion 360)
- Resolve part class (rev / prismatic / sheet / freeform) via `CADClassFeatureLibraryEngine`.
- Use class template to drive `Fusion360LiveBridgeEngine` (`:18360`) with typed primitives.
- **Order of operations for the CAD build itself:**
  1. Sketch base profile on the XY work plane.
  2. Extrude / revolve to solid.
  3. Cut major features in size order (largest pockets first → smallest holes last).
  4. Apply chamfers / fillets LAST (per CADClassFeatureLibraryEngine `buildSequenceFor` PHASE9 spec).
  5. Export STEP for downstream CAM ingestion.
- Fidelity score < 0.85 → flag for operator review before continuing.

### Stage 2.5 — GD&T_HANDOFF (orchestrator-internal side-channel)
- Attaches the Stage 1 OCR payload (dimensions + tolerances + GD&T + surface finish + material) to the orchestrator state.
- Echoed at Stages 3, 5, 7, 9 as immutable input.
- HARD BLOCK if any Stage-1 toleranced dim is missing a Stage-3 consumer reference (catches silent drop).

### Stage 3 — CAM_TRANSFER (hyperMILL)
- Hand off STEP via `PrintToHyperMillBridge` and `HyperMillSchemaUnifier`.
- **Inject GD&T side-channel** from Stage 2.5 into `HyperMillPPPInputAdapter` — material spec + tolerance + GD&T payload flows through PPP, not through the STEP file.
- HARD BLOCK if the PPP rejects any side-channel field.

### Stage 4 — SETUP_GEN (HARD BLOCK on envelope mismatch — peer-review fix)
- Read live shop state via `ShopConfigurationEngine.getProfile("jm-die")` — 21-machine fleet.
- Match by envelope + kinematics + spindle HP via `MachineEnvelopeGuardEngine`.
- **HARD BLOCK** if part envelope exceeds machine envelope — a part that won't fit is a tool/fixture crash risk, not a warning. Operator may resolve by:
  (a) picking a different machine,
  (b) changing stock orientation,
  (c) reducing the part envelope (e.g., dropping a feature to a secondary op).
- Pick workholding via `WorkholdingViabilityEngine`: vise + stop (mill), 3-jaw (lathe), 3R (wire EDM); apply force gate.
- Fixture-collision pre-check via `prism_safety:check_fixture_clearance` — also HARD BLOCK on collision verdict (not warn).

### Stage 5 — CAM_PROG (with PRISM toolpath injection)
- Default route: hyperMILL strategy auto-select via `HyperMillStrategyEngine`.
- **PRISM-injection override:** when the operator opts in OR the hyperMILL default fails a safety gate, inject PRISM-native toolpaths via the domain-specific PrintToProgram engines and have hyperMILL consume the path as imported geometry.
- Speeds/feeds always from `AutoSpeedFeedEngine` (Kienzle force + Taylor life + machine HP budget — canonical `physics/constants.ts`).
- Cross-CAM blind spot detection via `CrossCamRecommenderEngine`.
- HARD BLOCK on `S(x) < 0.98` (shop_floor tier).

### Stage 6 — SIMULATE (hyperMILL)
- hyperMILL Virtual Machining for swept-volume + machine-kinematic articulation.
- Cross-check via `prism_safety:collision_check_full` for an independent mathematical pass.
- BVH-based fast pre-screen via `prism_calc:bvh_raycast` before the full sim runs.
- HARD BLOCK on any collision verdict — operator must resolve, no auto-override.

### Stage 7 — POST_PROCESS
- Match machine to master post via `LatheMasterPostRouterEngine` (lathe) or the milling equivalent.
- If a perfect per-machine post exists (`OkumaOSPMillMasterPostEngine`, `OkumaB250LatheMasterPostEngine`, `HurcoV11MillMasterPostEngine`, `MitsubishiMV1200RWireEDMMasterPostEngine`) use it directly.
- Otherwise fall through to `MasterPostProcessorEngine` + `MasterPostFineTuningEngine` (generates a per-machine perfect post from the canonical master + machine fingerprint).
- AGI uncertainty pass via `MasterPostProcessorAGIOrchestrationEngine` — surfaces any ambiguous translation (M-code dialect, canned-cycle availability).
- Use GD&T side-channel to bias finish-pass parameters for tight-tolerance features.

### Stage 8 — SETUP_SHEET
- Generate from G-code (not from CAM tree) via `SetupSheetFromGCodeEngine` — survives format conversion + handles edited G-code that drifts from the CAM tree.
- Library-backed via `SetupSheetLibraryEngine` for shop-standard tool numbering + fixture call-outs.
- For hyperMILL-native rendering use `HyperMillSetupSheetBridge` (matches Open Mind's own format).

### Stage 9 — INSPECTION (measurement-tool-aware — expanded post peer-review)

Reads `inspectionTools` operator input. Matches each toleranced dim/feature
from the Stage 2.5 side-channel to the most appropriate available tool.

**Measurement-tool routing table (expanded per peer review):**

| Feature type | Primary tool | Fallback chain |
|---|---|---|
| Bore Ø > 6 mm, IT6–IT9 | Bore gauge | Pin gauge → CMM |
| Bore Ø ≤ 6 mm | Pin gauge | CMM |
| External Ø, IT6–IT9 | Micrometer | Caliper → optical comparator → CMM |
| External Ø, IT > IT9 | Caliper | Micrometer |
| Linear distance, IT6–IT9 | Caliper | Height gauge (with surface plate) → CMM |
| Linear distance, IT > IT9 | Caliper | — |
| **Step height, shoulder height** (new) | **Height gauge + surface plate** | Depth mic → CMM |
| **Shoulder squareness, parallelism** (new) | **Surface plate + indicator on height stand** | CMM |
| **2D profile, complex form, small radii** (new) | **Optical comparator** | CMM with form-error analysis |
| **Thread form, pitch verification** (new) | **Optical comparator** | Thread Go/No-Go gauges → CMM threading probe |
| Surface finish Ra | Profilometer (Mitutoyo SJ-210 or equiv) | — (no good fallback) |
| True position / GD&T (Ø, ⊥, ∥, ⌀, ⌖) | CMM (Zeiss / Hexagon) | Surface plate + indicators for simple cases |
| Thread internal / external (class fit) | Go/No-Go gauges (per thread class) | — |
| Surface flatness, free-form | CMM with form-error analysis | Surface plate sweep for first-pass |

**Why these additions matter for JM Die's shop:**
- **Surface plate + height gauge** — primary shop-floor tool for step
  heights, shoulder squareness, and parallelism. Faster + cheaper than
  CMM for go/no-go decisions. Every die/mold shop has at least one.
- **Optical comparator** — first-reach for any 2D profile feature
  (thread forms, complex contours, small radii). Faster than CMM for
  profile-only checks, often more reliable for small features the CMM
  probe can't reach.

**Output:** per-dimension inspection card with tool, expected reading,
tolerance band, measurement steps, and a fallback chain in case the
primary tool isn't available on the day.

Route through `FirstArticleInspectionPipelineEngine` for FAI generation,
`ProbeRoutineGeneratorEngine` for in-machine probe routines,
`CMMPathPlanningEngine` for CMM program generation. Stage 2.5 side-channel
provides the full dimension list — no stage drops any toleranced feature.

## Failure modes the orchestrator must handle (R12 fail-loud)

| Failure | Detect at | Surface as |
|---|---|---|
| OCR confidence < 0.7 on any toleranced dim | Stage 1 | operator-confirm dialog, do NOT proceed |
| Fusion 360 live bridge offline (`:18360` unreachable, or MISC-305 incomplete) | Stage 2 | fall back to CadQuery headless OR fail-loud per operator preference |
| GD&T side-channel dropped a toleranced dim between Stage 1 and Stage 3 | Stage 2.5 | **HARD BLOCK** |
| hyperMILL session not licensed for the customer site | Stage 3 | abort with link to procurement workflow |
| Part envelope exceeds machine envelope | Stage 4 | **HARD BLOCK** (per peer-review fix) |
| Fixture-collision verdict | Stage 4 | **HARD BLOCK** (per peer-review fix) |
| No machine in fleet matches envelope after all candidates exhausted | Stage 4 | **HARD BLOCK** — flag stock-form change or off-shop quote |
| Speed/feed violates `S(x) < 0.98` shop-floor tier | Stage 5 | **HARD BLOCK** |
| Collision verdict (either hyperMILL or PRISM) | Stage 6 | **HARD BLOCK** — never auto-override |
| No per-machine post AND master post can't translate a feature | Stage 7 | surface the unmappable feature + propose CAM-side workaround |
| Setup-sheet generator can't find tool in shop catalog | Stage 8 | flag missing tool, propose `ToolCatalogEngine` substitution |
| Operator's `inspectionTools` list can't measure a toleranced dim from Stage 2.5 side-channel | Stage 9 | flag with the dim + propose tool acquisition |

## What's already built vs the V2 delta (HONEST scope — peer-review fix)

**Already built (substrate):** every engine cell in the table above
exists on disk. Verify via
`node scripts/cad-pipeline-coverage-scorer.mjs --json` — six platforms,
nine stages.

**V2 delta — NET-NEW ORCHESTRATION (NOT pure composition):**

The original spec said "composition only — no new physics, no new
constants." Peer reviewer correctly pushed back: the V2 delta is real
new orchestration logic with conditional branching, side-channel
plumbing, and new dispatcher contract. Honest scope:

1. **NEW** — Stage 2.5 GD&T side-channel: payload definition, attach/echo
   contract, drop-detection HARD BLOCK. ~50–100 LOC, net new.
2. **EXTEND** — `PrintToProgramPipelineEngine.run` payload to surface ALL
   stages 1–9 (plus 2.5) as explicit `StageResult` objects with the new
   union type. Today's 5-stage flow becomes 10-stage. Real refactor.
3. **NEW** — `cadPlatform` + `camPlatform` selector params with the
   per-platform default routing logic (Fusion 360 → hyperMILL).
4. **NEW** — `injectPRISMToolpaths: boolean` switch at Stage 5 with the
   conditional branching to `MillingPrintToProgramEngine` /
   `TurningPrintToProgramEngine` / etc. depending on detected feature
   domain. Real branching logic, not a passthrough.
5. **NEW** — `inspectionTools: string[]` operator input → Stage 9
   measurement-tool router with the expanded routing table from §9.
6. **NEW** — HARD BLOCK reachability tests at Stages 2.5, 4 (envelope +
   fixture), 5 (S(x)), 6 (collision) — the unconditional safety gates
   must be provable, not just present.
7. **NEW** — `prism_cam:print_to_inspection_full` dispatcher action with
   Zod schema matching the operator API; lazy import; round-trip E2E
   test through the dispatcher (not just the engine singleton).

**Honest estimate:** 7 V2 delta items, ~600–1000 LOC of new code, plus
the test suite (per `comprehensive-build-enforce` floor — happy + 3
failure modes + 2 adversarial + variability across CAD/CAM platform
combos). One focused session if done as a single multi-file build with
per-file scrutiny gates; two sessions if the GD&T side-channel design
needs operator-input on field shape.

## Acceptance criteria (when this spec is "done")

- [ ] `PrintToProgramPipelineEngine` (or new `PrintToInspectionOrchestratorEngine`) exposes all 9 stages plus Stage 2.5 by name in its result payload.
- [ ] `prism_cam:print_to_inspection_full` action wired with Zod schema matching the operator API.
- [ ] Round-trip test against ≥ 1 real JM Die print (proposed: `2475-037` per the canonical PHASE15 reference).
- [ ] Setup sheet matches shop standard format (visual diff against JM Die's archived setup sheets).
- [ ] Inspection report covers every toleranced dimension in the print AND only proposes tools from the operator's `inspectionTools` list.
- [ ] Every stage produces a `StageResult` even on success — no silent passthrough.
- [ ] HARD BLOCK reachability test: deliberately fail each gate (Stage 2.5, Stage 4 envelope, Stage 4 fixture, Stage 5 safety, Stage 6 collision) and prove the pipeline halts.
- [ ] GD&T side-channel field-by-field consistency check between Stage 1 source and consumer stages.

## See also

- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md` — the amended audit
- `state/shared/specs/DOMAIN-PIPELINE-MS0-DESIGN.md` — the broader 18-stage canonical pipeline
- `mcp-server/src/engines/PrintToProgramPipelineEngine.ts` — the existing master engine to extend
- `mcp-server/src/engines/PrintToCADOrchestratorEngine.ts` — the existing 5-stage CAD diagnostic
- `knowledge/memories/reference/reference_cad_software_pipeline_recommendation.md` — canonical CAD-platform recommendation
- `scripts/cad-pipeline-coverage-scorer.mjs` — META artifact (peer-review-patched)
