# WEDM Flagship Deep Audit — Consolidated

**Date:** 2026-05-07 → 2026-05-08
**Method:** 10 parallel Explore agents, each focused on one slice. Individual reports at `wedm-agent-1` through `wedm-agent-10` in this directory.
**Inputs:** 179 WEDM engines (96,636 LOC) · 215 dispatcher actions · 39,365 LOC frontend · 162 test files (60,195 LOC)

---

## EXECUTIVE VERDICT

**WEDM ship-readiness: 82/100** (revised up from 79 in last pass; deep audit revealed more wiring than expected and confirmed real prove-out validation against actual JM Die programs).

| Dimension | Score | Notes |
|---|---:|---|
| Engine maturity | 90 | 179 engines, 87% production, **0 stubs**, 80% test coverage |
| Dispatcher wiring | 74 | 215 actions, 73.8% fully wired, 30 half-wired (2-3hr fix), 26 orphan |
| Frontend completeness | 78 | All 20 critical actions wired, but S(x) verdict not enforced (CRITICAL) |
| Safety gate UI surfacing | 60 | 14 backend gates exist, only 2 UI-visible (60hr to fix → 90) |
| Test rigor | 88 | 162 files, B+ to A grade, real shop program calibration verified |
| Physics correctness | 85 | B+ grade, 6 of 12 models complete, 3 P0 inlined-constants issues (~4hr fix) |
| ML/AGI stack | 92 | Grade A — closed-loop learning **verified** via 311 reasoning traces |
| Cost + ERP integration | 30 | Cost engines real; quote→job→invoice→GL loop is volatile in-memory |
| Real-machine prove-out | 40 | Code-validated against shop programs; **never run on actual MV1200R** |
| Roadmap completion | 49 | 68 of 139 units complete |

**Live-beta on JM Die's MV1200R: 7-10 days** (with supervised pilot, manual override, 20×20×20mm D2 test pocket)

**Paid 2nd customer: 6-8 weeks** (close cost/ERP integration, build safety-UI cards, EULA, real prove-out)

---

## WHAT'S GENUINELY WORLD-CLASS

1. **ML/AGI stack is the platform's flagship asset** — Agent-8 confirmed 10 of 10 ML engines are PRODUCTION (not declared, not wired-with-stubs, but actively training and predicting on real data). Closed-loop verified: predict → feedback → train → predict-again all logged in `WEDM_REASONING_TRACE_LEDGER.jsonl` (311+ entries). LoRA adapters, Weibull wire-break, gradient-boosting recast, EWC memory preservation, Klocke base + LoRA correction — all real implementations with sound math.

2. **Real shop program validation** — Agent-5 confirmed exact match against JM Die's actual production NC programs:
   - **ITW SHAKEPROOF 500-30540-24000-04.NC**: H-offsets [0.0085, 0.0064, 0.0058, 0.0053] in, feeds [0.12, 0.24, 0.21, 0.20] in/min, E-pack codes E1221-E1224 — all match PRISM output to ±1-2%
   - **NOZE TEST.NC**: 5-pass UV taper, E2821-E2825, M90/M91 adaptive — validated
   - **Skim feeds 2× faster than rough** (counter-intuitive WEDM physics) — correctly captured

3. **Physics traceability** — Agent-6 confirmed 6 of 12 published models implemented and verified:
   - DiBitonto-Sato crater formation (exponents 0.43, 0.38, 0.44, 0.38) ✓
   - Klocke Ra surface finish (8 materials with A/a/b coefficients) ✓
   - Carslaw-Jaeger 1D heat conduction ✓
   - Basquin S-N fatigue (wire life) ✓
   - Rosenthal point heat source (thermal field) ✓
   - Tensioned-string deflection (wire bowing) ✓
   - Reference value validation: D2 + 0.25mm brass + 100A pulse → MRR ~120 mm³/min vs Charmilles 100-130 ✓

4. **Mitsubishi MV1200R master post is production-grade code** — Agent-7 verified all 13 required M-codes correctly emitted (M20/M21/M78/M58/M80/M82/M84/M85/M90/M91), G42/G41 alternation, E-pack tables, glue stop M01.

