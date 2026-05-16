# PRISM ROADMAP — Consolidated Inventory

> Generated 2026-05-16T19:22:38.596Z · schemaVersion 1.0.0 · **advisory, human-verify**
> Every roadmap unified: what is left to do + the bridge layer that synergizes the galaxy.

## Headline

- Milestones: **849** (555 with pending work)
- **Pending units (master remaining-work set): 4497**
- Prose-roadmap units extracted: 1133 · **un-consolidated (no envelope): 969**
- Misc orphaned tasks (MISC-TASKS-INVENTORY): 318
- Bridge layer: **26 wiring units** (836 engines) + **16 deep-integration units**
- **Grand total remaining work items: 5826**

## Bridge layer — wire + synergize the galaxy

### Wiring units (domain-grouped — 836 built-but-unwired engines)

| Unit | Domain | Engines | Intent |
|------|--------|---------|--------|
| U-BRIDGE-WIRE-OTHER | Other | 144 | Connect the 144 built-but-unwired Other-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-LATHE | Lathe | 89 | Connect the 89 built-but-unwired Lathe-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-MACHINE | Machine | 17 | Connect the 17 built-but-unwired Machine-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-TURNING | Turning | 11 | Connect the 11 built-but-unwired Turning-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-MULTI | Multi | 10 | Connect the 10 built-but-unwired Multi-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-TOOL | Tool | 9 | Connect the 9 built-but-unwired Tool-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-FIVE | Five | 9 | Connect the 9 built-but-unwired Five-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-SHOP | Shop | 9 | Connect the 9 built-but-unwired Shop-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-OUTCOME | Outcome | 8 | Connect the 8 built-but-unwired Outcome-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-HYPER | Hyper | 7 | Connect the 7 built-but-unwired Hyper-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-MILLING | Milling | 7 | Connect the 7 built-but-unwired Milling-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-FUSION | Fusion | 7 | Connect the 7 built-but-unwired Fusion-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-WET | Wet | 7 | Connect the 7 built-but-unwired Wet-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-PROCESS | Process | 6 | Connect the 6 built-but-unwired Process-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-PRINT | Print | 6 | Connect the 6 built-but-unwired Print-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-SWISS | Swiss | 6 | Connect the 6 built-but-unwired Swiss-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-WIRE | Wire | 6 | Connect the 6 built-but-unwired Wire-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-CONSENSUS | Consensus | 6 | Connect the 6 built-but-unwired Consensus-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-MOBILE | Mobile | 5 | Connect the 5 built-but-unwired Mobile-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-MASTERCAM | Mastercam | 5 | Connect the 5 built-but-unwired Mastercam-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-MILL | Mill | 4 | Connect the 4 built-but-unwired Mill-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-TRIBAL | Tribal | 4 | Connect the 4 built-but-unwired Tribal-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-ELECTRODE | Electrode | 4 | Connect the 4 built-but-unwired Electrode-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-SPEED | Speed | 4 | Connect the 4 built-but-unwired Speed-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-OKUMA | Okuma | 4 | Connect the 4 built-but-unwired Okuma-domain engines into their natural MCP dispatcher(s) so the capability is reachable. |
| U-BRIDGE-WIRE-LONGTAIL | Long-tail (domains outside the top 25) | 442 | Connect the remaining 442 built-but-unwired engines (small/misc domains beyond the top 25) into their MCP dispatchers. |

### Deep-integration units (cross-subsystem synergy)

| Unit | From → To | Intent |
|------|-----------|--------|
| U-BRIDGE-SFC-FUSION | SpeedFeedOrchestrator → cam_fusion bridge | Physics-backed speeds/feeds flow directly into Fusion 360 toolpath generation. |
| U-BRIDGE-SFC-HYPERMILL | SpeedFeedOrchestrator → cam_hypermill bridge | SFC output drives hyperMILL cycle parameters. |
| U-BRIDGE-SFC-MASTERCAM | SpeedFeedOrchestrator → cam_mastercam bridge | SFC output drives Mastercam operation parameters. |
| U-BRIDGE-SFC-ESPRIT | SpeedFeedOrchestrator → cam_esprit bridge | SFC output drives Esprit toolpath parameters. |
| U-BRIDGE-SFC-INVENTORHSM | SpeedFeedOrchestrator → cam_inventor_hsm bridge | SFC output drives Inventor HSM cycle parameters. |
| U-BRIDGE-SFC-SOLIDWORKS | SpeedFeedOrchestrator → cam_solidworks bridge | SFC output drives SolidWorks CAM parameters. |
| U-BRIDGE-MASTERPOST-CAM | MasterPost → all 6 CAM bridges | One post-processor surface emits controller-correct NC for every CAM bridge. |
| U-BRIDGE-CAD-CAM-HANDOFF | CAD generation AI → CAM programming AI | Autonomously-generated CAD geometry flows into CAM programming without a manual step. |
| U-BRIDGE-AI-TIER1-TIER2 | Claude orchestrator → FullSystemAICoordinator | Master orchestrator delegates cleanly to the Tier-2 coordinator. |
| U-BRIDGE-AI-TIER2-TIER3 | FullSystemAICoordinator → 7 domain specialist AIs | Tier-2 routes domain work to each Tier-3 specialist and merges results. |
| U-BRIDGE-SHOPFLOOR-LEARN | shop-floor / MTConnect → learning engines | Real machine telemetry feeds the closed-loop learning layer. |
| U-BRIDGE-LEARN-SFC | learning engines → SpeedFeedOrchestrator | Learned outcomes refine SFC's physics parameters over time. |
| U-BRIDGE-LEARN-CAM | learning engines → CAM strategy selectors | Learned outcomes refine CAM toolpath strategy selection. |
| U-BRIDGE-ERP-SCHED | ERP integration → scheduling + capacity engines | ERP work orders drive machine scheduling and capacity planning. |
| U-BRIDGE-ERP-QUOTE | ERP integration → quoting + cost engines | Quoting and should-cost analysis read from and write to ERP. |
| U-BRIDGE-OPERATOR-GATES | operator approval layer → CAD + CAM + post pipelines | Unconditional operator review gates wired at every autonomous-output boundary. |

## Un-consolidated prose-roadmap units (work in a roadmap doc with NO envelope)

