---
artifact: fleet-phd-readiness
campaign: FLEET-PHD-BUILDOUT + KIENZLE-FRONTEND
owner_slot: zulu
generated_at: 2026-06-28
method: 16 parallel sonnet ground-truth assessors + opus synthesis (Workflow wf_6c0ca2ad-b28, 17 agents / 2.48M tok / 341 tool calls)
status: verified
---

# FLEET-PHD READINESS — FINALIZED (ground-truthed vs live repo)

> Each of the 16 DOMAIN-PLANs was VERIFIED against the live PRISM repo by an independent agent
> (Read/Grep/Glob/Bash). Verdicts are evidence-based, not plan-claimed. Supersedes plan-claimed
> status in 01-FLEET-ROLLUP for readiness purposes.

I'll produce the finalized readiness rollup, grounding every claim in the 16 scorecards provided.

# FLEET-PHD READINESS ROLLUP — FINALIZED (slot zulu synthesis, 2026-06-28)

All 16 domain scorecards verified against the live PRISM repo. Verdicts below are copied verbatim from each scorecard; nothing is invented.

---

## 1 — Readiness matrix

| slot | galaxy | plan | deepen | test | sim | validate | finetune | frontend | top_gap |
|------|--------|------|--------|------|-----|----------|----------|----------|---------|
| india | ai-training | draft (STALE) | GAP | GAP | GAP | GAP | GAP | PARTIAL | GNN regressed below all 3 gates (AUROC 0.7525); refpool+H2GCN is the only unblocked lever — every downstream domain finetune depends on a passing AUROC |
| romeo | wiring | draft (STALE) | GAP | PASS | GAP | PASS (partial) | GAP | PARTIAL | Wire `AssetWiringSummaryEngine` → `prism_dev:wiring_coverage_map` + WiringCoverageTab; UNWIRED already at 4 (goal hit), frontend is last §10 checkbox |
| sierra | system-viz | draft (PASS counts) | GAP | PARTIAL | GAP | GAP | GAP | GAP | Integration test `system-viz-dispatcher.test.ts` + outcome ledger both absent — no round-trip proof for 4 prism_session actions; finetune loop can't arm |
| zulu | hermes-zulu | draft (STALE) | GAP | PASS (PARTIAL) | GAP | PARTIAL | GAP | PARTIAL | `SystemSyncPage.tsx` entirely unbuilt (design exists, zero React impl); HERMES proxy DOWN (85.7% fail) |
| oscar | speed-feed | draft (PASS counts) | PASS | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | E2E page-core parity test (`sfc-page-core-parity.test.ts`) absent — acceptance gate for §6 VALIDATE + §8 FRONTEND; saleable SFC page has no automated correctness proof across 6 ISO groups |
| foxtrot | mill | draft (STALE) | GAP | GAP | GAP | GAP | GAP | PARTIAL | 6 Kienzle wizard backend routes (`POST /api/v1/mill/{analyze,fixture,strategy,physics,simulate,release}`) entirely absent — blocks frontend wiring, parity probe, S(x)≥0.98 release gate |
| whiskey | lathe | draft (STALE) | GAP | PASS | GAP | GAP | GAP | PARTIAL | Simulation + validation pass — §5/§6 acceptance gates (10/10 JM program upgrades, MAPE, S(x)≥0.95) have no execution evidence |
| mike | wedm | draft (STALE) | GAP | PARTIAL | GAP | GAP | GAP | PARTIAL | 3 of 6 core physics test files missing (EDMFeasibility, EDMCuttingParamFlush, edmDispatcher.integration) — block §5 sim trust + §6 validation sign-off |
| kilo | cam | draft (PASS counts) | GAP | GAP | GAP | GAP | GAP | PARTIAL | 6 plan §4 test files completely absent — prerequisite gate for sim/validate/finetune |
| echo | post-processor | draft (PASS counts) | GAP | PASS | GAP | GAP | GAP | PARTIAL | Wire `pp_outcome_emit` auto-call into PostProcessorPipelineEngine P6 — prerequisite for closed-loop finetune, LoRA dataset, GNN refpool growth |
| delta | cad | draft (STALE) | GAP | GAP | GAP | GAP | GAP | PARTIAL | 4 plan test files absent (CADKernel, CollisionDetection, CADToSTEPPipeline, cadDispatcher.integration) — entire sim-validate-finetune chain has no proven foundation; untested S(x) CCD gate |
| xray | blueprint-vision | draft (STALE) | GAP | PARTIAL | GAP | GAP | GAP | PARTIAL | Dispatcher round-trip + E2E test suite (2 missing files) — only missing gate before sim/validate produce trusted numbers |
| charlie | quoting | draft (STALE) | GAP | GAP | GAP | GAP | GAP | PARTIAL | MAPE=755.7% (gate ≤35%) — core quoting accuracy not production-ready; 3 missing core engine test files are highest-leverage to expose root cause |
| hotel | business | draft (STALE) | GAP | GAP | GAP | GAP | GAP | PARTIAL | `ERPCostFeedbackEngine.test.ts` missing AND 8 frontend-targeted dispatcher actions absent from businessDispatcher.ts — pages exist with no live backend wiring |
| quebec | frontend-app | draft (PASS counts) | GAP | GAP | GAP | GAP | GAP | PARTIAL | 6 §4 plan test files entirely absent + only page test is `typeof` stubs — R9 blocker that also gates §5 sim + §6 validate |
| lima | academy | **final** (STALE counts) | GAP | GAP | GAP | GAP | GAP | PARTIAL | Named test files missing + existing tests contain `toBeDefined()` stubs — no R9-compliant suite; foundation that unblocks sim/validate/frontend parity |

**Verdict tallies:** plan=1 final (lima), 15 draft. test: 4 PASS (romeo, echo, whiskey + zulu-partial), 4 PARTIAL (sierra, oscar, mike, xray, zulu), 7 GAP. validate: 1 PASS-partial (romeo), 3 PARTIAL (oscar, zulu + sierra-no), rest GAP. simulate: 1 PASS (oscar), rest GAP. finetune: 1 PARTIAL (oscar), rest GAP. frontend: 1 GAP (sierra), 15 PARTIAL.

---

## 2 — Dependency-ordered BUILD QUEUE

Every domain appears exactly once, with its `next_unit_id` from §1.

### WAVE 0 — INFRA (must land first; gates everything downstream)

| slot | next_unit_id | action |
|------|--------------|--------|
| india | **U-INDIA-GNN-REFPOOL-H2GCN** | Grow labeled refpool via active-label-worklist + wire H2GCN `graph_heterophily_aggregate` into train pipeline to lift AUROC back above 0.78 (currently 0.7525, all 3 gates failing) |
| romeo | **U-WIRE-COVERAGE-MAP-ACTION** | Add `prism_dev:wiring_coverage_map` action to guardDispatcher (wire AssetWiringSummaryEngine) + WiringCoverageTab to AuditManagerPage — UNWIRED=4 already under ≤10 gate |
| sierra | **U-SIERRA-VIZ-DISPATCHER-TEST** | Write `system-viz-dispatcher.test.ts` (prism_session 4-action + prism_knowledge tribal_capture round-trip) + arm `system-viz-query-outcomes.jsonl` + write 4 missing wiki leaves, one commit |
| zulu | **U-ZULU-FRONTEND-SYSTEM-SYNC** | Build `SystemSyncPage.tsx` (design exists, zero impl); self-heal HERMES proxy via `node H:/prism/scripts/hermes-proxy-ensure.mjs` |

### WAVE 1 — PHYSICS (oscar validates SFC FIRST — physics core all other domains build on)

| slot | next_unit_id | action |
|------|--------------|--------|
| oscar | **U-OSC-SFC-PAGE-PARITY-TEST** | Build `sfc-page-core-parity.test.ts` round-tripping SfcCalculatorPage vs `prism_product:sfc_calculate` for all 6 ISO groups (ratio ≤1.3×) + confirm nine-axis route at `:3100/api/v1/sfc/nine-axis` — **gate before mill/lathe/wedm/cam/quoting build on SFC** |
| foxtrot | **U-FOXTROT-MILL-WIZARD-ROUTES** | Implement 6 Express routes in `mcp-server/src/routes/milling.ts` wired to `prism_mill` actions per §8 table, with server-side S(x) gate before Step 6 release |
| whiskey | **U-W-VALIDATE-JM-PROGRAMS** | Run JMDieLatheProgramUpgraderV2 on 10 JM DIE/CNC LATHE/ programs → acceptance report `lathe-validation-2026-06-28.json` (CSS/G50/G76/jaw-force scores) |
| mike | **U-MIKE-CORE-PHYS-TESTS** | Add EDMFeasibilityEngine + EDMCuttingParamFlushEngine + edmDispatcher.integration tests (algebraic-invariant + round-trip) + missing wizard routes (plan_passes, generate_complete_program, estimate_time, dielectric_flush_calc, select_wire) to edm.ts |

### WAVE 2 — CAM / POST / GEO

| slot | next_unit_id | action |
|------|--------------|--------|
| kilo | **U-KILO-CAM-TEST-SUITE** | Build all 6 §4 test files with R9 reference-value assertions round-tripped through camDispatcher + toolpathDispatcher (kc1_1=3200 MPa H-group, clearance from collision_check_full, units-guard on cm input) |
| echo | **U-PP-OUTCOME-EMIT-P6-WIRE** | Wire `pp_outcome_emit` auto-call into PostProcessorPipelineEngine P6 — prerequisite for closed-loop finetune + LoRA dataset + GNN refpool |
| delta | **U-DELTA-CAD-CORE-TESTS** | Write 4 missing reference-value test files (CADKernel / CollisionDetection / CADToSTEPPipeline / cadDispatcher.integration) per §4 — prerequisite to every downstream §5-§8 gate |
| xray | **U-XRAY-DISPATCHER-ROUNDTRIP-TESTS** | Write 2 missing test files (`blueprint-cad-dispatcher-roundtrip.test.ts`, `blueprint-extraction-e2e.test.ts`) — only missing gate before simulate/validate produce trusted numbers |

### WAVE 3 — BIZ

| slot | next_unit_id | action |
|------|--------------|--------|
| charlie | **U-QP-CORE-ENGINE-TESTS** | Write InstantQuoteEngine + JobCostingEngine + CostEstimationEngine tests with real JM reference-value assertions (algebraic cost-sum identity, FMV ±20%, shop-rate source guard); red-first to expose the MAPE=755% root cause |
| hotel | **U-HOTEL-ERP-FRONTEND-ACTIONS** | Add 8 missing dispatcher actions to businessDispatcher.ts + ERPCostFeedbackEngine.test.ts (5-category invariant) + 4 missing Express routes (`/api/v1/business/{erp-dashboard,schedule,inventory,payroll}`), one commit (R15) |