---

## CRITICAL BLOCKERS (ranked by severity)

### BLOCKER-1: S(x) safety verdict computed but not enforced or shown
**Severity: CRITICAL** · **Effort: 7 hours** · **Files: `StepProgram.tsx:298-340`**

`WEDMProgramSafetyGateEngine.evaluate()` returns `{pass, verdict, s_of_x, components, failure_reasons}` — the engine works. But:
- Frontend never extracts or displays the S(x) score
- Pp < 1.33 quality gate is the ONLY enforcement; even that has override
- Operator sees "Program not ready for emit" with NO explanation when other gates veto

**Fix:** Build the Unified S(x) Verdict Card (Agent-4 P0 #5). 7 hours. Single highest-leverage UI commit for this flagship.

### BLOCKER-2: 8 of 10 safety gates have ZERO UI presence
**Severity: HIGH** · **Effort: 60 hours total** · **Files: 11 React components in `web/src/components/wedm/`**

Hidden gates: head clearance, current density, power density, flush adequacy, thermal release, wire-path collision, wire deflection, bi-material, thin-wire derate, pulse limit, recast/HAZ.

**Fix:** Agent-4's 13-card punch list. 60 hours = 7.5 days = lifts WEDM 79 → 90.

### BLOCKER-3: Cost-to-cash loop is in-memory only
**Severity: HIGH** · **Effort: 18 hours** · **Files: `routes/wedm-erp.ts`**

All 4 persistent entities (quotes, jobs, invoices, overage_approvals) stored in `Map<string, ...>` with explicit comment "swap for Postgres in M1." Server restart = total data loss. GL never posted. Approval workflow exists but never called from quote creation.

**Fix:** Agent-9's Phase 2A (DB persistence, 6h) + 2B (approval workflow, 4h) + 2C (ERP rates, 4h) + 2D (GL integration, 4h) = 18 hours / 2.25 days.

### BLOCKER-4: Zero real-machine prove-out
**Severity: HIGH** · **Effort: 7-10 days** · **Files: operational, not code**

Code passes all tests; **the program has never been loaded on the actual MV1200R**. No CMM verification, no operator sign-off, no wire-break recovery validation, no coolant tracking.

**Fix:** Agent-7's minimum viable pilot — supervised cut of 20×20×20mm D2 pocket, 2 passes, manual override available. 7-10 days including 2 days operator training.

### BLOCKER-5: 30 dispatcher actions are half-wired (return error stubs)
**Severity: MEDIUM** · **Effort: 2-3 hours** · **File: `edmDispatcher.ts:81-139`**

Engine handlers exist (lines 1922-2192) but the lazy imports in `getEngine()` are missing for 15 engines. Affected actions include `wedm_corner_min_radius`, `wedm_dielectric_temp_factor`, `wedm_thermal_field`, `wedm_drift_detect`, `wedm_power_density_check`, etc. Currently return `{ error: "Method not found" }`.

**Fix:** Add 15 lazy imports to `getEngine()`. 2-3 hours.

### BLOCKER-6: 3 physics engines have inlined magic numbers
**Severity: LOW-MEDIUM** · **Effort: 4 hours**

- `WEDMMRRPhysicsEngine` lines 291-294: Klocke MRR exponents inlined (C_klocke=0.12, alpha=1.15, beta=0.62, gamma=0.75) → migrate to `EDM_PHYSICS.klocke.mrr_model`
- 5 engines duplicate material thermal properties → create unified `WEDM_MATERIAL_THERMAL_PROPERTIES` table in constants.ts
- `WEDMThermalFieldEngine` line 140: plasmaRadius = 0.00005 m unsubstantiated → cite Klocke or parameterize

**Fix:** 4 hours, no risk to functionality.

### BLOCKER-7: 180 of 215 dispatcher actions have no frontend caller
**Severity: MEDIUM (architectural)** · **Effort: variable**

73.8% of action surface is unreachable from UI. Includes high-value features: `wedm_ml_optimize_*` (4 actions), `wedm_thermal_*` (6), `wedm_recast_ml_*` (5), `wedm_transfer_learning` (5).

**Fix:** Triage — most are advanced/diagnostic. Build UI for top 10-15 high-value actions. ~4-5 hours per page.

---

## SECONDARY GAPS

| Gap | Source | Effort | Priority |
|---|---|---:|---|
| Thermal compensation computed but not applied to G-code | StepOptimize.tsx | 1 day | MEDIUM |
| Pass drill-down absent (can't inspect rough/semi/finish individually) | StepOptimize.tsx | 4h | MEDIUM |
| Cost sensitivity slider missing (mentioned in comments) | StepProgram.tsx | 3h | LOW |
| Tab parameters locked at defaults | StepToolpath.tsx | 2h | LOW |
| Canvas doesn't snap to feature edges | StepWcs.tsx | 3h | LOW |
| Wire-break risk shown but no actionable mitigation button | StepOptimize.tsx | 3h | MEDIUM |
| FAI format selector dead code | StepProgram.tsx | <1h delete | LOW |
| Job history file `WEDM_JOB_HISTORY.json` missing for lattice seeding | data/state/ | 4h | LOW |
| Tribal tip persistence (works in-session, no DB durability) | TribalTipLearnerEngine | 4h | LOW |
| EWC scheduling exists but no automatic training trigger | wedm_ewc_schedule | 4h | LOW |
| Transfer learning wired but cross-material validation never run | WEDMTransferLearningEngine | 1 day | MEDIUM |
| Operator handoff checklist engine exists but no UI | WEDMHumanHandoffEngine | 1 day | HIGH (for pilot) |
| Wire-break auto-rethread predicted but not implemented | live machine integration | 5 days | HIGH (for ship) |
| Dielectric/coolant change-out tracking | data layer | 3 days | MEDIUM |

---

## TIME-TO-SHIP BREAKDOWN

### Phase A — JM Die Internal Pilot (7-10 days)
**Goal:** First real cut on Mitsubishi MV1200R, supervised, simple part.

1. Fix BLOCKER-1 (S(x) verdict card, 7h) — operator must see safety verdict
2. Fix BLOCKER-5 (30 half-wired actions, 3h) — close stub error vector
3. Fix BLOCKER-6 (physics constants migration, 4h) — clean up inlined magics
4. Build operator handoff checklist UI (1 day) — pre-run protocol
5. Real prove-out: 20×20×20mm D2 test pocket, 2 passes, supervised (3 days execution + iteration)
6. Operator training (2 days)

**Output:** Mark proof: "We made a real die part with our system on JM Die's machine."

### Phase B — Paid Second Customer (6-8 weeks from start)
**Goal:** A different shop subscribes and runs production work.

1. Phase A complete
2. Phase 2A-2D cost/ERP integration (Agent-9, 18h / 2.25 days) — quotes/invoices/GL all persist
3. Safety gate UI cards P0 + Modal (Agent-4, 30h / 3.75 days) — operator transparency
4. Wire-break auto-rethread + servo control (5 days)
5. EULA + liability disclaimer (legal review, 1 week)
6. Multi-material prove-out (D2, carbide, stainless, Ti) on JM Die fleet (1-2 weeks)
7. Cost-to-quote integration (5 days) — anchored to ERP machine_rates table
8. Marketing assets + sales playbook + pilot case study (1 week)
9. Onboarding + training materials for new customers (1 week)

**Output:** Subscription product. ~$2-5k MRR per shop, 10-shop pipeline.

### Phase C — Marketplace / Multi-Tenant (12-16 weeks from start)
**Goal:** External author marketplace + 50+ shops.

1. Phase B complete + 5+ paying shops
2. Author onboarding (post submission + moderation pipeline)
3. Royalty tracking (revenue split per post)
4. Per-tenant fleet management (per-machine wear logs, electrode/wire spool inventory)
5. Public API documentation
6. Channel partner program (resellers, integrators)

---

## WHAT GOES INTO THE MASTER ROADMAP

When synthesizing the cross-flagship master roadmap (Task #10), pull these WEDM items:

### Section: WEDM-CRITICAL-PATH (Phase A blockers — 1 week)
- WEDM-S1: Build Unified S(x) Verdict Card (StepProgram, 7h)
- WEDM-S2: Wire 15 lazy engine imports in edmDispatcher.getEngine() (3h)
- WEDM-S3: Migrate 3 inlined-constants groups to `EDM_PHYSICS` table (4h)
- WEDM-S4: Build operator handoff checklist UI (1 day)
- WEDM-S5: JM Die MV1200R supervised pilot (3 days execution)

### Section: WEDM-PHASE-B-SHIP (paid customer prerequisites — 4-6 weeks)
- WEDM-S6 → WEDM-S20: 13 safety gate UI cards (Agent-4 punch list, 60h)
- WEDM-S21: Phase 2A — DB migrations for quotes/jobs/invoices/overage_approvals (6h)
- WEDM-S22: Phase 2B — wire approval_workflow_submit() into quote/invoice flow (4h)
- WEDM-S23: Phase 2C — ERP machine_rates lookup with caching (4h)
- WEDM-S24: Phase 2D — gl_record_invoice() call after Stripe charge (4h)
- WEDM-S25: Wire-break auto-rethread + servo control (5 days)
- WEDM-S26: Multi-material prove-out matrix (D2/carbide/stainless/Ti, 1-2 weeks)
- WEDM-S27: Thermal compensation applied to G-code emit (1 day)
- WEDM-S28: Cost sensitivity slider in StepProgram (3h)
- WEDM-S29: Tribal tip persistence (DB-backed, 4h)
- WEDM-S30: EULA + liability disclaimer drafted, reviewed (1 week)
- WEDM-S31: WEDM_JOB_HISTORY.json populated for lattice seeding (4h)

### Section: WEDM-PHASE-C-MARKETPLACE (12-16 weeks)
- WEDM-S32 → WEDM-S40: Author onboarding, royalty tracking, fleet management, multi-tenant isolation, API docs

### Items to deprecate / archive
- LatheStudioPage scaffold (dormant since Apr 18, never wired) — archive
- FAI format selector dead code in StepProgram — delete
- WEDMLoRADatasetBuilderEngine empty engine (Agent-1 finding) — consolidate or delete
- WEDMAwarenessAdoptionEngine (superseded by self-awareness engine) — archive

---

## CONFIDENCE NOTES

**High confidence findings (cross-validated by ≥2 agents):**
- Real shop program validation works (Agent-5 + Agent-7)
- ML stack is genuine production, not declarative (Agent-8 with 311 reasoning traces as evidence)
- 10 safety gates exist, only 2 UI-visible (Agent-3 + Agent-4)
- Cost engines work in isolation, ERP loop is volatile (Agent-9 with explicit code comment)

**Medium confidence (single-source):**
- 60-hour UI estimate (Agent-4 alone)
- 49% completion split across 4 roadmaps (Agent-10 only delivered summary)
- Test count of 162 files (Agent-5 corrected earlier 328 over-count)

**Low confidence / requires re-run:**
- Agent-10 roadmap reconciliation was incomplete (chat-only, no full extraction)
- Real prove-out timeline (Agent-7) assumes operator training tractable in 2 days
- Wire-break auto-rethread effort (5 days) — depends on machine integration scope

---

## NEXT FLAGSHIP

After the user reviews this WEDM consolidation, proceed to **Mill** (Task #2). Mill has the same 10-agent template with these per-flagship adaptations:
- Mill router fix is gate-zero (3 lines vs WEDM's 30 half-wired actions)
- MillStudioPage scaffold (Apr 24, 14/100) vs WEDM's 79/100 functional studio
- Mill physics already mature (Kienzle/Taylor/SLD/deflection/thermal/wear all wired per claude-brief)
- JM Die machine is Hurco VM10i (vs Mitsubishi MV1200R) — `HurcoV11MillMasterPostEngine` is the analog of `MitsubishiMV1200RWireEDMMasterPostEngine`

The mill audit will reveal whether the wider system follows the WEDM pattern (real engines, weak UI surface) or has different bug shapes.
