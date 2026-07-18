# Hurco Post-Processor — Upstream + Downstream Engine Wiring Assessment

**Slot:** echo (claude-9029a5d7) · **Date:** 2026-05-25 · **Trigger:** operator overnight directive — *"assess wiring and bridging to engines that should be wired to post processor up and down stream"*

This assessment is the map: every engine that already exists in PRISM, where it sits in the print-to-program pipeline relative to the Hurco post, whether it's currently wired into the post-emission path, and the bridge cost if not.

---

## Pipeline diagram

```
[ CAD / Blueprint ] → [ CAM strategy ] → [ Physics + Material ] → [ Hurco V11 post ] → [ Verify + Sim ] → [ Machine ]
       ↑                    ↑                    ↑                      │                    ↓               ↓
   reverse-eng          tool selection      tribal/wiki                 │                S(x) gate     ERP / Job
                                                                        ↓
                                                              Master Post Pipeline (end-mission)
```

---

## §1. UPSTREAM — what feeds the Hurco post

| # | Pipeline stage | Engine(s) | Currently wired to post? | Bridge cost |
|---:|---|---|:--:|---|
| U1 | CAD geometry parse | `CADGeometryEngine`, `STEPParserEngine`, `IGESParserEngine`, `STLParserEngine` | ⚠ partial (Master pipeline only) | **wire** — pipe `MillOperation[]` source-of-truth from CAD output through `HurcoV11MillMasterPostEngine.post()`. ~1 day. |
| U2 | Blueprint / picture / video → CAD | `BlueprintVisionOCREngine`, `PartMediaToCADEngine` (built this session), `CADReverseTemplateEngine` | ⚠ ships to template, not post | **wire** — close the template → MillOperation[] arrow via `CAMOperationGeneratorEngine`. ~1 day. |
| U3 | CAM operation extraction | `CAMOperationGeneratorEngine`, `ToolpathOptimizationEngine`, `AdaptiveRoughingStrategyEngine` | ⚠ partial | **wire** — Hurco post currently accepts a pre-built `MillOperation[]`; needs an upstream binding for "give me CAD file → MillOperation[] in one call". ~½ day. |
| U4 | Tool selection | `ToolCatalogEngine`, `ChipThinningEngine`, `ToolWearProgressionEngine`, `AdvancedWearPhysicsEngine` | ⚠ Hurco reads `op.tool` if supplied; doesn't pick | **wire** — auto-tool-pick from `ToolCatalogEngine.recommend(material, ap, ae)` when `op.tool` absent. ~½ day. |
| U5 | Speed/feed calculation | `UltimateSpeedFeedEngine` (CI95-aware), `AutoSpeedFeedEngine`, `SpeedFeedOrchestratorEngine` | ✅ via `prismCI95Comments` property (shipped) | **shipped — keep**. CI95 comments emit per-op. |
| U6 | Cutting-force physics | `KienzleForceModel`, `CuttingForceEngine`, `StochasticCuttingForceEngine`, `ConstitutiveModelEngine` | ✅ Kienzle check string emitted | **shipped — keep**. Per HurcoV11MillMasterPostEngine.test.ts 72/72. |
| U7 | Chatter / stability | `ChatterStabilityLobeEngine`, `RegenerativeChatterEngine`, `StochasticChatterEngine`, `DampingOptimizationEngine` | ❌ NOT wired | **wire** — SLD per-op gate before emit; reject ops that fall in unstable lobe. ~1 day. |
| U8 | Deflection check | `ToolDeflectionEngine`, `PartDeflectionEngine`, `BoringBarDeflectionEngine` | ❌ NOT wired | **wire** — stickout deflection ratio check (test #6 from 2026-05-22 spec — already covered in engine but emission-side absent). ~½ day. |
| U9 | Surface finish prediction | `SurfaceFinishPredictorEngine`, `StochasticSurfaceFinishEngine` | ❌ NOT wired | **wire** — predict Ra per finish-op + emit as `(Ra predicted = X.X um @ 95% CI)` comment. ~½ day. |
| U10 | Thermal | `CuttingTemperatureEngine`, `ThermalWearCouplingEngine`, `ThermalExpansionEngine`, `CryogenicCuttingEngine` | ❌ NOT wired | **wire** — flag ops where predicted temperature exceeds tool-coating envelope. ~½ day. |
| U11 | Tool life (Taylor) | `TaylorToolLifeEngine`, `ToolWearProgressionEngine`, `StochasticToolLifeEngine` | ✅ Taylor check string emitted | **shipped — keep**. |
| U12 | Material (ISO group + canonical constants) | `physics/constants.ts` (kc1.1, mc, Taylor C/n) | ✅ via `prismMaterialGroup` property (v11 added) | **shipped — keep**. |
| U13 | Tribal knowledge injection | `PRISMSelfAwarenessEngine.searchTribalKnowledge`, `TribalKnowledgeStoreEngine` | ✅ via `prismTribalCitation` property | **shipped — keep**. |
| U14 | Wiki citation | `WikiIndexMaintainerEngine`, `WikiQueryEngine` | ⚠ partial | **wire** — promote tribal-citation → wiki-citation alongside, format `(see [[wiki-slug]] line N)`. ~½ day. |
| U15 | Cross-CAM ontology | `CrossCAMTranslationEngine`, 18 CAM-bridge engines | ✅ via `prismCrossCAMFeatures` property | **shipped — keep**. |

**Upstream summary:** 5 of 15 shipped (U5/U6/U11/U12/U13/U15 — physics + property surface). 9 need wiring (U1-U4 input pipeline; U7-U10 safety gates; U14 wiki citation). Highest-leverage wires: **U7 (chatter SLD)** + **U8 (deflection)** — both safety-relevant.

---

## §2. DOWNSTREAM — what the Hurco post feeds

| # | Pipeline stage | Engine(s) | Currently wired from post? | Bridge cost |
|---:|---|---|:--:|---|
| D1 | NC output emission | `HurcoV11MillMasterPostEngine` itself | ✅ canonical output contract | **shipped — keep**. 72/72 tests. |
| D2 | NC verification (post-emission) | `PostProcessorVerificationOrchestratorEngine` (shipped this session) | ✅ accepts emitted .NC + ControllerFeatureMatrix → S(x) verdict | **shipped — keep**. |
| D3 | Feature-presence audit (.cps source) | `PostFeatureAuditEngine` (shipped this session, iter 11) | ✅ via `prism_cam:cam_post_feature_audit` + `cam_post_feature_compare` | **shipped — keep**. 28-feature matrix, real-I/O E2E test through dispatcher. |
| D4 | Safety / S(x) scoring | `SafetyValidationEngine`, `prism_safety:validate_physics` | ⚠ called as separate gate, not chained | **wire** — chain `Hurco post → S(x) gate → block emit if S(x) < 0.98 (shop_floor tier)`. ~½ day. |
| D5 | Collision check | `CollisionAvoidanceEngine`, `prism_safety:check_toolpath_collision` | ❌ NOT wired — soul refuses emit-without-check | **wire** — REQUIRED per echo slot soul ("emitting-gcode-without-collision-check"). ~½ day. |
| D6 | NC simulation (5-axis kinematics) | `NCSimEngine`, `FiveAxisKinematicsEngine` | ❌ NOT wired | **wire** — emit `.NC` + run kinematics-replay → report axis-limit violations + cycle time. ~1 day. |
| D7 | WinMax PC driver (live machine) | `scripts/winmax-driver.mjs` (scaffolded this session) | ⚠ scaffolded, not orchestrated from post | **wire** — `post → winmax-driver --load <ncfile> --verify` round-trip. ~½ day. |
| D8 | Cycle-time estimator | `CycleTimeEstimatorEngine`, `MRREstimatorEngine` | ⚠ called separately | **wire** — emit cycle time as post-metadata comment. ~½ day. |
| D9 | Cost / quote | `QuoteEstimatorEngine`, `ActualCostEngine`, `JobLifecycleEngine` | ❌ NOT wired | **wire** — post output → quote refresh. ~1 day. |
| D10 | ERP integration | `ERPSyncEngine`, `JobLifecycleEngine`, `OEEEngine` | ❌ NOT wired | **wire** — post completion → job-status transition. ~1 day. |
| D11 | Master Post pipeline | `MasterPostProcessorUnifiedAGIEngine` | ⚠ exists but `generatePost` returns `quality_score=0` — **P0 regression** | **engine** — fix `generatePost` before any downstream chaining (per POST-PROCESSOR-PROVE-OUT-2026-05-25.md). |
| D12 | Print-to-program AGI handoff | `MasterPostProcessorUnifiedAGIEngine`, `PRISMOmegaEngine` | ❌ NOT wired (no `PRISM_AGI` marker in v11 .cps) | **engine + wire** — gated on D11 fix. |
| D13 | Setup sheet generation | inside `HurcoV11MillMasterPostEngine` | ✅ via test #18/19/20 (was failing 2026-05-22, now PASS in 72/72) | **shipped — keep**. |
| D14 | Tool list output | inside `HurcoV11MillMasterPostEngine` | ✅ dedup + sort | **shipped — keep**. |
| D15 | Tribal feedback loop | `OperatorOutcomeBusEngine`, post-job feedback ingest | ❌ NOT wired | **wire** — emitted NC + post-job outcome → tribal-tip promotion. ~1 day. |

**Downstream summary:** 5 of 15 shipped (D1/D2/D3/D13/D14). 10 need wiring. Highest-leverage: **D5 (collision)** is REQUIRED per echo soul, **D11 (Master Post regression)** is P0 because it blocks the entire end-mission, **D4 (S(x) chain)** is the safety enforcement gate.

---

## §3. Wiring priority matrix (overnight YOLO actionable)

Sorted by leverage × cost:

| Priority | Bridge | Effort | Why |
|:---:|---|:---:|---|
| **P0** | D11: Fix `MasterPostProcessorUnifiedAGIEngine.generatePost` quality_score=0 | engine fix | Blocks the entire end-mission (print-to-CNC). Surfaced by POST-PROCESSOR-PROVE-OUT R12 fail-loud 2026-05-25. |
| **P0** | D5: Collision check before emit | ½ day | REQUIRED per echo slot soul (refuses emit-without-check). |
| **P1** | U7: Chatter SLD gate | 1 day | Safety-relevant — unstable ops kill tool + part. |
| **P1** | U8: Deflection check emit | ½ day | Already-built engine, just emit. |
| **P1** | D4: S(x) chain after emit | ½ day | shop_floor tier requires Ω≥0.95, S(x)≥0.98. |
| **P2** | U1: CAD → MillOperation[] auto-bind | 1 day | Unblocks the "load a CAD file, get NC out" one-shot path. |
| **P2** | U9: Surface-finish prediction comment | ½ day | Sale-ready differentiator. |
| **P2** | D6: NC sim + kinematics replay | 1 day | High-value verification surface. |
| **P3** | U10: Thermal envelope flag | ½ day | Catches coating-burn early. |
| **P3** | U14: Wiki citation alongside tribal | ½ day | Audit-trail completeness. |
| **P3** | D7: WinMax driver orchestrated from post | ½ day | Closes operator's "test in WinMax PC" loop. |
| **P3** | D8: Cycle time as post-metadata | ½ day | Operator-visible. |
| **P3** | D15: Tribal feedback loop | 1 day | Compounding learning. |

---

## §4. Total assessment

- **Engines built and ready to wire:** 30+ (CAD parse, CAM, physics, safety, sim, ERP, Master AGI, etc.)
- **Currently wired to Hurco post:** 5 upstream + 5 downstream = 10
- **Wire-gap:** 9 upstream + 10 downstream = **19 bridges**
- **Engine-side gaps (not just wiring):** 1 (D11: MasterPostProcessorUnifiedAGIEngine quality_score=0)
- **Total budget if all P0+P1+P2 cleared:** ~7 days dedicated milestone
- **Overnight-shippable (P0+P1 only):** ~3 days

## §5. Connection to fleet promotion (echo slot tonight)

The promoted JM-Die mill fleet (6 posts across 4 brands, `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/`) is the **test substrate** for tomorrow. Each promoted post will benefit from:

- P0 D5 + P1 D4 wires close the safety chain before operator-side WinMax PC load
- P1 U7/U8 wires kill bad ops at emission, not at the machine
- P0 D11 unblocks the Master Post variant (currently shipped but `quality_score=0`)

Until D11 lands, the fleet ships as **individual-post Enhanced tier** (operator-trusted today). Master Post conversion is gated on D11.

---

## §6. Next overnight actions

1. **Now (echo iter 12):** Commit this assessment + the fleet-promotion script.
2. **Iter 13:** Wire D5 (collision check) into HurcoV11MillMasterPostEngine — required by echo soul.
3. **Iter 14:** Wire D4 (S(x) chain) — safety gate enforcement.
4. **Iter 15:** Trace D11 quality_score=0 regression — find why MasterPost returns 0.
5. **Operator wakes:** /goal complete-gate fires; loop continues until "Hurco proven perfect" gate passes via 72/72 + S(x)≥0.98 + collision-clear.

---

## §7. Artifacts

- This assessment: `state/shared/specs/HURCO-POST-PIPELINE-BRIDGE-ASSESSMENT-2026-05-25.md`
- Fleet promotion script: `scripts/promote-jm-mill-fleet-to-enhanced.mjs`
- Fleet INDEX: `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/_INDEX.md` (gitignored)
- v8.9 vs v11 compare: `state/shared/specs/HURCO-VM30i-V8.9-vs-V11-COMPARE-2026-05-25.md`
- 2026-05-22 engine verification: `state/shared/specs/HURCO-POST-VERIFICATION-2026-05-22.md`
- POST-PROCESSOR-PROVE-OUT (R12 fail-loud): `state/shared/specs/POST-PROCESSOR-PROVE-OUT-2026-05-25.{json,md}`
- PostFeatureAuditEngine: `mcp-server/src/engines/PostFeatureAuditEngine.ts` (40/40 tests)
- Baselines wiki: `knowledge/wiki/architecture/post-processor-fleet-baselines-2026-05-25.md`