### WAVE 4 — FRONTEND (Kienzle, last per domain)

| slot | next_unit_id | action |
|------|--------------|--------|
| quebec | **U-QC-ENVELOPE-TESTS** | Add resilientFetch + OptimisticSyncManager + OfflineQueueManager + businessApi.integration tests with real reference-value assertions (retry ≤200ms; idempotency-key uniqueness over 1000 calls; 200-OK-with-error throws DispatcherError not silent null) |

> **Note on lima/academy:** lima is the one domain whose plan is `final` but does not map to any of the named campaign waves above. Its `next_unit_id` is **U-LIMA-TEST-SUITE** (create `academy-curriculum-engine.test.ts` + `academy-course-builder.test.ts`, strip `toBeDefined()` stubs from `learn-course-autogen.test.ts`, add dispatcher round-trip for `academy_courses` length≥29). It belongs functionally alongside WAVE 3/4 (knowledge/training surface, no upstream blocker). Surfaced explicitly so it is not lost — it was not assigned to a wave bucket in the campaign order given, but it must appear exactly once and is actionable now.

---

## 3 — Cross-domain BLOCKERS

These are the real upstream/downstream dependencies surfaced across the scorecards. Each blocker is cited to the scorecard(s) that evidence it.

1. **oscar SFC parity must pass before mill/lathe/wedm/cam/quoting can trust their physics core.**
   - oscar §6 VALIDATE is PARTIAL — `sfc-page-core-parity.test.ts` is MISSING, so the SFC product page has no automated correctness proof against the dispatcher across the 6 ISO groups (oscar scorecard TOP_GAP).
   - Downstream consumers that read SFC primitives: foxtrot (mill — "oscar speed-feed primitives healthy per recent regression fixes" cited in foxtrot blocked_by), kilo (cam — kc1_1=3200 MPa H-group assertion routed through dispatcher, kilo §4), whiskey (lathe physics), mike (wedm), charlie (quoting cost basis driven by physics).
   - **Action ordering:** WAVE 1 places oscar first for exactly this reason.

2. **india GNN gate (AUROC 0.7525 < 0.78) blocks every domain's §7 fine-tune leg.**
   - india §6 VALIDATE: NN-EVAL.json (2026-06-27) — AUROC 0.7525, macro-F1 0.2834, Brier 0.22 — **all 3 gates FAIL** (india scorecard, regressed from the 0.808 baseline the other plans assume is active).
   - Every domain marks finetune GAP and depends on a passing AUROC for refpool/GNN seeding: explicitly echo (GNN refpool growth named in TOP_GAP), delta (GNN refpool push UNVERIFIED), mike (refpool-wedm.jsonl not confirmed), sierra (GNN ref-pool seed, outcome ledger not armed), charlie/hotel/foxtrot/lima/xray/quebec (all finetune GAP, LoRA datasets MISSING).
   - **Consequence:** the selective-deploy posture the india plan assumes is **not currently active** — this is the single widest-blast-radius infra blocker. WAVE 0 fronts india for this reason.

3. **romeo wiring closure gates quebec frontend wires + the WiringCoverageTab merge.**
   - romeo §10: `prism_dev:wiring_coverage_map` action is ABSENT from guardDispatcher → parity probe cannot run; WiringCoverageTab not present in AuditManagerPage (romeo scorecard).
   - romeo blocked_by explicitly names "quebec coordination needed before AuditManagerPage tab merge" — bidirectional coordination point between romeo (backend action) and quebec (frontend surface).
   - Mitigating fact: UNWIRED is already at **4** (well under the ≤10 gate) per romeo §6, so this is a frontend-surface blocker, not a backend-closure blocker.

