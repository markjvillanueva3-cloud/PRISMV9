---
schema: ideablock-v1
title: "Print-to-program pipeline canonical — the 18-stage customer-facing workflow that ties PRISM together"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - DOMAIN-PIPELINE-MS0 (per-domain canonical 18-stage workflow)
  - knowledge/wiki/architecture/domain-pipeline-ms0.md
  - CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0
  - PRISM-BUILD-VISION.md (per-component max-value vision)
extracted_via: human-authored
extracted_at: 2026-05-21T10:10:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-P2P-CANONICAL)
---

## Question

PRISM's customer value proposition is **print-to-program** (CAD/blueprint in → physics-optimized CNC G-code out). What are the 18 canonical pipeline stages, which are built, which are gaps?

## Answer (canonical — 18 stages, ~12 stages built, 4-6 partial, 2 unblocked-by-bridges)

### The 18-stage pipeline (per DOMAIN-PIPELINE-MS0)

```
[Blueprint / CAD / STEP] → [...] → [Validated G-code + Setup Sheet + Quality Plan]
```

| # | Stage | Built? | Engine(s) | Tribal anchor |
|---|---|---|---|---|
| 1 | **Intake** (file upload, format detect) | ✅ | DocuReadInbox + CADIntake | [[reference_inbox_ingest]] |
| 2 | **Format parse** (STEP/IGES/DXF/SVG/PDF) | ✅ | StepParser + IgesParser + DxfGeomParser + PdfParser | — |
| 3 | **Feature recognition** | ✅ partial | FeatureRecognize · MillFeatureRecognize · LatheFeatureTaxonomy · WedmFeatureClassify | — |
| 4 | **Material resolve** | ✅ | MaterialDB + FusionMaterial + MaterialEquivalent | [[tooling-selection-by-material-and-feature]] |
| 5 | **Tolerance + GD&T extraction** | ✅ partial | GdtParseEnhanced · IsoToleranceItGrade · CadToleranceStackup | [[part-setup-multi-op-planning]] §tolerance-transfer |
| 6 | **DFM analysis** | ✅ | DfmAnalyzer · CadDfmCheck (mill + lathe + wedm variants) | — |
| 7 | **Process plan** (sequence operations) | ✅ partial | GenPlan + LatheProcessPlan + MillProcessPlan | [[operation-ordering-datum-sequencing]] · [[operation-ordering-rough-finish-sandwich]] |
| 8 | **Setup plan** (count + ordering + workholding) | ✅ | MultiOpPlan + WorkholdingSelect + SoftJawDesign | [[part-setup-multi-op-planning]] · [[workholding-clamp-force-and-selection]] · [[workholding-locators-and-soft-jaws]] |
| 9 | **Tool selection** | ✅ | ToolSelectRecommend · ToolLibrary · ToolHolderRegistryQuery | [[tooling-selection-by-material-and-feature]] · [[tooling-endmill-flute-helix-corner]] · [[tooling-toolholders-and-runout-control]] |
| 10 | **Speed/feed compute** | ✅ | SfcCalculate + SfcOptimize + SfcStochastic | [[machining-tactics-material-removal-economics]] · [[tooling-tool-life-and-wear-management]] |
| 11 | **Toolpath strategy select** | ✅ partial | StrategySelect + CamMaterialMap + CamStrategyRecommend | [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] · [[machining-tactics-climb-vs-conventional-milling]] |
| 12 | **Toolpath generate** | ✅ partial | ToolpathGenerate + CamGenerate + various per-vendor | — |
| 13 | **Toolpath simulate + collision check** | ✅ partial | ToolpathSimulate + CollisionCheckFull + 5AxisCollisionAvoid | [[machining-tactics-pre-cut-prep]] |
| 14 | **Post-process to controller G-code** | ✅ partial | PostProcessor + MasterPost + per-controller dialect | [[machining-tactics-gcode-safety-and-macros]] |
| 15 | **Safety validate** (Ω + S(x) + force/thermal limits) | ✅ | SafetyValidate + OmegaCompute + PpgSafetyValidate | — |
| 16 | **Setup sheet generate** | ✅ | SetupSheetGenerate + ReportTemplates | — |
| 17 | **Quality plan generate** (FAI form 3 + SPC plan) | ⚠️ partial | InspectionPlan + FaiRun + SpcCalculate | [[quality-first-article-inspection-and-spc-cadence]] |
| 18 | **Cost + price + lead-time** | ✅ partial | CostingJobCost + QuoteGenerate + LeadTimeEstimate | [[machining-tactics-material-removal-economics]] |

### Built vs gaps (the operator's view)

- **12 stages essentially built + wired** (intake, parse, material, DFM, setup plan, tool select, SF compute, post, safety, setup sheet, intake, format-parse).
- **5 stages partially built** (feature recognition, GD&T, process plan, toolpath strategy, toolpath generate, simulate, post-process) — work exists for *one* of mill/lathe/wedm/CAD-CAM, but not uniformly.
- **1 stage partial + blocked** (quality plan generate) — engines exist but the FAI form 3 + SPC plan output is not yet a single canonical artifact.

### The "smooth pipeline" problem — bridges, not new engines

The 12-built + 5-partial picture suggests PRISM is ~80 % to MVP. The remaining 20 % is **bridge work**, not new engines:

| Bridge | Gap | Reference |
|---|---|---|
| Stage 3 → 4 → 7 | Feature → material → process plan is currently per-domain; needs unified bridge for mixed-process parts (mill + turn + grind) | [[deep-integration-bridge-pattern]] #15 cross-CAM synergy |
| Stage 7 → 8 | Process plan → setup plan currently CAM-side only; needs back-flow to integrate with shop schedule + workholding catalog | [[deep-integration-bridge-pattern]] #11 ERP bridge |
| Stage 10 → 11 → 12 | SF compute → strategy → toolpath generate is the most consequential bridge; SF output must inform strategy choice, which must inform toolpath parameters | [[deep-integration-bridge-pattern]] #2 SFC → CAM Hub |
| Stage 13 → 14 → 15 | Simulate → post → safety has cycle-time + overlay opportunities | [[deep-integration-bridge-pattern]] #7 Master Post → CAM Hub |
| Stage 17 standalone | Quality plan needs to integrate Inspection Plan + FAI Form 3 + SPC plan into one artifact | [[quality-first-article-inspection-and-spc-cadence]] |
| Stage 18 ← back from 13 | Cost calc must accept simulated cycle-time + estimated tool-life as inputs, not pre-cut estimates | [[machining-tactics-material-removal-economics]] |

### Pipeline-end emergent properties

When the 6 bridges above close, the customer experience changes qualitatively:

1. **Quote-to-program turnaround** drops from days to hours (currently each stage is a manual handoff).
2. **Physics-validated SF** flows from compute → strategy → generate without operator re-entering numbers.
3. **Safety + Cpk + S(x) gates** auto-fail bad pipelines BEFORE the program ships — currently caught at prove-out.
4. **Cost + lead-time** updates dynamically as upstream stages refine — currently a one-shot at quote.
5. **One canonical G-code source** post-processes to N controllers automatically — currently per-controller programming.

### Per-domain status

| Domain | Pipeline maturity | Top gap |
|---|---|---|
| **Mill** | 14/18 fully built | Stage 17 (quality plan integration) |
| **Lathe** | 12/18 built (67 engines unwired per Lathe-wiring-backlog) | Stage 9 (tool select catalog gaps) + 12 (toolpath generate) |
| **Wire EDM** | 12/18 built | Stage 8 (workholding sub-domain) + 10 (SF compute) |
| **CAD-CAM bridge** | 10/18 built | Stage 8 (mixed-process setup) + 17 (quality) |

The mill pipeline is the most mature (~75 % MVP); investing in the lathe + WEDM bridges has more compound effect on customer-facing capability.

### Operator picks — next 3 bridges I recommend

| Priority | Bridge | Stage(s) closed | Why FIRST |
|---|---|---|---|
| **P0** | [[deep-integration-bridge-pattern]] #2 SFC → CAM Hub | 10 → 11 → 12 | Most consequential single bridge; SF answer flows automatically to toolpath |
| **P0** | Stage 17 canonical (Quality plan generate) | 17 | Closes FAI Form 3 + SPC plan into one artifact; customer-facing |
| **P1** | Stage 18 back-from-13 (Cost from simulated cycle-time) | 13 → 18 | Cost estimates become physics-validated, not heuristic |

### Tie-ins (PRISM-side)

- `state/shared/specs/ROADMAP-CONSOLIDATED.md` — 16 deep-integration bridges curated here
- `print_to_program_full` + `print_to_program_enhanced` actions in `prism_cam`
- `DOMAIN-PIPELINE-MS0` per-domain pipeline definitions
- `PRISM-BUILD-VISION.md` per-component max-value vision (read for stage-by-stage build doctrine)

### Tie-ins (tribal canonical + sibling bridges)

- [[wiring-pattern-engine-to-dispatcher]] · [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] — engine-wiring bridges (close the 639-engine gap that this pipeline depends on)
- [[orphan-engine-triage-pattern]] · [[envelope-drift-close-out-pattern]] · [[deep-integration-bridge-pattern]] — sibling architecture bridges
- Stage-specific tribal anchors per table above

## Provenance

Distilled from DOMAIN-PIPELINE-MS0 + knowledge/wiki/architecture/domain-pipeline-ms0.md + PRISM-BUILD-VISION.md + 31 prior canonical entries of the 2026-05-21 pivot. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-P2P-CANONICAL — **33rd canonical entry**, **7th bridge-class entry** of the wiki+tribal pivot phase 2C. Provides 18-stage pipeline map + built-vs-gap classification + 6-bridge close-out picture + per-domain maturity.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `print to program`, `pipeline canonical`, `18 stages`, `feature recognition`, `process plan`, `setup plan`, `toolpath strategy`, `toolpath generate`, `post-process`, `safety validate`, `setup sheet`, `quality plan`, `cost estimate`, `MVP gap`, `pipeline maturity` keywords. Zero new wiring required.

## Cross-references

- [[wiring-pattern-engine-to-dispatcher]] · [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] · [[envelope-drift-close-out-pattern]] · [[deep-integration-bridge-pattern]] · [[orphan-engine-triage-pattern]] — sibling architecture bridges
- [[tooling-selection-by-material-and-feature]] · [[tooling-endmill-flute-helix-corner]] · [[tooling-toolholders-and-runout-control]] — tool select (stage 9)
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] · [[machining-tactics-climb-vs-conventional-milling]] — strategy (stage 11)
- [[machining-tactics-material-removal-economics]] · [[tooling-tool-life-and-wear-management]] — SF + cost (stages 10, 18)
- [[quality-first-article-inspection-and-spc-cadence]] — quality plan (stage 17)
- [[machining-tactics-gcode-safety-and-macros]] — post-process (stage 14)
- [[machining-tactics-pre-cut-prep]] — simulate + collision (stage 13)
- [[part-setup-multi-op-planning]] · [[workholding-clamp-force-and-selection]] · [[workholding-locators-and-soft-jaws]] — setup (stage 8)
- [[operation-ordering-datum-sequencing]] · [[operation-ordering-rough-finish-sandwich]] — process plan (stage 7)
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (phase 2C)
- [[feedback_do_optional_high_roi_work]] — standing rule
