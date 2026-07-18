# PRISM Priority Build Plan (2026-06-03)

The operator has set an explicit, ordered build priority: **(1)** SFC (speed-feed, oscar) + the Post-Processor generator (echo), fully built and **battle-tested against every mathematical/logical input combination** on the PRISM calculator page, with posts proven **5-axis-first** then mill → mill-turn → Swiss-lathe-first-of-lathe downward; **(2)** complete the quoting system + quoting app feature (charlie); **(3)** make the full ERP business stack (hotel) production-usable so JM Die can start using it at work; **(4)** catch the PRISM app up to present-day JM Die by filling it with every document we have (JM Die corpus + resources + Docustrata). This plan is grounded in `FLEET-DOMAIN-GOALS-2026-06-03.md`, `FLEET-1MONTH-TRAJECTORY-2026-06-03.md`, `MASTER-ROADMAP-ARCHAEOLOGY-2026-06-03.md`, and `BUILD_STATE.md` — every deliverable cites a real existing engine (wire-don't-rebuild). Work orders below are routable blocks that Hermes (bravo) will turn into per-slot briefs via `prism_context:slot_brief_write` → `slot-brief-inject.mjs`.

---

## Priority sequence

Dependency-ordered. Substrate items that gate "proven" status are called out so a consumer is never built atop an unproven dependency (R13 logical order).

1. **PRIORITY 1 — SFC + Post-processor, battle-tested (oscar + echo, supported by kilo/oscar feed-spine, romeo data, foxtrot/whiskey/mike machine-domain coverage).**
   - **Lands first:** oscar's SFC engine layer is already BUILT (`UltimateSpeedFeedEngine` 31 models / 401-assert gauntlet, `SpeedFeedNineAxisOrchestratorEngine`). The work is **exhaustive combinatorial validation on the calculator page** + closing `MS-SFC-CALIBRATE` (the saleable moat).
   - **Synergizes:** the SFC↔cutting-physics spine — `cam_speedfeed_compute` / `SpeedFeedPropagationBridgeEngine` already fans SFC into mill/lathe/wedm + per-block into echo's post. Validating SFC validates the parameter that every post block carries. **Build SFC's validated matrix BEFORE echo's full post matrix** — the post consumes oscar's F/S per block, so the post-proof rides on a proven SFC (producer-before-consumer).
   - **Post ordering is operator-locked:** 5-axis (top tier) → 3-axis mill → mill-turn / live-tooling → Swiss-lathe (top of lathe) → standard lathe → wire-EDM. echo owns the dialect-emit half; oscar feeds F/S; kilo feeds the toolpath; foxtrot/whiskey/mike own the per-domain cut physics being posted.
   - **Substrate caveat:** echo's #1 leverage is converting ~14 stub-wired post engines from `method?.()` dark fallbacks to real executing calls (FLEET-DOMAIN-GOALS Tier-1 #5) — a dark engine = a dark post tail. This is inside PRIORITY 1, not deferred.

2. **PRIORITY 2 — Quoting system + quoting app (charlie).** Depends on PRIORITY 1 for cost-basis truth: `CycleTimeEstimatorEngine` / `SpeedFeedPropagationBridgeEngine` MRR→cycle_min is the SFC→quote link, so a calibrated SFC sharpens every quote. QuoteToShip pipeline 0.51 → 1.0; consume the 3 unconsumed data sources; ship a customer-facing quote UI with a margin-floor gate. Charlie's outbound-revenue calibration is blocked by hotel's `ERPCostFeedbackEngine` (the only true actuals source) — so PRIORITY 2 and 3 interlock on the quote↔ERP revenue spine.

3. **PRIORITY 3 — Full ERP business stack, production-usable (hotel).** `quote_to_ship_run` 21-stage orchestrator + `GeneralLedgerEngine` (debits=credits invariant) are BUILT. Work = wire the orphan `HotelERPTribalKnowledgeEngine`, extract 6 inline financial/HR constants families, surface the Lean/Six-Sigma dashboards over already-built engines (OEE/SPC/Kaizen — engines exist, only frontends missing), and close the cost-feedback loop back to charlie. **The PostgreSQL persistence gap (archaeology #1) is a precondition** — durable state + AS9100 audit trail before any production use.

4. **PRIORITY 4 — JM-Die catch-up (delta + xray + romeo + hotel + lima, corpus-fed).** Fill the app from the 3 critical resource roots. hotel's JM-DOC-POPULATION-MS0 already reconciled 554,999 files (gate 0→61.44%); xray's overnight OCR + delta's reverse-corpus + romeo's catalog DB-gen are the population engines. Runs partly in parallel with 1-3 because it is read-mostly population, but its *value* compounds only once SFC/quoting/ERP surfaces exist to consume the data.

**Cross-cutting foundations that gate "proven" (run alongside, owned outside the priority slots):** sierra's merge-OOM fix (gates india's eval + every slot's search), india's deploy-gate clearance (gates the self-improving half of every domain), golf's MCP :3100 uptime (a wedged daemon drops all `prism_*` reachability). These are not in the operator's 4-item list but every priority above inherits "proven by training" status from them.

---

## WORK ORDERS

### WORK ORDER → oscar (speed-feed)
**Objective:** Make the SFC calculator page emit physics-correct RPM/feed/DOC/WOC with cited uncertainty for EVERY mathematically/logically valid input combination, and ship the calibration moat that turns physics-default into shop-calibrated.

**Concrete deliverables:**
- A **combinatorial SFC validation harness** that drives `prism_calc:sfc_nine_axis_run` / `sfc_calculate` / `ultimate_speed_feed` across the full input cross-product (see matrix) and asserts: finite physics output OR honest limited-mode flag (never a silent default), Altintas SLD chatter-stable RPM gate fires, units-clean per-line (no 25.4× scale anomaly), machine/heat-treat-aware adjustment applied. Extends the existing 103-case `SPEEDFEED-VARIABILITY-MS0` matrix (`1b87f98f2c`) and the 401-assert `UltimateSpeedFeedEngine` gauntlet to full coverage.
- `MS-SFC-CALIBRATE` (24 units, **never_started**) — the Stacked-Bayesian-Model-Averaging regime-routed ensemble on a physics-prior backbone; wire the orphaned `U-OSC9-CALIB-APPLY-WIRE` keystone.
- Per-vendor S/F extraction backlog (44 HIGH catalogs → `<vendor>-speed-feed-data.ts`, worklist `catalog-sfc-extraction-manifest.json`) so the matrix runs on cited real data, not defaults — coordinate with romeo (catalog DB-gen).
- The `MS-CAM-MASTERY` Fusion pillar-D "Speed&Feed via PRISM" button surfaces this calculator in-seat (shared with kilo, Revenue Day 1).

**Test/validation matrix (the calculator-page cross-product to cover):**
- **Materials** (ISO P/M/K/N/S/H, ~6,509 rows; kc1.1 canonical P=1800/M=2100/K=1100/N=700/S=2800/H=3200) × **machines** (JM fleet: 5 VMC Haas/Hurco + Okuma lathes + Roku-Roku + WEDM; spindle-power/RPM-cap aware) × **tools** (41,209-tool space: end-mill/face/drill/tap/thread-mill/bore/groove/insert-turn, per-diameter buckets) × **holders** (shrink/hydraulic/ER/sidelock/holderless — normalizeHolder null-holder path) × **operations** (face/slot/pocket/profile/drill/bore/thread/turn/groove/part-off) × **toolpath type** (HSM/trochoidal/adaptive/peel/plunge/conventional) × **surface finish** (Ra target → finish-feed) × **tolerance** (IT grade → DOC/WOC banding) × **coolant/coating** state. Each cell: assert physics-valid or honest limited-mode; assert chatter-gate; assert units; assert no inline constant (imports `constants.ts`).

**Dormant builds / existing engines to leverage:** `UltimateSpeedFeedEngine`, `SpeedFeedOrchestratorEngine` (2,851 LOC), `SpeedFeedNineAxisOrchestratorEngine`, `SpeedFeedPropagationBridgeEngine`, `SpeedFeedPDFCorpusBridgeEngine` (`sfc_pdf_corpus_bridge`), G-Wizard/HSMAdvisor adapters+exporters, `PhysicsFusionConvergenceEngine` (archaeology — VERIFY shipped; Anderson/Broyden convergence is the fusion heart), `CoolantRegistry`/`CoatingRegistry` (archaeology — populate), `ThreadCalculationEngine` (archaeology Tier-0 — verify coverage).

**Synergy edges:** FEEDS echo (per-NC-block F/S via `cam_speed_feed_bridge`), FEEDS foxtrot/whiskey/mike (`SpeedFeedPropagationBridgeEngine`), FEEDS charlie (MRR→cycle_min cost link), FEEDS kilo (Fusion Speed&Feed button), PUBLISHES outcomes→india (`xproc_outcome_publish {slot:oscar}`); CONSUMES romeo's cited vendor catalogs.

**Acceptance criteria:** 100% of the valid input cross-product returns physics-valid-or-honest-limited (zero silent defaults); chatter/units guards fire on every cell; `MS-SFC-CALIBRATE` shipped + calib-apply wired; Engines wiredPct 88→100 for the ~25 SFC engines. SVI lift: closes the SFC slice of the fleet "Engines 88%→100%" rank-2 gap and raises intelligence-category reachability via calibrated confidence.

### WORK ORDER → echo (post-processor)
**Objective:** Prove a single canonical CAM→controller post for the full JM machine fleet, exercised **5-axis-first** down through Swiss, with every emitted block physics/safety-verified and byte-checkable against the golden NC archive.

**Concrete deliverables:**
- Convert the **~14 stub-wired post engines** (`method?.()` "method not callable" dark fallbacks → real executing calls): `MasterPostProcessor{AGIOrchestration,Genius,UnifiedAGI}`, the 5 WEDM dialect engines, the active-learning trio (`LathePostGeneratorActiveLearning`, `JMDiePostProcessorLearning`, `PostProcessorAGIContinuousLearning`). This is the #1 leverage move (the literal cause of "reachable-on-paper, dark-in-practice").
- A **post-proving matrix harness** that emits + verifies posts in the operator-locked tier order (see matrix), reusing `scripts/lib/nc-normalize.mjs` (byte-equivalence) + `nc-dialect-masks.mjs` (volatile-comment masks) + the golden round-trip classifier (byte-identical | volatile-header-only | semantic-drift), and the `prism_cimco` sim-bridge (`CimcoVerificationBridgeEngine`, 6 actions) for sim-report pass/fail.
- Close the 4 P0 machine-coverage gaps: Haas PRE-NGC, Roku-Roku (VMC-05), EA sinker, FA10S mis-route.
- Wire the 5 WEDM dialects (Mitsubishi/Sodick/Makino/Agie/Fanuc) so JM wire-EDM posts exist (jointly owned with mike's cut-physics).
- Alarm-aware emit: cross-check the 2,588-alarm DB into PostProcessorPipeline P5 (declared-but-unwired).
- (Gated, Tier-3) `MS-MASTERPOST` (0/44) is BLOCKED on `U-LEGAL-13` (re-derive dialect codes from public manuals: Fanuc B-61395E, Haas 96-0284, Mitsubishi IB-1501279, Siemens 840D, Okuma OSP-P300) — surface the legal gate, do not ship copyrighted-derived codes.

**Test/validation matrix (operator-locked post tier order, top→bottom):**
1. **5-AXIS (TOP TIER)** — RTCP/TCPM (G43.4/G234), singularity-avoidance, G68.2 tilted-plane; controllers: Haas NGC (VF-with-TR), Hurco WinMAX (`HurcoV11MillMasterPostEngine` 92K), Heidenhain, Fanuc 5-ax, Siemens 840D, Okuma OSP 5-ax. `MillKinematicsCollisionEngine.detectSingularity` gate must fire.
2. **3-AXIS MILL** — G81/82/83/73/84/85 canned cycles byte-matched to JM goldens (`HaasNGCMillMasterPostEngine` condition-1/2 proven); coolant-before-spindle, rapid-limit, retract gates.
3. **MILL-TURN / LIVE-TOOLING** — C-axis polar (G12.1/G13.1), Y-axis, sub-spindle transfer (M200/M201/WAITM), channel-sync; `Fusion360MillTurnBridgeEngine` handoff; Okuma Multus / Mazak Integrex dialects.
4. **SWISS-LATHE (TOP OF LATHE)** — guide-bushing, LFV chip-break (Citizen/Star), sub-spindle pickoff, bar-feeder M99 loop; Citizen/Star/Tsugami dialects.
5. **STANDARD LATHE** — G96 CSS / G50 cap, G76/G92 threading, G75 peck-groove; Okuma OSP-P300 (JM 100%-Okuma fleet), Fanuc-T, Haas-ST.
6. **WIRE-EDM** — rough/skim/taper/no-core; Mitsubishi MV1200R (`EDMPostProcessGCodeEngine` 126K + `MitsubishiMV1200RWireEDMMasterPostEngine`) + Sodick/Makino/Agie/Fanuc dialects.
Each tier × {every JM machine in that class} × {each canned/special cycle} → assert: emits, passes dialect-lint (8 rules), CIMCO sim verdict PASS (fail-CLOSED on empty report), byte-class = identical|volatile-header-only (never semantic-drift), units-first (no 25.4× trap), carries oscar's F/S per block.

**Dormant builds / existing engines to leverage:** `MasterPostProcessorUnifiedAGIEngine` (14 controllers/19 CAM/25+ ops), `PostProcessorPipelineEngine` (7-phase/38-stage), `GCodeSafetyAnalyzerEngine` (67K), `CimcoVerificationBridgeEngine` (`prism_cimco`), `nc-normalize.mjs` / `nc-dialect-masks.mjs` / `post-gen-reward.mjs`, the 12 JM `.cps` fleet, `Post-Processor Framework (UIR→12+ controllers)` + `OptimizationReportEngine` (archaeology R14 flagship — ship the before/after report as the value artifact), Swiss dialects (Citizen/Star LFV — archaeology).

**Synergy edges:** CONSUMES kilo toolpaths (NCI/APT/ToolpathBlock, lossless strategy+tool-list+WCS), CONSUMES oscar F/S per block, EMITS NC→india as reward labels; SHARES the WEDM dialect surface with mike, the Okuma post corpus with whiskey, the mill master-post with foxtrot; FEEDS juliett (DB-index the 160K-NC/13.8K-cps corpus).

**Acceptance criteria:** Every machine in every tier emits + passes lint + CIMCO-sim + byte-class (no semantic-drift) for its full cycle set; 14 dark engines converted to real calls (0 `method?.()` fallbacks); 4 P0 machine gaps closed; 5 WEDM dialects live; alarm-aware P5 wired. SVI lift: EDM pipeline 0.38 → toward 1.0, Turning post reachability up, closes Tier-1 #5 (the dark-tail unblock for mill/lathe/wedm end-to-end).

### WORK ORDER → charlie (quoting)
**Objective:** Any print → margin-correct, physics-grounded, customer-ready quote in one shot, with a closed quote-vs-actual loop, surfaced in a customer-facing quoting app feature.

**Concrete deliverables:**
- Ship the **customer-facing quote UI** (the "quoting app feature"): full cost-stack + confidence band + per-customer margin-floor gate that turns an advisory FMV into a true, profit-guaranteed quote. Wire `prism_quoting:training_status` + a frontend consumer for `latest-training-status.json`.
- Feed the **3 unconsumed data sources** into training: `jm-vendor-cost-index.json` ($10M AP cost-basis), `jm-tool-purchases.json`, `docustrata-invoices.curated.json` → drive MAPE down from the 71.1% synth ceiling.
- Connect QuoteToShip to the `strategies` registry it currently lacks (today only materials/tools/machines) and lift `controller_dialects` past its single dialect — QuoteToShip 0.51 → 1.0.
- Ship the 2 unbuilt Quoting BUILD_STATE units (resolve to frontend/wiring).
- (Archaeology revenue) build the **DrawingToQuoteMathPipeline + MonteCarloCostPDFEngine** (P10/P50/P90 cost with confidence bands — the SCIMATH stakeholder-unanimous "money shot") on top of `InstantQuoteEngine`/`DFMPipelineEngine`.

**Test/validation matrix:** customers (JM 468-customer set) × processes (mill/lathe/wedm/additive/casting/injection-mold/sheet-metal) × qty-breaks × lead-time tiers × {known-actual back-tested orders for MAPE} × margin-floor edge cases (at/below floor → gate fires). Assert: never blends data sources of different grain (units-safe), advisory-vs-quote distinction held, FMV→quote only when margin-floor passes, P10/P50/P90 band emitted.

**Dormant builds / existing engines to leverage:** `InstantQuoteEngine`, `BlueprintToQuoteBridgeEngine` (print-to-quote entry — CONSUMES cad features, never re-parses prints), `JobCostingEngine`, `QuoteAnalyticsEngine`, `OutboundPriceIndexEngine`, `fair_market_value`/`inflation_adjust`, `QuoteToOrderBridgeEngine`, `QuotingTrainingLoopEngine` (47,905-record baseline), `LatheAutoQuoteFromPrintEngine`/`LatheActualCostReconciliationEngine`, `DrawingToQuoteMathPipeline`+`MonteCarloCostPDFEngine` (archaeology).

**Synergy edges:** CONSUMES delta `feature_recognize`+DFM (strongest live edge — start quotes from cad features), CONSUMES oscar MRR→cycle_min for cost basis, CONSUMES hotel `ERPCostFeedbackEngine` actuals (the only true outbound-revenue ground truth), FEEDS hotel via `QuoteToOrderBridgeEngine`, PUBLISHES outcomes→india.

**Acceptance criteria:** QuoteToShip reachability 0.51→1.0; MAPE measurably below 71.1% on real back-tested orders (not synth); customer quote UI live with margin-floor gate; 5-of-5 data sources consumed; 2 unbuilt units shipped. SVI lift: closes Tier-2 #8 (charlie's gap also unblocks india's quoting calibration corpus).

### WORK ORDER → hotel (business / ERP)
**Objective:** A production-usable autonomous back-office: accepted quote → costed/scheduled/shipped/invoiced job with per-category cost truth, ready for JM Die to use at work.

**Concrete deliverables:**
- **Unblock PostgreSQL persistence** (archaeology #1) — `pg` is dead-code → DB layer silently falls back to in-memory; all auth/rate-limit/business data lost on restart. This is a fail-loud violation and AS9100 audit-trail blocker; durable state is the precondition for production use. Replace `String.includes` over business records with pgvector where it gates correctness.
- Wire the **orphan `HotelERPTribalKnowledgeEngine`** (0 dispatcher refs, 17 stranded tribal categories) into `prism_business`.
- Extract the **6 inline financial/HR constants families** (payroll-tax-tables, pto-policies, benefits-plans, customer-terms, vendor-profile, chart-of-accounts) into `src/data/*` — violates the no-inline-tax-tables HARD RULE.
- Surface the **Lean/Six-Sigma dashboards** over already-built engines (OEE/SPC control charts/Kaizen/VSM/Kanban/5-Whys/Fishbone/A3) — low-effort/high-visibility: `OEECalculator`, `SPCProcessCapability`, `NelsonSPCRules`, `LeanSixSigma` exist, only frontends + a downtime fact-table schema are missing.
- Close the QuoteToShip cost-feedback loop (`ERPCostFeedbackEngine` per-category variance) back into charlie + the domain adaptive engines.
- Finish the JM-DOC gate (7 financial tuples still pending at 61.44%) and the queued q2s frontend verbs (`rfq_assign`/`rfq_update_status`, `kaizen_list`/`update_status`, `oee_losses`/`oee_trend`, `credit_review_all`).
- Add a PII/consent gate on customer-export paths (`customer-consents.json` exists, enforcement thin).

**Test/validation matrix:** the 21-stage `quote_to_ship_run` orchestrator end-to-end × {7 ERP vendors: JobBOSS/Epicor/ProShop/Global Shop/SAP/Oracle/Generic round-trip} × {GL debits=credits invariant on every posting} × {credit-check + AR-aging gate at/over limit} × {per-category variance: material/labor/machine-hr/overhead/freight} × {financial_guard invariant: count(consumed AND financial_guard)===0 — never create AR/AP/GL from indexed-only DocuStrata pointers}. Assert: no fabricated DSO/AR (NEEDS-DATA honesty), restart-durability (Postgres), no inline tax table.

**Dormant builds / existing engines to leverage:** `quote_to_ship_run` orchestrator (21 stages), `GeneralLedgerEngine` (debits=credits gate), `AccountingHardeningEngine`, `ERPCostFeedbackEngine`, `ERPWorkOrderEngine`, `JobProfitabilityWaterfallEngine`, `EmployeeMachineDomainAcademyEngine`, `CustomerPortalEngine`, `BillingEngine` (Stripe), `DocumentInboxEngine` (4 seed-bridges), `PartsLibraryEngine`, `ShopStateEngine` (archaeology ULTIMATE-SHOP-OS event spine), `InstantQuoteEngine`/`DFMPipelineEngine`/`FileStorage`/`PartsLibrary` (archaeology lucky-sauteeing-blum), Lean/Six-Sigma dashboard set (archaeology serene-meandering-prism).

**Synergy edges:** RECEIVES charlie accepted quotes (`ERPWorkOrderEngine`) / RETURNS actuals (`ERPCostFeedbackEngine`) — the revenue spine; INGESTS quality SPC/Cpk (`ERPQualityEngine`); CONSUMES shop-floor live status + mill/lathe/wedm tool-life for reorder; FEEDS academy role/machine training; PUBLISHES outcomes→india.

**Acceptance criteria:** Postgres durable (survives restart, AS9100 trail intact); orphan tribal engine wired (17 cats reachable); 6 constants families extracted; Lean/SixSigma dashboards live over real JM data; QuoteToShip 0.51-0.72 → 1.0; JM-DOC gate 100%; q2s verbs shipped. Operator can run a real quote→ship→invoice cycle on JM data. SVI lift: closes Tier-1 #6 + Tier-2 #8 ERP half (unblocks charlie's calibration ground truth).

### WORK ORDER → kilo (cam) — SFC/post support
**Objective:** Guarantee the toolpath half of the print-to-program spine feeds echo losslessly and surfaces SFC in-seat, so the PRIORITY-1 post matrix has real toolpaths to post across all 6 tiers.

**Concrete deliverables:** Prove `toolpath_generate`→NCI/APT/`ToolpathBlock` terminates losslessly into echo's post (strategy+tool-list+WCS carried block-by-block) for each post tier; wire EDM/Grinding/Laser strategy stages into `cam_strategy_recommend` (machine-domain keyed — lifts the weak 0.37-0.52 pipelines that echo's WEDM/special posts depend on); ship the `MS-CAM-MASTERY` Fusion add-in buttons (`U-CAMM-FUS-D1` Speed&Feed / `D2` Auto-program / `D3` Post — Revenue Day 1, shared pillar with oscar); `collision_check_full` clearance gate on every generated path feeding a post.
**Test/validation matrix:** per post tier (5ax/3ax/mill-turn/swiss/lathe/wedm) × seat (Fusion/hyperMILL/Mastercam) → assert lossless `ToolpathBlock`→echo round-trip + mandatory collision gate.
**Dormant builds / existing engines to leverage:** `CAMAGIMasterOrchestratorEngine`, `CAMKernelEngine`, `CAMCrossSystemTranslatorEngine` (`cam_cross_translate`), `ToolpathStrategyDB` (586), `CAMAddInFrameworkEngine`, `Fusion 360 3-tier add-in product` (archaeology — single largest unbuilt revenue surface), `F360-REV` reroute (AutoProgram S10→PostProcessorPipeline, per-block physics un-bypass).
**Synergy edges:** CONSUMES delta features + oscar F/S; PRODUCES toolpaths→echo; FEEDS india strategy embeddings.
**Acceptance criteria:** lossless toolpath→post for all 6 tiers; weak CAM pipelines (EDM/Laser/Grinding) wired into strategy recommender; Fusion D1/D2/D3 buttons live. SVI lift: Tier-2 #11 + Tier-3 #12.

### WORK ORDER → foxtrot (mill) — 3-axis + 5-axis post-matrix support
**Objective:** Supply proven mill + multi-axis cut physics and machine coverage for the 5-axis-first and 3-axis post tiers on the JM 5-VMC Haas/Hurco fleet.
**Concrete deliverables:** register the VMC-05 Roku-Roku post (the missing 5th VMC); ship `hypermill/CLAUDE.md` sub-galaxy sentinel + wire the 3 unwired `Hyper*` engines; close the last 1 unwired mill engine + the `PRISM_UPGRADED/` mill output stage so PrintToProgram is end-to-end reachable; iter2 P2P-replication real corpus loader (`HMCProjectParser` over JM `.hmc/.nc`) + 4-axis fixture. Feed `SurfaceFinishPredictionEngine` Cpk into the post's surface-finish validation.
**Test/validation matrix:** 5-VMC fleet × {3-axis canned cycles, 5-axis RTCP/singularity} → assert every VMC has a registered, byte-matched post.
**Dormant builds / existing engines to leverage:** `MillingPrintToProgramEngine`, `AdvancedMillingStrategiesEngine`, `MillKinematicsCollisionEngine` (`detectSingularity`), `HurcoV11MillMasterPostEngine`, `Real-geometry toolpath gen + cutter-comp MILL-MS4` (archaeology — verify cutter-comp/multi-setup built), `5 ONNX/GNN mill neural engines` (archaeology — embed 24,545 JM programs), `MultiAxisPrintToProgramEngine` rebuild (archaeology FIVE-AXIS stub).
**Synergy edges:** queries oscar `cam_speedfeed_compute`; consumes kilo strategy; terminates in echo `HurcoV11MillMasterPost`.
**Acceptance criteria:** all 5 VMCs post-covered (incl Roku-Roku); HyperMILL sentinel + 3 engines wired; mill PrintToProgram 0.90→end-to-end. SVI lift: Tier-2 #10.

### WORK ORDER → whiskey (lathe) — Swiss + standard-lathe post-matrix support
**Objective:** Supply crash-safe, controller-ready lathe cut physics for the Swiss-first → standard-lathe post tiers on JM's 100%-Okuma-OSP fleet.
**Concrete deliverables:** close the iter-3 accuracy gap (material inference from `.MIN` + JM-shop SFM/feed calibration — textbook ISO-P runs 2-4× JM's conservative practice, the root of the 41.6% accuracy floor); connect the Turning 4th (strategies) registry (0.74→0.92); merge the unmerged `H:/prism-slot-whiskey` 6-file galaxy brain; fix `LATHE-MASTER` envelope drift; lathe Master Post productization parity with mill/SFC for the post-proof. Supply Swiss + mill-turn cut physics for echo's tiers 3-4.
**Test/validation matrix:** {Swiss guide-bushing/LFV/pickoff, standard OD/ID/thread/groove/part-off, hard-turn} × Okuma OSP fleet → assert pre-emit safety gates (`lathe_safety_predicate_evaluate`, `lathe_partoff_safety_gate`, G50/CSS cap) pass + post byte-class clean.
**Dormant builds / existing engines to leverage:** `LatheAutoQuoteFromPrintEngine`, `turningProgramDispatcher` (ISO 286/2768 taxonomy), `LatheAI*` stack (Orchestration/Reasoning/ActiveLearning/Bayesian), `JM Die program upgrader v2`, 14-vendor insert/holder catalogs, `Multi-channel + sub-spindle mill-turn pipeline MT-MS4/MS7` (archaeology — for live-tooling tier).
**Synergy edges:** mill-turn handoff via `Fusion360MillTurnBridgeEngine`; consumes oscar CSS/IPR; terminates in Okuma OSP post (shared `JM DIE/POST PROCESSORS` corpus with echo); `LatheActualFeedback`→hotel.
**Acceptance criteria:** Turning reachability 0.74→0.92; Swiss + standard posts byte-clean through all safety gates; galaxy brain merged; envelope drift fixed. SVI lift: Tier-2 #9.

### WORK ORDER → mike (wedm) — wire-EDM post-matrix support (bottom tier)
**Objective:** Supply real discharge-physics + the wire-EDM dialect cut data for echo's wire-EDM post tier, and unblock the WEDM training loop.
**Concrete deliverables:** wire the wire/electrode + dielectric registries into the EDM 8-stage pipeline (reachability 0.38, worst in fleet → 0.72 — only materials+machines connected today); fix the **0-byte `WEDMLoRADatasetBuilderEngine.ts`** (blocks `wedm_lora`); confirm/extract canonical `edm-constants.ts`/`edm-wires.ts`/`edm-dielectrics.ts`; WEDM-P2P-ACCURACY TASK #3 (real G-code emit vs held-out JM corpus outside ITW/NOZE/FIOCCHI to expose the `patterns.ts` R7 E952/E56xx gap; current "100%" is a regression-lock, not measured accuracy); unify the 3 divergent E-code selectors. Per the U-WTW-AUDIT, the WEDM-TRAINING-WIZARD build-out may hand to charlie (canonical wire slot).
**Test/validation matrix:** {rough/skim/taper/no-core} × {E952/E56xx ACU 7-pass families, calibrated material set} × held-out JM corpus → assert real emit + structural-skeleton match + fail-loud on uncalibrated compound materials.
**Dormant builds / existing engines to leverage:** `EDMPostProcessGCodeEngine` (126K), `MitsubishiMV1200RWireEDMMasterPostEngine`, `EDMMultiPassStrategyEngine`, `EDMCuttingParamFlushEngine` (71K), the self-improving cluster (`WEDMNeuralTrainingEngine`/`WEDMLoRA*`/`WEDMContinuousLearningEngine`), `6 WEDM safety-guard engines + WEDM-P2P production pipeline` (archaeology — current-density/pulse-limit/kerf/wire-deflection guards), `WEDM sensor-fusion + digital-twin` (archaeology).
**Synergy edges:** `EDMPostProcessGCodeEngine`↔echo dialect parity (the 5 WEDM dialects are the joint unblock); `cam_strategy_recommend` wedm-keyed←kilo; discharge params←oscar SFC baselines; PUBLISHES→india.
**Acceptance criteria:** EDM pipeline 0.38→0.72; 0-byte builder fixed; 5 dialects feed echo; held-out accuracy measured (not regression-locked). SVI lift: Tier-2 #7 (also unblocks kilo EDM + echo wire-post).

### WORK ORDER → romeo (wiring) — SFC/post data substrate
**Objective:** Populate the cited tool/material/machine catalogs that the SFC matrix and post-proof consume, and wire the 110 unwired engines so no SFC/post capability sits dark.
**Concrete deliverables:** execute the BLACKWELL-DB-GEN-MS0 concurrent vision-OCR catalog extraction (`estimateExtractionPlan()`); fill the remaining empty tool/material catalogs (Sandvik/Helical/Sumitomo/ISCAR/Kennametal/Korloy/Guhring/OSG already filled — continue); wire the 110 unwired engines in ≤5/commit batches (Other:21, Speed:6, Monolith:5 lead — note the 6 unwired `Speed*` engines directly serve oscar); purge ghost Zod actions; export PRISM tools → CIMCO `.tmlib` / Fusion `.machine` / hyperMILL `.hmt` for the JM fleet.
**Test/validation matrix:** per ISO group (P/M/K/N/S/H) × tool class × vendor → assert cited cutting data present (R9, no fabrication) + round-trip export verified.
**Dormant builds / existing engines to leverage:** `AutoWiringEngine`, `EngineUtilizationAuditEngine`, `audit-unwired-engines.mjs`, `cimco_toollib_export`, `Tool DB → 45K + Tool Explorer` (archaeology — index-before-expand), `MachinePackageGeneratorEngine + 12 machine-safety hooks` (archaeology MCAT-MS0 — machine data 0.5% complete).
**Synergy edges:** feeds oscar (cited S/F data) + echo (machine/controller defs) + charlie (cost-index) + kilo (Fusion tool libs); consumes juliett's ISO-513 material axis; hands wired batches→uniform verify.
**Acceptance criteria:** 110 unwired → wired (Engines 88%→100%); empty catalogs filled with cited data; CIMCO/Fusion/hyperMILL exports verified. SVI lift: Tier-1 #4 (single largest reachable-units lever fleet-wide).

---

## JM-Die catch-up plan

Fill the PRISM app with present-day JM Die using the **3 critical resource roots** (canonical registry `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`; pathway = root + its own index, **never re-OCR Docustrata** — search `manifest.json` + `.index/`).

| Resource root | What's there | Owning slot(s) | Population engine / method | Doctrine |
|---|---|---|---|---|
| **H:/PRISM/JM DIE** | 24,545-file archive, 100+ customers (ITW/Alcoa/Optimas/SFS/Holo-Krome), 554,999 part-files, real programs (Haas/Hurco/Okuma/.hmc/.MIN), POST PROCESSORS corpus | hotel (docs/ERP), delta (CAD reverse), xray (blueprint OCR), foxtrot/whiskey/mike (programs as ground-truth labels) | `DocumentInboxEngine.seedFromJMCorpus` (109,558 docs) + `seedViewerArchive` (85,345 scans) + `PartsLibraryEngine.seedFromJMCorpus` (30,890 rows/468 customers); xray `extract-jm-die-corpus-page-by-page.py` (8,154→36,638 prints) | search-never-re-OCR; financial docs = link-only pointers (`financial_guard`, no AR/AP/GL records) |
| **H:/PRISM/Docustrata** | 257,992 indexed files; DocuStrata QuickBooks export (174 vendors, 20,550 bill-lines, 2014-2026, $4.9M AP); curated invoices | hotel (financial pointers), charlie (pricing priors), xray (search-only) | `DocumentInboxEngine.seedManifestPointers` (104,587, never re-OCR) + `seedFinancialPointers` (34,452 link-only); charlie `DocuStrataMaterialPriorEngine` | INBOUND-only; never create discrete financial records from pointers; search `manifest.json`+`.index/` |
| **H:/PRISM/resources** | 1,008+ PDF resources index, vendor catalogs (tooling/machine/toolholder/workholding), MIT-OCW, CAM corpora | lima (academy/MIT), romeo (catalog DB-gen), oscar (S/F extraction), foxtrot (mill PDF corpus) | lima pypdf page-extractor (8,752 pages — fleet-canonical, 76× deeper than pdf-parse); `CAD-CAM-RESOURCES-INDEX` (1,008-PDF index+query+wiki); romeo catalog OCR | use lima's pypdf; cite every extracted tip (R9) |

**Sequence:** (1) hotel completes JM-DOC gate to 100% (7 financial tuples) so the business layer is queryable on real data. (2) xray runs the overnight GPU-OCR batch (12,321 blueprints need OCR) + delta reverse-engineers the 20,006-file CAD ground-truth corpus → feeds CAD/quoting/program ground truth. (3) romeo fills cited catalogs from `resources` → SFC/quoting/CAM consume. (4) lima harvests MIT-OCW + builds courses from the corpus → academy makes the populated app teachable. **Per `CAD_COVERAGE_MATRIX` JM corpus is 33% covered today — the catch-up target is driving that high.** Population is read-mostly and can run in parallel with PRIORITY 1-3; its compounding value lands once SFC/quoting/ERP surfaces exist to consume it.

---

## Hermes routing table

The table Hermes (bravo) consumes to write per-slot briefs (`prism_context:slot_brief_write` → `slot-brief-inject.mjs`). Priority = operator's order; effort is rough order-of-magnitude.

| slot | work order | priority | est. effort |
|------|-----------|----------|-------------|
| oscar | SFC combinatorial calculator validation + `MS-SFC-CALIBRATE` (24u) + calib-apply wire | **P1** | XL (matrix harness + 24-unit calibration milestone) |
| echo | Post-proof matrix 5ax→swiss + convert 14 dark engines + 4 P0 machine gaps + 5 WEDM dialects | **P1** | XL (post matrix + dark-engine unblock; MS-MASTERPOST legal-gated) |
| kilo | Lossless toolpath→post for 6 tiers + weak-pipeline strategy wire + Fusion D1/D2/D3 buttons | **P1 (support)** | L |
| foxtrot | VMC-05 Roku-Roku post + HyperMILL sentinel/3 engines + mill PrintToProgram end-to-end | **P1 (support)** | M-L |
| whiskey | Swiss+lathe post support + Turning strategies registry (0.74→0.92) + brain merge + envelope fix | **P1 (support)** | M-L |
| mike | WEDM registries into pipeline (0.38→0.72) + 0-byte builder fix + held-out accuracy + 5 dialects | **P1 (support)** | M-L |
| romeo | Cited catalog DB-gen + wire 110 unwired (Speed:6 → oscar) + CIMCO/Fusion/hyperMILL export | **P1 (substrate)** | L (continuous) |
| charlie | Customer quote UI + margin-floor gate + 3 data sources + QuoteToShip strategies (0.51→1.0) + P10/P50/P90 | **P2** | L |
| hotel | Postgres unblock + orphan tribal wire + 6 constants extract + Lean/SixSigma dashboards + q2s verbs + JM-DOC 100% | **P3** | XL (Postgres is the precondition) |
| delta | JM CAD reverse-corpus (20,006 files) + coverage 33%→high + merge 2 CAD UIs | **P4 (corpus)** | L |
| xray | Overnight GPU-OCR batch (12,321 blueprints) + cross-source dim reconcile real candidates | **P4 (corpus)** | M-L |
| lima | MIT-OCW harvest + courses-from-corpus + academy SVI subsystem | **P4 (corpus)** | M |
| sierra | (foundation) merge-OOM streaming fix — gates india eval + every slot's search | **F0** | M |
| india | (foundation) seed ref-pool + heterophily aggregator + deploy-gate reeval — gates "proven" half of all domains | **F0** | M |
| golf | (foundation) guarded MCP :3100 auto-restart + fleet-health dashboard | **F0** | M |
| bravo | route this plan → per-slot briefs; own auto-fanout governance | **orchestrator** | S (routing) |

---

5-LINE SUMMARY:
Path: H:/prism/state/shared/specs/PRIORITY-BUILD-PLAN-2026-06-03.md
SFC test-matrix axes: 9 combinatorial axes (materials × machines × tools × holders × operations × toolpath-type × surface-finish × tolerance × coolant/coating) over ~6,509 materials / JM machine fleet / 41,209 tools — each cell asserts physics-valid-or-honest-limited + chatter + units guards.
5-axis-first post test tiers (operator-locked, top→bottom): (1) 5-AXIS [TOP] → (2) 3-axis mill → (3) mill-turn/live-tooling → (4) Swiss-lathe [TOP OF LATHE] → (5) standard lathe → (6) wire-EDM.
Slots receiving work orders: oscar+echo (P1 core), kilo/foxtrot/whiskey/mike/romeo (P1 support+substrate), charlie (P2), hotel (P3), delta/xray/lima (P4 JM-Die catch-up), plus sierra/india/golf (F0 foundations) and bravo (routing).
Routing: Hermes (bravo) turns the routing table into per-slot briefs via prism_context:slot_brief_write → slot-brief-inject.mjs.
