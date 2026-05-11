## REVENUE-MS0 v2 — SFC-first, dependency-repaired (paste-ready section)

**Why v2:** Round-3 found 12 dispatcher actions MISSING + 4 STUB-routed; Round-3.5 found SFC backend is only 35% ship-ready (5 net-new engines required); Round-3/02 Pareto-min showed 5 MS3 sub-batches must hoist into MS0 to unblock 75.7% of pages. The prior MS0 (37 units, MILL-first ordering) cannot ship as written. v2 reorders to SFC-first (P0 revenue), hoists Pareto-min wiring, adds 5 net-new P0/P1 engine units, documents missing dispatcher actions, and fixes the 37-vs-40 count drift by adopting the canonical **37 customer pages + 9 backend-prereq units + 4 stub-remediation units + 5 net-new engine units + 5 hoist-wiring units + 1 billing-concurrency unit = 61 units total**.

**Sequencing law (NEW in v2):** every customer-facing page-unit `depends_on` the engine/action/wiring units that back it. The Stop hook `stop_on_unwired_assets` already enforces this — v2 just makes the dependency edges explicit. Anti-false-green rule (Round-3/10): every page MUST invoke a dispatcher action that returns non-stub real data verified by an integration test asserting return-shape != `{ok: true}` placeholder.

### v2 unit table (61 units, depends_on graph)

Legend — Priority: **P0** = blocks revenue today · **P1** = blocks paid-launch quality · **P2** = nice-to-have within MS0.