| Unit ID | Roadmap | Title |
|---------|---------|-------|
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS1 — 400+ formula extraction |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS2 — CPS/cyc/CFG post+cycle library |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS3 — manufacturer-catalog PDFs |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS4 — OEM machine STEP models |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS5 — training curriculum docs |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS6 — tribal-knowledge mining |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS7 — hyperMILL deep intelligence |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS8 — Fusion 360 post library |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS9 — MIT-course algorithms |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS10 — CAD part library |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS11 — 15599 .MIN cutting conditions |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS12 — wire-EDM physics calibration |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS13 — JM Die machine configuration |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS14 — 287 tooldb/db tool catalog import |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS15 — 2110 hyperMILL SDK Python scripts |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS16 — automated job pipeline + xlsm integration |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS17 — probing-routine selection |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS18 — QT validation suite |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS19 — intelligent fixture selection |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS20 — automated setup sheet |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS21 — customer-defaults engine |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS22 — material-property enrichment |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS23 — hyperMILL Automation Center |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS24 — drawing-template learning |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS25 — NC output-format understanding |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS26 — macro conversion |
| — | REVENUE-ROADMAP-v7.6 | Promote RES-MS27 — CAD/CAM front-end |
| U-VIZRM-01 | REVENUE-ROADMAP-v7.6 | Roadmap-to-graph parser |
| U-VIZRM-02 | REVENUE-ROADMAP-v7.6 | Ghost-node schema extension |
| U-VIZRM-03 | REVENUE-ROADMAP-v7.6 | Roadmap↔graph reconciliation |
| U-VIZRM-04 | REVENUE-ROADMAP-v7.6 | Burndown overlay |
| U-VIZRM-05 | REVENUE-ROADMAP-v7.6 | Auto-regen hook |
| U-VIZRM-06 | REVENUE-ROADMAP-v7.6 | Reconciliation feeds back into the roadmap |
| U-VIZRM-07 | REVENUE-ROADMAP-v7.6 | Burndown CI gate |
| U-VIZRM-08 | REVENUE-ROADMAP-v7.6 | /system-viz --roadmap flag |
| U-VIZRM-09 | REVENUE-ROADMAP-v7.6 | Regenerate MILESTONE_PROGRESS from roadmap-nodes.json |
| U-VIZRM-10 | REVENUE-ROADMAP-v7.6 | PRISM-ROADMAP-VIZ-DIRECTIVE.md documentation |
| U-WIRE-BE-P0-02 | REVENUE-ROADMAP-v7.6 | Product-critical wirings P0 batch 2 (= MS-CRITWIRE) |
| U-WIRE-BE-P0-03 | REVENUE-ROADMAP-v7.6 | Product-critical wirings P0 batch 3 (= MS-CRITWIRE) |
| U-WIRE-BE-P0-04 | REVENUE-ROADMAP-v7.6 | Product-critical wirings P0 batch 4 (= MS-CRITWIRE) |
| U-DOCFLOW | REVENUE-ROADMAP-v7.6 | Cross-cutting doc-backflow rule + audit-doc-backflow.mjs |
| U-REV-MS0-ENG-SPINDLE-01 | REVENUE-ROADMAP-v7.6 | Build SpindleCharacteristicEngine |
| U-REV-MS0-ENG-TOOLDB-01 | REVENUE-ROADMAP-v7.6 | Build ToolCatalogEngine |
| U-REV-MS0-ENG-DEFLECT-01 | REVENUE-ROADMAP-v7.6 | Build DeflectionCalculateEngine |
| U-REV-MS0-ENG-MATBAND-01 | REVENUE-ROADMAP-v7.6 | Build MaterialBandResolverEngine |
| U-REV-MS0-ENG-GILBERT-01 | REVENUE-ROADMAP-v7.6 | Build GilbertEconomicSpeedEngine |
| U-REV-MS0-STUB-MILL-CHATTER-01 | REVENUE-ROADMAP-v7.6 | Remediate STUB mill_chatter_predict |
| U-REV-MS0-STUB-MILL-SCI-01 | REVENUE-ROADMAP-v7.6 | Remediate STUB mill_scientific_analyze |
| U-REV-MS0-ACT-CHIPCTRL-01 | REVENUE-ROADMAP-v7.6 | Add lathe_chip_control_validate action + ChipControlEngine wiring |
| U-REV-MS0-ACT-WEDM-TS-01 | REVENUE-ROADMAP-v7.6 | Add wedm_troubleshoot action + wire WEDMTroubleshootingEngine |
| U-REV-MS0-ACT-WEDM-CTRL-01 | REVENUE-ROADMAP-v7.6 | Add wedm_controller_select action + WEDMControllerDialectEngine |
| U-REV-MS0-ACT-CADVIEW-01 | REVENUE-ROADMAP-v7.6 | Add cad_viewer_load_stl action + build CADViewerStreamEngine |
| U-REV-MS0-ACT-APIKEY-01 | REVENUE-ROADMAP-v7.6 | Add api_key_create/revoke/list + build ApiKeyEngine |
| U-REV-MS0-ACT-RBAC-01 | REVENUE-ROADMAP-v7.6 | Add rbac_role_create/assign/list + permission_grant + build RBACEngine |
| U-REV-MS0-ACT-SEAT-01 | REVENUE-ROADMAP-v7.6 | Add seat_assign action (hoist SeatAllocationEngine from MS1) |
| U-REV-MS0-ACT-SUBTIER-01 | REVENUE-ROADMAP-v7.6 | Add subscription_tier_set action (hoist from MS1) |
| U-REV-MS0-ACT-TUTOR-01 | REVENUE-ROADMAP-v7.6 | Add tutor session actions + build TutorialProgressionEngine |
| U-REV-MS0-ACT-VIDEO-01 | REVENUE-ROADMAP-v7.6 | Add video session actions + build VideoTrainingEngine |
| U-REV-MS0-ACT-BPTRAIN-01 | REVENUE-ROADMAP-v7.6 | Add blueprint_trainer_quiz/score + build BlueprintTrainingEngine |
| U-REV-MS0-HOIST-ADMIN-01 | REVENUE-ROADMAP-v7.6 | Hoist rank #1 — wire ADMIN engines into prism_auth + prism_tenant |
| U-REV-MS0-HOIST-LATHE-01 | REVENUE-ROADMAP-v7.6 | Hoist rank #2a — wire 6 lathe engines into prism_turning + prism_lathe |
| U-REV-MS0-HOIST-LATHE-02 | REVENUE-ROADMAP-v7.6 | Hoist rank #2b — wire 4 lathe AI engines |
| U-REV-MS0-HOIST-WEDM-01 | REVENUE-ROADMAP-v7.6 | Hoist rank #3a — wire 4 WEDM engines |
| U-REV-MS0-HOIST-WEDM-02 | REVENUE-ROADMAP-v7.6 | Hoist rank #3b — wire 3 WEDM engines |
| U-REV-MS0-HOIST-QUALITY-01 | REVENUE-ROADMAP-v7.6 | Hoist rank #4 — wire 7 quality engines |
| U-REV-MS0-HOIST-MILL-01 | REVENUE-ROADMAP-v7.6 | Hoist rank #5 — wire 4 mill engines |
| U-REV-MS0-HOIST-MILL-02-NEW | REVENUE-ROADMAP-v7.6 | Build greenfield ThermalFieldEngine |
| U-REV-MS0-HOIST-SFC-01 | REVENUE-ROADMAP-v7.6 | Wire 8 SpeedFeed engines to prism_calc |
| U-REV-MS0-HOIST-LEARN-01 | REVENUE-ROADMAP-v7.6 | Wire 6 LEARN engines |
| U-REV-CAD-SFC-01 | REVENUE-ROADMAP-v7.6 | SfcCalculatorPage |
| U-REV-CAD-SFC-02 | REVENUE-ROADMAP-v7.6 | SfcCompareMaterialsPage |
| U-REV-CAD-SFC-03 | REVENUE-ROADMAP-v7.6 | CadViewer3DPage |
| U-REV-CAD-SFC-04 | REVENUE-ROADMAP-v7.6 | NL-to-CadQuery Page |
| U-REV-CAD-SFC-05 | REVENUE-ROADMAP-v7.6 | BlueprintToCadPage |
| U-REV-CAD-SFC-06 | REVENUE-ROADMAP-v7.6 | SfcMachineAwarePage |
| U-REV-MILL-01 | REVENUE-ROADMAP-v7.6 | MillStudioPage / SpeedFeedPage (mill mode) |
| U-REV-MILL-02 | REVENUE-ROADMAP-v7.6 | MillStrategyPage / ToolpathSelectorPage |
| U-REV-MILL-03 | REVENUE-ROADMAP-v7.6 | ChatterPredictionPage / SLDViewerPage |
| U-REV-MILL-04 | REVENUE-ROADMAP-v7.6 | MillThermalPreviewPage |
| U-REV-MILL-05 | REVENUE-ROADMAP-v7.6 | MillScientificAnalysisPage |
| U-REV-LATHE-01 | REVENUE-ROADMAP-v7.6 | LatheStudioPage / TurningSpeedFeedPage |
| U-REV-LATHE-02 | REVENUE-ROADMAP-v7.6 | LatheThreadingPage |
| U-REV-LATHE-03 | REVENUE-ROADMAP-v7.6 | LathePostgenPage / MasterPostPage |
| U-REV-LATHE-04 | REVENUE-ROADMAP-v7.6 | LatheChipControlPage |
| U-REV-LATHE-05 | REVENUE-ROADMAP-v7.6 | LatheCostOptimizePage |
| U-REV-WEDM-01 | REVENUE-ROADMAP-v7.6 | WireEdmStudioPage / FeasibilityGate |
| U-REV-WEDM-02 | REVENUE-ROADMAP-v7.6 | WireEdmProgramPage |
| U-REV-WEDM-03 | REVENUE-ROADMAP-v7.6 | WireEdmCostPage |
| U-REV-WEDM-04 | REVENUE-ROADMAP-v7.6 | WireEdmMultipassPage |
| U-REV-WEDM-05 | REVENUE-ROADMAP-v7.6 | WireEdmTroubleshootPage |
| U-REV-WEDM-06 | REVENUE-ROADMAP-v7.6 | WireEdmControllerSelectPage |
| U-REV-WEDM-07 | REVENUE-ROADMAP-v7.6 | WireEdmReportPage |
| U-REV-QUALITY-01 | REVENUE-ROADMAP-v7.6 | SpcChartPage |
| U-REV-QUALITY-02 | REVENUE-ROADMAP-v7.6 | FaiEditorPage |
| U-REV-QUALITY-03 | REVENUE-ROADMAP-v7.6 | CmmParseViewPage |
| U-REV-QUALITY-04 | REVENUE-ROADMAP-v7.6 | ToleranceStackVisualizerPage |
| U-REV-ADMIN-01 | REVENUE-ROADMAP-v7.6 | UserManagementPage |
| U-REV-ADMIN-02 | REVENUE-ROADMAP-v7.6 | AuditLogViewerPage |
| U-REV-ADMIN-03 | REVENUE-ROADMAP-v7.6 | BillingPortalPage |
| U-REV-ADMIN-04 | REVENUE-ROADMAP-v7.6 | SeatAssignmentPage |
| U-REV-ADMIN-05 | REVENUE-ROADMAP-v7.6 | ApiKeyManagementPage |
| U-REV-ADMIN-06 | REVENUE-ROADMAP-v7.6 | RbacRoleEditorPage |
| U-REV-ADMIN-07 | REVENUE-ROADMAP-v7.6 | SubscriptionTierEditorPage |
| U-REV-LEARN-01 | REVENUE-ROADMAP-v7.6 | TutorPage / OnboardingFlowPage |
| U-REV-LEARN-02 | REVENUE-ROADMAP-v7.6 | VideoPlayerPage |
| U-REV-LEARN-03 | REVENUE-ROADMAP-v7.6 | BlueprintTrainerPage |
| U-REV-CI-00 | REVENUE-ROADMAP-v7.6 | CI non-stub gate |
| U-DEP-NORMALIZE | REVENUE-ROADMAP-v7.6 | Normalize cross-MS prose dependencies into explicit depends_on |
| U-MS2-STUB-SWEEP | REVENUE-ROADMAP-v7.6 | Replace all 6 stub-trap dispatcher action returns |
| U-MS2-MILLPHYS-FENCE | REVENUE-ROADMAP-v7.6 | Mill-physics fence dependency edge |
| U-MASTERPOST-FENCE | REVENUE-ROADMAP-v7.6 | Master Post scope-fence |
| U-REVB-MC-CANON | REVENUE-ROADMAP-v7.6 | Fix v7.B Row 25 mc exponents to match constants.ts |
| U-REVB-CHIPTHIN-ARCSIN | REVENUE-ROADMAP-v7.6 | Fix v7.B Row 5 chip-thinning arcsin form |
| U-REVB-SLD-GUARD | REVENUE-ROADMAP-v7.6 | Add v7.B Row 3 SLD Re-Phi guard |
| U-PILOT-FLEET-REGROUND | REVENUE-ROADMAP-v7.6 | Re-scope MS-PILOT onto actual JM-Die 15-machine fleet |
| U-MP-DIFFERENTIATOR-FUND | REVENUE-ROADMAP-v7.6 | Fund Master-Post differentiators (+4 units) |
| U-CAM-TIER1-COMPLETE | REVENUE-ROADMAP-v7.6 | Add Inventor HSM + SolidWorks CAM parser units |
| U-SUB-00 | REVENUE-ROADMAP-v7.6 | prism_subscription dispatcher scaffold |
| U-SUB-19 | REVENUE-ROADMAP-v7.6 | Stripe webhook security primitives |
| U-SUB-20 | REVENUE-ROADMAP-v7.6 | Stripe webhook event handler dispatch |
| U-SUB-21 | REVENUE-ROADMAP-v7.6 | Paddle webhook RSA signature verifier |
| U-SUB-22 | REVENUE-ROADMAP-v7.6 | Stripe Tax bridge |
| U-SUB-23 | REVENUE-ROADMAP-v7.6 | Invoice tax-line rendering |
| U-SUB-24 | REVENUE-ROADMAP-v7.6 | B2B VAT-ID validation |
| U-SUB-25 | REVENUE-ROADMAP-v7.6 | Tax-exempt customer flow |
| U-SUB-26 | REVENUE-ROADMAP-v7.6 | Currency rounding + reconciliation |
| U-SUB-27 | REVENUE-ROADMAP-v7.6 | GDPR Art-17 delete cascade |
| U-SUB-28 | REVENUE-ROADMAP-v7.6 | SOC2 audit-log immutable hash-chain |
| U-SUB-29 | REVENUE-ROADMAP-v7.6 | Audit-log retention + PII minimization |
| U-SUB-30 | REVENUE-ROADMAP-v7.6 | Proration engine (decoupled) |
| U-SUB-31 | REVENUE-ROADMAP-v7.6 | Plan-change downgrade state machine |
| U-SUB-32 | REVENUE-ROADMAP-v7.6 | Grandfather pricing table + reactivation window |
| U-SUB-33 | REVENUE-ROADMAP-v7.6 | Refund math + entitlement revoke atomicity |
| U-SUB-34 | REVENUE-ROADMAP-v7.6 | Chargeback evidence pipeline |
| U-SUB-35 | REVENUE-ROADMAP-v7.6 | Annual-to-monthly credit conversion |
| U-SUB-36 | REVENUE-ROADMAP-v7.6 | Dunning state machine |
| U-SUB-37 | REVENUE-ROADMAP-v7.6 | Offline CAM-plugin JWT license |
| U-SUB-38 | REVENUE-ROADMAP-v7.6 | Browser-to-plugin token bridge |
| U-SUB-39 | REVENUE-ROADMAP-v7.6 | Seat revoke + token revocation list (CRL) |
| U-SUB-40 | REVENUE-ROADMAP-v7.6 | Seat transfer + history audit |
| U-SUB-41 | REVENUE-ROADMAP-v7.6 | Multi-org membership |
| U-SUB-42 | REVENUE-ROADMAP-v7.6 | Pairwise test matrix generator (IPOG) |
| U-SUB-43 | REVENUE-ROADMAP-v7.6 | Affiliate fraud heuristics + clawback |
| U-SUB-01 | REVENUE-ROADMAP-v7.6 | Stripe webhook receiver (thin shim) |
| U-SUB-02 | REVENUE-ROADMAP-v7.6 | Paddle alternative for non-US (thin shim) |
| U-SUB-03 | REVENUE-ROADMAP-v7.6 | Tier-feature mapping (FeatureTierEngine) |
| U-SUB-04 | REVENUE-ROADMAP-v7.6 | Per-seat license validation middleware |
| U-SUB-05 | REVENUE-ROADMAP-v7.6 | Trial to paid conversion flow |
| U-SUB-06 | REVENUE-ROADMAP-v7.6 | Customer dashboard backend |
| U-SUB-07 | REVENUE-ROADMAP-v7.6 | Customer dashboard frontend |
| U-SUB-08 | REVENUE-ROADMAP-v7.6 | Invoice/receipt PDF generation |
| U-SUB-09 | REVENUE-ROADMAP-v7.6 | Failed-payment dunning flow (thin shim) |
| U-SUB-10 | REVENUE-ROADMAP-v7.6 | API rate-limit per-tier middleware |
| U-SUB-11 | REVENUE-ROADMAP-v7.6 | Per-tier hook injection |
| U-SUB-12 | REVENUE-ROADMAP-v7.6 | Refund/dispute handler (thin shim) |
| U-SUB-13 | REVENUE-ROADMAP-v7.6 | Tax calc (thin shim) |
| U-SUB-14 | REVENUE-ROADMAP-v7.6 | Annual-vs-monthly discount logic |
| U-SUB-15 | REVENUE-ROADMAP-v7.6 | Multi-seat purchase + admin invite (thin shim) |
| U-SUB-16 | REVENUE-ROADMAP-v7.6 | Subscription pause / vacation mode |
| U-SUB-17 | REVENUE-ROADMAP-v7.6 | Self-service plan upgrade/downgrade |
| U-SUB-18 | REVENUE-ROADMAP-v7.6 | Affiliate / referral tracking (thin shim) |
| U-INV-MILL-01 | REVENUE-ROADMAP-v7.6 | Mill Operator Advisor |
| U-INV-MILL-02 | REVENUE-ROADMAP-v7.6 | Tool-life co-optimizer with MRR |
| U-INV-MILL-03 | REVENUE-ROADMAP-v7.6 | Long-tool feed advisor with damped closed-loop |
| U-INV-MILL-04 | REVENUE-ROADMAP-v7.6 | Per-operation chatter-free RPM picker |
| U-INV-MILL-05 | REVENUE-ROADMAP-v7.6 | Thermal-compensated first-part probe + offset |
| U-INV-MILL-06 | REVENUE-ROADMAP-v7.6 | Quote-from-STEP |
| U-INV-MILL-08 | REVENUE-ROADMAP-v7.6 | Cycle Time Crush SaaS |
| U-INV-LATHE-01 | REVENUE-ROADMAP-v7.6 | Hard-turn parameter advisor |
| U-INV-LATHE-02 | REVENUE-ROADMAP-v7.6 | Lights-out turning verdict |
| U-INV-LATHE-03 | REVENUE-ROADMAP-v7.6 | Universal threading wizard |
| U-INV-LATHE-04 | REVENUE-ROADMAP-v7.6 | Mill-turn collision-free post for Okuma B250IIW |
| U-INV-LATHE-05 | REVENUE-ROADMAP-v7.6 | Cost-per-part calculator |
| U-INV-LATHE-06 | REVENUE-ROADMAP-v7.6 | Lathe Print-to-Program Pipeline |
| U-INV-LATHE-07 | REVENUE-ROADMAP-v7.6 | Groove-job advisor |
| U-INV-WEDM-01 | REVENUE-ROADMAP-v7.6 | WEDM 4-axis taper-die programming |
| U-INV-WEDM-03 | REVENUE-ROADMAP-v7.6 | WEDM PCD-specific hooks |
| U-INV-CROSS-02 | REVENUE-ROADMAP-v7.6 | Setup-sheet auto-generator |
| U-INV-CROSS-03 | REVENUE-ROADMAP-v7.6 | Tolerance-stack web tool |
| U-INV-CROSS-04 | REVENUE-ROADMAP-v7.6 | Quote-to-Ship Milestone (multi-unit) |
| U-INV-CROSS-05 | REVENUE-ROADMAP-v7.6 | Cross-domain process planner |
| U-INV-CROSS-06 | REVENUE-ROADMAP-v7.6 | MoldDFM engine |
| U-INV-SHOP-01 | REVENUE-ROADMAP-v7.6 | Shop-floor live dashboard |
| U-INV-SHOP-02 | REVENUE-ROADMAP-v7.6 | OEE alerts (real-time) |
| U-INV-SHOP-03 | REVENUE-ROADMAP-v7.6 | Tool-crib inventory + reorder |
| U-INV-SHOP-04 | REVENUE-ROADMAP-v7.6 | Magazine/turret optimizer |
| U-INV-SHOP-05 | REVENUE-ROADMAP-v7.6 | Shop-safety check |
| U-INV-SHOP-06 | REVENUE-ROADMAP-v7.6 | Industrial-supply auto-reorder |
| U-INV-SHOP-07 | REVENUE-ROADMAP-v7.6 | Job-traveler PDF/QR generator |
| U-INV-KNOW-02 | REVENUE-ROADMAP-v7.6 | Ingest customer manuals (PDF/video/web) |
| U-INV-KNOW-03 | REVENUE-ROADMAP-v7.6 | Operator chat with conflict resolution + PII |
| U-INV-KNOW-04 | REVENUE-ROADMAP-v7.6 | Internal training tracker |
| U-INV-CAD-01 | REVENUE-ROADMAP-v7.6 | Text-to-CAD generation |
| U-INV-CAD-02 | REVENUE-ROADMAP-v7.6 | Topology-optimized geometry via TopOpt/ToPy sidecar |
| U-INV-CAD-03 | REVENUE-ROADMAP-v7.6 | Chat-with-the-part |
| U-WIRE-LATHE-BATCH12 | REVENUE-ROADMAP-v7.6 | Wire 9 Lathe AI/CAM/chemistry engines to prism_turning |
| U-WIRE-LATHE-BATCH13 | REVENUE-ROADMAP-v7.6 | Wire 9 Lathe knowledge/material/measurement engines |
| U-WIRE-TURNING-BATCH1 | REVENUE-ROADMAP-v7.6 | Wire 11 Turning engines (full domain close) |
| U-WIRE-LATHE-BATCH14 | REVENUE-ROADMAP-v7.6 | Wire 10 Lathe sequencing/optimization/strategy engines |
| U-WIRE-LATHE-BATCH15 | REVENUE-ROADMAP-v7.6 | Wire 10 Lathe tools/validation/workholding engines |
| U-WIRE-MACHINE-BATCH1 | REVENUE-ROADMAP-v7.6 | Wire 9 Machine speed/feed/OEE engines |
| U-WIRE-MACHINE-BATCH2 | REVENUE-ROADMAP-v7.6 | Wire 8 Machine ROI/state/telemetry engines |
| U-WIRE-MULTI-BATCH1 | REVENUE-ROADMAP-v7.6 | Wire 12 Multi-agent/multi-vendor engines |
| U-WIRE-CAM-OTHER-BATCH1 | REVENUE-ROADMAP-v7.6 | Wire 10 CAD subset of Other engines |
| U-WIRE-CAM-OTHER-BATCH2 | REVENUE-ROADMAP-v7.6 | Wire 10 CAM subset of Other engines |
| U-WIRE-QUALITY-OTHER-BATCH1 | REVENUE-ROADMAP-v7.6 | Wire 8 AS9100/PPAP/FAIR quality engines |
| U-WIRE-OTHER-MISC-BATCH1 | REVENUE-ROADMAP-v7.6 | Wire 10 ShopFloor + GCode-template engines |
| U-DRIFT-01 | REVENUE-ROADMAP-v7.6 | Reconcile MF-MS1 via envelope-sync |
| U-DRIFT-02 | REVENUE-ROADMAP-v7.6 | Reconcile MF-MS2 via envelope-sync |
| U-DRIFT-03 | REVENUE-ROADMAP-v7.6 | 6h drift-watch cron monitor (optional) |
| U-REV-AUDIT-SFC-01 | REVENUE-ROADMAP-v7.6 | Audit SFC engine family for stubs + dispatcher wiring |
| U-REV-AUDIT-MASTERPOST-01 | REVENUE-ROADMAP-v7.6 | Master Post controller-dialect coverage audit |
| U-REV-AUDIT-CAM-BRIDGE-01 | REVENUE-ROADMAP-v7.6 | Six tier-1 CAM-bridge audit |
| U-REV-AUDIT-SYNTHESIS-01 | REVENUE-ROADMAP-v7.6 | Synthesis report feeding REVENUE-MS1 billing gates |
| U-CAMM-FUS-D | REVENUE-ROADMAP-v7.6 | PRISM Fusion add-in |
| U-REV-MP-01 | REVENUE-ROADMAP-v7.6 | MasterPost unified API surface |
| U-REV-MP-02 | REVENUE-ROADMAP-v7.6 | Upload pipe + ingest |
| U-REV-MP-03 | REVENUE-ROADMAP-v7.6 | Neutral Toolpath Schema (NTS) v1.0 |
| U-REV-MP-04 | REVENUE-ROADMAP-v7.6 | Fusion 360 .nc parser to NTS |
| U-REV-MP-05 | REVENUE-ROADMAP-v7.6 | Mastercam NCI/MCAM parser to NTS |
| U-REV-MP-06 | REVENUE-ROADMAP-v7.6 | hyperMILL .H parser to NTS |
| U-REV-MP-07 | REVENUE-ROADMAP-v7.6 | InventorHSM / HSMWorks parser to NTS |
| U-REV-MP-08 | REVENUE-ROADMAP-v7.6 | Esprit / SolidCAM parser to NTS |
| U-REV-MP-09 | REVENUE-ROADMAP-v7.6 | Fanuc emitter (mill+lathe) |
| U-REV-MP-10 | REVENUE-ROADMAP-v7.6 | Haas emitter (NGC + PRE-NGC) |
| U-REV-MP-11 | REVENUE-ROADMAP-v7.6 | Okuma OSP emitter (lathe+mill) |
| U-REV-MP-12 | REVENUE-ROADMAP-v7.6 | Mazak Mazatrol-T/M emitter |
| U-REV-MP-13 | REVENUE-ROADMAP-v7.6 | Siemens 840D/828D emitter |
| U-REV-MP-14 | REVENUE-ROADMAP-v7.6 | Heidenhain TNC640 / iTNC530 emitter |
| U-REV-MP-15 | REVENUE-ROADMAP-v7.6 | Mitsubishi M700/M800 emitter |
| U-REV-MP-16 | REVENUE-ROADMAP-v7.6 | Hurco WinMAX emitter |
| U-REV-MP-17 | REVENUE-ROADMAP-v7.6 | Sodick/Makino/Agie WEDM emitter unification |
| U-REV-MP-18 | REVENUE-ROADMAP-v7.6 | MasterPost upload page |
| U-REV-MP-19 | REVENUE-ROADMAP-v7.6 | Controller picker |
| U-REV-MP-20 | REVENUE-ROADMAP-v7.6 | Format options panel |
| U-REV-MP-21 | REVENUE-ROADMAP-v7.6 | Output preview pane + diff |
| U-REV-MP-22 | REVENUE-ROADMAP-v7.6 | Output download + share-link |
| U-REV-MP-23 | REVENUE-ROADMAP-v7.6 | WCS / work-offset handling |
| U-REV-MP-24 | REVENUE-ROADMAP-v7.6 | Tool-change block builder |
| U-REV-MP-25 | REVENUE-ROADMAP-v7.6 | M-code library |
| U-REV-MP-26 | REVENUE-ROADMAP-v7.6 | Canned cycle translator |
| U-REV-MP-27 | REVENUE-ROADMAP-v7.6 | Safety preamble + epilogue |
| U-REV-MP-28 | REVENUE-ROADMAP-v7.6 | Comments + program header |
| U-REV-MP-29 | REVENUE-ROADMAP-v7.6 | Sub-program + pattern repeat |
| U-REV-MP-30 | REVENUE-ROADMAP-v7.6 | Sub-spindle + dual-turret lathe |
| U-REV-MP-31 | REVENUE-ROADMAP-v7.6 | Syntax-check validator |
| U-REV-MP-32 | REVENUE-ROADMAP-v7.6 | Controller-rule validator |
| U-REV-MP-33 | REVENUE-ROADMAP-v7.6 | Vericut-class collision sim integration |
| U-REV-MP-34 | REVENUE-ROADMAP-v7.6 | Dry-run mode |
| U-REV-MP-35 | REVENUE-ROADMAP-v7.6 | Stripe metered billing — per-program credits |
| U-REV-MP-36 | REVENUE-ROADMAP-v7.6 | Per-seat subscription tiers |
| U-REV-MP-37 | REVENUE-ROADMAP-v7.6 | Free tier (watermarked, 5 posts/mo) |
| U-REV-MP-38 | REVENUE-ROADMAP-v7.6 | Training data pipeline |
| U-REV-MP-39 | REVENUE-ROADMAP-v7.6 | JM Die live-pilot |
| U-REV-MP-40 | REVENUE-ROADMAP-v7.6 | REST API key + CAM-plugin hook |
| U-TRAIN-P2P-01 | REVENUE-ROADMAP-v7.6 | Docustrata image-OCR to part-numbers |
| U-TRAIN-P2P-02 | REVENUE-ROADMAP-v7.6 | Print-feature extraction pipeline |
| U-TRAIN-P2P-03 | REVENUE-ROADMAP-v7.6 | Print-program join + dataset-builder JSONL |
| U-TRAIN-P2P-04 | REVENUE-ROADMAP-v7.6 | Held-out freeze + harness real-file replay upgrade |
| U-TRAIN-P2P-05 | REVENUE-ROADMAP-v7.6 | Functional-equiv validator (cnc_simulate_physics) |
| U-TRAIN-P2P-06 | REVENUE-ROADMAP-v7.6 | Lathe LoRA first train + benchmark |
| U-TRAIN-P2P-07 | REVENUE-ROADMAP-v7.6 | Mill + mill-turn + wire-EDM adapters |
| U-TRAIN-P2P-08 | REVENUE-ROADMAP-v7.6 | MoE composition + drift-trigger + monthly cron |
| U-TRAIN-CAD-01 | REVENUE-ROADMAP-v7.6 | Finish CAD corpus classification (70% to ~95%) |
| U-TRAIN-CAD-02 | REVENUE-ROADMAP-v7.6 | CAD-script tokenize + CAD_TRAINING_CORPUS.jsonl |
| U-TRAIN-CAD-03 | REVENUE-ROADMAP-v7.6 | Print-CAD feature-tree pairing |
| U-TRAIN-CAD-04 | REVENUE-ROADMAP-v7.6 | Real ModelBackend wired into CADSequenceTrainerEngine |
| U-TRAIN-CAD-05 | REVENUE-ROADMAP-v7.6 | Geometric-sim + feature-F1 held-out harness |
| U-TRAIN-CAD-06 | REVENUE-ROADMAP-v7.6 | First CAD-generation LoRA + cad_regen_compare benchmark |
| U-TRAIN-CAD-07 | REVENUE-ROADMAP-v7.6 | CAM-toolpath-from-features layer + drift-trigger |
| U-TRAIN-SFC-01 | REVENUE-ROADMAP-v7.6 | Measured-cut capture path |
| U-TRAIN-SFC-02 | REVENUE-ROADMAP-v7.6 | Bayesian Kienzle/Taylor per-cell calibration harness |
| U-TRAIN-SFC-03 | REVENUE-ROADMAP-v7.6 | Tool-life cold-start bootstrap |
| U-TRAIN-SFC-04 | REVENUE-ROADMAP-v7.6 | Per-cell enumeration + conformal-coverage gate |
| U-TRAIN-SFC-05 | REVENUE-ROADMAP-v7.6 | Per-machine LoRA onboarding pipeline for Haas TM-1P |
| U-TRAIN-SFC-06 | REVENUE-ROADMAP-v7.6 | Drift-detector + quarterly cron |
| U-TRAIN-X-01 | REVENUE-ROADMAP-v7.6 | Unified extract-to-label step |
| U-TRAIN-X-02 | REVENUE-ROADMAP-v7.6 | Deterministic stratified split utility |
| U-TRAIN-X-03 | REVENUE-ROADMAP-v7.6 | Detached-GPU training runner |
| U-TRAIN-X-04 | REVENUE-ROADMAP-v7.6 | Adapter registry + deploy |
| U-TRAIN-X-05 | REVENUE-ROADMAP-v7.6 | Drift-monitor + re-train trigger |
| U-SFCC-P0-01 | REVENUE-ROADMAP-v7.6 | SFCBenchmarkMatrixEngine + benchmark matrix schema |
| U-SFCC-P0-02 | REVENUE-ROADMAP-v7.6 | HSMAdvisor matrix runner |
| U-SFCC-P0-03 | REVENUE-ROADMAP-v7.6 | Vendor Playwright scrapers (B4/B5/B7) |
| U-SFCC-P0-04 | REVENUE-ROADMAP-v7.6 | Internal-benchmark adapters (B9-B12) |
| U-SFCC-P0-05 | REVENUE-ROADMAP-v7.6 | SFCResidualHarnessEngine |
| U-SFCC-P0-06 | REVENUE-ROADMAP-v7.6 | Manual-export importer for B2/B3/B6/B8 + CI assertion |
| U-SFCC-P1-01 | REVENUE-ROADMAP-v7.6 | SFCSynthesisEngine |
| U-SFCC-P1-02 | REVENUE-ROADMAP-v7.6 | Regime router |
| U-SFCC-P1-03 | REVENUE-ROADMAP-v7.6 | SFCBayesianAveragingEngine |
| U-SFCC-P1-04 | REVENUE-ROADMAP-v7.6 | Tribal post-adjustment + Monte-Carlo confidence band |
| U-SFCC-P1-05 | REVENUE-ROADMAP-v7.6 | Calibration loop driver (SFCCalibrationLoopEngine) |
| U-SFCC-P1-06 | REVENUE-ROADMAP-v7.6 | Wire proven-program outcome-capture loop |
| U-SFCC-P1-07 | REVENUE-ROADMAP-v7.6 | Customer-facing SFC result API/page |
| U-SFCC-P2-01 | REVENUE-ROADMAP-v7.6 | Tier-0 validation (~300 proven-program cells) |
| U-SFCC-P2-02 | REVENUE-ROADMAP-v7.6 | Tier-1 Taguchi OA generation + validation |
| U-SFCC-P2-03 | REVENUE-ROADMAP-v7.6 | Tier-2 LHS fill |
| U-SFCC-P2-04 | REVENUE-ROADMAP-v7.6 | Tier-3 adversarial validation |
| U-SFCC-P2-05 | REVENUE-ROADMAP-v7.6 | DoD scorecard generator |
| U-SFCC-ONG-01 | REVENUE-ROADMAP-v7.6 | SFCDriftCanaryEngine cron |
| U-LEGAL-01 | REVENUE-ROADMAP-v7.6 | IP-source risk register |
| U-LEGAL-02 | REVENUE-ROADMAP-v7.6 | Engage IP counsel |
| U-LEGAL-03 | REVENUE-ROADMAP-v7.6 | Re-derive alarm DB from public operator manuals |
| U-LEGAL-04 | REVENUE-ROADMAP-v7.6 | Re-author post configs from machine-builder manuals |
| U-LEGAL-05 | REVENUE-ROADMAP-v7.6 | Vendor-catalog migration to ISO 13399 feeds |
| U-LEGAL-06 | REVENUE-ROADMAP-v7.6 | JM-Die data-use agreement |
| U-LEGAL-07 | REVENUE-ROADMAP-v7.6 | JM-Die anonymization pass |
| U-LEGAL-08 | REVENUE-ROADMAP-v7.6 | MIT/academic audit |
| U-LEGAL-09 | REVENUE-ROADMAP-v7.6 | Terms of Service |
| U-LEGAL-10 | REVENUE-ROADMAP-v7.6 | EULA / subscription license |
| U-LEGAL-11 | REVENUE-ROADMAP-v7.6 | Privacy policy + DPA |
| U-LEGAL-12 | REVENUE-ROADMAP-v7.6 | Output-IP + indemnification policy |
| U-LEGAL-13 | REVENUE-ROADMAP-v7.6 | Legally-clean-to-sell sign-off gate |
| U-DESK-01 | REVENUE-ROADMAP-v7.6 | Electron shell scaffold |
| U-DESK-02 | REVENUE-ROADMAP-v7.6 | Local-server lifecycle |
| U-DESK-03 | REVENUE-ROADMAP-v7.6 | License-key activation flow |
| U-DESK-04 | REVENUE-ROADMAP-v7.6 | Tier enforcement in-app |
| U-DESK-05 | REVENUE-ROADMAP-v7.6 | Auto-update channel |
| U-DESK-06 | REVENUE-ROADMAP-v7.6 | Code-signing |
| U-DESK-07 | REVENUE-ROADMAP-v7.6 | File-association + deep-links |
| U-DESK-08 | REVENUE-ROADMAP-v7.6 | Offline mode |
| U-DESK-09 | REVENUE-ROADMAP-v7.6 | CAM-plugin bridge re-point |
| U-DESK-10 | REVENUE-ROADMAP-v7.6 | Crash reporting |
| U-DESK-11 | REVENUE-ROADMAP-v7.6 | First-run onboarding |
| U-DESK-12 | REVENUE-ROADMAP-v7.6 | Data-migration web-desktop sync |
| U-DESK-13 | REVENUE-ROADMAP-v7.6 | Per-OS installer (macOS) |
| U-DESK-14 | REVENUE-ROADMAP-v7.6 | Per-OS installer (Windows) |
| U-DESK-15 | REVENUE-ROADMAP-v7.6 | Per-OS installer (Linux) |
| U-DESK-16 | REVENUE-ROADMAP-v7.6 | Desktop-specific Playwright/Spectron E2E |
| U-DESK-17 | REVENUE-ROADMAP-v7.6 | Bundle-size budget |
| U-DESK-18 | REVENUE-ROADMAP-v7.6 | Desktop GA gate |
| U-TRAIN-01 | REVENUE-ROADMAP-v7.6 | KienzleKc11FitEngine build + wire |
| U-TRAIN-02 | REVENUE-ROADMAP-v7.6 | TaylorConstantFitEngine build + wire |
| U-TRAIN-03 | REVENUE-ROADMAP-v7.6 | FRFMeasurementEngine build |
| U-TRAIN-04 | REVENUE-ROADMAP-v7.6 | RCSAStabilityPredictorEngine build |
| U-TRAIN-05 | REVENUE-ROADMAP-v7.6 | ThermalGrowthCalibrationEngine build |
| U-TRAIN-06 | REVENUE-ROADMAP-v7.6 | ConformalDriftDetectorEngine build |
| U-TRAIN-07 | REVENUE-ROADMAP-v7.6 | SpindlePowerSensorIngestEngine + clamp-on CT retrofit |
| U-TRAIN-08 | REVENUE-ROADMAP-v7.6 | TelemetryIngestionOrchestratorEngine — 5-protocol fabric |
| U-TRAIN-09 | REVENUE-ROADMAP-v7.6 | LoRATrainerOrchestratorEngine |
| U-TRAIN-10 | REVENUE-ROADMAP-v7.6 | MillLoRADatasetBuilderEngine |
| U-TRAIN-11 | REVENUE-ROADMAP-v7.6 | mill_lora r=16 first training run |
| U-TRAIN-12 | REVENUE-ROADMAP-v7.6 | lathe_lora r=8 first training run |
| U-TRAIN-13 | REVENUE-ROADMAP-v7.6 | wedm_lora r=4 first training run |
| U-TRAIN-14 | REVENUE-ROADMAP-v7.6 | cam_lora ensemble r=8 training |
| U-TRAIN-15 | REVENUE-ROADMAP-v7.6 | TribalKnowledgeCaptureEngine |
| U-TRAIN-16 | REVENUE-ROADMAP-v7.6 | lora-weights-presence-check.mjs Stop hook |
| U-TRAIN-17 | REVENUE-ROADMAP-v7.6 | CalibrationHealthReportEngine |
| U-TRAIN-18 | REVENUE-ROADMAP-v7.6 | Master Post LoRA — okuma + mitsubishi sinker operator adapters |
| U-TRAIN-19 | REVENUE-ROADMAP-v7.6 | Master Post tribal overlays rule packs |
| U-TRAIN-20 | REVENUE-ROADMAP-v7.6 | Confidence-tier UI badges |
| U-PILOT-01 | REVENUE-ROADMAP-v7.6 | Instrumentation foundation |
| U-PILOT-02 | REVENUE-ROADMAP-v7.6 | MasterPostByteEquivalenceCI + golden NC archive snapshot |
| U-PILOT-03 | REVENUE-ROADMAP-v7.6 | MTConnect spindle-load streamer + adapters |
| U-PILOT-04 | REVENUE-ROADMAP-v7.6 | OperatorFeedbackButton (R/Y/G) UI + persistence |
| U-PILOT-05 | REVENUE-ROADMAP-v7.6 | Phase-2 cut-air protocol + acceptance harness |
| U-PILOT-06 | REVENUE-ROADMAP-v7.6 | Phase-3 soft-stock harness |
| U-PILOT-07 | REVENUE-ROADMAP-v7.6 | DualLogEngine + DeltaAnalyzer + OperatorOverrideReasoningCapture |
| U-PILOT-08 | REVENUE-ROADMAP-v7.6 | Phase-4 production-shadow rollout |
| U-PILOT-09 | REVENUE-ROADMAP-v7.6 | BatchOutcomeTracker + ToolLifeRegressionDetector + Cpk/CycleTime streamers |
| U-PILOT-10 | REVENUE-ROADMAP-v7.6 | Phase-5 A-B execution + acceptance scoring |
| U-PILOT-11 | REVENUE-ROADMAP-v7.6 | Flagship pre-flight |
| U-PILOT-12 | REVENUE-ROADMAP-v7.6 | Phase-6 primary rollout |
| U-PILOT-13 | REVENUE-ROADMAP-v7.6 | DriftDetector + ModelVersionRollbackEngine + CalibrationAuditLogger |
| U-PILOT-14 | REVENUE-ROADMAP-v7.6 | /forge-learn weekly recalibration cron |
| U-PILOT-15 | REVENUE-ROADMAP-v7.6 | Operator training package |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 1 — GilbertEconomicSpeedEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 6 — JohnsonCookEngine + MerchantForceEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 4 — UsuiWearRateEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 7 — BrammertzRoughnessEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 9 — SimulatedAnnealingEngine + GeneticAlgorithmEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 11 — MIPSolverEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 12 — ResidualStressEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 15 — WeibullReliabilityEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 16 — MicroGeometryForceEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 17 — BUEAvoidanceEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 18 — CoolantEvacuationEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 23 — MeasurementUncertaintyEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 24 — SpindleGrowthEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 37 — CoolantSelectorEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 38 — CUSUMEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 40 — QueueingShopEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 41 — InventoryPolicyEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 43 — NSGA2Engine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 45 — InspectionPlanEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 48 — OperatorLearningCurveEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 49 — AnomalyDetectionEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.B Row 50 — UncertaintyPropagationEngine |
| — | REVENUE-ROADMAP-v7.6 | T3 — 4 LoRA adapters (mill/lathe/wedm/cam) training plan |
| — | REVENUE-ROADMAP-v7.6 | T6 — Z3ToleranceAllocatorEngine |
| — | REVENUE-ROADMAP-v7.6 | T6 — MIPSchedulingEngine |
| — | REVENUE-ROADMAP-v7.6 | T6 — GeometricToleranceSolverEngine |
| — | REVENUE-ROADMAP-v7.6 | T6 — SymbolicSolverRouterEngine |
| — | REVENUE-ROADMAP-v7.6 | T7 — PRISMKnowledgeGraphReasoningEngine + rename PRISMCreativeReasoningEngine |
| — | REVENUE-ROADMAP-v7.6 | v7.C Gate binding — 4-line Zod schema patch |
| H1.0 | BACKEND-DEVTOOLS-RGS6-MEGA | Build verify-hook-refs.mjs script |
| H1 | BACKEND-DEVTOOLS-RGS6-MEGA | Generate HOOK_REGISTRY.json from hook source |
| H2 | BACKEND-DEVTOOLS-RGS6-MEGA | Convert warn-style hooks to deterministic autofix |
| H3 | BACKEND-DEVTOOLS-RGS6-MEGA | Settings-dedup pass |
| H4 | BACKEND-DEVTOOLS-RGS6-MEGA | TaskCreated claim guard |
| H5 | BACKEND-DEVTOOLS-RGS6-MEGA | PostToolBatch budget ceiling hook |
| H6 | BACKEND-DEVTOOLS-RGS6-MEGA | Cross-worktree firewall (K2 unlocker) |
| H7 | BACKEND-DEVTOOLS-RGS6-MEGA | Boris-style defer decision in PreToolUse |
| K2-K0 | BACKEND-DEVTOOLS-RGS6-MEGA | Build KimiTransportEngine |
| K2-K1 | BACKEND-DEVTOOLS-RGS6-MEGA | Wire K2.6 cloud route in AISystemRouterEngine |
| K2-K2 | BACKEND-DEVTOOLS-RGS6-MEGA | Cost-model entry for K2.6 |
| K2-K3 | BACKEND-DEVTOOLS-RGS6-MEGA | Scrutiny-3way to scrutiny-5way |
| K2-K4..K12 | BACKEND-DEVTOOLS-RGS6-MEGA | 9 cascade/wiring units (calibration probe, fallback, telemetry, dashboard, alarm, schema,  |
| HC-0 | BACKEND-DEVTOOLS-RGS6-MEGA | Build SpecHTMLCompanionEngine |
| HC-1 | BACKEND-DEVTOOLS-RGS6-MEGA | Generalize emit-revenue-roadmap-html.mjs to emit-spec-html.mjs |
| HC-2 | BACKEND-DEVTOOLS-RGS6-MEGA | Theme support (dark/light) |
| HC-3 | BACKEND-DEVTOOLS-RGS6-MEGA | Anchor-link navigation + Mermaid embed |
| HC-4 | BACKEND-DEVTOOLS-RGS6-MEGA | Accessibility hook (WAI-ARIA) |
| HC-5 | BACKEND-DEVTOOLS-RGS6-MEGA | MD-HTML drift guard |
| OB-1 | BACKEND-DEVTOOLS-RGS6-MEGA | Build WikiObsidianBridgeEngine |
| OB-2 | BACKEND-DEVTOOLS-RGS6-MEGA | Build MemoryObsidianBridgeEngine |
| OB-3 | BACKEND-DEVTOOLS-RGS6-MEGA | Fleeting to permanent promotion ritual |
| OB-4 | BACKEND-DEVTOOLS-RGS6-MEGA | MOC auto-generator |
| OB-5 | BACKEND-DEVTOOLS-RGS6-MEGA | Smart-Connections-equivalent in-PRISM |
| OB-6 | BACKEND-DEVTOOLS-RGS6-MEGA | Wayback-archive cron for external sources |
| U-BUILD-ML-PREDICTION-ENGINE | BACKEND-DEVTOOLS-RGS6-MEGA | Build MLPredictionEngine.ts |
| U-WIRE-ML-PREDICTION | BACKEND-DEVTOOLS-RGS6-MEGA | Wire MLPredictionEngine to prism_cam + prism_calc |
| U-BUILD-MANUAL-LIBRARY-ENGINE | BACKEND-DEVTOOLS-RGS6-MEGA | Build ManualLibraryEngine.ts |
| U-WIRE-MANUAL-LIBRARY | BACKEND-DEVTOOLS-RGS6-MEGA | Wire ManualLibraryEngine to prism_ai:knowledge_query |
| — | BACKEND-DEVTOOLS-RGS6-MEGA | Adopt 8 external MCP servers as exposure-surfaces (10 units) |
| U-BUILD-CONTAINER-SKILL-PIPE | BACKEND-DEVTOOLS-RGS6-MEGA | Build ContainerSkillPipe (renamed from U-CONTAINER-SKILL-PIPE) |
| U-WIRE-OCTOPUS-CONSENSUS | BACKEND-DEVTOOLS-RGS6-MEGA | Wire octopus consensus (renamed from U-OCTOPUS-FULL-WIRE) |
| U-PPH01 | PRISM-UNIFIED-ROADMAP-v2 | Fix CoolantControlConfigEngine M-code conflicts |
| U-PPH02 | PRISM-UNIFIED-ROADMAP-v2 | Fix PostProcessorPipelineEngine physics errors |
| U-PPH03 | PRISM-UNIFIED-ROADMAP-v2 | Fix division-by-zero paths in 5 engines |
| U-PPH04 | PRISM-UNIFIED-ROADMAP-v2 | Fix Heidenhain arc direction |
| — | PRISM-UNIFIED-ROADMAP-v2 | Validation Layer (5 units) |
| — | PRISM-UNIFIED-ROADMAP-v2 | API & Error Handling (4 units) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Type Unification & Consistency (4 units) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Performance & State Management (4 units) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Test Hardening (5 units) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Product & UX Polish (3 units) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Machine Catalog Convergence |
| — | PRISM-UNIFIED-ROADMAP-v2 | CAMX controller validation, strategies, multi-axis (26 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | CAMX-v17 print reading & physics hardening (14 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Scientific mathematics (8 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Sensor integration & signal processing (3 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Business & ERP hardening (14 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Fusion 360 ecosystem (30 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | hyperMILL ecosystem (18 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Post-processor ecosystem (14 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Infrastructure & products (47 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Content Ingestion Pipeline |
| — | PRISM-UNIFIED-ROADMAP-v2 | Video + Interactive Learning Wiring |
| — | PRISM-UNIFIED-ROADMAP-v2 | Knowledge Graph Enrichment + Cross-Reference |
| — | PRISM-UNIFIED-ROADMAP-v2 | Course Auto-Generation |
| — | PRISM-UNIFIED-ROADMAP-v2 | Feedback + Fleet Learning Wiring |
| — | PRISM-UNIFIED-ROADMAP-v2 | Web UI — Knowledge Ingestion + Browser + Courses |
| U-VID01 | PRISM-UNIFIED-ROADMAP-v2 | Video Source Registry |
| U-VID02 | PRISM-UNIFIED-ROADMAP-v2 | Transcript Extraction Pipeline |
| U-VID03 | PRISM-UNIFIED-ROADMAP-v2 | Visual Frame Analysis |
| U-VID04 | PRISM-UNIFIED-ROADMAP-v2 | Knowledge Extraction & Tagging |
| U-VID05 | PRISM-UNIFIED-ROADMAP-v2 | Batch channel crawler |
| U-VID06 | PRISM-UNIFIED-ROADMAP-v2 | Manufacturer training videos |
| U-VID07 | PRISM-UNIFIED-ROADMAP-v2 | Conference & webinar extraction |
| U-VID08 | PRISM-UNIFIED-ROADMAP-v2 | Shop floor video processing |
| U-VID09 | PRISM-UNIFIED-ROADMAP-v2 | Knowledge quality audit + confidence scoring |
| U-VID10 | PRISM-UNIFIED-ROADMAP-v2 | Auto-course generator from video clusters |
| U-VID11 | PRISM-UNIFIED-ROADMAP-v2 | Interactive video-follow lessons |
| U-VID12 | PRISM-UNIFIED-ROADMAP-v2 | Continuous ingestion daemon |
| U-VID13 | PRISM-UNIFIED-ROADMAP-v2 | Analytics dashboard |
| U-PDF01 | PRISM-UNIFIED-ROADMAP-v2 | PDF Source Registry |
| U-PDF02 | PRISM-UNIFIED-ROADMAP-v2 | Table Extraction Engine |
| U-PDF03 | PRISM-UNIFIED-ROADMAP-v2 | Formula Extraction Engine |
| U-PDF04 | PRISM-UNIFIED-ROADMAP-v2 | Material Property Extraction |
| U-PDF05 | PRISM-UNIFIED-ROADMAP-v2 | Handbook Batch Processing |
| U-PDF06 | PRISM-UNIFIED-ROADMAP-v2 | Sandvik Main Catalog extraction |
| U-PDF07 | PRISM-UNIFIED-ROADMAP-v2 | Kennametal/Walter/ISCAR catalogs |
| U-PDF08 | PRISM-UNIFIED-ROADMAP-v2 | Standards extraction |
| U-PDF09 | PRISM-UNIFIED-ROADMAP-v2 | Quality audit & merge |
| U-PDF10 | PRISM-UNIFIED-ROADMAP-v2 | MIT OCW Course Registry |
| U-PDF11 | PRISM-UNIFIED-ROADMAP-v2 | Lecture note extraction |
| U-PDF12 | PRISM-UNIFIED-ROADMAP-v2 | Academic paper pipeline |
| U-PDF13 | PRISM-UNIFIED-ROADMAP-v2 | Course-to-Academy bridge |
| U-PDF14 | PRISM-UNIFIED-ROADMAP-v2 | Formula calibration sprint |
| U-DB01 | PRISM-UNIFIED-ROADMAP-v2 | Machine manufacturer census |
| U-DB02 | PRISM-UNIFIED-ROADMAP-v2 | Haas complete catalog |
| U-DB03 | PRISM-UNIFIED-ROADMAP-v2 | Mazak/DMG MORI/Okuma catalogs |
| U-DB04 | PRISM-UNIFIED-ROADMAP-v2 | Tier 2 & 3 machine bulk import |
| U-DB05 | PRISM-UNIFIED-ROADMAP-v2 | Machine data quality audit |
| U-DB06 | PRISM-UNIFIED-ROADMAP-v2 | Controller family census |
| U-DB07 | PRISM-UNIFIED-ROADMAP-v2 | G-code dialect maps |
| U-DB08 | PRISM-UNIFIED-ROADMAP-v2 | Alarm code database expansion |
| U-DB09 | PRISM-UNIFIED-ROADMAP-v2 | Controller capability matrix |
| U-DB10 | PRISM-UNIFIED-ROADMAP-v2 | Tool holder system census |
| U-DB11 | PRISM-UNIFIED-ROADMAP-v2 | Holder geometry extraction |
| U-DB12 | PRISM-UNIFIED-ROADMAP-v2 | Holder-to-spindle compatibility matrix |
| U-DB13 | PRISM-UNIFIED-ROADMAP-v2 | Tool assembly builder |
| U-DB14 | PRISM-UNIFIED-ROADMAP-v2 | Cutting data gap analysis |
| U-DB15 | PRISM-UNIFIED-ROADMAP-v2 | Manufacturer cutting data import |
| U-DB16 | PRISM-UNIFIED-ROADMAP-v2 | Physics-based cutting data generation |
| U-DB17 | PRISM-UNIFIED-ROADMAP-v2 | Tool catalog unification + search index |
| U-DB18 | PRISM-UNIFIED-ROADMAP-v2 | Fixture type taxonomy |
| U-DB19 | PRISM-UNIFIED-ROADMAP-v2 | Clamping force calculator data |
| U-DB20 | PRISM-UNIFIED-ROADMAP-v2 | Fixture selection engine data |
| U-DB21 | PRISM-UNIFIED-ROADMAP-v2 | Zero-point pallet system database |
| muS-01 | PRISM-UNIFIED-ROADMAP-v2 | Validate SpeedFeedOrchestrator ISO P on 5 mills |
| muS-02 | PRISM-UNIFIED-ROADMAP-v2 | Validate ISO M/K/N on 5 mills |
| muS-03 | PRISM-UNIFIED-ROADMAP-v2 | Chatter SLD per spindle |
| muS-04 | PRISM-UNIFIED-ROADMAP-v2 | Deflection validation |
| muS-05 | PRISM-UNIFIED-ROADMAP-v2 | Trochoidal/adaptive clearing |
| muS-06 | PRISM-UNIFIED-ROADMAP-v2 | Pocket milling strategies |
| muS-07 | PRISM-UNIFIED-ROADMAP-v2 | Contour/profile milling |
| muS-08 | PRISM-UNIFIED-ROADMAP-v2 | 4th axis rotary indexing |
| muS-09 | PRISM-UNIFIED-ROADMAP-v2 | Wrap milling / cylindrical milling |
| muS-10 | PRISM-UNIFIED-ROADMAP-v2 | RTCP/TCP validation |
| muS-11 | PRISM-UNIFIED-ROADMAP-v2 | 3+2 positional machining |
| muS-12 | PRISM-UNIFIED-ROADMAP-v2 | Simultaneous 5-axis |
| muS-13 | PRISM-UNIFIED-ROADMAP-v2 | HSM parameter tuning |
| muS-14 | PRISM-UNIFIED-ROADMAP-v2 | Controller-specific HSM names |
| muS-15 | PRISM-UNIFIED-ROADMAP-v2 | Parse 1,358 newer Fusion programs |
| muS-16 | PRISM-UNIFIED-ROADMAP-v2 | Parse 100 sample older programs |
| muS-17 | PRISM-UNIFIED-ROADMAP-v2 | Generate program upgrade recommendations |
| muS-18 | PRISM-UNIFIED-ROADMAP-v2 | Batch upgrade Haas VF-2 + OM-2 programs |
| muS-19 | PRISM-UNIFIED-ROADMAP-v2 | Batch upgrade Hurco VM30i + Okuma M460V programs |
| muS-20 | PRISM-UNIFIED-ROADMAP-v2 | Batch upgrade Roku-Roku programs |
| muS-L01 | PRISM-UNIFIED-ROADMAP-v2 | CSS validation per Okuma spindle |
| muS-L02 | PRISM-UNIFIED-ROADMAP-v2 | Turning force model validation |
| muS-L03 | PRISM-UNIFIED-ROADMAP-v2 | Tool nose radius compensation validation |
| muS-L04 | PRISM-UNIFIED-ROADMAP-v2 | OD roughing strategies |
| muS-L05 | PRISM-UNIFIED-ROADMAP-v2 | ID boring strategies |
| muS-L06 | PRISM-UNIFIED-ROADMAP-v2 | Facing strategies |
| muS-L07 | PRISM-UNIFIED-ROADMAP-v2 | Single-point threading |
| muS-L08 | PRISM-UNIFIED-ROADMAP-v2 | Thread whirling |
| muS-L09 | PRISM-UNIFIED-ROADMAP-v2 | Multi-start threading |
| muS-L10 | PRISM-UNIFIED-ROADMAP-v2 | Thread milling |
| muS-L11 | PRISM-UNIFIED-ROADMAP-v2 | Cross-drilling + tapping |
| muS-L12 | PRISM-UNIFIED-ROADMAP-v2 | C-axis milling |
| muS-L13 | PRISM-UNIFIED-ROADMAP-v2 | Off-center features |
| muS-L14 | PRISM-UNIFIED-ROADMAP-v2 | B-axis milling |
| muS-L15 | PRISM-UNIFIED-ROADMAP-v2 | Sub-spindle operations |
| muS-L16 | PRISM-UNIFIED-ROADMAP-v2 | Y-axis machining |
| muS-L17 | PRISM-UNIFIED-ROADMAP-v2 | Grooving + parting |
| muS-L18 | PRISM-UNIFIED-ROADMAP-v2 | Hard turning |
| muS-L19 | PRISM-UNIFIED-ROADMAP-v2 | Big bore turning |
| muS-L20 | PRISM-UNIFIED-ROADMAP-v2 | Parse 669 newer Fusion .MIN programs |
| muS-L21 | PRISM-UNIFIED-ROADMAP-v2 | Parse 100 older .MIN samples |
| muS-L22 | PRISM-UNIFIED-ROADMAP-v2 | Batch upgrade 5,297 older lathe .MIN programs (batch 1) |
| muS-L23 | PRISM-UNIFIED-ROADMAP-v2 | Complete batch upgrade (remaining ~2,800) |
| muS-W01 | PRISM-UNIFIED-ROADMAP-v2 | Multipass optimization |
| muS-W02 | PRISM-UNIFIED-ROADMAP-v2 | Wire break prediction model validation |
| muS-W03 | PRISM-UNIFIED-ROADMAP-v2 | W21FAS-2 dialect verification |
| muS-W04 | PRISM-UNIFIED-ROADMAP-v2 | W30FAS-2 dialect verification |
| muS-W05 | PRISM-UNIFIED-ROADMAP-v2 | W31MV-2 dialect verification |
| muS-W06 | PRISM-UNIFIED-ROADMAP-v2 | Punch cutting strategy |
| muS-W07 | PRISM-UNIFIED-ROADMAP-v2 | Die cutting strategy |
| muS-W08 | PRISM-UNIFIED-ROADMAP-v2 | Profile cutting strategy |
| muS-W09 | PRISM-UNIFIED-ROADMAP-v2 | MD+ Pro II wire optimization |
| muS-W10 | PRISM-UNIFIED-ROADMAP-v2 | MV1200S wire optimization |
| muS-W11 | PRISM-UNIFIED-ROADMAP-v2 | Parse 188 newer Fusion wire programs |
| muS-W12 | PRISM-UNIFIED-ROADMAP-v2 | Parse 50 older wire samples |
| muS-W13 | PRISM-UNIFIED-ROADMAP-v2 | Batch upgrade Esprit wire programs |
| muS-W14 | PRISM-UNIFIED-ROADMAP-v2 | Batch upgrade Mastercam wire programs |
| muS-P01 | PRISM-UNIFIED-ROADMAP-v2 | Build unified program parser |
| muS-P02 | PRISM-UNIFIED-ROADMAP-v2 | Build S/F deviation scorer |
| muS-P03 | PRISM-UNIFIED-ROADMAP-v2 | Build program age/quality classifier |
| muS-P04 | PRISM-UNIFIED-ROADMAP-v2 | Build batch upgrade pipeline |
| muS-P05 | PRISM-UNIFIED-ROADMAP-v2 | Build delta report generator |
| muS-P06 | PRISM-UNIFIED-ROADMAP-v2 | Feed validated program pairs into learning pipeline |
| muS-P07 | PRISM-UNIFIED-ROADMAP-v2 | Build accuracy tracker |
| muS-P08 | PRISM-UNIFIED-ROADMAP-v2 | Continuous improvement |
| U-ELEC01 | PRISM-UNIFIED-ROADMAP-v2 | Excel Macro Reverse Engineering |
| U-ELEC02 | PRISM-UNIFIED-ROADMAP-v2 | Electrode Design Engine |
| U-ELEC03 | PRISM-UNIFIED-ROADMAP-v2 | Fusion 360 Electrode CAM Bridge |
| U-ELEC04 | PRISM-UNIFIED-ROADMAP-v2 | Pipeline Architecture |
| U-ELEC05 | PRISM-UNIFIED-ROADMAP-v2 | Graphite Machining Physics |
| U-ELEC06 | PRISM-UNIFIED-ROADMAP-v2 | Machine-Specific Post-Processors |
| U-ELEC07 | PRISM-UNIFIED-ROADMAP-v2 | Electrode CAM Strategy Engine |
| U-ELEC08 | PRISM-UNIFIED-ROADMAP-v2 | Setup Sheet & Electrode Traveler |
| U-ELEC09 | PRISM-UNIFIED-ROADMAP-v2 | End-to-End Test — Electrode Milling |
| U-ELEC10 | PRISM-UNIFIED-ROADMAP-v2 | Mitsubishi EA12S Controller Dialect |
| U-ELEC11 | PRISM-UNIFIED-ROADMAP-v2 | Sinker Burn Parameter Engine |
| U-ELEC12 | PRISM-UNIFIED-ROADMAP-v2 | Sinker Program Generator |
| U-ELEC13 | PRISM-UNIFIED-ROADMAP-v2 | End-to-End Test — Full Pipeline |
| U-LASER01 | PRISM-UNIFIED-ROADMAP-v2 | Laser cutting parameter database |
| U-LASER02 | PRISM-UNIFIED-ROADMAP-v2 | Nesting optimization engine |
| U-LASER03 | PRISM-UNIFIED-ROADMAP-v2 | Laser-specific post-processors |
| U-LASER04 | PRISM-UNIFIED-ROADMAP-v2 | Laser quality prediction |
| U-LASER05 | PRISM-UNIFIED-ROADMAP-v2 | Tube/pipe laser cutting support |
| U-LASER06 | PRISM-UNIFIED-ROADMAP-v2 | 3D laser cutting (5-axis) |
| U-LASER07 | PRISM-UNIFIED-ROADMAP-v2 | Laser marking/engraving program generation |
| U-LASER08 | PRISM-UNIFIED-ROADMAP-v2 | Wire to dispatchers + frontend page |
| U-LASER09 | PRISM-UNIFIED-ROADMAP-v2 | Setup sheet + job traveler for laser |
| U-LASER10 | PRISM-UNIFIED-ROADMAP-v2 | End-to-end test laser |
| U-WATER01 | PRISM-UNIFIED-ROADMAP-v2 | Waterjet cutting parameter database |
| U-WATER02 | PRISM-UNIFIED-ROADMAP-v2 | Piercing strategy engine |
| U-WATER03 | PRISM-UNIFIED-ROADMAP-v2 | Taper compensation engine |
| U-WATER04 | PRISM-UNIFIED-ROADMAP-v2 | Waterjet nesting + lead-in/lead-out |
| U-WATER05 | PRISM-UNIFIED-ROADMAP-v2 | Multi-head waterjet support |
| U-WATER06 | PRISM-UNIFIED-ROADMAP-v2 | 5-axis waterjet |
| U-WATER07 | PRISM-UNIFIED-ROADMAP-v2 | Waterjet quality prediction |
| U-WATER08 | PRISM-UNIFIED-ROADMAP-v2 | End-to-end test + dispatcher wiring + frontend |
| U-SINK01 | PRISM-UNIFIED-ROADMAP-v2 | Die-sinking EDM for mold cavities |
| U-SINK02 | PRISM-UNIFIED-ROADMAP-v2 | Micro-EDM for small features |
| U-SINK03 | PRISM-UNIFIED-ROADMAP-v2 | Sinker EDM with copper/copper-tungsten electrodes |
| U-SINK04 | PRISM-UNIFIED-ROADMAP-v2 | Adaptive sinker EDM |
| U-SINK05 | PRISM-UNIFIED-ROADMAP-v2 | Full test suite for EA12S programs |
| U-SINK06 | PRISM-UNIFIED-ROADMAP-v2 | Wire to frontend sinker EDM page |
| U-SINK07 | PRISM-UNIFIED-ROADMAP-v2 | Sinker EDM knowledge base |
| — | PRISM-UNIFIED-ROADMAP-v2 | CAM/CAD Kernel (46 milestones) |
| — | PRISM-UNIFIED-ROADMAP-v2 | QA & Hardening (30 milestones) |
| U-QM01 | PRISM-UNIFIED-ROADMAP-v2 | X-bar/R chart engine |
| U-QM02 | PRISM-UNIFIED-ROADMAP-v2 | CUSUM + EWMA advanced charts |
| U-QM03 | PRISM-UNIFIED-ROADMAP-v2 | Cpk/Ppk process capability calculation |
| U-QM04 | PRISM-UNIFIED-ROADMAP-v2 | Control limit auto-computation |
| U-QM05 | PRISM-UNIFIED-ROADMAP-v2 | ANOVA-based gauge R&R |
| U-QM06 | PRISM-UNIFIED-ROADMAP-v2 | %GRR and ndc calculation |
| U-QM07 | PRISM-UNIFIED-ROADMAP-v2 | Measurement system analysis reporting |
| U-QM08 | PRISM-UNIFIED-ROADMAP-v2 | AS9102 Form 1 |
| U-QM09 | PRISM-UNIFIED-ROADMAP-v2 | AS9102 Form 2 |
| U-QM10 | PRISM-UNIFIED-ROADMAP-v2 | AS9102 Form 3 |
| U-QM11 | PRISM-UNIFIED-ROADMAP-v2 | ASME Y14.5 tolerance stack-up analysis |
| U-QM12 | PRISM-UNIFIED-ROADMAP-v2 | Datum reference frame construction |
| U-QM13 | PRISM-UNIFIED-ROADMAP-v2 | Feature control frame parsing + validation |
| U-QM14 | PRISM-UNIFIED-ROADMAP-v2 | PC-DMIS program export |
| U-QM15 | PRISM-UNIFIED-ROADMAP-v2 | Calypso program export |
| U-QM16 | PRISM-UNIFIED-ROADMAP-v2 | CMM measurement result import + SPC feed |
| U-QM17 | PRISM-UNIFIED-ROADMAP-v2 | Compliance checklist engine |
| U-QM18 | PRISM-UNIFIED-ROADMAP-v2 | Audit finding tracker + CAPA management |
| U-QM19 | PRISM-UNIFIED-ROADMAP-v2 | Certification expiry alerting |
| U-QM20 | PRISM-UNIFIED-ROADMAP-v2 | Measured vs predicted recalibration pipeline |
| U-QM21 | PRISM-UNIFIED-ROADMAP-v2 | Automatic physics constant refinement |
| U-QM22 | PRISM-UNIFIED-ROADMAP-v2 | Quality trend dashboarding |
| U-QM23 | PRISM-UNIFIED-ROADMAP-v2 | Expand qualityDispatcher to 30+ actions |
| U-QM24 | PRISM-UNIFIED-ROADMAP-v2 | Wire QM engines to frontend quality pages |
| U-QM25 | PRISM-UNIFIED-ROADMAP-v2 | End-to-end quality pipeline test |
| U-JM01 | PRISM-UNIFIED-ROADMAP-v2 | Seed EmployeeEngine with JM Die staff |
| U-JM02 | PRISM-UNIFIED-ROADMAP-v2 | Skill matrix per employee |
| U-JM03 | PRISM-UNIFIED-ROADMAP-v2 | Shift assignments + labor rate tiers |
| U-JM04 | PRISM-UNIFIED-ROADMAP-v2 | Import tool holder inventory per machine |
| U-JM05 | PRISM-UNIFIED-ROADMAP-v2 | Import cutting tool crib inventory |
| U-JM06 | PRISM-UNIFIED-ROADMAP-v2 | Tool life tracking setup |
| U-JM07 | PRISM-UNIFIED-ROADMAP-v2 | Magazine layout per machine |
| U-JM08 | PRISM-UNIFIED-ROADMAP-v2 | Import material stock inventory |
| U-JM09 | PRISM-UNIFIED-ROADMAP-v2 | Standard stock sizes per material |
| U-JM10 | PRISM-UNIFIED-ROADMAP-v2 | Customer print library organization |
| U-JM11 | PRISM-UNIFIED-ROADMAP-v2 | Print-to-machine routing rules |
| U-JM12 | PRISM-UNIFIED-ROADMAP-v2 | Validate 21 PRISM-enhanced posts |
| U-JM13 | PRISM-UNIFIED-ROADMAP-v2 | Compare post output to Mark's custom Haas post |
| U-JM14 | PRISM-UNIFIED-ROADMAP-v2 | Promote validated posts to production |
| muS-A01 | PRISM-UNIFIED-ROADMAP-v2 | ParsedProgram schema + UnifiedProgramParserEngine shell |
| muS-A02 | PRISM-UNIFIED-ROADMAP-v2 | OkumaOSPParser enhancement |
| muS-A03 | PRISM-UNIFIED-ROADMAP-v2 | OkumaMultusParser sub-dialect |
| muS-A04 | PRISM-UNIFIED-ROADMAP-v2 | ISO/NC auto-detect + router |
| muS-A05 | PRISM-UNIFIED-ROADMAP-v2 | HurcoParser enhancement |
| muS-A06 | PRISM-UNIFIED-ROADMAP-v2 | CycleTimeComputationEngine |
| muS-A07 | PRISM-UNIFIED-ROADMAP-v2 | HMC 7z decompressor |
| muS-A08 | PRISM-UNIFIED-ROADMAP-v2 | MCX-8 metadata extractor enhancement |
| muS-A09 | PRISM-UNIFIED-ROADMAP-v2 | Esprit binary scanner |
| muS-A10 | PRISM-UNIFIED-ROADMAP-v2 | Batch orchestrator + progress tracking |
| muS-A11 | PRISM-UNIFIED-ROADMAP-v2 | Validation + test suite |
| muS-A12 | PRISM-UNIFIED-ROADMAP-v2 | Schema migration 018 |
| muS-A13 | PRISM-UNIFIED-ROADMAP-v2 | FileScanner engine |
| muS-A14 | PRISM-UNIFIED-ROADMAP-v2 | PartNumberExtractor |
| muS-A15 | PRISM-UNIFIED-ROADMAP-v2 | GCodeAnalyzer |
| muS-A16 | PRISM-UNIFIED-ROADMAP-v2 | CadMetadataExtractor |
| muS-A17 | PRISM-UNIFIED-ROADMAP-v2 | DuplicateDetector |
| muS-A18 | PRISM-UNIFIED-ROADMAP-v2 | CustomerNormalizer |
| muS-A19 | PRISM-UNIFIED-ROADMAP-v2 | AgeClassifier + SearchIndexBuilder |
| muS-A20 | PRISM-UNIFIED-ROADMAP-v2 | IncrementalWatcher |
| muS-A21 | PRISM-UNIFIED-ROADMAP-v2 | Data quality dashboard |
| muS-A22 | PRISM-UNIFIED-ROADMAP-v2 | Dispatcher + integration tests |
| muS-A23 | PRISM-UNIFIED-ROADMAP-v2 | PersistenceBridge registration |
| muS-B01 | PRISM-UNIFIED-ROADMAP-v2 | Fusion baseline S/F extraction |
| muS-B02 | PRISM-UNIFIED-ROADMAP-v2 | Legacy parameter comparison |
| muS-B03 | PRISM-UNIFIED-ROADMAP-v2 | Program quality scorer |
| muS-B04 | PRISM-UNIFIED-ROADMAP-v2 | Prioritized upgrade list |
| muS-B05 | PRISM-UNIFIED-ROADMAP-v2 | Accuracy tracker dashboard |
| muS-B06 | PRISM-UNIFIED-ROADMAP-v2 | OSP dialect fingerprinting |
| muS-B07 | PRISM-UNIFIED-ROADMAP-v2 | Parameter envelope histograms |
| muS-B08 | PRISM-UNIFIED-ROADMAP-v2 | Canned cycle vs manual profiling |
| muS-B09 | PRISM-UNIFIED-ROADMAP-v2 | Live tooling utilization analyzer |
| muS-B10 | PRISM-UNIFIED-ROADMAP-v2 | Turret station standardization |
| muS-B11 | PRISM-UNIFIED-ROADMAP-v2 | CSS optimization tables |
| muS-B12 | PRISM-UNIFIED-ROADMAP-v2 | M-code sequence patterns |
| muS-B13 | PRISM-UNIFIED-ROADMAP-v2 | Big bore vs standard routing |
| muS-B14 | PRISM-UNIFIED-ROADMAP-v2 | Customer revenue concentration |
| muS-B15 | PRISM-UNIFIED-ROADMAP-v2 | Customer growth/decline trends |
| muS-B16 | PRISM-UNIFIED-ROADMAP-v2 | Job complexity distribution |
| muS-B17 | PRISM-UNIFIED-ROADMAP-v2 | Machine utilization proxy |
| muS-B18 | PRISM-UNIFIED-ROADMAP-v2 | Seasonal patterns |
| muS-B19 | PRISM-UNIFIED-ROADMAP-v2 | Customer churn detection |
| muS-B20 | PRISM-UNIFIED-ROADMAP-v2 | Cross-sell opportunity detection |
| muS-B21 | PRISM-UNIFIED-ROADMAP-v2 | Average order value estimation |
| muS-B22 | PRISM-UNIFIED-ROADMAP-v2 | New customer acquisition rate |
| muS-B23 | PRISM-UNIFIED-ROADMAP-v2 | Product mix analysis |
| muS-C01 | PRISM-UNIFIED-ROADMAP-v2 | Wire EDM archive census |
| muS-C02 | PRISM-UNIFIED-ROADMAP-v2 | Cut condition optimizer |
| muS-C03 | PRISM-UNIFIED-ROADMAP-v2 | Wire break predictor |
| muS-C04 | PRISM-UNIFIED-ROADMAP-v2 | Skim pass optimizer |
| muS-C05 | PRISM-UNIFIED-ROADMAP-v2 | Die corner strategy |
| muS-C06 | PRISM-UNIFIED-ROADMAP-v2 | Controller-specific taper intelligence |
| muS-C07 | PRISM-UNIFIED-ROADMAP-v2 | Wire consumption & cost estimator |
| muS-C08 | PRISM-UNIFIED-ROADMAP-v2 | Slug retention strategy |
| muS-C09 | PRISM-UNIFIED-ROADMAP-v2 | Esprit vs Mastercam comparison |
| muS-C10..C18 | PRISM-UNIFIED-ROADMAP-v2 | Wire EDM integration tests + dispatcher wiring |
| muS-C19 | PRISM-UNIFIED-ROADMAP-v2 | Electrode geometry classifier |
| muS-C20 | PRISM-UNIFIED-ROADMAP-v2 | Machine routing logic |
| muS-C21 | PRISM-UNIFIED-ROADMAP-v2 | Graphite vs copper decision engine |
| muS-C22 | PRISM-UNIFIED-ROADMAP-v2 | Rougher/finisher electrode pairing |
| muS-C23 | PRISM-UNIFIED-ROADMAP-v2 | Wafer die code decoder |
| muS-C24 | PRISM-UNIFIED-ROADMAP-v2 | Electrode-to-cavity traceability |
| muS-C25 | PRISM-UNIFIED-ROADMAP-v2 | Electrode cost model |
| muS-C26 | PRISM-UNIFIED-ROADMAP-v2 | Trilobe-specific intelligence |
| muS-C27 | PRISM-UNIFIED-ROADMAP-v2 | System 3R WorkPartner queue integration |
| muS-C28 | PRISM-UNIFIED-ROADMAP-v2 | Burn parameter database |
| muS-C29..C33 | PRISM-UNIFIED-ROADMAP-v2 | Electrode integration tests + cost calibration |
| muS-C34..C37 | PRISM-UNIFIED-ROADMAP-v2 | DieWearLifeEngine |
| muS-C38..C40 | PRISM-UNIFIED-ROADMAP-v2 | PunchGeometryOptimizerEngine |
| muS-C41..C42 | PRISM-UNIFIED-ROADMAP-v2 | DiePunchClearanceEngine |
| muS-C43..C47 | PRISM-UNIFIED-ROADMAP-v2 | HeaderStationSequencingEngine |
| muS-C48..C50 | PRISM-UNIFIED-ROADMAP-v2 | ElectrodeWearCompensationEngine |
| muS-C51..C53 | PRISM-UNIFIED-ROADMAP-v2 | CarbideGradeSelectionEngine |
| muS-C54..C56 | PRISM-UNIFIED-ROADMAP-v2 | HeatTreatRoutingEngine |
| muS-C57..C59 | PRISM-UNIFIED-ROADMAP-v2 | ThreadRollingDieDesignEngine |
| muS-C60..C63 | PRISM-UNIFIED-ROADMAP-v2 | WaferDieCodeEngine |
| muS-C64..C67 | PRISM-UNIFIED-ROADMAP-v2 | FastenerGDTEngine |
| muS-D01..D03 | PRISM-UNIFIED-ROADMAP-v2 | Repeat order recall |
| muS-D04..D07 | PRISM-UNIFIED-ROADMAP-v2 | Similar part suggestion |
| muS-D08..D11 | PRISM-UNIFIED-ROADMAP-v2 | Program version control |
| muS-D12..D16 | PRISM-UNIFIED-ROADMAP-v2 | DNC file transfer |
| muS-D17..D20 | PRISM-UNIFIED-ROADMAP-v2 | Live job tracking |
| muS-D21..D23 | PRISM-UNIFIED-ROADMAP-v2 | G-code feature extractor |
| muS-D24..D29 | PRISM-UNIFIED-ROADMAP-v2 | Program quality scorer (ML) |
| muS-D30..D33 | PRISM-UNIFIED-ROADMAP-v2 | Speed/feed recommender |
| muS-D34..D37 | PRISM-UNIFIED-ROADMAP-v2 | Tool selection recommender |
| muS-D38..D42 | PRISM-UNIFIED-ROADMAP-v2 | Cycle time predictor |
| muS-D43..D45 | PRISM-UNIFIED-ROADMAP-v2 | Customer order predictor |
| muS-D46..D48 | PRISM-UNIFIED-ROADMAP-v2 | Tolerance extraction |
| muS-D49..D50 | PRISM-UNIFIED-ROADMAP-v2 | Inspection plan generator |
| muS-D51..D53 | PRISM-UNIFIED-ROADMAP-v2 | FAI automation |
| muS-D54..D55 | PRISM-UNIFIED-ROADMAP-v2 | Wire EDM offset SPC |
| muS-D56..D57 | PRISM-UNIFIED-ROADMAP-v2 | Die life prediction |
| muS-D58..D59 | PRISM-UNIFIED-ROADMAP-v2 | Electrode inspection protocol |
| muS-D60..D61 | PRISM-UNIFIED-ROADMAP-v2 | Surface finish correlation |
| muS-D62..D64 | PRISM-UNIFIED-ROADMAP-v2 | Dimensional feedback loop |
| muS-D65..D67 | PRISM-UNIFIED-ROADMAP-v2 | Best practice extraction |
| muS-D68..D70 | PRISM-UNIFIED-ROADMAP-v2 | Common mistakes database |
| muS-D71..D72 | PRISM-UNIFIED-ROADMAP-v2 | Operator skill profiling |
| muS-D73..D75 | PRISM-UNIFIED-ROADMAP-v2 | Training path generator |
| muS-D76..D78 | PRISM-UNIFIED-ROADMAP-v2 | Program revision journal |
| muS-D79..D82 | PRISM-UNIFIED-ROADMAP-v2 | Interactive archive learning |
| muS-D83..D85 | PRISM-UNIFIED-ROADMAP-v2 | Tribal knowledge miner |
| muS-D86..D87 | PRISM-UNIFIED-ROADMAP-v2 | Knowledge gap detector |
| muS-H01 | PRISM-UNIFIED-ROADMAP-v2 | G187 smoothing inventory |
| muS-H02 | PRISM-UNIFIED-ROADMAP-v2 | Tool magazine standardization |
| muS-H03 | PRISM-UNIFIED-ROADMAP-v2 | OM-2 vs VF-2 classifier |
| muS-H04 | PRISM-UNIFIED-ROADMAP-v2 | Mark's custom post delta analysis |
| muS-H05 | PRISM-UNIFIED-ROADMAP-v2 | Setup sheet parsing |
| muS-H06 | PRISM-UNIFIED-ROADMAP-v2 | Offset management |
| muS-H07 | PRISM-UNIFIED-ROADMAP-v2 | Macro template library |
| muS-HR01 | PRISM-UNIFIED-ROADMAP-v2 | UltiMotion activation analysis |
| muS-HR02 | PRISM-UNIFIED-ROADMAP-v2 | WinMAX M-code cleanup |
| muS-HR03 | PRISM-UNIFIED-ROADMAP-v2 | Post migration engine |
| muS-HR04 | PRISM-UNIFIED-ROADMAP-v2 | Rigid tapping normalization |
| muS-HR05 | PRISM-UNIFIED-ROADMAP-v2 | HurcoUltiMotionOptimizerEngine |
| muS-MC01 | PRISM-UNIFIED-ROADMAP-v2 | Technology table mining |
| muS-MC02 | PRISM-UNIFIED-ROADMAP-v2 | Toolpath strategy inventory |
| muS-MC03 | PRISM-UNIFIED-ROADMAP-v2 | MCX-8 to MIN cross-reference |
| muS-MC04 | PRISM-UNIFIED-ROADMAP-v2 | Wire EDM condition extraction from MCX-8 |
| muS-MC05 | PRISM-UNIFIED-ROADMAP-v2 | Mastercam version migration analysis |
| muS-MC06 | PRISM-UNIFIED-ROADMAP-v2 | Material database from Mastercam names |
| muS-MC07 | PRISM-UNIFIED-ROADMAP-v2 | Machine definition extraction |
| muS-MC08 | PRISM-UNIFIED-ROADMAP-v2 | NCI file analysis |
| muS-MC09 | PRISM-UNIFIED-ROADMAP-v2 | Post processor identification |
| muS-MC10 | PRISM-UNIFIED-ROADMAP-v2 | MastercamProjectBridgeEngine |
| muS-HM01 | PRISM-UNIFIED-ROADMAP-v2 | Cycle template analysis |
| muS-HM02 | PRISM-UNIFIED-ROADMAP-v2 | Post version audit |
| muS-HM03 | PRISM-UNIFIED-ROADMAP-v2 | Tool holder library |
| muS-HM04 | PRISM-UNIFIED-ROADMAP-v2 | Training content ingestion |
| muS-HM05 | PRISM-UNIFIED-ROADMAP-v2 | Strategy-to-machine capability mapping |
| muS-HM06 | PRISM-UNIFIED-ROADMAP-v2 | $hyperMILL_* variable catalog |
| muS-HM07 | PRISM-UNIFIED-ROADMAP-v2 | Definition file parser |
| muS-HM08 | PRISM-UNIFIED-ROADMAP-v2 | hyperMILL Project Template Generator |
| muS-HM09 | PRISM-UNIFIED-ROADMAP-v2 | hyperMILL vs Fusion 360 routing logic |
| muS-S01..S03 | PRISM-UNIFIED-ROADMAP-v2 | Setup sheet auto-generation from G-code |
| muS-S04..S05 | PRISM-UNIFIED-ROADMAP-v2 | Standard turret kit definitions |
| muS-S06..S07 | PRISM-UNIFIED-ROADMAP-v2 | Bar feeder setup intelligence |
| muS-S08..S09 | PRISM-UNIFIED-ROADMAP-v2 | Fixture library indexing |
| muS-S10..S11 | PRISM-UNIFIED-ROADMAP-v2 | Work offset management |
| muS-S12..S13 | PRISM-UNIFIED-ROADMAP-v2 | Setup time estimation |
| muS-S14..S15 | PRISM-UNIFIED-ROADMAP-v2 | First-article risk prediction |
| muS-S16 | PRISM-UNIFIED-ROADMAP-v2 | Quick-change tooling ROI analysis |
| muS-S17..S19 | PRISM-UNIFIED-ROADMAP-v2 | Similar-setup batching optimizer |
| muS-S20..S21 | PRISM-UNIFIED-ROADMAP-v2 | Digital setup sheet with QR code |
| muS-T01..T03 | PRISM-UNIFIED-ROADMAP-v2 | Virtual shop floor layout |
| muS-T04..T06 | PRISM-UNIFIED-ROADMAP-v2 | Toolpath visualization |
| muS-T07..T09 | PRISM-UNIFIED-ROADMAP-v2 | Virtual tool magazine |
| muS-T10 | PRISM-UNIFIED-ROADMAP-v2 | Machine state model |
| muS-T11..T14 | PRISM-UNIFIED-ROADMAP-v2 | Program simulation |
| muS-T15..T17 | PRISM-UNIFIED-ROADMAP-v2 | Capacity simulation |
| muS-T18..T19 | PRISM-UNIFIED-ROADMAP-v2 | Production replay |
| muS-T20..T22 | PRISM-UNIFIED-ROADMAP-v2 | What-if P&L impact |
| muS-T23..T24 | PRISM-UNIFIED-ROADMAP-v2 | Sensitivity spider chart |
| muS-T25..T26 | PRISM-UNIFIED-ROADMAP-v2 | Multi-job scenario aggregation + export |
| muS-M01..M02 | PRISM-UNIFIED-ROADMAP-v2 | Material usage volume estimator |
| muS-M03 | PRISM-UNIFIED-ROADMAP-v2 | Bar stock size optimizer |
| muS-M04 | PRISM-UNIFIED-ROADMAP-v2 | Graphite grade usage analysis |
| muS-M05..M06 | PRISM-UNIFIED-ROADMAP-v2 | Customer-material demand map |
| muS-M07 | PRISM-UNIFIED-ROADMAP-v2 | Material cost impact analyzer |
| muS-M08 | PRISM-UNIFIED-ROADMAP-v2 | Reorder point intelligence |
| muS-M09 | PRISM-UNIFIED-ROADMAP-v2 | Standard stock size catalog |
| muS-M10 | PRISM-UNIFIED-ROADMAP-v2 | Material substitution opportunity finder |
| muS-M11 | PRISM-UNIFIED-ROADMAP-v2 | Waste & remnant tracker |
| muS-M12 | PRISM-UNIFIED-ROADMAP-v2 | Vendor consolidation analyzer |
| muS-SC01..SC02 | PRISM-UNIFIED-ROADMAP-v2 | Machine loading heat map |
| muS-SC03 | PRISM-UNIFIED-ROADMAP-v2 | Queue depth analyzer |
| muS-SC04..SC05 | PRISM-UNIFIED-ROADMAP-v2 | Setup batching optimizer |
| muS-SC06..SC07 | PRISM-UNIFIED-ROADMAP-v2 | Due date estimator |
| muS-SC08..SC09 | PRISM-UNIFIED-ROADMAP-v2 | Electrode job router |
| muS-SC10 | PRISM-UNIFIED-ROADMAP-v2 | Rush job impact analyzer |
| muS-SC11 | PRISM-UNIFIED-ROADMAP-v2 | Overtime/outsource trigger |
| muS-SC12..SC13 | PRISM-UNIFIED-ROADMAP-v2 | Seasonal capacity planner |
| muS-SC14 | PRISM-UNIFIED-ROADMAP-v2 | Machine investment ROI engine |
| muS-SC15..SC16 | PRISM-UNIFIED-ROADMAP-v2 | Daily machine dispatch engine |
| U-TK01 | PRISM-UNIFIED-ROADMAP-v2 | Purge + content-dedup captured tips |
| U-TK02 | PRISM-UNIFIED-ROADMAP-v2 | Lazy-init + null safety + perf fixes |
| U-TK03 | PRISM-UNIFIED-ROADMAP-v2 | Taxonomy alignment (15 undeclared categories) |
| U-TK04 | PRISM-UNIFIED-ROADMAP-v2 | inferDomain + search interface expansion |
| U-TK05 | PRISM-UNIFIED-ROADMAP-v2 | KnowledgeApplicabilityEngine |
| U-TK06 | PRISM-UNIFIED-ROADMAP-v2 | KnowledgeConflictResolverEngine |
| U-TK07 | PRISM-UNIFIED-ROADMAP-v2 | KnowledgeConsumerRegistryEngine |
| U-TK08 | PRISM-UNIFIED-ROADMAP-v2 | KnowledgeFeedbackIngestEngine |
| U-TK09 | PRISM-UNIFIED-ROADMAP-v2 | KnowledgePromotionEngine |
| U-TK10 | PRISM-UNIFIED-ROADMAP-v2 | PipelineRegistryBridge + PipelineDecisionOrchestrator |
| U-TK11 | PRISM-UNIFIED-ROADMAP-v2 | WEDM + EDM pipeline wiring |
| U-TK12 | PRISM-UNIFIED-ROADMAP-v2 | PostProcessor + IntelligentSequencing wiring |
| U-TK13 | PRISM-UNIFIED-ROADMAP-v2 | Turning + MillTurn + MultiAxis pipelines |
| U-TK14 | PRISM-UNIFIED-ROADMAP-v2 | ProcessPlan + AutoProgram + Intelligence |
| U-TK15 | PRISM-UNIFIED-ROADMAP-v2 | Grinding + Laser + Waterjet + broken loop fixes |
| U-TK16 | PRISM-UNIFIED-ROADMAP-v2 | TribalKnowledgeAdvisor engine + interfaces |
| U-TK17 | PRISM-UNIFIED-ROADMAP-v2 | SpeedFeedOrchestrator Tier 2 wiring |
| U-TK18 | PRISM-UNIFIED-ROADMAP-v2 | QuoteEstimator + ProcessPlan Tier 2 wiring |
| U-TK19 | PRISM-UNIFIED-ROADMAP-v2 | IntelligentSequencing + CapacityPlanning Tier 3 wiring |
| U-TK20 | PRISM-UNIFIED-ROADMAP-v2 | Heat treatment + tool steel behavior tips |
| U-TK21 | PRISM-UNIFIED-ROADMAP-v2 | Cold heading die design tips |
| U-TK22 | PRISM-UNIFIED-ROADMAP-v2 | Sinker EDM electrode design tips |
| U-TK23 | PRISM-UNIFIED-ROADMAP-v2 | Grinding + WEDM skim pass + workholding tips |
| U-TK24 | PRISM-UNIFIED-ROADMAP-v2 | Machine-specific quirks + post-processor tips |
| U-TK25 | PRISM-UNIFIED-ROADMAP-v2 | Metrology + threading + maintenance + cost tips |
| U-TK26 | PRISM-UNIFIED-ROADMAP-v2 | tribal-consumer-gate.mjs enforcement hook |
| U-TK27 | PRISM-UNIFIED-ROADMAP-v2 | Index refresh + skill updates |
| U-TK28 | PRISM-UNIFIED-ROADMAP-v2 | Security hardening |
| U-TK29 | PRISM-UNIFIED-ROADMAP-v2 | Knowledge graph from auto-categorized tips |
| U-TK30 | PRISM-UNIFIED-ROADMAP-v2 | Master Machinist recommendation mode |
| U-TK31 | PRISM-UNIFIED-ROADMAP-v2 | CourseBuilder + Academy integration |
| — | PRISM-UNIFIED-ROADMAP-v2 | Evolution Learning (future) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Customer Profiles (future) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Video-Learned Enhancement (future) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Tribal Conflict Resolution UI (future) |
| — | PRISM-UNIFIED-ROADMAP-v2 | Cross-Shop Learning (future) |
| U-DEVOPS01 | PRISM-UNIFIED-ROADMAP-v2 | TypeScript Build Gate |
| U-DEVOPS02 | PRISM-UNIFIED-ROADMAP-v2 | Vitest Integration |
| U-DEVOPS03 | PRISM-UNIFIED-ROADMAP-v2 | Coverage Reporting |
| U-DEVOPS04 | PRISM-UNIFIED-ROADMAP-v2 | Bundle Size Guard |
| U-DEVOPS05 | PRISM-UNIFIED-ROADMAP-v2 | Incremental Builds |
| U-DEVOPS06 | PRISM-UNIFIED-ROADMAP-v2 | Post-Build Verification |
| U-DEVOPS07 | PRISM-UNIFIED-ROADMAP-v2 | Build Caching |
| U-DEVOPS08 | PRISM-UNIFIED-ROADMAP-v2 | Version Tracking |
| U-DEVOPS09 | PRISM-UNIFIED-ROADMAP-v2 | Schema Changelog |
| U-DEVOPS10 | PRISM-UNIFIED-ROADMAP-v2 | CI Schema Check |
| U-DEVOPS11 | PRISM-UNIFIED-ROADMAP-v2 | Lock Service Interface |
| U-DEVOPS12 | PRISM-UNIFIED-ROADMAP-v2 | PostgreSQL Backend |
| U-DEVOPS13 | PRISM-UNIFIED-ROADMAP-v2 | Redis Fallback |
| U-DEVOPS14 | PRISM-UNIFIED-ROADMAP-v2 | Dead-Letter Queue |
| U-DEVOPS15 | PRISM-UNIFIED-ROADMAP-v2 | NPM Audit Integration |
| U-DEVOPS16 | PRISM-UNIFIED-ROADMAP-v2 | Vulnerability Scanning |
| U-KAR02 | PRISM-UNIFIED-ROADMAP-v2 | Define WiringManifest schema |
| U-KAR03 | PRISM-UNIFIED-ROADMAP-v2 | Implement KnowledgeLineageEngine |
| U-KAR04 | PRISM-UNIFIED-ROADMAP-v2 | Write tests |
| U-KAR05 | PRISM-UNIFIED-ROADMAP-v2 | Session-start resource scan hook |
| U-KAR06 | PRISM-UNIFIED-ROADMAP-v2 | File watcher hook with chokidar |
| U-KAR07 | PRISM-UNIFIED-ROADMAP-v2 | Post-extraction auto-wire hook |
| U-KAR08 | PRISM-UNIFIED-ROADMAP-v2 | Cadence hook for periodic re-index |
| U-KAR09 | PRISM-UNIFIED-ROADMAP-v2 | Tests for all hooks |
| U-KAR10..15 | PRISM-UNIFIED-ROADMAP-v2 | Wire PDF-EXT outputs to registries |
| U-KAR16 | PRISM-UNIFIED-ROADMAP-v2 | JMDieProgramInventoryEngine |
| U-KAR17 | PRISM-UNIFIED-ROADMAP-v2 | ProvenSpeedFeedAggregatorEngine |
| U-KAR18 | PRISM-UNIFIED-ROADMAP-v2 | EXTEND FeatureRecognitionEngine for lathe features |
| U-KAR19 | PRISM-UNIFIED-ROADMAP-v2 | Tests for program archive wiring |
| U-KAR20..23 | PRISM-UNIFIED-ROADMAP-v2 | Wire CAD formats to engines |
| U-KAR44..47 | PRISM-UNIFIED-ROADMAP-v2 | Wire G-code/Cycle to engines |
| U-KAR24..28 | PRISM-UNIFIED-ROADMAP-v2 | Complete WiringManifest routes + integration |
| U-KAR38..41 | PRISM-UNIFIED-ROADMAP-v2 | Controller Knowledge Wiring |
| U-KAR42..45 | PRISM-UNIFIED-ROADMAP-v2 | Tooling Knowledge Wiring |
| U-KAR29..33 | PRISM-UNIFIED-ROADMAP-v2 | Business Learning + Feedback Loops |
| U-KAR34..36 | PRISM-UNIFIED-ROADMAP-v2 | Video Tips Wiring |
| U-KAR51 | PRISM-UNIFIED-ROADMAP-v2 | PRISMUnifiedOrchestratorEngine shell |
| U-KAR52 | PRISM-UNIFIED-ROADMAP-v2 | IntentClassifierEngine |
| U-KAR53 | PRISM-UNIFIED-ROADMAP-v2 | DomainOrchestratorPluginRegistry |
| U-KAR54 | PRISM-UNIFIED-ROADMAP-v2 | ChainExecutorEngine |
| U-KAR55 | PRISM-UNIFIED-ROADMAP-v2 | Authority ranking implementation |
| U-KAR56 | PRISM-UNIFIED-ROADMAP-v2 | Tests for PUOA core |
| U-KAR57..62 | PRISM-UNIFIED-ROADMAP-v2 | Domain Wrapper Expansion |
| U-KAR63 | PRISM-UNIFIED-ROADMAP-v2 | /api/orchestrate/* Express routes |
| U-KAR64 | PRISM-UNIFIED-ROADMAP-v2 | React hook useOrchestrator() |
| U-KAR65 | PRISM-UNIFIED-ROADMAP-v2 | Calculator page integration |
| U-KAR66 | PRISM-UNIFIED-ROADMAP-v2 | Quoting page integration |
| U-KAR67 | PRISM-UNIFIED-ROADMAP-v2 | ConversationContextEngine |
| U-KAR68 | PRISM-UNIFIED-ROADMAP-v2 | Tests for app integration |
| U-A1 | prism-stabilization | git-sync-stop bounded push |
| U-A2 | prism-stabilization | .gitignore hygiene + helper audit |
| U-A3 | prism-stabilization | orphan reaper Stop hook |
| U-A4 | prism-stabilization | archive 23 disabled hooks |
| U-A5 | prism-stabilization | mirror direction enforcement |
| U-B1 | prism-stabilization | hybrid handoff store + 2 dispatcher actions |
| U-B2 | prism-stabilization | ID resolution hardening (mandate stdin) |
| U-B3 | prism-stabilization | compact pipeline consolidation (5+ files -> 2) |
| U-B4 | prism-stabilization | startup pipeline read path |
| U-B5 | prism-stabilization | Obsidian vault integration (NTFS junction) |
| U-B6 | prism-stabilization | Quartz HTML build (port 8766) |
| U-C1 | prism-stabilization | context-bundle daemon |
| U-C2 | prism-stabilization | ONE prompt-context-inject hook |
| U-C3 | prism-stabilization | browseable context dashboard |
| U-C4 | prism-stabilization | retire 30+ redundant hooks |
| U-GC-00 | GIT-TREE-REMEDIATION-MS0 | Decision gate: which trunk is canonical? |
| U-GC-01 | GIT-TREE-REMEDIATION-MS0 | Decision gate: keep or delete archive/forge-orphans-2026-05-01 |
| U-GC-02 | GIT-TREE-REMEDIATION-MS0 | Decision gate: do the history rewrite + force-push |
| U-GC-03 | GIT-TREE-REMEDIATION-MS0 | Add .gitignore block for generated artifacts |
| U-GC-04 | GIT-TREE-REMEDIATION-MS0 | git rm --cached the now-ignored tracked artifacts |
| U-GC-04b | GIT-TREE-REMEDIATION-MS0 | Remove brave-euclid stray worktree + delete 14 worktree-agent-* cruft branches |
| U-GC-05 | GIT-TREE-REMEDIATION-MS0 | git reflog expire + git gc --prune=now |
| U-GC-06 | GIT-TREE-REMEDIATION-MS0 | git config worktree.baseRef head + new trunk-guard.mjs SessionStart hook |
| U-GC-07 | GIT-TREE-REMEDIATION-MS0 | worktree-commit-route.mjs: [MAIN] bypasses worktree-routing only, never trunk-routing |
| U-GC-08 | GIT-TREE-REMEDIATION-MS0 | Reconcile stale doctrine + point /sync-rebase at the canonical trunk |
| U-GC-09 | GIT-TREE-REMEDIATION-MS0 | History rewrite: strip generated blobs via filter-repo on a fresh mirror |
| U-GC-10 | GIT-TREE-REMEDIATION-MS0 | Force-push the rewritten history; re-sync every worktree |
| U-GC-11 | GIT-TREE-REMEDIATION-MS0 | Characterize main's 874 unique commits |
| U-GC-12 | GIT-TREE-REMEDIATION-MS0 | Reconcile main's unique work onto cad-f (staging branch) OR declare cad-f canonical |
| U-GC-13 | GIT-TREE-REMEDIATION-MS0 | Promote the canonical trunk to main; retire the old trunks |
| U-GC-14 | GIT-TREE-REMEDIATION-MS0 | Sweep all 40 worktrees for uncommitted WIP before P2's reset --hard |
| U-GC-15 | GIT-TREE-REMEDIATION-MS0 | Retire the broken work/xproc-neural worktree |
| U-GC-16 | GIT-TREE-REMEDIATION-MS0 | Retire the stale-merged worktrees/branches |
| U-GC-17 | GIT-TREE-REMEDIATION-MS0 | Triage the ~24 stale-unmerged work-branch forks |
| U-GC-18 | GIT-TREE-REMEDIATION-MS0 | Retire worktree-u-fus-api01/02 |
| U-GC-19 | GIT-TREE-REMEDIATION-MS0 | Clean the claude/* auto-branches + origin/archive-2026-02-01 + origin/worktree-data-loss-f |
| U-GC-20 | GIT-TREE-REMEDIATION-MS0 | Decide on archive/forge-orphans-2026-05-01 (the 3.09 GB whisper model) |
| U-GC-21 | GIT-TREE-REMEDIATION-MS0 | Post-cleanup verification suite |
| U-GC-22 | GIT-TREE-REMEDIATION-MS0 | Document the new topology + update memory + CLAUDE.md |
| U-DOCKER-HOOK-BROKER | OBSIDIAN-INTELLIGENCE-MS3 | Track A1 — Docker hook broker |
| U-REREAD-SIGNAL-FINISH | OBSIDIAN-INTELLIGENCE-MS3 | Track A2 — Re-read signal finish |
| U-DAILY-CONTEXT-WORKFLOW | OBSIDIAN-INTELLIGENCE-MS3 | Track B1 — Daily context workflow |
| U-CONNECTION-FINDER | OBSIDIAN-INTELLIGENCE-MS3 | Track B2 — Connection finder |
| U-QUEUE-PROCESSOR | OBSIDIAN-INTELLIGENCE-MS3 | Track B3 — Queue processor |
| U-WEEKLY-SYNTHESIS | OBSIDIAN-INTELLIGENCE-MS3 | Track B4 — Weekly synthesis |
| U-PROJECT-AUTO-UPDATER | OBSIDIAN-INTELLIGENCE-MS3 | Track B5 — Project auto-updater |
| U-KNOWLEDGE-DISTILLATION | OBSIDIAN-INTELLIGENCE-MS3 | Track B6 — Knowledge distillation |
| U-HTML-OUTPUT-MODE | OBSIDIAN-INTELLIGENCE-MS3 | Track C1 — HTML output mode |
| U-HTML-DASHBOARD | OBSIDIAN-INTELLIGENCE-MS3 | Track C2 — HTML dashboard |
| U-HTML-DESIGN-SYSTEM | OBSIDIAN-INTELLIGENCE-MS3 | Track C3 — HTML design system |
| U-PROVENANCE-LAYER | OBSIDIAN-INTELLIGENCE-MS3 | Track D1 — Provenance layer |
| U-ONTOLOGY-LAYER | OBSIDIAN-INTELLIGENCE-MS3 | Track D2 — Ontology layer |
| U-CONFLICT-RESOLUTION | OBSIDIAN-INTELLIGENCE-MS3 | Track D3 — Conflict resolution |
| U-ACTION-TRACES | OBSIDIAN-INTELLIGENCE-MS3 | Track D4 — Action traces |
| U-CONTEXT-EVAL-GATE | OBSIDIAN-INTELLIGENCE-MS3 | Track D5 — Context eval gate |
| U-IDEABLOCK-EXTRACTOR | OBSIDIAN-INTELLIGENCE-MS3 | Track E1 — IdeaBlock extractor |
| U-IDEABLOCK-DEDUP | OBSIDIAN-INTELLIGENCE-MS3 | Track E2 — IdeaBlock dedup |
| U-IDEABLOCK-RAG-ENGINE | OBSIDIAN-INTELLIGENCE-MS3 | Track E3 — IdeaBlock RAG engine |
| U-IDEABLOCK-GOVERNANCE | OBSIDIAN-INTELLIGENCE-MS3 | Track E4 — IdeaBlock governance |
| U-VOICE-CAPTURE | OBSIDIAN-INTELLIGENCE-MS3 | Track F1 — Voice capture |
| U-HIGHLIGHTS-ONLY | OBSIDIAN-INTELLIGENCE-MS3 | Track F2 — Highlights-only PDF ingest |
| U-AGENT-JOB-DESCRIPTIONS | OBSIDIAN-INTELLIGENCE-MS3 | Track G1 — Agent job descriptions |
| U-AGENT-PIXEL-DEPT-OVERLAY | OBSIDIAN-INTELLIGENCE-MS3 | Track G2 — Agent pixel-dept overlay |
| U-AGENT-RUNTIME-ALERTS | OBSIDIAN-INTELLIGENCE-MS3 | Track G3 — Agent runtime alerts |

## Milestone rollup (pending work per milestone)

| Milestone | Shipped/Total | Pending | Status | Roadmaps |
|-----------|---------------|---------|--------|----------|
| 5AXIS-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| ACP-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS0A | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS1 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS2 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS2B | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS3 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS4 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS5 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS6 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ACP-MS7 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| AGI-MASTER-PARITY-MS30 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,envelope |
| AI-INTEG-MS4 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| AI-MAX-MS0 | 9/12 | 3 | in_progress_real | MILESTONE_PROGRESS,envelope |
| AI-WIRE-MS0 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| APP-MS0 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| APPW-MS8 | 0/11 | 11 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ARCH-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ARCH-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ARCH-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| AUTO-LEARNING-LOOP-MS0 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| AWARE-MS0 | 2/8 | 6 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BENCH-MS0 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BENCH-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BENCH-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BENCH-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BENCH-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BIZ-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BIZ-MS1 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BIZ-MS2 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BIZ-MS3 | 0/9 | 9 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BIZ-MS4 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BIZ-MS5 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BIZ-MS6 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| BLUEPRINT-OCR-TRAINING-MS1 | 8/8 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| BP-MS0 | 0/28 | 28 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-AI-DEEP | 6/6 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-AI-ULTRA | 6/6 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-AUTOMATION-MS0 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-CAM-MASTER | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-COMPLETE-MS0 | 33/335 | 302 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-GROUND-TRUTH-MS0 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-INFRA-MS0 | 4/16 | 12 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-TRAINING-EXTRACT-MS0 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAD-UNIVERSAL-CONTROL-MS0 | 3/18 | 15 | in_progress_real | MILESTONE_PROGRESS,envelope |
| CADCAM-AGI-MS0 | 0/24 | 24 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DAGI-MS0 | 14/14 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DAGI-MS1 | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DAGI-MS2 | 0/14 | 14 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DAGI-MS3 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DAGI-MS4 | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DAGI-MS5 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DAGI-MS6 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DAGI-MS7 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CADCAM-DEEPAGI-MASTER | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CALC-HARDEN-MS0 | 0/18 | 18 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAM-AI-DEEP | 7/7 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAM-EXHAUST-MS0 | 156/189 | 33 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAM-ML-CLOSEDLOOP-MS0 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAM-PARITY-AGI-MS0 | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMK-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMK-MS1 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMK-MS2 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMK-MS3 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS0 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS0.3 | 0/24 | 24 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS0.5 | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS0.7 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS1 | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS10 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS11 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS12 | 0/13 | 13 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS13 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS14 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS15 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS16 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS17 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS18 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS19 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS2 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS20 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS21 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS22 | 0/20 | 20 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS3 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS4 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS5 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS6 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS7 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS8 | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-MS9 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P0A | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P0B | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P0C | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P1 | 0/18 | 18 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P10 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P11 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P12 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P2 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P3 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P4 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P5 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P6 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P7 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P8 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CAMX-V17-P9 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-EXT-MS0 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-EXT-MS1 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-EXT-MS2 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-EXT-MS3 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-EXT-MS4 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-EXT-MS5 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-EXT-MS6 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS0 | 0/9 | 9 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS10 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS11 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS6 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS7 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS8 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CC-MS9 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS0 | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS1 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS10 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS11 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS12 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS13 | 0/14 | 14 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS14 | 0/14 | 14 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS15 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS16 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS17 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS2 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS3 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS4 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS5 | 0/14 | 14 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS6 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS7 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS8 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CCM-MS9 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CK-MS0 | 5/5 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CK-MS1 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CK-MS10 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CK-MS11 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CK-MS12 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CK-MS13 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CK-MS9 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CLEANUP-MS0 | 0/73 | 73 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CLI-MS0 | 0/22 | 22 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| COMMAND-KERNEL-MS0 | 0/29 | 29 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CONTROLLER-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| COORD-MS0 | 9/12 | 3 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| COST-CASCADE-MS0 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CPL | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CPL-MS2 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| CWEDM-MS0 | 12/12 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| DB-EXP-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| DB-EXP-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| DB-EXP-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| DB-EXP-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| DB-EXP-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS0A | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS1 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS10 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS2 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS3 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS4 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS5 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS6 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS7 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS8 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EIGC-MS9 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ELEC-PIPE-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ELEC-PIPE-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ELEC-PIPE-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| EMP-MS0 | 0/28 | 28 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-AP-MS0 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-AP-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-AP-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-AP-MS6 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-AP-MS7 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-AP-MS8 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-FULL-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-FULL-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-FULL-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-FULL-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-FULL-MS5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-FULL-MS6 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-FULL-MS7 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-FULL-MS8 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-MS1 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-MS2 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-MS3 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-MS4 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-MS5 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS10 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS11 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS12 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS6 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS7 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS8 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| F360-REV-MS9 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| FLEET-REAPER-MS1 | 6/6 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| FMERGE-MS0 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| FMERGE-MS1 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| FMERGE-MS2 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| GAP-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| GRAPH-AS-LLM-CONTEXT-MS0 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS0 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS1 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS10 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS11 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS2 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS3 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS4 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS5 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS6 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS7 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS8 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HBK-MS9 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HITL-OPERATOR-UI-MS24 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,envelope |
| HM-KC-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS10 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS6 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS7 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS8 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-KC-MS9 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-PLG-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-PLG-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-PLG-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-PLG-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-PLG-MS5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-PLG-MS6 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-PLG-MS7 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HM-PLG-MS8 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HOOK-MANIFEST-DAG-MS26 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,envelope |
| HOOK-SYNERGY-MS0 | 0/11 | 11 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HOOKS-AUTOMATION-V2-MS0 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| HSM-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| HTML-COMPANION-MS0 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,envelope |
| HTML-PRIMARY-MS0 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| INFRA-AGI-ROUTER-MS2 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| INFRA-CLOSEOUT-MS0 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| INFRA-CONSENSUS-WIRE-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| INFRA-NEURAL-LEDGER-MS1 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| INTEG-MS5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| INTEL-OLLAMA-OBSIDIAN-MS0 | 0/92 | 92 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| INTEL-OLLAMA-OBSIDIAN-MS1 | 0/23 | 23 | not_started_real | MILESTONE_PROGRESS,envelope |
| K2-CLOUD-MS0 | 0/13 | 13 | not_started_real | MILESTONE_PROGRESS,envelope |
| KNOWLEDGE-VAULT-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| KNOWLEDGE-WIKI-MS0 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,envelope |
| L0-NEW-MS0 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L0-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L0-P0-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L0-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L0-P2-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L1-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L1-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L1-P1-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L1-P2-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L10-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L10-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L10-P2-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L10-P3-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L2-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L2-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L2-P2-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L2-P3-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L2-P4-MS1 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L3-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L3-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L4-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L4-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L5-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L5-P0-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L5-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L6-BACKPROP-REGISTRY-MS25 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,envelope |
| L6-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L6-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L7-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L8-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L8-P0-MS2 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L8-P1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L8-P1-MS2 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L8-P2-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L8-P2-MS2 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L8-P3-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L9-P0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L9-P1-MS1 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| L9-P2-MS1 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LASER-PIPE-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LASER-PIPE-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LASER-PIPE-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| LATHE-LORA-MS0 | 0/50 | 50 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MASTER | 0/136 | 136 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS0.5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS3 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS4 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS6 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS7 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-MS8 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-P2P-CONSENSUS-MS4 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LATHE-PROD-READY-MS0 | 0/135 | 135 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LOCAL-LLM-MS0 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| LOOP-MIGRATE-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MACHINE-CONNECTIVITY-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MACRO-PROGRAM-PIPELINE-MS0 | 7/7 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MCAT-MS0 | 0/21 | 21 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MF-MS0 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MF-MS1 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MF-MS2 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MF-MS3 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MF-MS4 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MF-MS5 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MFG-SCIENCE-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| MILLTURN-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| MIO-MS0 | 57/57 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-AUDIT-DERIVED-2026-05-10 | 0/30 | 30 | not_started_real | MILESTONE_PROGRESS,envelope |
| MS-CAM-MASTERY | 0/34 | 34 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-CI-GATES | 0/9 | 9 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-CRITWIRE | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-DESKTOP | 0/18 | 18 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-DOCFLOW | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-DOCU-FINISH | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-DOCU-INGEST | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-FRONTEND | 0/14 | 14 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-GTM | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-INFRA | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-LEGAL | 0/13 | 13 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-MASTERPOST | 0/44 | 44 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-MONOLITH-HARVEST | 0/11 | 11 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P0-V | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P0.5-COORD | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P1-100PCT | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P1.5-ONESHOT | 4/7 | 3 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P10-V2LAUNCH | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P2.5-SAFETY | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P3-TIER6B | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P4-DL-CORE | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P4-DL-PRED | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P5-GNN | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P6-VAL30 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P7.5-FE-GAPS | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P8-FEBE | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P9-INT | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-P9-XAI | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-PAY | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-PILOT | 0/20 | 20 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-PRINT-PROGRAM-LOOP | 0/23 | 23 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-CADCAM-DOCS | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-FIXTURE-CATALOGS | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-FORMULA-ALGO | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-HYPERMILL-SDK | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-MACHINE-MODELS | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-MATERIAL-ENRICH | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-NC-MINE | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-POST-CYCLE-LIB | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-TOOLDB-IMPORT | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-RES-XLSM-ENGINE | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-SFC-CALIBRATE | 0/24 | 24 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-TRAIN-DEEP | 0/26 | 26 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-VIZ-ROADMAP-BIND | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-WIRE-BACKEND | 0/60 | 60 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS-WIRE-FRONTEND | 0/90 | 90 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS0-EXTENSION | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS1 | 0/39 | 39 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS2 | 0/30 | 30 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MS4 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MULTI-CLI-SYNC-HOOK-MS28 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,envelope |
| MXU-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS0A | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS1 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS10 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS2 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS3 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS4 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS5 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS6 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS7 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS8 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| MXU-MS9 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| OBSIDIAN-INTELLIGENCE-MS3 | 0/25 | 25 | not_started_real | MILESTONE_PROGRESS,envelope |
| OBSIDIAN-MS0 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| OCTOPUS-NEURAL-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| OPUS47-FULL-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| OT-IT-SECURITY-MS20 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,envelope |
| P2P-FULLSTACK-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PB-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PCCA-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PCCA-MS0A | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PCCA-MS1 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PCCA-MS4 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PCCA-MS6 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PDF-EXT-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PDF-EXT-MS1 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PDF-EXT-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PIPE-MS0 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PIPE-MS1 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PIPELINE-VAR-MS0 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| POST-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| PP-MOAT-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MOAT-MS1 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MOAT-MS2 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MOAT-MS3 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MOAT-MS4 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS1 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS2 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS3 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS4 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS5 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS6 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS7 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-MS8 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-REV-MS5 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-REV-MS6 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PP-REV-MS7 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PPG-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS1 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS10 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS11 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS12 | 0/9 | 9 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS13 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS14 | 0/9 | 9 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS15 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS16 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS17 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS18 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS19 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS2 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS20 | 0/9 | 9 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS21 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS22 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS23 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS24 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS25 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS26 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS27 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS28 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS29 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS3 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS30 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS31 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS32 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS33 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS34 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS35 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS36 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS37 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS38 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS4 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS5 | 0/9 | 9 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS6 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS7 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS8 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,envelope |
| PPG-MS9 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,envelope |
| PRISM-AGENT | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,envelope |
| PROBING-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| PROD-GATE-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PROD-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PSAU-LEARN | 0/11 | 11 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| PSAU-PPG-SFC | 9/14 | 5 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS1 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS10 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS11 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS12 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS13 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS14 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS2 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS3 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS4 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS5 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS6 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS7 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS8 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QA-MS9 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QS-MS0 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QS-MS1 | 0/9 | 9 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QS-MS2 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QS-MS3 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QS-MS4 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QS-MS5 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QS-MS6 | 0/11 | 11 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| QUALITY-GDT-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| REM-MS0 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| REM-MS1 | 3/3 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| REM-MS2 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| REM-MS3 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| REM-MS4 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| REM-MS5 | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| RES-ROADMAP | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,envelope |
| RGS-TOOL-AUTOINVOKE-MS0 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,envelope |
| RGS-TOOL-AUTOINVOKE-MS1 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,envelope |
| RT-ADAPTIVE-MS22 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,envelope |
| RT-ADAPTIVE-MS22A | 0/2 | 2 | not_started_real | MILESTONE_PROGRESS,envelope |
| RT-ADAPTIVE-MS22B | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,envelope |
| RT-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| RT-MS1 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S0-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S1-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S1-MS2 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S2-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S2-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S3-MS1 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S3-MS2 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S3-MS3 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| S4-MS1 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCENARIO-TEST-MS0 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCHEMA-MIGRATION-RUNNER-MS27 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,envelope |
| SCI-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCI-MS1 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCI-MS2 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCI-MS3 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-MS0 | 0/17 | 17 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-MS1 | 0/20 | 20 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-MS2 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-MS3 | 0/16 | 16 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-MS4 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-MS5 | 0/23 | 23 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-MS6 | 0/17 | 17 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-MS7 | 0/15 | 15 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SCIMATH-WIRE-MS0 | 0/21 | 21 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SIM-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SINKER-FULL-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SINKER-FULL-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SKILLS-UTILIZATION-MS0 | 0/8 | 8 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SLOT-WORKTREE-MS0 | 1/16 | 15 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-MS0 | 6/6 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-MS1 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-MS2 | 6/6 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-MS3 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-MS4 | 3/3 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-MS5 | 2/2 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-MS6 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-MS7 | 3/3 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYS-UTIL-AUDIT-MS0 | 0/12 | 12 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| SYSTEM-VIZ-BRAIN-MS0 | 15/26 | 11 | in_progress_real | MILESTONE_PROGRESS,envelope |
| TC-MS0 | 0/14 | 14 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| TENANT-ONBOARD-MS29 | 0/3 | 3 | not_started_real | MILESTONE_PROGRESS,envelope |
| TK-AI-HARDEN | 5/5 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| TK-MS10 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| TK-MS11 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| TK-MS2 | 6/6 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| TK-MS5 | 3/3 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| TK-MS6 | 3/3 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| TK-MS7 | 3/3 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| TK-MS8 | 3/3 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| TK-MS9 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| TOKEN-OPT-MS0 | 7/7 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| TOOL-INVENTORY-MS0 | 0/10 | 10 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| TOOLING-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| TOOLS-AUDIT-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,envelope |
| TRAINING-LEARNING-MS0 | 0/7 | 7 | not_started_real | MILESTONE_PROGRESS,envelope |
| TRAINING-MANUAL-AI | 8/8 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| TWIN-SIM-GATE-MS23 | 0/4 | 4 | not_started_real | MILESTONE_PROGRESS,envelope |
| ULT-MS0 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ULT-MS1 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ULT-MS2 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ULT-MS3 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ULT-MS4 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| ULT-MS5 | 0/5 | 5 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| USF-MS0 | 12/12 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| USSH-OPUS47-BOLSTER | 0/18 | 18 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| V6-INTELLIGENCE | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| V6-ROADMAP | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| VAR-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| VAR-MS1 | 0/14 | 14 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| VID-EXT-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| VID-EXT-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| VID-EXT-MS2 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| VIZ-COVERAGE-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,envelope |
| VL-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WATER-PIPE-MS0 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WATER-PIPE-MS1 | 0/1 | 1 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-100PCT-MS0 | 27/30 | 3 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-AI-ADVANCED | 7/7 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-AI-DEEP | 7/7 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-AI-DEEP-MAX | 10/10 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-AI-HARDEN | 6/6 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-AI-MACRO | 7/7 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-AI-MACRO-DEEP | 8/8 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-AI-PRODUCTION | 7/7 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-CAL-MS0 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-CAL-MS1 | 5/5 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-CAL-MS2 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-CAL-MS3 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-CAL-MS4 | 4/4 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-CODEX-INTEGRATION-MS0 | 8/8 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-ERP-MS0 | 10/10 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-GAPFILL-MS0 | 0/11 | 11 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-LAUNCH-MS0 | 9/9 | 0 | completed_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WEDM-P2P-PRODUCTION-MS0 | 18/24 | 6 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WIKI-EVOLVE-MS0 | 0/6 | 6 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WIRE-MS0 | 1/16 | 15 | in_progress_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| WORKHOLDING-AI | 1/1 | 0 | completed_real | MILESTONE_PROGRESS,envelope |
| WORKTREE-CONSOLIDATE-MS0 | 0/37 | 37 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |
| XPROC-NEURAL-OPTIMIZE-MS0 | 0/31 | 31 | not_started_real | MILESTONE_PROGRESS,roadmap-index,envelope |

_Per-unit detail (all 4497 pending units): ROADMAP-CONSOLIDATED.json `pending_units[]`._