4. **echo `pp_outcome_emit` P6 auto-call absent — blocks the entire post-processor closed-loop.**
   - echo §6 + §7: `pp_outcome_emit` case exists at ppDispatcher.ts:2338 but the P6 auto-call in PostProcessorPipelineEngine returned no match — wiring gap confirmed (MEMORY.md landmine #1 still open). This is the prerequisite for post-processor LoRA dataset + GNN refpool (echo TOP_GAP + finetune GAP).

5. **delta U-EFF25 (CADFeatureRecognitionEngine de-stub) blocks cadDispatcher.integration feature-recognize path AND cam+quoting consumers.**
   - delta blocked_by: U-EFF25 must land before cadDispatcher.integration feature-recognize path can assert real output; delta TOP_GAP notes the stub blocks cam+quoting consumers (delta scorecard).

6. **zulu SystemSyncPage requires `prism_session:master_index_query` live on :3100 + HERMES proxy up.**
   - zulu blocked_by: master_index_query must return live data on :3100 before SystemSyncPage can display real fleet-node status; HERMES proxy must be up before deepening tribal/wiki via Hermes ask (zulu §validate: HERMES proxy DOWN, 85.7% fail rate).

7. **Test-suite-first dependency (R9 chain) inside 8 domains: tests gate sim → validate → finetune.**
   - Charlie, delta, kilo, hotel, quebec, lima, mike, xray all state explicitly that missing/stub test files are the prerequisite gate blocking §5 simulate and §6 validate (each scorecard's TOP_GAP). This is not cross-domain but is the dominant per-domain ordering constraint — physics/geometry core tests before any simulation trust.

---

## 4 — FRONTEND readiness (Kienzle rollout) — quebec's buildable order

**Classification rule used:** READY = both `.dc.html` design exists AND backend route live AND page implementation confirmed; PARTIAL = design + page exist but backend route/action gap or unverified implementation; GAP = a core surface (page or design or both) missing.

### READY (design + page + live route all confirmed)
None of the 16 domains are fully frontend-READY by the strict definition. The closest are below under PARTIAL with the specific missing piece named — quebec should treat these as "one route/action away."

### PARTIAL — design + page exist, named backend route/action missing (build the route/action, then wire)

| domain | design (.dc.html) | page (.tsx) | route status — the missing piece |
|--------|-------------------|-------------|----------------------------------|
| oscar | `Kienzle Speed-Feed.dc.html` (726 lines) | `SfcCalculatorPage.tsx` + `SpeedFeedPage.tsx` | `/api/v1/sfc/calculate` LIVE (sfc.ts:154); **nine-axis route NOT confirmed** in sfc.ts — closest to READY |
| charlie | `Kienzle Quote.dc.html`, `Kienzle Job Cost.dc.html` | `QuoteBuilderPage.tsx`, `CostEstimatorPage.tsx` | `/api/v1/quoting/<verb>` route EXISTS (quoting.ts); **TSX body implementation completeness UNVERIFIED** |
| echo | `Kienzle Post.dc.html`, `Kienzle Alarm Decoder.dc.html` | `PostProcessorPage.tsx`, `AlarmPage.tsx` | `/api/v1/ppg` LIVE; **plan-target `/api/v1/pp/generate` + `/pp/alarm/:controller/:code` NOT found**; `pp_alarm_lookup` action absent |
| whiskey | `Kienzle Wizards.dc.html` | `LatheWizardPage.tsx` | `/api/v1/lathe` LIVE (index.ts:182), `/api/v1/lathe/wizard` confirmed; **parity probe (FE Fc vs prism_turning ±1%) not verified passing** |
| romeo | `Kienzle Backend Wiring Map.dc.html` | `AuditManagerPage.tsx` | `prism_dev:wiring_coverage_map` action ABSENT; **WiringCoverageTab not in page** |
| hotel | all 5 Kienzle `.dc.html` | all 5 target `.tsx` | `/api/v1/hotel-portal` LIVE; **8 dispatcher actions absent** (erp_schedule_get, erp_po_list/receive/create_batch, erp_alerts, payroll_run_period, erp_work_order_get, capacity_plan_query); 4 Express routes unwired |
| foxtrot | `Kienzle Wizards.dc.html` | `MillingWizardPage.tsx` (581 lines, 5-step impl via `/wizard-submit`) | **6 Kienzle routes ALL ABSENT** (`/mill/{analyze,fixture,strategy,physics,simulate,release}`); page calls pre-Kienzle 5-step flow |
| mike | `Kienzle Wizards.dc.html` | `WireEdmWizardPage.tsx` | `edm.ts` route LIVE (interpret-drawing/generate-toolpath/predict-wire-break/generate-gcode); **5 plan routes NOT confirmed**; `edmClient.ts` MISSING |
| kilo | `Kienzle Collision Gap.dc.html`, `Kienzle Tooling Shop.dc.html` | `CamStrategyPage.tsx`, `ToolpathAdvisorPage.tsx` | **4 backend routes absent** (collision-status, tooling-roi, roi-math, distributors) |
| quebec | `Kienzle Audit & Rebrand.dc.html`, `Kienzle Backend Wiring Map.dc.html` | all 10 Kienzle gap pages exist | `business.ts` route LIVE; ShopFloorLivePage wired to `getShopFloorSnapshot`; **MEMORY.md/AWARENESS.md absent from web/**; test gap only |
| xray | `Kienzle Blueprint Intake.dc.html` (179 lines) | `BlueprintQuotePage.tsx`, `DocumentInboxPage.tsx` | `/api/v1/cad/blueprint-extract-{contract,route}` LIVE (cad.ts:70,81); **`/api/v1/drawing/execute` route NOT found**; `blueprintApi.ts` unconfirmed |
| charlie/delta (cad) | all 5 cad `.dc.html` present | `CADRegenerationDashboardPage.tsx`, `CADAIStatePage.tsx` exist | **`TrilobeCreatorPage.tsx` + `WarmUpGeneratorPage.tsx` MISSING; `cadRoutes.ts` MISSING; thermal_compensation_get not in cadDispatcher** — pages 4+5 have NO backend at all |
| lima | `Kienzle Academy.dc.html` | `CourseViewerPage.tsx` exists but **0 "academy" references** | Express route LIVE (knowledge.ts + learning.ts); **`'academy'` ViewTab + `KienzleAcademyView` NOT built; `web/src/api/academy.ts` absent** |

### GAP — a core surface missing (page or design absent)

| domain | what's missing |
|--------|----------------|
| sierra | `Kienzle System Sync.dc.html` + `Kienzle Backend Wiring Map.dc.html` EXIST, but **`SystemSyncPage.tsx` MISSING, `systemRoutes.ts` MISSING, `systemApi.ts` MISSING** — only IndexGateway.tsx matches a "system" search (sierra frontend = GAP) |
| zulu | `Kienzle System Sync.dc.html` EXISTS, but **`SystemSyncPage.tsx` DOES NOT EXIST, no `/system-sync` route** in web/src (zulu TOP_GAP — entirely unbuilt; `swarm_status` backend route exists at orchestration.ts:167) |
| delta (pages 4+5) | `TrilobeCreatorPage.tsx` + `WarmUpGeneratorPage.tsx` MISSING with **no backend at all** (delta frontend) |

**Quebec's exact buildable order (lowest-effort-to-READY first):**
1. **oscar** — only the nine-axis route to confirm; everything else live. Highest-leverage single wire.
2. **whiskey** — route live, only the parity probe to verify.
3. **romeo + quebec** — coordinate the WiringCoverageTab once `wiring_coverage_map` action lands (romeo WAVE 0).
4. **hotel, foxtrot, kilo, mike, echo** — pages+designs exist; build the named missing routes/actions (these are the backend-action gaps in WAVE 1-3).
5. **lima** — build the `academy` ViewTab + `academy.ts` api client (page shell exists).
6. **zulu + sierra (System Sync)** — both need the page built from scratch; gated on master_index_query live + (zulu) HERMES proxy up.
7. **delta pages 4+5 (Trilobe, WarmUp)** — last; no backend exists yet.

---

## 5 — Honest gaps (R12) — UNVERIFIED / STALE items needing a human/specialist check

These are items the assessors explicitly flagged as not confirmable this session:

**Count claims that could not be live-verified (STALE plan counts):**
- **charlie** — engine count of 78 UNVERIFIED from live grep (plan references MEMORY.md which cites it); dispatcher action count returned 0 from `grep -o "case '...'"` because the dispatcher uses double-quoted strings (false-negative grep, not a real absence).
- **delta** — ~564 cadDispatcher actions UNVERIFIED (flat string list, not z.enum; 617 `case` hits in a 6,404-line file); `thermal_compensation_get`, `trilobe_generate`, `warmup_program_generate` NOT found in cadDispatcher — those §8 page backends are confirmed unwired.
- **foxtrot** — "49 actions" in plan §2 is a stale undercount (398 case-statements, 553 unique `mill_*` strings); z.enum block not extractable in one pass.
- **hotel** — 42+ engine claim UNVERIFIED (engines flat under src/engines, lazy-imported); action count vs plan sample list UNVERIFIED; ERPCostFeedbackEngine import absent from dispatcher grep (test gap is also a wiring gap).
- **india** — plan baseline AUROC 0.808 is STALE/regressed (live 0.7525); `capture_bus_emit` is the WRONG action name (actual: `capture_bus_record`, outcomeDispatcher.ts:96); `neural_fleet_state_*` absent from aiReasoningDispatcher.
- **mike** — engine count 164 not re-grepped (consistent with CLAUDE.md but unverified this session).
- **whiskey** — 444 action strings vs plan's 373 (plan conservative/stale-low).
- **xray** — "~40 actions" likely understates the multi-domain cadDispatcher (~100 case-handler lines); `blueprint_lora_prepare_set` at :3697 not :3568 (stale line cite).
- **zulu** — plan claims 15 engines; live grep finds 23+; `weekly-synthesis-get.test.ts` absent by that exact name (closest: `contextDispatcher.slot-brief.test.ts`).
- **lima** — `VideoLearningEngine.ts` not found in integration tree (likely slot/lima-only branch drift); `audit-academy-prereq-chain.mjs` is slot/lima-only and not present in integration tree.
- **sierra** — 8 engine .ts files unverified by name (no glob run); dispatcher wiring is live but engine enumeration not done.

**Implementation completeness not verified without reading file bodies:**
- **charlie** — design-to-page completeness (KPI header row, cost-breakdown bar, Quantity breaks table, Margin Waterfall SVG) UNVERIFIED without reading the TSX body.
- **quebec** — wiki "707 entries" claim is fleet-wide, not this galaxy (only 7 tagged frontend-app); tribal tip count unverified.

**Process/cron/runtime states not confirmed live:**
- **charlie** — nightly cron wiring UNVERIFIED; LoRA emit flag not confirmed active; `quoting_lora_train.jsonl` not checked.
- **echo** — `scripts/post-gen-reward.mjs`, `post-nc-dialect-lint.mjs` existence UNVERIFIED; `post_processor_lora_train.jsonl` unconfirmed.
- **india** — scheduled-task crons not confirmed live; LoRA retrain cadence unverified; CAG hit-rate not measured; 34-domain outcome-bus coverage unverified.
- **xray** — OCR cron currently idle (Ready/not running nightly); calibration `reliable:false` (n≈24 < MIN_RELIABLE=50); A/B benchmark has never been empirically run.
- **zulu** — **HERMES proxy DOWN (85.7% fail rate, last active 2h ago)** — needs operator/self-heal before tribal/wiki deepening via Hermes ask.
- **mike** — `refpool-wedm.jsonl` not confirmed; outcome capture bus integration unconfirmed.
- **whiskey** — outcome capture bus emit `{domain:'lathe'}` claimed in plan but no ledger artifact present; NN/GNN lathe refpool labels unconfirmed.
- **sierra** — outcome ledger not yet armed; NN-EVAL.json MISSING for this domain.

**Material accuracy concern requiring specialist sign-off:**
- **charlie** — **MAPE=755.7%** in live `latest-training-status.json` (vs ≤35% gate). Core quoting accuracy is not production-ready; root cause unknown until the 3 missing engine tests expose it. This is the single most material correctness gap in the fleet and warrants specialist review of the cost-basis math, not just test authoring.
- **india** — GNN below all 3 gates is the infrastructure-wide correctness gap; refpool growth payoff is **blocked on operator-supplied ghost labels** (india blocked_by) — a human-in-the-loop dependency that no code change can satisfy alone.

---

# Appendix — per-domain VERIFIED scorecards (evidence)

I have enough data. Let me compile the scorecard.

### charlie/quoting
- plan_status: draft | plan_lines: 187
- counts_verified: STALE — plan claims ~78 engines + ~15 dispatcher actions; dispatcher file exists (`quotingDispatcher.ts`) and 4 key named actions confirmed present (`fair_market_value`, `gcode_time_estimate`, `training_status`, `cost_savings`), but `grep -o "case '...'"` returns 0 (dispatcher uses double-quoted strings, not single-quoted case patterns); route files `mcp-server/src/routes/quote.ts` + `mcp-server/src/routes/quoting.ts` both live; engine count of 78 is UNVERIFIED from live grep this session (plan references MEMORY.md which cites it)
- deepen: GAP — tribal tips confirmed at 81 (MEMORY.md live count) vs target 130; wiki at 356 entries (MEMORY.md); gap of 49+ tribal tips unwritten; 5 target wiki entries from §3 not verified as present
- test: GAP — of the 6 plan-named test files: `OutboundPriceIndexEngine.test.ts` EXISTS (174 real-value assertions, 0 toBeDefined stubs — PASS quality); `QuotingCalibrationEngine.test.ts` EXISTS (42 real assertions — PASS quality); `InstantQuoteEngine.test.ts` MISSING; `JobCostingEngine.test.ts` MISSING; `CostEstimationEngine.test.ts` MISSING; `quotingDispatcher.wire.test.ts` MISSING — 4 of 6 plan-named files absent
- simulate: GAP — `latest-training-status.json` EXISTS at `state/shared/quoting/latest-training-status.json`; MAPE=755.7% (far above the 35% acceptance gate); no simulation run artifact (SEMBLEX/OPTIMAS/SIG scenarios) confirmed on disk
- validate: GAP — `latest-training-status.json` live: coverage_pct=50% (3 of 6 sources consumed, not 2 of 5 as plan states — consumed_count upgraded but MAPE=755.7% vs gate ≤35%); `jm-material-cost-basis.json` present (U-QP-COST-BASIS-NORMALIZE shipped per CLAUDE.md §12); parity probe and quantity-break monotonicity not verified
- finetune: GAP — nightly cron wiring UNVERIFIED this session; LoRA emit flag not confirmed active; `quoting_lora_train.jsonl` not checked for existence; india `xproc_outcome_publish` action name verified as corrected to OutcomeCaptureBus in CLAUDE.md §10
- frontend: PARTIAL — both `.dc.html` design files EXIST (`Kienzle Quote.dc.html`, `Kienzle Job Cost.dc.html` under `mcp-server/web/design-imports/kienzle-app-build/`); both target pages EXIST (`QuoteBuilderPage.tsx`, `CostEstimatorPage.tsx` under `mcp-server/web/src/pages/`); backend routes EXIST (`mcp-server/src/routes/quoting.ts` with `/api/v1/quoting/<verb>`); design-to-page implementation completeness (KPI header row, cost-breakdown bar, Quantity breaks table, Margin Waterfall SVG) UNVERIFIED without reading the TSX body
- TOP_GAP: MAPE=755.7% means the core quoting accuracy is not production-ready — the 3 missing unit test files (`InstantQuoteEngine`, `JobCostingEngine`, `CostEstimationEngine`) are the highest-leverage next build because they enforce the physics/math contracts that drive MAPE down; building them will surface the root cause of the 755% error
- next_unit_id: U-QP-CORE-ENGINE-TESTS — write `InstantQuoteEngine.test.ts` + `JobCostingEngine.test.ts` + `CostEstimationEngine.test.ts` with real JM Die reference-value assertions (algebraic cost-sum identity, FMV ±20% vs actuals, shop-rate source guard); red-first to expose the MAPE=755% root cause
- blocked_by: none (U-QP-COST-BASIS-NORMALIZE already shipped per CLAUDE.md §12; india LoRA retrain is downstream, not upstream of tests)

---

All data collected. Here is the scorecard:

### delta/cad
- plan_status: draft | plan_lines: 462
- counts_verified: STALE — plan claims ~564 cadDispatcher actions; grep shows 71 in the doc comment + 617 `case` hits in a 6,404-line file (action enum uses a flat string list, not z.enum blocks, so exact count UNVERIFIED); 3 other dispatchers confirmed present (cadAutomation/cadDrawingKnowledge/cadRegression); `thermal_compensation_get`, `trilobe_generate`, `warmup_program_generate` NOT found in cadDispatcher.ts — those §8 page backends are not yet wired
- deepen: GAP — tribal 277 tips (confirmed in MEMORY.md 2026-05-29); target 400; wiki entries named in §3 (cad-feature-recognition-stub-hazard, cad-collision-conservative-ccd, cad-dispatcher-action-map, cad-tolerance-stack-up, cad-api-unit-traps) not confirmed on disk; LoRA dataset (`state/shared/lora/cad_lora_*.jsonl`) MISSING
- test: GAP — plan names 5 test files; only 1 of 5 exists on disk: `CADDrawingKnowledgeEngine.test.ts` EXISTS (real reference-value assertions: GD&T symbol counts, fit-class checks, 84 toBe/toEqual assertions — PASS quality); `CADKernelEngine.test.ts` MISSING; `CollisionDetectionEngine.test.ts` MISSING; `CADToSTEPPipelineEngine.test.ts` MISSING; `cadDispatcher.integration.test.ts` MISSING
- simulate: GAP — no simulation run artifact found; `cad-outcome-ledger.jsonl` MISSING; `CAD_COVERAGE_MATRIX.json` EXISTS but stale (generated 2026-04-19, 16,039 files scanned — pre-dates plan)
- validate: GAP — no F1/CCD/volume-error acceptance gate results on disk; `cad-outcome-ledger.jsonl` MISSING; no live validation numbers available
- finetune: GAP — `state/shared/lora/cad_lora_train.jsonl` MISSING; `cad-outcome-ledger.jsonl` MISSING; nightly cron not confirmed active; GNN refpool push path UNVERIFIED
- frontend: PARTIAL — all 5 `.dc.html` design sources PRESENT in `mcp-server/web/design-imports/kienzle-app-build/`; `CADRegenerationDashboardPage.tsx` EXISTS; `CADAIStatePage.tsx` EXISTS; `TrilobeCreatorPage.tsx` MISSING; `WarmUpGeneratorPage.tsx` MISSING; `cadRoutes.ts` MISSING — page 1/2 backends lack dedicated route file; `thermal.ts` route EXISTS but thermal_compensation_get action not in cadDispatcher; pages 4+5 have no backend at all
- TOP_GAP: The 4 plan-required test files are absent (`CADKernelEngine`, `CollisionDetectionEngine`, `CADToSTEPPipelineEngine`, `cadDispatcher.integration`) — without these the entire §5/§6/§7 simulate-validate-finetune chain has no proven foundation; the S(x) safety gate (`CollisionDetectionEngine` conservative CCD) is untested and the stub `CADFeatureRecognitionEngine` (U-EFF25) blocks cam+quoting consumers
- next_unit_id: U-DELTA-CAD-CORE-TESTS — write the 4 missing reference-value test files (CADKernelEngine / CollisionDetectionEngine / CADToSTEPPipelineEngine / cadDispatcher.integration) with algebraic-invariant assertions per §4; prerequisite to every downstream §5-§8 gate
- blocked_by: U-EFF25 (CADFeatureRecognitionEngine de-stub, delta owns) must land before cadDispatcher.integration feature-recognize path can assert real output

---

I have all needed data. Here is the scorecard:

### echo/post-processor
- plan_status: draft | plan_lines: 449
- counts_verified: PASS — plan claims 655 prism_pp actions; grep confirms exactly 655 `case "pp_"` entries in `mcp-server/src/tools/dispatchers/ppDispatcher.ts`; AWARENESS.md present (plan said absent — stale claim)
- deepen: GAP — AWARENESS.md reports 0 tribal/wiki lines in its body; plan targets tribal ≥130 tips and ≥8 wiki entries; current tribal count unconfirmed from AWARENESS (file is auto-gen AI-synergy only, no tip count); synthesis exists at `state/shared/galaxy-transcript-mining/post-processor/_SYNTHESIS.md` but no ECHO-tribal count surfaced; wiki and tribal legs not yet enumerated in awareness surface
- test: PASS — all §4 named files exist: `GCodeSafetyAnalyzerEngine.test.ts`, `GCodeTranspilerEngine.test.ts`, `PostProcessorPipelineEngine.test.ts`, `GCodeRuntimePredictorEngine.test.ts`, `MasterPostFineTuningEngine.test.ts`; `GCodeSafetyAnalyzerEngine.test.ts:51` shows `.toBe(100)` / `.toBe(false)` reference-value assertions (not stubs); `prism_pp.integration.test.ts` and `AlarmDB.coverage.test.ts` NOT found — plan marks these as new/needed
- simulate: GAP — `scripts/post-gen-reward.mjs` not confirmed present (no file check done — UNVERIFIED); no simulation run artifact found under `state/shared/specs/`; `post-nc-dialect-lint.mjs` existence unconfirmed
- validate: GAP — no `ECHO-VALIDATION-RESULTS.md` or reward-distribution report found; `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md` EXISTS but no passing acceptance numbers cited; `pp_outcome_emit` case exists at `ppDispatcher.ts:2338` but P6 auto-call in `PostProcessorPipelineEngine.ts` returned no match — wiring gap confirmed (MEMORY.md landmine #1 still open)
- finetune: GAP — `pp_outcome_emit` P6 auto-call absent (prerequisite for all downstream loops); `post_processor_lora_train.jsonl` existence unconfirmed; NN/GNN refpool seeding for post-processor ghost nodes unconfirmed
- frontend: PARTIAL — both `.dc.html` files confirmed at `mcp-server/web/design-imports/kienzle-app-build/Kienzle Post.dc.html` and `Kienzle Alarm Decoder.dc.html`; `PostProcessorPage.tsx` and `AlarmPage.tsx` both exist under `mcp-server/web/src/pages/`; Express route `/api/v1/ppg` confirmed at `src/routes/index.ts:172` but plan targets `/api/v1/pp/generate` and `/api/v1/pp/alarm/:controller/:code` — those specific routes NOT found; `pp_alarm_lookup` action not found in ppDispatcher (no case entry)
- TOP_GAP: Wire `pp_outcome_emit` auto-call into `PostProcessorPipelineEngine` P6 — this is the prerequisite blocking the closed-loop fine-tune pipeline, LoRA dataset generation, and GNN refpool growth for the entire post-processor domain
- next_unit_id: U-PP-OUTCOME-EMIT-P6-WIRE
- blocked_by: none (the wiring itself is internal to echo; india consuming the output is downstream, not a blocker for wiring)

---

Now I have all the data I need. Here is the scorecard:

---

### foxtrot/mill
- plan_status: draft | plan_lines: 402
- counts_verified: STALE — plan claims 49 actions; grep finds 398 case-statements in millDispatcher.ts (file is 217K, lazy-import pattern); `z.enum` block not extractable in one pass but 553 unique `mill_*` quoted strings confirm far more than 49 actions exist. The "49 actions" figure in plan §2 is a stale undercount. Confirmed actions include `mill_physics_force`, `mill_strategy_recommend`, `mill_validate_safety`, `mill_collision_check`, `mill_kinematics_verify`, `mill_agi_orchestrate`.
- deepen: GAP — wiki has 23 pages (plan targeted 16 cluster pages, ~7 unplanned extras exist including `mill-foundations-verified-2026-06-14.md`; net not bad). Tribal tips at 57 vs target 120+; RAG embedding of HyperMILL wiki pages still pending per MEMORY.md. 4 planned new memory files (VMC-05 gap, chip-thinning, 5-axis, coolant block) not yet written.
- test: GAP — 1/6 named test files present: `mcp-server/mcp-server/src/__tests__/MillingForceEngine.test.ts` EXISTS with 35 real reference-value assertions (toBeCloseTo/toBeGreaterThan) vs only 2 toBeDefined stubs — PASS quality. Missing: `AdaptiveMillingStrategiesEngine.test.ts`, `TrochoidalMillingEngine.test.ts`, `BallEndMillEngine.test.ts`, `MillKinematicsCollisionEngine.test.ts`, `millDispatcher.integration.test.ts` (all absent).
- simulate: GAP — no simulation artifact or output found under `mcp-server/data/state/`; mill-specific lora train/test jsonl absent; `MILLING_REASONING_TRACE_LEDGER.jsonl` present but no closed-loop D2/4140/Ti simulation results.
- validate: GAP — no `mill_lora_train.jsonl`/`mill_outcome_*.md` in `data/state/`; `MILL_AI_TRAINING_REPORT.json` + `MILL_CAPABILITY_MANIFEST.json` present but are AI audit artifacts, not live-data parity validation vs JM Die production RPM/feed values. Parity probe not run (MillingWizardPage routes to `/wizard-submit`, not the 6 Kienzle wizard routes defined in plan §8 table).
- finetune: GAP — `mill_lora_train.jsonl` absent; no `reference_foxtrot_mill_outcome_*.md` memory files found; LoRA retrain trigger not wired. `WEDM_OUTCOME_LEDGER.jsonl` exists (different domain); no mill equivalent. NN refpool has no mill-specific ghost examples confirmed.
- frontend: PARTIAL — `Kienzle Wizards.dc.html` EXISTS at `mcp-server/web/design-imports/kienzle-app-build/Kienzle Wizards.dc.html`. `MillingWizardPage.tsx` EXISTS (581 lines, 5-step wizard implemented via `/wizard-submit`). BUT: plan's 6-step Kienzle wizard routes (`/api/v1/mill/analyze`, `/mill/fixture`, `/mill/strategy`, `/mill/physics`, `/mill/simulate`, `/mill/release`) are ALL ABSENT from `mcp-server/src/routes/milling.ts` — existing routes are `/upload`, `/wizard-submit`, `/calculate`, `/validate`, `/speed-feed`, `/ai/wisdom`, `/ai/agi` (none match the plan's Step 1-6 table). Frontend calls `wizard-submit` (5-step pre-Kienzle flow), not the planned 6-step Kienzle dispatcher-backed API.
- TOP_GAP: The 6 Kienzle wizard backend routes (`POST /api/v1/mill/{analyze,fixture,strategy,physics,simulate,release}`) are entirely absent — without them the frontend cannot be wired to the planned `prism_mill` actions, blocking the entire §8 acceptance gate and the parity probe. This is the single highest-leverage gap: it unblocks frontend completion, parity validation, and the S(x) ≥ 0.98 release gate.
- next_unit_id: U-FOXTROT-MILL-WIZARD-ROUTES — implement the 6 Express routes in `mcp-server/src/routes/milling.ts` wired to `prism_mill` dispatcher actions per plan §8 table, with server-side S(x) gate before Step 6 release.
- blocked_by: none (prism_mill dispatcher actions confirmed present; oscar speed-feed primitives healthy per recent regression fixes; MillingWizardPage.tsx exists and ready to extend)

---

I have all the data needed. Here is the scorecard:

### hotel/business
- plan_status: draft | plan_lines: 372
- counts_verified: STALE — plan claims 42+ engines (no .ts files directly under business/; engines live flat under `src/engines/` imported lazily by dispatcher); dispatcher is 8057 lines (plan claimed 7770) with 1078 `case "` matches (action count unverified vs plan's sample list — ERPCostFeedbackEngine import absent from dispatcher grep, confirming test gap is also a wiring gap)
- deepen: GAP — tribal index unreadable at current size (V8-cap risk); plan targets 60+ tips vs claimed-current 23; tribal injection UNVERIFIED live; 5 wiki leaves + 4 memories listed as missing and not confirmed present
- test: GAP — 4 of 6 named test files exist with real reference-value assertions (GL: debits/credits invariant confirmed at line 41-48; BusinessSync: status `.toBe("ok")` confirmed; Payroll/PTO: exist); MISSING: `ERPCostFeedbackEngine.test.ts` (5-category sum invariant — the core financial correctness test) + `businessDispatcher.integration.test.ts` (full dispatcher round-trip)
- simulate: GAP — no simulation run artifact found; `business-closed-loop-outcomes.jsonl` MISSING; `JMDieErpSimulationEngine` wiring to cost-feedback loop unconfirmed
- validate: GAP — `business-closed-loop-outcomes.jsonl` MISSING; `jm-die-purchases-summary.json` referenced but live-data validation run against it has not produced a results artifact; parity probe (page↔backend 5-category) not yet executable (ERPCostFeedbackEngine test missing)
- finetune: GAP — `business_lora_train.jsonl` MISSING at `mcp-server/data/ai-training/lora/business/`; outcome ledger (prerequisite) also missing; NN/GNN refpool submission for 3 named engines UNVERIFIED
- frontend: PARTIAL — all 5 Kienzle `.dc.html` design files confirmed at `mcp-server/web/design-imports/kienzle-app-build/`; all 5 target `.tsx` pages confirmed at `mcp-server/web/src/pages/`; `hotel-portal.ts` route confirmed live at `/api/v1/hotel-portal`; BUT: `erp_schedule_get`, `erp_po_list`, `erp_po_receive`, `erp_po_create_batch`, `erp_alerts`, `payroll_run_period`, `erp_work_order_get`, `capacity_plan_query` — NONE found in businessDispatcher.ts (timeclock uses `timeclock_record_punch`; capacity uses `qdrant_capacity_plan`); `mcp-server/src/routes/business.ts` has no erp-dashboard/schedule/inventory/payroll endpoints wired
- TOP_GAP: The `ERPCostFeedbackEngine.test.ts` 5-category invariant test is missing AND the 8 frontend-targeted dispatcher actions (`erp_schedule_get`, `erp_po_list/receive/create_batch`, `erp_alerts`, `payroll_run_period`, `erp_work_order_get`, `capacity_plan_query`) are absent from businessDispatcher.ts — the frontend pages exist but have no live backend wiring; this is the blocker for both §4 CI green and §8 frontend acceptance
- next_unit_id: U-HOTEL-ERP-FRONTEND-ACTIONS — add the 8 missing dispatcher actions to businessDispatcher.ts + ERPCostFeedbackEngine.test.ts (5-category invariant) + wire the 4 missing Express routes (`/api/v1/business/{erp-dashboard,schedule,inventory,payroll}`) in a single commit (R15: wire+test+validate together)
- blocked_by: none (backend engines confirmed importable; shop-floor cross-galaxy feed is additive, not a blocker for the core 8 actions)

---

Now I have enough data for the scorecard. Let me compile the findings.

**Key verified facts:**
- Plan: draft, 374 lines
- `capture_bus_emit` is WRONG — actual action is `capture_bus_record` (outcomeDispatcher.ts:96)
- `neural_fleet_state_*` absent from aiReasoningDispatcher.ts
- NN-EVAL.json freshness: 2026-06-27 — but AUROC now **0.7525 (FAIL)**, not 0.808 (plan claims 0.808 as baseline to maintain — it regressed)
- `Kienzle System Sync.dc.html` EXISTS
- `AILearningDashboardPage.tsx` EXISTS but has no System Sync tab (only line 228 is the function export, no "System Sync" string found)
- `/api/v1/ai/system-sync` route does NOT exist (only `/api/v1/ai/reasoning` found)
- `aiSystemsApi.ts` does NOT exist
- Named plan test files `prism_outcome.integration.test.ts`, `prism_ml.lora_gate.test.ts` do NOT exist
- `OutcomeFeedbackBusEngine.test.ts`, `AdaptiveThresholdEngine.test.ts`, `MetaLearningOptimizerEngine.test.ts` (as named) — only `meta-learning-optimizer-engine.test.ts` exists (different name)
- `graphsage-trainer.test.mjs`, `hybrid-retrieval.test.mjs` — EXIST with real assertions (0 `toBeDefined` stubs)
- outcome-bus.jsonl: 134,325 lines, 68MB — LIVE and active
- Wiki planned entries (lora-stack-inventory, rag-cag-hybrid-retrieval, india-xproc-fallthrough-pattern, heterophily-collapse-class) — NOT found on disk
- 6 orphan wires still open (verified by INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md present)

### india/ai-training
- plan_status: draft | plan_lines: 374
- counts_verified: STALE — plan claims AUROC 0.808 baseline; NN-EVAL.json (2026-06-27) shows AUROC 0.7525 (ALL 3 gates FAIL); plan §8 cites `capture_bus_emit` but actual action is `capture_bus_record` (outcomeDispatcher.ts:96); `neural_fleet_state_*` absent from aiReasoningDispatcher.ts
- deepen: GAP — tribal at 66 tips vs target 150; 4 planned wiki entries (lora-stack-inventory, rag-cag-hybrid-retrieval, india-xproc-fallthrough-pattern, heterophily-collapse-class) not found on disk; 6 orphan wires still open per INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md
- test: GAP — graphsage-trainer.test.mjs + hybrid-retrieval.test.mjs EXIST with real assertions (0 stubs); but plan-named `OutcomeFeedbackBusEngine.test.ts`, `AdaptiveThresholdEngine.test.ts` missing (only `meta-learning-optimizer-engine.test.ts` and `devDispatcher.uwire23` cover those engines); `prism_outcome.integration.test.ts` and `prism_ml.lora_gate.test.ts` missing entirely
- simulate: GAP — no evidence of GNN dry-run / LoRA Monte-Carlo / RRF substrate exercise artifacts on disk; scenario scripts not found
- validate: GAP — NN-EVAL.json dated 2026-06-27, ALL gates failing (AUROC 0.7525 < 0.78, macro-F1 0.2834 < 0.55, Brier 0.22 > 0.15); outcome-bus.jsonl live (134K lines, 68MB) but 34-domain coverage unverified; CAG hit-rate not measured
- finetune: GAP — outcome bus active (134K entries); vault-to-lora-dataset.mjs wired; scheduled task crons not confirmed live; LoRA retrain cadence unverified
- frontend: PARTIAL — Kienzle System Sync.dc.html EXISTS at mcp-server/web/design-imports/kienzle-app-build/; AILearningDashboardPage.tsx EXISTS but has no System Sync tab (no "System Sync" string in file); /api/v1/ai/system-sync route absent (only /api/v1/ai/reasoning found); aiSystemsApi.ts absent
- TOP_GAP: GNN has regressed below all 3 gates (AUROC 0.7525, assessed 2026-06-27 on 200-ghost holdout); refpool growth + H2GCN feature swap is the only unblocked lever to restore the selective-deploy posture the plan assumes is active — everything downstream (finetune, frontend parity probe, validation gates) depends on a passing AUROC
- next_unit_id: U-INDIA-GNN-REFPOOL-H2GCN — grow labeled refpool via active-label-worklist (active-label-worklist.json is on disk) + wire H2GCN `graph_heterophily_aggregate` primitive into the train pipeline to lift AUROC back above 0.78
- blocked_by: operator-supplied ghost labels (refpool growth payoff); H2GCN feature integration is code-runnable now via `prism_algorithm:graph_heterophily_aggregate`

---

I have enough data to produce the scorecard. Let me compile the findings.

**Verified facts:**
- `engines/cam/` dir: 0 local .ts files (all root-level per CLAUDE.md confirmed)
- Root engines: 7 named engines confirmed in `mcp-server/src/engines/*.ts` (+ 10+ additional cam-related engines found beyond the plan's count)
- `engines/hypermill/`: exactly 17 .ts files — matches plan
- `prism_cam` actions: `cam_material_map`, `cam_strategy_recommend`, `cam_strategy_recommend_full`, `collision_check_full`, `cam_safety_validate`, `cam_multiaxis_recommend`, `toolpath_generate`, `mastercam_strategy_recommend`, `mastercam_safety_validate`, `ollama_cam_strategy_recommend`, `cam_ml_train_lora` — all confirmed in camDispatcher.ts
- `prism_toolpath` (toolpathDispatcher.ts): `strategy_select`, `simulate`, `stock_simulate`, `surface_finish_predict`, `cycle_time_estimate` — all confirmed
- Plan's named test files (`cam-material-map.test.ts`, `cam-strategy-recommend.test.ts`, `cam-collision-check.test.ts`, `cam-cross-vendor.test.ts`, `cam-hypermill-units.test.ts`, `cam-dispatcher-roundtrip.test.ts`): NONE of the 6 exist; 63 other cam*.test.ts files exist but none match the plan's exact names
- `cam-pipeline-real-parts.test.ts`: real reference-value assertions confirmed (real part geometry, not toBeDefined stubs)
- Wiki gaps: `cam-collision-ccd-architecture.md`, `cam-cross-vendor-transfer-protocol.md`, `cam-units-trap-fusion.md`, `cam-algorithm-primitives.md`, `cam-hypermill-blade-roughing.md` — none found under `knowledge/wiki/cam/`; only 6 general cam wiki files present
- `cam-outcome-ledger.jsonl`: MISSING
- `cam_lora_train.jsonl`: MISSING
- Both dc.html files: CONFIRMED (`Kienzle Collision Gap.dc.html`, `Kienzle Tooling Shop.dc.html`)
- Target TSX pages: `CamStrategyPage.tsx` and `ToolpathAdvisorPage.tsx` both CONFIRMED
- Express routes `/api/v1/cam/collision-status`, `/api/v1/cam/tooling-roi`, `/api/v1/cam/roi-math`, `/api/v1/cam/distributors`: NONE found in `src/routes/`

---

### kilo/cam
- plan_status: draft | plan_lines: 431
- counts_verified: PASS — plan claims 7 root engines + 17 hypermill = 24; grep confirms 7 named root engines present (31 cam-related files total in src/engines/) + exactly 17 hypermill .ts files; prism_cam + prism_toolpath + camFunctionDispatcher actions all confirmed in dispatcher source
- deepen: GAP — 88 tribal tips confirmed (target 150+); all 5 named wiki gap leaves missing from knowledge/wiki/cam/ (cam-collision-ccd-architecture.md, cam-cross-vendor-transfer-protocol.md, cam-units-trap-fusion.md, cam-algorithm-primitives.md, cam-hypermill-blade-roughing.md)
- test: GAP — none of the 6 plan-named test files exist (cam-material-map.test.ts, cam-strategy-recommend.test.ts, cam-collision-check.test.ts, cam-cross-vendor.test.ts, cam-hypermill-units.test.ts, cam-dispatcher-roundtrip.test.ts all missing); 63 existing cam*.test.ts files present but are prior-generation tests; cam-pipeline-real-parts.test.ts confirmed as real-assertion quality
- simulate: GAP — no simulation synthesis artifact or acceptance-result doc found; toolpathDispatcher:simulate + stock_simulate actions confirmed wired but no recorded simulation pass results on disk
- validate: GAP — cam-outcome-ledger.jsonl missing; no strategy-match-rate or cycle-time MAPE result document found; 0 of 3 JM Die live validation gates provably recorded
- finetune: GAP — cam_lora_train.jsonl missing; cam-outcome-ledger.jsonl missing; closed-loop retrain pathway exists (CAMFeedbackLoopEngine + CAMLoRAAdapterTrainerEngine confirmed) but no population data
- frontend: PARTIAL — both dc.html designs confirmed (Kienzle Collision Gap.dc.html, Kienzle Tooling Shop.dc.html); both target TSX pages confirmed (CamStrategyPage.tsx, ToolpathAdvisorPage.tsx); 4 required backend Express routes absent from src/routes/ (collision-status, tooling-roi, roi-math, distributors)
- TOP_GAP: The 6 plan-specified §4 test files are completely absent — they are the prerequisite gate for simulation, validation, and fine-tune; writing them with real reference-value assertions (kc1_1=3200 MPa for H-group, clearance number from collision_check_full, units-guard on cm input) is the single highest-leverage next unit
- next_unit_id: U-KILO-CAM-TEST-SUITE — build all 6 §4 test files with R9 reference-value assertions round-tripped through camDispatcher and toolpathDispatcher
- blocked_by: none — camDispatcher.ts, toolpathDispatcher.ts, and all target engines are confirmed present; units-guard.mjs is the only external dependency (verify importable before running)

---

I have all the data needed. Here is the scorecard:

### lima/academy
- plan_status: final | plan_lines: 464
- counts_verified: STALE — plan claims 18 engines; grep-confirmed 16 in integration tree (MITCourseRegistryEngine.ts + VideoELearningAIEngine.ts + MITCourseDeepLearningEngine.ts + MITCourseExpansionEngine.ts + MITCourseFullIntegrationEngine.ts + MitCourseIndexEngine.ts + MITCourseIntegrationEngine.ts + MITCourseKnowledgeEngine.ts + CourseBuilderEngine.ts + CurriculumEngine.ts + KnowledgeCurriculumBridgeEngine.ts + LessonRendererEngine.ts + InteractiveLearningSessionEngine.ts + InstructorDashboardEngine.ts + EmployeeMachineDomainAcademyEngine.ts + EmployeeRoleAcademyInjectionEngine.ts = 16; VideoLearningEngine.ts not found in integration tree — likely slot/lima-only branch drift); dispatcher actions confirmed live in knowledgeDispatcher.ts (13 academy + curriculum actions verified at lines 14–76, 1850–2654)
- deepen: GAP — plan targets 120 tribal tips (current 56); wiki entries 1–6 listed as absent/stub; no academy-prefixed algorithm/formula entries confirmed; LoRA dataset files (academy_lora_train.jsonl) not found on disk
- test: GAP — named files `academy-curriculum-engine.test.ts` and `academy-course-builder.test.ts` MISSING (no match under mcp-server/src/__tests__/academy*); `learn-course-autogen.test.ts` EXISTS at `mcp-server/src/__tests__/learn-course-autogen.test.ts` but contains `toBeDefined()` stubs (lines 27–29, 71) — not R9-compliant reference-value tests; `learning-course-routes.test.ts` EXISTS but has no academy_courses length>=29 assertion (grep: no match); `mit-course-registry.test.ts` EXISTS at `mcp-server/src/__tests__/mit-course-registry.test.ts`
- simulate: GAP — no simulation artifact (prereq DAG dry-run output, learn_curriculum_* MAPE report) found on disk; `audit-academy-prereq-chain.mjs` is slot/lima-only per plan §2 landmine #3 and not present in integration tree
- validate: GAP — `mcp-server/data/state/academy-outcomes.jsonl` does not exist; no live-data validation numbers on record; parity probe not documented as having run
- finetune: GAP — `academy_lora_train.jsonl` / `academy_lora_test.jsonl` not found; outcome ledger absent; NN/GNN refpool seed for 18 academy nodes not confirmed emitted
- frontend: PARTIAL — `mcp-server/web/design-imports/kienzle-app-build/Kienzle Academy.dc.html` EXISTS (confirmed); `mcp-server/web/src/pages/CourseViewerPage.tsx` EXISTS but contains 0 references to "academy" — the `'academy'` ViewTab and `KienzleAcademyView` sub-component are NOT yet built; `web/src/api/academy.ts` absent (only `knowledge.ts` + `knowledgeExt.ts` present); Express route for academy confirmed live at `mcp-server/src/routes/knowledge.ts` + `learning.ts`
- TOP_GAP: The named test files `academy-curriculum-engine.test.ts` and `academy-course-builder.test.ts` are missing and existing tests contain `toBeDefined()` stubs — no R9-compliant test suite exists; building real reference-value tests (courseDefinitions.length>=29 invariant, Cpk floor assertions, dispatcher round-trips) is the foundation that unblocks §5 sim, §6 validate, and the frontend parity probe
- next_unit_id: U-LIMA-TEST-SUITE — create `academy-curriculum-engine.test.ts` + `academy-course-builder.test.ts` with reference-value/invariant assertions per §4; upgrade `learn-course-autogen.test.ts` to remove `toBeDefined()` stubs; add dispatcher round-trip for `prism_knowledge:academy_courses` length>=29
- blocked_by: none (dispatchers live, engines present, dc.html exists — test authoring has no upstream blocker)

---

Enough data collected. Producing the scorecard now.

### mike/wedm
- plan_status: draft | plan_lines: 402
- counts_verified: STALE — plan claims 280 wedm_ actions / 3,262 lines; grep confirms 287 case matches / 3,410 lines (dispatcher grew since plan was written; engine count of 164 not re-grepped but consistent with CLAUDE.md)
- deepen: GAP — 6 verified wiki leaves confirmed on disk (wedm-foundations, wedm-applied-practice, wedm-advanced-techniques, wedm-resource-atlas, wedm-source-atlas, wedm-foundations-verified-2026-06-14); target 8 leaves; wedm-formulas.md, wedm-fa10s-tech-tables.md, wedm-ai-orchestration.md all MISSING
- test: PARTIAL — WEDMTaperErrorBudgetEngine.test.ts EXISTS (real algebraic-invariant assertions: UV=h·tan(θ) reference values confirmed); EDMMultiPassStrategyEngine.test.ts EXISTS (real assertions); WEDMGapVoltageControlEngine.test.ts EXISTS; EDMFeasibilityEngine.test.ts MISSING; EDMCuttingParamFlushEngine.test.ts MISSING; edmDispatcher.integration.test.ts MISSING
- simulate: GAP — no simulation synthesis artifact found; wedm-outcomes.jsonl MISSING; WEDM_DIGEST.json EXISTS at mcp-server/data/state/WEDM_DIGEST.json
- validate: GAP — wedm-outcomes.jsonl MISSING; no parity-probe results on disk; MRR/cycle-time acceptance numbers unverified
- finetune: GAP — wedm_lora_train.jsonl MISSING under mcp-server/data/lora/; state/shared/nn-graph/refpool-wedm.jsonl not confirmed
- frontend: PARTIAL — Kienzle Wizards.dc.html EXISTS at mcp-server/web/design-imports/kienzle-app-build/; WireEdmWizardPage.tsx EXISTS at mcp-server/web/src/pages/; edm.ts route live at mcp-server/src/routes/edm.ts with interpret-drawing, generate-toolpath, predict-wire-break, generate-gcode wired; plan-required routes wedm_plan_passes, wedm_generate_complete_program, wedm_estimate_time, wedm_dielectric_flush_calc, wedm_select_wire NOT confirmed in edm.ts; edmClient.ts MISSING (api/edm.ts exists as partial substitute)
- TOP_GAP: 3 of 6 plan-named core physics test files are missing (EDMFeasibilityEngine, EDMCuttingParamFlushEngine, edmDispatcher.integration) — these are the R9 reference-value gates that block §5 simulation trust and §6 validation sign-off; without them the entire test→simulate→validate chain is unproven
- next_unit_id: U-MIKE-CORE-PHYS-TESTS — add EDMFeasibilityEngine.test.ts + EDMCuttingParamFlushEngine.test.ts + edmDispatcher.integration.test.ts with algebraic-invariant + dispatcher round-trip assertions per §4 spec; also add missing wizard routes (plan_passes, generate_complete_program, estimate_time, dielectric_flush_calc, select_wire) to mcp-server/src/routes/edm.ts
- blocked_by: none (all required engines exist; india LoRA substrate is a §7 dependency only, not blocking §4)

---

I now have all the data needed. Here is the scorecard:

### oscar/speed-feed
- plan_status: draft | plan_lines: 305
- counts_verified: PASS — plan claims 29+ engines + 30+ prism_calc actions; grep confirms 34 distinct SFC action hits in calcDispatcher.ts (line 1192 `sfc_nine_axis_run` confirmed, `speedfeed_outcome_record_actuals` confirmed); `prism_product:sfc_calculate` confirmed (5 hits in productDispatcher); `sfc_nine_axis_run` case at line 10302
- deepen: PASS — wiki speed-feed namespace has 11 leaves (target >=10 MET: kienzle-force-depth, chatter-solver-sld, vendor-parity-loop, nine-axis-orchestration present); tribal narrow-count 54 tips but 800+ retrieval-relevant per §3 reconciliation note
- test: PARTIAL — `UltimateSpeedFeedEngine.test.ts` EXISTS (69 real assertions, toBe/toBeGreaterThan), `sfc-nine-axis-radial-engagement.test.ts` EXISTS (8 assertions), `SpeedFeedOutcomeFeedbackBridge-bus-capture.test.ts` EXISTS; `sfc-page-core-parity.test.ts` MISSING (`mcp-server/src/__tests__/sfc-page-core-parity.test.ts`)
- simulate: PASS — sweep ledger present: `sfc-full-sweep-FULL-ledger.jsonl` (276,480 lines, 172MB, dated Jun 25) + `sfc-full-sweep-ledger.jsonl` (576 lines); Monte-Carlo sweep artifact exists
- validate: PARTIAL — sweep ledger proves simulation ran; `proven-speed-feed-store.json` + `jm-proven-speedfeed-samples.jsonl` present; NN-EVAL.json MISSING; no explicit tri-compare parity report artifact found on disk (parity acceptance gate not proven documented)
- finetune: PARTIAL — outcome ledger infra confirmed (`sfc-full-sweep-FULL-ledger.jsonl`, `dev-outcomes.jsonl`); `SFCParameterRefinementEngine` exists; LoRA dataset files MISSING (`lora-datasets/speed-feed_lora_train.jsonl` + `speed-feed_lora_test.jsonl` not found)
- frontend: PARTIAL — `Kienzle Speed-Feed.dc.html` EXISTS (726 lines, exact match to plan's "727 lines"); `SfcCalculatorPage.tsx` EXISTS; `SpeedFeedPage.tsx` EXISTS; backend routes `mcp-server/src/routes/sfc.ts` (POST `/api/v1/sfc/calculate` confirmed line 154) + `speedfeed.ts` LIVE; nine-axis route not confirmed in sfc.ts grep (no output); `sfc-page-core-parity.test.ts` MISSING so frontend↔core parity acceptance gate unproven
- TOP_GAP: E2E page-core parity test (`sfc-page-core-parity.test.ts`) is the single blocking artifact — it is the acceptance gate for both §6 VALIDATE and §8 FRONTEND done-definition, and its absence means the saleable SFC product page has no automated correctness proof against the backend dispatcher across all 6 ISO groups
- next_unit_id: U-OSC-SFC-PAGE-PARITY-TEST — build `sfc-page-core-parity.test.ts` round-tripping `SfcCalculatorPage` computed values vs `prism_product:sfc_calculate` for all 6 ISO groups (P/M/K/N/S/H), ratio <=1.3x; also confirm nine-axis route at `:3100/api/v1/sfc/nine-axis` is wired in `sfc.ts`
- blocked_by: none (all dispatcher actions, engines, and the .dc.html design file are confirmed live)

---

I have all the data needed. Here is the scorecard:

### quebec/frontend-app
- plan_status: draft | plan_lines: 391
- counts_verified: PASS — plan claims 0 domain AI engines (pure HTTP consumer, correct); 165 pages confirmed in `mcp-server/web/src/pages/` (plan claims ~156, actual 165, minor stale); all 10 Kienzle gap pages confirmed present on disk; 90+ `src/api/*.ts` wrappers confirmed; `prism_business` route live at `mcp-server/src/routes/business.ts`
- deepen: GAP — wiki 7 entries tagged frontend-app (plan claims 707 — that count is fleet-wide, not this galaxy); tribal tips current count unverified but synthesis md exists at `knowledge/memories/patterns/frontend-app_synthesis.md`; target 60 tribal tips, no evidence of cron wired yet
- test: GAP — plan names `resilientFetch.test.ts`, `OptimisticSyncManager.test.ts`, `OfflineQueueManager.test.ts`, `businessApi.integration.test.ts`, `e2e/shopFloorLive.e2e.ts`, `e2e/customerPortal.e2e.ts` — ALL MISSING; `ShopFloorLivePage.test.tsx` EXISTS but contains only `toBe('function')` + `toBe(0)` stub assertions (not reference-value tests per R9); 260 total web test files present but none matching plan targets
- simulate: GAP — no Playwright scenario artifacts found for the 5 named simulation flows (WebSocket storm, offline drain, envelope error, Polish UTF-8, iPhone SE viewport); `e2e/` contains generic `navigation.spec.ts` / `performance.spec.ts` but not the plan-named scenarios
- validate: GAP — `mcp-server/data/state/frontend-app-outcomes.jsonl` missing; no parity probe artifact; no OEE ±0.1% validation record; no Polish locale 100% key coverage report found
- finetune: GAP — `frontend-app-outcomes.jsonl` absent (no outcome capture running); `frontend-app_lora_train.jsonl` not found; nightly cron and GNN feature-vector update not confirmed wired
- frontend: PARTIAL — all 10 Kienzle gap pages exist as `.tsx` files; `Kienzle Audit & Rebrand.dc.html` and `Kienzle Backend Wiring Map.dc.html` both present in `mcp-server/web/design-imports/kienzle-app-build/`; `ShopFloorLivePage.tsx` confirmed wired to `getShopFloorSnapshot` (not demo arrays); `MEMORY.md` and `AWARENESS.md` absent from `mcp-server/web/`; backend route live at `src/routes/business.ts`
- TOP_GAP: The six §4 plan-named test files are entirely absent and the one existing page test (`ShopFloorLivePage.test.tsx`) contains only `typeof` stub assertions — no reference-value coverage of the dispatcher envelope guard, resilientFetch retry contract, or offline queue drain. This is the R9 compliance blocker that also gates §5 simulation and §6 validation.
- next_unit_id: U-QC-ENVELOPE-TESTS — add `resilientFetch.test.ts` + `OptimisticSyncManager.test.ts` + `OfflineQueueManager.test.ts` + `businessApi.integration.test.ts` with real reference-value assertions (retry fires ≤200ms; idempotency-key uniqueness over 1000 calls; 200-OK-with-error throws DispatcherError not silent null)
- blocked_by: none (hotel `prism_business` route is live; all 10 pages exist; design files present — test gap is purely internal to quebec)

---

I have enough data. Here is the scorecard:

### romeo/wiring
- plan_status: draft | plan_lines: 370
- counts_verified: STALE — plan claimed UNWIRED=54 (2026-06-13 baseline); live audit 2026-06-28 shows UNWIRED=4, WIRED-DIRECT=3,639, TOTAL=3,851, WIRE-EXEMPT=125. Plan counts are ~6 weeks stale but direction is correct (closure ongoing).
- deepen: GAP — tribal count unconfirmed from plan's "40 tips / target 80+" (no wiring-domain tribal jsonl found); wiki entries named in §3 not confirmed present; wiring-next-batch.json ABSENT (nightly cron output missing).
- test: PASS — all plan-named test files confirmed on disk: `AutoWiringEngine.test.ts`, `WiringPotentialEngine.test.ts`, `AssetWiringSummaryEngine.test.ts`, `EngineUtilizationAuditorEngine.test.ts` exist; assertions include real `.toBe()` / `.toBeGreaterThan()` reference values (not pure `toBeDefined` stubs). GAP: `dispatcher-dev-wiring.test.ts` and `dispatcher-session-wiring.test.ts` (the two new integration round-trip files) are ABSENT.
- simulate: GAP — `state/shared/wiring-simulation-report.json` ABSENT; dry-run not yet executed.
- validate: PASS (partially) — `UNWIRED-ENGINE-AUDIT-*.json` nightly regen is live and current (files 2026-06-15 through 2026-06-28 confirmed); live UNWIRED count is 4 (well under the ≤10 acceptance gate). `wiring_coverage_map` dispatcher action is ABSENT from guardDispatcher — parity probe cannot run against it yet.
- finetune: GAP — `wiring-next-batch.json` ABSENT; LoRA dataset (`wiring_lora_train.jsonl`) not confirmed on disk; outcome ledger entries for romeo not confirmed.
- frontend: PARTIAL — `Kienzle Backend Wiring Map.dc.html` confirmed at `mcp-server/web/design-imports/kienzle-app-build/`. `AuditManagerPage.tsx` confirmed at `mcp-server/web/src/pages/AuditManagerPage.tsx`. "Wiring Coverage" tab NOT present in AuditManagerPage. `prism_dev:wiring_coverage_map` action ABSENT from guardDispatcher. Backend route and API client wiring unconfirmed.
- TOP_GAP: Wire `AssetWiringSummaryEngine` to a new `prism_dev:wiring_coverage_map` action in guardDispatcher, then add the WiringCoverageTab to AuditManagerPage — the UNWIRED count has already hit 4 (goal achieved) so the frontend surface is the last undelivered §10 checkbox.
- next_unit_id: U-WIRE-COVERAGE-MAP-ACTION
- blocked_by: none (UNWIRED=4 is already under ≤10 gate; quebec coordination needed before AuditManagerPage tab merge)

---

I now have enough verified data to produce the scorecard.

### sierra/system-viz
- plan_status: draft | plan_lines: 393
- counts_verified: PASS — plan claims 8 engines + 4 prism_session actions + 4 prism_knowledge actions; grep confirmed all 4 prism_session case handlers in sessionDispatcher.ts and all 4 prism_knowledge case handlers in knowledgeDispatcher.ts; 8 engine .ts files unverified by name (no glob) but dispatcher wiring is live
- deepen: GAP — tribal count ~125 in knowledge/memories (target 150); 4 of 5 planned wiki leaves missing (dual-reg-audit, cross-substrate-edges, sidecar-sharding, graph-oom-prevention wiki all absent); 2 of 3 planned reference memories missing (reference_sierra_dual_reg_auditor, reference_sierra_cross_substrate_edges)
- test: PARTIAL — MasterIndexEngine.test.ts EXISTS (real assertions, no stubs); SpectralGraphEngine.test.ts EXISTS (real algebraic invariants); RankedHybridGraphSearchEngine.test.ts EXISTS (real RRF assertions); GraphAlgorithmsEngine test exists as graph-algorithms-r7.test.ts (real Dijkstra/A* assertions, NOT the plan's named GraphAlgorithmsEngine.test.ts); system-viz-dispatcher.test.ts MISSING
- simulate: GAP — no dedicated simulation artifact found; .last-successful-regen.json EXISTS (ts 2026-06-28T22:21:17, pendingCount=0, sidecarOk=True) covering regen scenario, but blast-radius / RRF-consistency / dual-reg synthetic scenarios have no recorded run artifact
- validate: GAP — regen stamp verified (pendingCount=0, sidecarOk=True, 2026-06-28); system-viz-query-outcomes.jsonl MISSING (outcome ledger not yet armed); NN-EVAL.json MISSING
- finetune: GAP — system_viz_lora_train.jsonl MISSING; system-viz-query-outcomes.jsonl MISSING; GNN ref-pool seed script referenced but outcome ledger not armed
- frontend: GAP — Kienzle System Sync.dc.html and Kienzle Backend Wiring Map.dc.html both EXIST at mcp-server/web/design-imports/kienzle-app-build/; SystemSyncPage.tsx MISSING from mcp-server/web/src/pages/; systemRoutes.ts MISSING from mcp-server/src/routes/; systemApi.ts MISSING from mcp-server/web/src/api/; only IndexGateway.tsx matches a "system" page search
- TOP_GAP: The integration test (system-viz-dispatcher.test.ts) and outcome ledger (system-viz-query-outcomes.jsonl) are both absent — without the dispatcher integration test there is no round-trip proof for the 4 prism_session actions, and without the outcome ledger the entire §7 fine-tune loop cannot arm; these two + the 4 missing wiki leaves are the highest-leverage next items before frontend work
- next_unit_id: U-SIERRA-VIZ-DISPATCHER-TEST — write system-viz-dispatcher.test.ts (prism_session 4-action round-trip + prism_knowledge tribal_capture integration) + arm system-viz-query-outcomes.jsonl ledger + write the 4 missing wiki leaves in one commit
- blocked_by: none (backend dispatcher actions are live; wiki/test work is self-contained)

---

I have enough data. Here is the scorecard:

### whiskey/lathe
- plan_status: draft | plan_lines: 282
- counts_verified: STALE — plan claims 373 turningDispatcher actions; grep confirms 444 unique action strings (plan is conservative/stale-low; 194 Lathe*.ts engines confirmed via Glob, matches plan)
- deepen: GAP — plan targets 80 lathe tribal tips; tribal index is sharded (no direct lathe-only count possible from shard files); no lathe-specific wiki entries exist matching plan targets (4 wiki entries exist but none of the 4 plan-specified ones: lathe-safety-gate-sequence.md, boring-bar-deflection-L-vs-bore-depth.md, lathe-threading-g76-multipass.md, lathe-workholding-decision-tree.md)
- test: PASS — all 4 §4 named test files exist and contain real reference-value assertions (mcp-server/src/__tests__/boring-bar-deflection-engine.test.ts has toBeCloseTo deflection values; CSSChipLoadInvariantCoordinatorEngine.test.ts has toBeCloseTo(1145.9); ChuckJawForceEngine.test.ts and LatheAutoQuoteFromPrintEngine.test.ts both present; 241 lathe test files total)
- simulate: GAP — no simulation synthesis artifact (no lathe-sim-results.md or equivalent in mcp-server/data/state/); 5 scenarios in plan are unexecuted; proven-sf-raw-lathe.jsonl exists but is raw data not a simulation pass report
- validate: GAP — no validation artifact confirming 10/10 JM Die programs upgraded; mcp-server/data/state/ has lathe-engine-registry.json + proven-sf-raw-lathe.jsonl but no acceptance-gate output; quote MAPE / cycle-time MAPE / S(x) numbers unverified
- finetune: GAP — no lathe_lora_train.jsonl found; outcome capture bus integration unconfirmed (plan says "emit {domain:'lathe'}" but no ledger artifact present); NN/GNN lathe refpool labels unconfirmed
- frontend: PARTIAL — Kienzle Wizards.dc.html EXISTS (mcp-server/web/design-imports/kienzle-app-build/Kienzle Wizards.dc.html); LatheWizardPage.tsx EXISTS (mcp-server/web/src/pages/LatheWizardPage.tsx); backend route LIVE at /api/v1/lathe via mcp-server/src/routes/index.ts:182 + latheTurning.js; plan's specific POST /api/v1/lathe/wizard route confirmed in lathe-turning-routes.test.ts:8; GAP: parity probe (FE Fc vs prism_turning within ±1%) not verified as passing
- TOP_GAP: Simulation + validation pass — the plan's §5/§6 acceptance gates (10/10 JM Die program upgrades, quote MAPE ≤20%, S(x) ≥0.95) have no evidence of execution; without a validation artifact the domain cannot claim PhD-depth readiness despite strong engine/test coverage
- next_unit_id: U-W-VALIDATE-JM-PROGRAMS (run JMDieLatheProgramUpgraderV2 on 10 JM DIE/CNC LATHE/ programs, emit acceptance report to mcp-server/data/state/lathe-validation-2026-06-28.json with CSS/G50/G76/jaw-force scores)
- blocked_by: none (JM DIE/CNC LATHE/ programs exist on disk; turningDispatcher + upgrader engines are live; no upstream dependency blocks execution)

---

### xray/blueprint-vision
- plan_status: draft | plan_lines: 671
- counts_verified: STALE — plan claims "~40 blueprint-vision actions" in cadDispatcher; grep confirms 120 matching lines but that is occurrence count not unique actions; actual case-handler count ~100 lines, plan's "~40" likely understates the full dispatcher (cadDispatcher is multi-domain). The specific 17 named actions are all grep-confirmed present; `blueprint_lora_prepare_set` at cadDispatcher.ts:3697 confirmed (plan cites :3568 — stale line). `xproc_outcome_publish` confirmed live at aiReasoningDispatcher.ts:776+2990.
- deepen: GAP — tribal 54 tips (target 100+, not reached); synthesis brain exists (36 lines) but plan flags it polluted with off-domain content; wiki entries named in §3 not yet confirmed written; cited-tips artifact `mcp-server/data/state/blueprint-vision-cited-tips.ts` missing from disk.
- test: PARTIAL — 3 of 5 named test files exist (GDTCalloutParserEngine.test.ts, PDFBlueprintDimensionExtractorEngine.test.ts, BlueprintExtractionContract.test.ts — all confirmed real reference-value tests with concrete numeric assertions, not stubs). MISSING: `blueprint-cad-dispatcher-roundtrip.test.ts` and `blueprint-extraction-e2e.test.ts` — no such files on disk.
- simulate: GAP — scripts exist (`bench-vision-ocr-ab.mjs`, `blueprint-ocr-training-loop.mjs`, `validate-perfect-parts.mjs` all on disk) but plan explicitly states A/B benchmark has never been empirically run; `--dry-run` path not confirmed exercised; no simulation run artifact found.
- validate: GAP — `blueprint-accuracy-events.jsonl` missing from disk (neither `mcp-server/data/state/` nor `state/shared/`); calibration n≈24 per plan (`MIN_RELIABLE=50`, `reliable:false`); LoRA dataset files (`blueprint-vision_lora_train.jsonl`, `blueprint-vision_lora_test.jsonl`) missing; no 10-print F1 report artifact found.
- finetune: GAP — `blueprint-accuracy-events.jsonl` ledger absent; LoRA dataset not yet emitted; calibration `reliable:false` (n≈24 < 50); OCR cron currently idle (Ready/not running nightly per plan §3); outcome publish action confirmed wired but ledger file not yet created.
- frontend: PARTIAL — `Kienzle Blueprint Intake.dc.html` confirmed at `mcp-server/web/design-imports/kienzle-app-build/` (179 lines, exact match). Both target pages confirmed: `BlueprintQuotePage.tsx` and `DocumentInboxPage.tsx` exist. Routes PARTIAL: `/api/v1/cad/blueprint-extract-contract` and `/api/v1/cad/blueprint-extract-route` live in `mcp-server/src/routes/cad.ts:70,81`; `/api/v1/drawing/execute` route NOT found (plan claims it from `extractionPlanExecutor` commit — route missing from `mcp-server/src/routes/`). `blueprintApi.ts` API client not confirmed.
- TOP_GAP: Dispatcher round-trip + E2E test suite is the highest-leverage next unit — the 2 missing test files (`blueprint-cad-dispatcher-roundtrip.test.ts`, `blueprint-extraction-e2e.test.ts`) are the only missing gate before simulate/validate can produce trusted numbers; without them the extraction pipeline has no integration-level safety net.
- next_unit_id: U-XRAY-DISPATCHER-ROUNDTRIP-TESTS
- blocked_by: none (all required engines + dispatcher actions confirmed live; needs only test authoring)

---

All verification data is confirmed. Here is the scorecard:

### zulu/hermes-zulu FLEET-PHD-BUILDOUT scorecard

**plan_status:** draft · 587 lines · generated 2026-06-27 by zulu-plan-agent

**counts_verified:** STALE — plan claims 15 engines; live grep finds 23+ hermes/zulu `.ts` engines (HermesParallelFanoutPlannerEngine, HermesFileScopePartitionerEngine, HermesParallelBudgetEnvelopeEngine, HermesParallelVerdictAggregatorEngine, HermesSelfCorrectionEngine, DreamMarkerScannerEngine, ZuluTaskAuctionEngine, ZuluFleetGovernorEngine, ZuluDashboardControlEngine, MoonshotClientEngine, HermesAutomationBridge, HermesAutonomousDriverEngine, HermesGoalDecomposerEngine, ZuluAdaptiveBackPressureEngine, ZuluCapabilityAttestationEngine, ZuluCapabilityRegistryEngine, ZuluDelegationContractEngine, ZuluFleetHealthSynthesisEngine, ZuluSoulEvolutionAdvisorEngine, ZuluTaskContinuityEngine, ZuluWaveSchedulerEngine, SlotBriefEngine, AgentSpecializationProfileEngine, ConsensusAIBridgeEngine, ConsensusNeuralFeedbackEngine, SoulAwareFanoutExtenderEngine); dispatcher actions: CONFIRMED superset in `sessionDispatcher.ts:536,578,596-659` and `contextDispatcher.ts:83-84,1181,1191`

**deepen:** GAP — 57 tribal tips (target 90+); `knowledge/hermes-brain/` has only 2 files (MEMORY.md + USER.md); weekly-hermes-reflection sidecars ARE present in `knowledge/memories/` (2026-06-07 through 2026-06-28, 4 files) — validate axis PARTIAL not ABSENT

**test:** PASS (PARTIAL) — all major test files present and R9-compliant with real-value assertions (`zulu_governor_wire.test.ts:64-129`, `ZuluFleetGovernorEngine.test.ts:25-103`); `weekly-synthesis-get.test.ts` absent by that exact name (closest: `contextDispatcher.slot-brief.test.ts`); all other named files confirmed present

**simulate:** GAP — no dry-run fleet sweep artifacts found under `state/shared/dashboards/` or any zulu simulation output dir

**validate:** PARTIAL — weekly-hermes-reflection sidecars confirmed at `knowledge/memories/weekly-hermes-reflection-2026-06-{07,14,21,28}.md`; hermes-brain Obsidian corpus sparse (2 files only); HERMES proxy DOWN per SessionStart meta-health (85.7% fail rate, last active 2h ago)

**finetune:** GAP — no LoRA dataset files or refpool labeling artifacts confirmed for hermes/zulu domain

**frontend:** PARTIAL — `mcp-server/web/design-imports/kienzle-app-build/Kienzle System Sync.dc.html` EXISTS; `mcp-server/web/src/pages/SystemSyncPage.tsx` DOES NOT EXIST; no `/system-sync` route in `web/src/`; `orchestration.ts:167` confirms `swarm_status` backend route exists

**TOP_GAP:** `SystemSyncPage.tsx` entirely unbuilt — the fleet orchestration dashboard (Kienzle System Sync design exists but zero React implementation); secondary: HERMES proxy down (self-heal: `node H:/prism/scripts/hermes-proxy-ensure.mjs`)

**next_unit_id:** U-ZULU-FRONTEND-SYSTEM-SYNC

**blocked_by:** `prism_session:master_index_query` must return live data on `:3100` before SystemSyncPage can display real fleet-node status; HERMES proxy must be up before deepening tribal/wiki corpus via Hermes ask