#### Phase 0 — Pre-wiring (must ship FIRST; blocks every customer page)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-MS0-ENG-SPINDLE-01` | Build **SpindleCharacteristicEngine** (Pc output + machine-aware power-limit gate across 21 ShopConfig machines) | — | engine unit-tests (kW/kNm/torque curve at 6 RPM bands per machine) PASS; dispatcher action `prism_calc:spindle_power_check` returns numeric Pc and limit-flag (NOT `{ok}`); 21 ShopConfig machines covered | P0 |
| `U-REV-MS0-ENG-TOOLDB-01` | Build **ToolCatalogEngine** (canonical Tool DB: geometry + insert lookup; backs free-text → structured tool record) | — | round-trip test ingests 10 representative tools across mill/lathe/drill/thread; dispatcher action `prism_calc:tool_catalog_resolve` returns canonical record; SFC requirement #6 (tool selection ingest) closes | P0 |
| `U-REV-MS0-ENG-DEFLECT-01` | Build **DeflectionCalculateEngine** (discrete `prism_calc:deflection_calculate` — δ = F·L³/(3EI) + ap-derate solver) | `U-REV-MS0-ENG-TOOLDB-01` (needs tool geometry) | dispatcher action returns numeric δ AND derated ap honoring tolerance budget (NOT overlay-form only); rejects NaN/Infinity; 5 spanning tool-overhang configs PASS | P0 |
| `U-REV-MS0-ENG-MATBAND-01` | Build **MaterialBandResolverEngine** (interpolate kc1.1/n across 6 ISO × 5 hardness × 2 coolant = 60-cell grid; closes Round-2 variability gap) | — | grid coverage 60/60 (vs current 11/60); dispatcher action `prism_calc:material_resolve` returns kc1.1, n, hardness_band, coolant_modifier (NOT canonical-row passthrough); 18 spanning tests across axes PASS | P1 |
| `U-REV-MS0-ENG-GILBERT-01` | Build **GilbertEconomicSpeedEngine** (V*_eco / V*_max_prod / V*_max_profit triad on Gilbert/Taylor; backs `prism_calc:lathe_cost_optimize`) | `U-REV-MS0-ENG-TOOLDB-01` | three objective modes return distinct V* values; cost-per-part breakdown returns 7 buckets (material/tool/machine/setup/overhead/scrap/labor); benchmark-flag fires when bucket > 70% or total > industry median | P1 |
| `U-REV-MS0-STUB-MILL-CHATTER-01` | **Remediate STUB** `mill_chatter_predict` (currently AUDIT #448 MillingForceEngine 15L stub) — reroute to ChatterPredictionEngine | — | dispatcher round-trip test asserts return-shape includes SLD lobe array + RPM-pick numeric (NOT `{ok}`); anti-false-green gate green | P0 |
| `U-REV-MS0-STUB-MILL-SCI-01` | **Remediate STUB** `mill_scientific_analyze` (AUDIT #460 MillScientificPipelineEngine 14L stub) — reroute to MillingPhysicsKernelEngine | — | return-shape includes uncertainty band + physics-derived parameters (NOT `{ok}`); 5 spanning material × tool configs PASS | P0 |
| `U-REV-MS0-ACT-CHIPCTRL-01` | Add MISSING `prism_cam:lathe_chip_control_validate` action + ChipControlEngine wiring (Sandvik/Kennametal/ISCAR/Tungaloy/Mitsubishi catalogs; CSS high-RPM wrapping risk) | `U-REV-MS0-ENG-TOOLDB-01` | dispatcher returns `{valid, chip_form, lights_out_ok, mitigations[], evidence_uri}`; 5 chipbreaker catalogs validated | P1 |
| `U-REV-MS0-ACT-WEDM-TS-01` | Add MISSING `prism_edm:wedm_troubleshoot` + wire existing WEDMTroubleshootingEngine (62-engine pool) | — | returns `{root_causes[], remediations[], tribal_tips[]}` for 4 symptom classes (wire_break/poor_finish/taper_error/burn); not stub | P1 |
| `U-REV-MS0-ACT-WEDM-CTRL-01` | Add MISSING `prism_edm:wedm_controller_select` + WEDMControllerDialectEngine surface (5 dialects: Mitsubishi/Sodick/Makino/AgieCharmilles/Fanuc) | — | dialect chosen from input; header/footer templates + param-table mapping returned; 5 dialect E2E round-trips PASS | P1 |
| `U-REV-MS0-ACT-CADVIEW-01` | Add MISSING `prism_cad:cad_viewer_load_stl` + build **CADViewerStreamEngine** (wraps step_pipeline_run + decimation; backs mcp-cadquery frontend merge) | — | streams Three.js-ready mesh for STEP/STL/IGES/GLB input; vertex_count + bbox returned; mcp-cadquery frontend can render | P0 |
| `U-REV-MS0-ACT-APIKEY-01` | Add MISSING `prism_auth:api_key_create/revoke/list` + build **ApiKeyEngine** (integrates AuthEngine.sessionManage + audit_log_authz emission) | — | one-shot secret returned; revoke disables; list scoped to tenant; audit-log entry per op | P0 |
| `U-REV-MS0-ACT-RBAC-01` | Add MISSING `prism_auth:rbac_role_create/assign/list + permission_grant` + build **RBACEngine** (extends pass-through role_assign into full CRUD + permission matrix) | `U-REV-MS0-ACT-APIKEY-01` (shared audit emission) | role CRUD round-trip; permission matrix enforces in middleware; audit-log entries | P0 |
| `U-REV-MS0-ACT-SEAT-01` | Add MISSING `prism_tenant:seat_assign` — **HOIST from MS1 U-SUB-17** (SeatAllocationEngine) — concurrent with ADMIN, not after | `U-REV-MS0-ACT-RBAC-01` (seat type bound to role) | seat assignment round-trip; seat_remaining decrements; tenant cap enforced; audit-log | P0 |
| `U-REV-MS0-ACT-SUBTIER-01` | Add MISSING `prism_business:subscription_tier_set` — **HOIST from MS1** (FeatureTierEngine + StripeAdapter; concurrent with ADMIN per Round-3/02 ranking #1) | `U-REV-MS0-ACT-APIKEY-01` | tier upgrade/downgrade round-trip via Stripe sandbox; prorate flag honored; next_invoice_at returned; audit-log | P0 |
| `U-REV-MS0-ACT-TUTOR-01` | Add MISSING `prism_intelligence:tutor_session_start/lesson_complete/progression_get` + build **TutorialProgressionEngine** (fires trial→paid hook on lesson-N) | — | session round-trip; progression persists across sessions; trial→paid hook armed flag returned | P1 |
| `U-REV-MS0-ACT-VIDEO-01` | Add MISSING `prism_intelligence:video_session_start/segment_complete/query_transcript` + build **VideoTrainingEngine** (wraps video-learn skill) | — | transcript URI returned; segment-complete fires hooks; query_transcript returns time-stamped matches | P1 |
| `U-REV-MS0-ACT-BPTRAIN-01` | Add MISSING `prism_cad:blueprint_trainer_quiz/score` + build **BlueprintTrainingEngine** (wraps blueprint_to_cadquery_script + JM DIE archive quizzing) | `U-REV-MS0-ACT-CADVIEW-01` | quiz served from JM DIE archive; score persists; difficulty bands respected | P1 |

#### Phase 1 — Pareto-minimum wiring hoists (Round-3/02 ranks #1–#5; unblocks 28/37 customer pages)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-MS0-HOIST-ADMIN-01` | **Hoist rank #1**: wire SessionLifecycle/TenantOnboarding/UserModel/AuthorityRanking/SkillTierRegistry into prism_auth + prism_tenant (gates ALL revenue) | `U-REV-MS0-ACT-APIKEY-01`, `U-REV-MS0-ACT-RBAC-01`, `U-REV-MS0-ACT-SEAT-01`, `U-REV-MS0-ACT-SUBTIER-01` | 5 engines wired (WIRE-TO-ALL: dual dispatcher); 7 ADMIN pages unblocked; engine-named tests PASS | P0 |
| `U-REV-MS0-HOIST-LATHE-01` | **Hoist rank #2a**: wire MillTurnCAM/LathePartClassifier/SequenceOptimizer/MultiOpPlanner/Workholding/Orchestration (6 of 89 lathe unwired) | `U-REV-MS0-ENG-TOOLDB-01` | 6 engines wired to prism_turning + prism_lathe (WIRE-TO-ALL); mill-turn-sync page unblocked | P0 |
| `U-REV-MS0-HOIST-LATHE-02` | **Hoist rank #2b**: wire LatheDeepLearning/LatheUnifiedAI/EccentricTurning/LathePrintToleranceStack | `U-REV-MS0-HOIST-LATHE-01` | 4 engines wired to prism_turning + prism_ai; tolerance-stack reuse from quality verified | P1 |
| `U-REV-MS0-HOIST-WEDM-01` | **Hoist rank #3a**: wire MultiSetupFeasibilityChain/WEDMScheduling/WedmProgramIndex/WEDMStrategyLibrary | `U-REV-MS0-ACT-WEDM-CTRL-01` | 4 engines wired to prism_edm + prism_orchestrate; pass-schedule + cost + program-gen pages unblocked | P0 |
| `U-REV-MS0-HOIST-WEDM-02` | **Hoist rank #3b**: wire WEDMPartRecognition/WEDMMaterialCharacterization/WEDMWireThreadingMin | `U-REV-MS0-HOIST-WEDM-01` | 3 engines wired to prism_edm; feasibility + controller-select pages unblocked | P1 |
| `U-REV-MS0-HOIST-QUALITY-01` | **Hoist rank #4**: wire SPCProcessCapability/MultivariateSPC/HyperMillFAIBridge/HyperMillSPCBridge/LathePrintToleranceStack/TurningInspectionPlan/GateFailureHistory | — | 7 engines wired to prism_safety/prism_quality; 4 quality pages unblocked | P1 |
| `U-REV-MS0-HOIST-MILL-01` | **Hoist rank #5**: wire ChatterStabilityLobe/ArchardAdhesiveWear/TurningToolpathWear/TurningWearPrediction (also unblocks STUB remediations) | `U-REV-MS0-STUB-MILL-CHATTER-01`, `U-REV-MS0-STUB-MILL-SCI-01` | 4 engines wired to prism_mill + prism_vibration_physics; SLD viewer + chatter map + wear timeline pages unblocked | P0 |
| `U-REV-MS0-HOIST-MILL-02-NEW` | Build greenfield **ThermalFieldEngine** (no equivalent in unwired pool; ~500 LOC) → wire to prism_calc + prism_mill + prism_safety | — | FEM/heat-transfer kernel tested across 5 cutting-condition spans; thermal preview page renders live data | P1 |
| `U-REV-MS0-HOIST-SFC-01` | Wire MachineAwareSpeedFeed/ProvenSpeedFeedAggregator/SpeedFeedDeepLearning/SpeedFeedResourceIntegration/SpeedFeedAdvancedAI/SpeedFeedUltimateAI/PowerMillStrategy/PowerMillAIOrchestration | `U-REV-MS0-ENG-SPINDLE-01`, `U-REV-MS0-ENG-TOOLDB-01`, `U-REV-MS0-ENG-MATBAND-01` | 8 engines wired to prism_calc; SFC pages can serve machine-aware variants | P0 |
| `U-REV-MS0-HOIST-LEARN-01` | Wire PrintToProgramTutorial/VideoReplayOrchestrator/VideoReplayPipeline/VideoELearningAI/TribalExplanation/KnowledgeIngestionOrchestrator | `U-REV-MS0-ACT-TUTOR-01`, `U-REV-MS0-ACT-VIDEO-01`, `U-REV-MS0-ACT-BPTRAIN-01` | 6 engines wired to prism_knowledge + prism_document_learning; 3 learn pages unblocked | P1 |

#### Phase 2 — SFC customer pages (P0 revenue — ships FIRST per user priority)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-CAD-SFC-01` | SfcCalculatorPage — invokes `prism_calc:sfc_calculate` (anti-false-green: assert return-shape includes Vc/n/fz/ap/ae/Q/Pc/Fc/Tc/δ/Ra/risk_flags numerics) | `U-REV-MS0-HOIST-SFC-01`, `U-REV-MS0-ENG-DEFLECT-01` | page renders live SFC for 6 ISO groups × 5 hardness × 2 coolant axis spans (≥3 per axis = ≥18 cases); Playwright happy + 3 failure + 2 adversarial PASS | P0 |
| `U-REV-CAD-SFC-02` | SfcCompareMaterialsPage — `prism_calc:sf_compare` | `U-REV-CAD-SFC-01` | side-by-side compare across 3 materials renders all 11 output fields; charts non-empty | P0 |
| `U-REV-CAD-SFC-03` | CadViewer3DPage (Three.js — mcp-cadquery frontend merge) — `prism_cad:cad_viewer_load_stl` | `U-REV-MS0-ACT-CADVIEW-01` | STEP/STL/IGES upload renders; rotate/zoom/section work; controller-variant overlay shows Fanuc/Haas/Mazak/Okuma/Mitsubishi work-coord differences | P0 |
| `U-REV-CAD-SFC-04` | NL→CadQueryPage (cqask/ui merge) — `prism_cad:cadquery_codegen_prompt` | `U-REV-CAD-SFC-03` | prompt→script→exec round-trip green; failures emit explanation, not raw stack | P1 |
| `U-REV-CAD-SFC-05` | BlueprintToCadPage — `prism_cad:blueprint_to_all_cads` | `U-REV-CAD-SFC-03` | uploaded blueprint → STEP/IGES/STL emission; 3 JM DIE blueprint adversarial samples pass | P1 |
| `U-REV-CAD-SFC-06` | SfcMachineAwarePage — invokes machine-aware variant (selects from 21 ShopConfig machines) | `U-REV-MS0-HOIST-SFC-01`, `U-REV-MS0-ENG-SPINDLE-01` | per-machine SFC differs by ≥1 parameter; spindle power-limit gate visibly fires on over-spec request | P0 |

#### Phase 3 — Mill customer pages (revenue P1)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-MILL-01` | MillStudioPage / SpeedFeedPage (mill mode) — `prism_mill:mill_quick_speed_feed` | `U-REV-MS0-HOIST-SFC-01` | renders for 5 controller dialects (Fanuc/Haas/Mazak/Okuma/Mitsubishi); each emits dialect-correct g-code snippet | P1 |
| `U-REV-MILL-02` | MillStrategyPage / ToolpathSelectorPage — `prism_mill:mill_strategy_select` | `U-REV-MILL-01` | strategy ranks ≥3 candidates; physics rationale shown | P1 |
| `U-REV-MILL-03` | ChatterPredictionPage / SLDViewerPage — `prism_mill:mill_chatter_predict` (anti-false-green) | `U-REV-MS0-STUB-MILL-CHATTER-01`, `U-REV-MS0-HOIST-MILL-01` | SLD lobe map renders; RPM-pick highlights peak; assert return non-stub | P1 |
| `U-REV-MILL-04` | MillThermalPreviewPage — wraps ThermalField | `U-REV-MS0-HOIST-MILL-02-NEW` | thermal field renders live; warmup compensation calc visible | P1 |
| `U-REV-MILL-05` | MillScientificAnalysisPage — `prism_mill:mill_scientific_analyze` | `U-REV-MS0-STUB-MILL-SCI-01` | uncertainty bands shown; not stub | P1 |

#### Phase 4 — Lathe customer pages (revenue P1)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-LATHE-01` | LatheStudioPage / TurningSpeedFeedPage — `prism_cam:lathe_sf_full` | `U-REV-MS0-HOIST-LATHE-01` | 5-controller-dialect spans PASS | P1 |
| `U-REV-LATHE-02` | LatheThreadingPage — `prism_calc:thread_single_point` | `U-REV-MS0-ENG-TOOLDB-01` | universal thread standards (UN/M/BSP/NPT) covered | P1 |
| `U-REV-LATHE-03` | LathePostgenPage / MasterPostPage — `prism_cam:lathe_masterpost_emit` | `U-REV-LATHE-01` | per-dialect post emission verified; Master Post product surface live | P0 |
| `U-REV-LATHE-04` | LatheChipControlPage — `prism_cam:lathe_chip_control_validate` | `U-REV-MS0-ACT-CHIPCTRL-01` | chip-form prediction renders; lights-out verdict shown | P1 |
| `U-REV-LATHE-05` | LatheCostOptimizePage (Gilbert/Taylor) — `prism_calc:lathe_cost_optimize` | `U-REV-MS0-ENG-GILBERT-01` | min-cost / max-prod / max-profit triad renders; benchmark-flag visible | P1 |

#### Phase 5 — WEDM customer pages (revenue P1)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-WEDM-01` | WireEdmStudioPage / FeasibilityGate — `prism_edm:wedm_assess_feasibility` | `U-REV-MS0-HOIST-WEDM-02` | feasibility verdict per material/thickness | P1 |
| `U-REV-WEDM-02` | WireEdmProgramPage — `prism_edm:wedm_generate_gcode` | `U-REV-MS0-HOIST-WEDM-01`, `U-REV-MS0-ACT-WEDM-CTRL-01` | 5-dialect emission PASS | P1 |
| `U-REV-WEDM-03` | WireEdmCostPage — `prism_edm:wedm_estimate_cost` | `U-REV-MS0-HOIST-WEDM-01` | wire/machine/consumables breakdown | P1 |
| `U-REV-WEDM-04` | WireEdmMultipassPage — `prism_edm:wedm_full_multipass` | `U-REV-MS0-HOIST-WEDM-01` | pass-schedule rendered | P1 |
| `U-REV-WEDM-05` | WireEdmTroubleshootPage — `prism_edm:wedm_troubleshoot` | `U-REV-MS0-ACT-WEDM-TS-01` | 4 symptom-class round-trips PASS | P1 |
| `U-REV-WEDM-06` | WireEdmControllerSelectPage — `prism_edm:wedm_controller_select` | `U-REV-MS0-ACT-WEDM-CTRL-01` | 5-dialect picker PASS | P1 |
| `U-REV-WEDM-07` | WireEdmReportPage — `prism_edm:wedm_full_documentation` | `U-REV-WEDM-04` | report PDF emit | P2 |

#### Phase 6 — Quality customer pages (P1)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-QUALITY-01` | SpcChartPage — `prism_safety:spc_calculate` | `U-REV-MS0-HOIST-QUALITY-01` | live SPC chart; Xbar/R + IMR + Cpk variants | P1 |
| `U-REV-QUALITY-02` | FaiEditorPage — `prism_safety:fai_run` | `U-REV-MS0-HOIST-QUALITY-01` | FAI form populates | P1 |
| `U-REV-QUALITY-03` | CmmParseViewPage — `prism_safety:cmm_plan` | `U-REV-MS0-HOIST-QUALITY-01` | CMM XML import → form | P1 |
| `U-REV-QUALITY-04` | ToleranceStackVisualizerPage — `prism_safety:tolerance_stack` | `U-REV-MS0-HOIST-QUALITY-01` | stack viz + Monte-Carlo distribution | P1 |

#### Phase 7 — Admin customer pages (P0 — gates revenue)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-ADMIN-01` | UserManagementPage — `prism_tenant:list` | `U-REV-MS0-HOIST-ADMIN-01` | user CRUD; pagination | P0 |
| `U-REV-ADMIN-02` | AuditLogViewerPage — `prism_safety:audit_query_events` | `U-REV-MS0-HOIST-ADMIN-01` | audit log streams; filter by actor/event | P0 |
| `U-REV-ADMIN-03` | BillingPortalPage — `prism_business:billing_create_portal` | `U-REV-MS0-ACT-SUBTIER-01` | Stripe portal opens; sub state visible | P0 |
| `U-REV-ADMIN-04` | SeatAssignmentPage — `prism_tenant:seat_assign` | `U-REV-MS0-ACT-SEAT-01` | seat assign/remove round-trip | P0 |
| `U-REV-ADMIN-05` | ApiKeyManagementPage — `prism_auth:api_key_create/revoke/list` | `U-REV-MS0-ACT-APIKEY-01` | one-shot secret display; revoke works | P0 |
| `U-REV-ADMIN-06` | RbacRoleEditorPage — `prism_auth:rbac_role_create/assign/permission_grant` | `U-REV-MS0-ACT-RBAC-01` | role CRUD; permission matrix UI | P0 |
| `U-REV-ADMIN-07` | SubscriptionTierEditorPage — `prism_business:subscription_tier_set` | `U-REV-MS0-ACT-SUBTIER-01` | tier upgrade/downgrade UI | P0 |

#### Phase 8 — Learn customer pages (P1 — trial→paid flywheel)

| id | title | depends_on | acceptance | priority |
|---|---|---|---|---|
| `U-REV-LEARN-01` | TutorPage / OnboardingFlowPage — `prism_intelligence:tutor_session_start` | `U-REV-MS0-ACT-TUTOR-01`, `U-REV-MS0-HOIST-LEARN-01` | session start + lesson progression | P1 |
| `U-REV-LEARN-02` | VideoPlayerPage — `prism_intelligence:video_session_start` | `U-REV-MS0-ACT-VIDEO-01`, `U-REV-MS0-HOIST-LEARN-01` | video plays + transcript searchable | P1 |
| `U-REV-LEARN-03` | BlueprintTrainerPage — `prism_cad:blueprint_trainer_quiz` | `U-REV-MS0-ACT-BPTRAIN-01`, `U-REV-MS0-HOIST-LEARN-01` | quiz served + scored | P1 |

### Sequencing summary

```
Day 1: Phase 0 P0 — Spindle + ToolDB + Deflection + CADViewer + ApiKey + RBAC + Seat + SubTier + Stub-remediation (mill chatter/scientific)
Day 2: Phase 1 P0 hoists — ADMIN, LATHE-01, WEDM-01, MILL-01, SFC-01
Day 3: SFC customer pages (CAD-SFC-01..06) — first revenue surface ships
Day 4: ADMIN customer pages (revenue gate)
Day 5: Phase 0 P1 — MatBand + Gilbert + ChipCtrl + WEDM-TS/CTRL + Tutor/Video/BPTrain
Day 6: Phase 1 P1 hoists — LATHE-02, WEDM-02, QUALITY, MILL-02-NEW (greenfield Thermal), LEARN
Day 7-8: Lathe + Mill + WEDM + Quality + Learn customer pages
```

**Multi-controller variability gate (NEW per user directive):** every customer page (SFC, mill, lathe, WEDM) MUST exercise ≥3 of the 5 controller dialects (Fanuc/Haas/Mazak/Okuma/Mitsubishi) in its Playwright suite. The matrix is enforced by `comprehensive-build-enforce` hook.

**Count reconciliation:** 6 SFC + 5 mill + 5 lathe + 7 WEDM + 4 quality + 7 ADMIN + 3 learn = **37 customer pages** (was the original "37 vs 40" drift — locked to 37; original spec's "40" was an arithmetic error). Plus 18 backend prereq + hoist + remediation units = **61 total units**.
