# MILL Flagship Deep Audit — Consolidated

**Date:** 2026-05-08
**Method:** 10 parallel Explore agents. Individual reports `mill-agent-1` through `mill-agent-10`.
**Scope:** 71 mill engines (~85K LOC) · 103 dispatcher actions · 12 HTTP endpoints · 141 test files · 5-machine JM Die fleet
**JM Die fleet (corrected by user):** Haas VF-2, Hurco VM30i (NOT VM10i), Haas OM2, Roku-Roku HC-658 II, Okuma M460V-5AX

---

## EXECUTIVE VERDICT

**Mill ship-readiness: 68/100**

Mill has the strongest backend in the platform (engines, ML, physics, tests all production-grade) but the weakest shipping path (router unregistered, frontend mostly stub, ERP unwired). **The 3-line router registration is the single highest-leverage commit available across the entire platform.**

| Dimension | Score | Notes |
|---|---:|---|
| Engine maturity | 92 | 71 engines, 90% production, 0 stubs (1 placeholder), 80% test coverage |
| Dispatcher wiring | 70 | 103 actions, 49 fully-wired + 54 half-wired, **router NOT registered** (BLOCKER) |
| Frontend completeness | 67 | Upload/Wizard/Results trio real (16-min fixes); MillStudioPage 917 LOC scaffold orphaned |
| Safety gate UI | 45 | 8 backend gates, **0 UI visible** to operator |
| Test rigor | 88 | 141 files, 99.6% concrete assertions, 100% JM Die fleet coverage |
| Physics correctness | 92 | Grade A, ISO 3685 / Altintas / Sandvik all matched, no inlined constants |
| ML/AGI stack | 95 | **EXCEEDS WEDM** — 47 engines, 3 training scripts, 7,986 reasoning traces (25.7× WEDM) |
| Cost + ERP integration | 5 | Worse than WEDM. Cost action calls non-existent engine. 0% ERP wiring. |
| JM Die fleet readiness | 50 | Haas VF-2 ready today (26 programs); Hurco VM30i engine targets WRONG MODEL |
| Roadmap completion | 30 | 5 competing roadmaps, ~400-500 person-days unfinished |

**Live-beta on JM Die's Haas VF-2: 1-2 days** (router fix + supervised pilot, FONTANA B-1289-11 already proven)
**Paid 2nd customer: 8-12 weeks** (Hurco fix, safety UI cards, Phase 2 ERP, multi-machine prove-out, EULA)

---

## WHAT'S GENUINELY WORLD-CLASS

1. **ML/AGI stack EXCEEDS WEDM** — Agent-8 found:
   - 47 ML/AGI engines (vs WEDM's 10)
   - **3 complete training scripts** that work on real JM Die NC programs (vs WEDM's 0)
   - **7,986 reasoning trace entries** in `MILLING_REASONING_TRACE_LEDGER.jsonl` vs WEDM's 311 (25.7× more)
   - Every trace includes `physics_validated: true` + multi-engine reasoning + confidence scoring
   - Active wiring evidence: 5 BATCH commits in 36 hours (Batches 1-5) wiring 30 engines

2. **Physics is canonically correct (Grade A)** — Agent-6 verified:
   - All flagship engines (KienzleForceModel, ToolWearProgression, ChatterStabilityLobe, ToolAssemblyDeflection, CuttingThermal) properly import from `src/physics/constants.ts`
   - Zero inlined Kienzle/Taylor coefficients in engine source
   - Reference value validation: 4140+12mm carbide endmill → calculated Fc=738N, P=5.6kW match Sandvik published 600-900N, 4-7kW
   - Cross-validated against ISO 3685, Altintas (2012), ASM Vol. 2, Machinery's Handbook 32, Kennametal 2023

3. **Test rigor matches production claim** — Agent-5 found:
   - 141 mill test files, 99.6% concrete assertions (no `toBeDefined` blanket stubs)
   - 100% JM Die fleet coverage including Hurco VM30i, Okuma M460V-5AX, Haas VF-2, Haas OM-2, Roku-Roku HC-658 II
   - 23 materials × 27 tools × 5 machines × 11 strategies variability matrix
   - Real shop program calibration (FONTANA, ITW SHAKEPROOF, ALL STAR, OPTIMAS)
   - Adversarial safety gate testing present

4. **Mill = production claim VERIFIED** — Agent-1 confirmed:
   - 64 of 71 engines (90%) production-grade
   - All flagship physics engines (Kienzle/Taylor/SLD/deflection/thermal/wear/chatter) wired
   - HurcoV11MillMasterPostEngine 1,664 LOC, OkumaOSPMillMasterPostEngine 1,618 LOC, FiveAxisOrchestration 1,810 LOC
   - Top 20 flagship engines: 19,357 LOC

---

## CRITICAL BLOCKERS (ranked by severity)

### BLOCKER-1: Mill router never registered — 3-line fix
**Severity: CRITICAL** · **Effort: 30 minutes** · **File: `mcp-server/src/routes/index.ts`**

`createMillingRouter` is NOT imported and NOT registered. All 12 milling HTTP endpoints return 404. Frontend Upload/Wizard/Results trio cannot reach backend.

**Fix:**
```typescript
// Line 43:
import { createMillingRouter } from "./milling.js";

// Line 133:
app.use("/api/v1/milling", createMillingRouter(callTool));
```

**Single highest-leverage commit available across PRISM.** Unblocks 85 dispatcher actions + 5 frontend pages + entire mill UI flow.

### BLOCKER-2: Hurco engine targets wrong machine model
**Severity: CRITICAL** · **Effort: 2-3 days** · **File: `engines/HurcoV11MillMasterPostEngine.ts`**

Engine lines 3-14 hardcode VMX24 specs (X=24"/Y=20"/Z=24", 10K RPM, 15 HP, CT40). **JM Die's actual machine is VM30i** (different envelope/spindle).

**Fix:**
1. Verify actual JM Die Hurco model from data nameplate
2. Read VM30i datasheet, extract correct kinematics
3. Update HurcoV11MillMasterPostEngine constants OR create dedicated `HurcoVM30iEngine.ts`
4. Validate against 1 Fontana grip block program

### BLOCKER-3: 8 backend safety gates, 0 UI visible
**Severity: HIGH** · **Effort: 65-82 hours / 8-10 days** · **Files: web/src/components/mill/**

Backend has CollisionDetection, MachineEnvelopeGuard, ChatterStabilityLobe, ToolDeflectionPrediction, ThermalAnalysis, SpindlePowerCheck, SingularityAvoidance (5-axis), RTCP_Compensation. **OmegaSafetyScoreEngine** computes S(x) ≥ 0.70 hard block. Frontend never sees the verdict.

When gates fail, operator sees: HTTP 400 "Program not ready for emit" with no explanation, no fix path.

**Fix:** Agent-4's 13-card punch list. Score impact: 45 → 85 (+40 points).

### BLOCKER-4: Frontend trio works but blocked by router (16 minutes from working)
**Severity: HIGH** · **Effort: 16 minutes (after BLOCKER-1)** · **Files: MillingResultsPage.tsx**

After router lands, 3 tiny fixes complete the E2E flow:
1. Mount /milling router (5 min — same as BLOCKER-1)
2. Add `useEffect(getMillingResult)` for jobId in ResultsPage (10 min)
3. Fix `handleEdit()` to pass `extractedData` back to wizard (1 min)

Removes refresh/bookmark issue and feature data loss on edit.

### BLOCKER-5: Cost engine wired but missing
**Severity: MEDIUM-HIGH** · **Effort: 1-2 days** · **File: `engines/MillProgramOptimizerEngine.ts` (does not exist)**

Action `mill_quick_cost_estimate` calls `MillProgramOptimizerEngine.estimateCost()` but the engine file doesn't exist. Action returns error.

Mill has **0 dedicated cost engines** vs WEDM's 8 (2,349 LOC). No `MillCostEngine`, no `MillJobCostEngine`, no `MillCycleTimeEngine`.

### BLOCKER-6: 30 half-wired actions return error stubs
**Severity: MEDIUM** · **Effort: 2-3 hours**

Batches 1-5 (30 actions) use direct imports instead of `callOrThrow` lazy pattern. Some engine lazy imports missing in `getEngine()` switch. Affected actions return `{ error: "Method not found" }` until imports added.

### BLOCKER-7: Auth missing on milling routes
**Severity: MEDIUM (security)** · **Effort: 30 minutes**

All 12 milling endpoints have NO authentication middleware. Anyone with network access can POST to `/upload`, `/wizard-submit`, `/calculate`. Add `optionalToken` middleware matching `/api/v1/edm` pattern.

### BLOCKER-8: ERP integration 0% wired
**Severity: HIGH (for paid)** · **Effort: 14 hours / Phase 2A-2D**

- No machine_rates lookup → hardcoded $45.50/part
- No quote/job/invoice persistence → in-memory `jobStore` Map (data lost on restart)
- No `gl_record_invoice` call → accounting break
- No approval workflow integration

### BLOCKER-9: 0 mill prove-out programs run on real machines
**Severity: HIGH (for ship)** · **Effort: 7-10 days per machine**

Backend tests pass; **no program has been generated by PRISM and cut on a real JM Die mill**. Need supervised pilot (Haas VF-2 first since 26 proven programs exist as ground truth).

---

## SECONDARY GAPS

| Gap | Source | Effort | Priority |
|---|---|---:|---|
| MillStudioPage scaffold (917 LOC orphaned) | Agent-3 | <1 day decision | LOW (delete or implement) |
| MillTurnPage stub (90 LOC, no interactivity) | Agent-3 | 1 week implementation | MEDIUM |
| Toolpath visualization is mock SVG | Agent-3 | 2 hours | MEDIUM |
| AI Reasoning panel hardcoded text | Agent-3 | 30 min | MEDIUM |
| Haas OM2 missing from machine catalog | Agent-7 | 2-3 days | MEDIUM |
| RokuRokuMillMasterPostEngine doesn't exist (parser only) | Agent-7 | 3-4 days | HIGH (for Roku pilot) |
| Spindle thermal compensation for Roku-Roku precision | Agent-7 | 1 day | MEDIUM |
| 5-axis RTCP/singularity audit (separate from physics audit) | Agent-6 | 3 days | MEDIUM (Okuma M460V) |
| CuttingThermal material DB embedded (should externalize) | Agent-6 | 4 hours | LOW |
| Probing routines (Haas WIPS, Okuma G65, Fanuc) | Agent-7 | 2 days | MEDIUM |
| Tool magazine config per machine | Agent-7 | 1 day per machine | MEDIUM |
| MillScientificPipelineEngine is 14-LOC stub | Agent-1 | 1 week | LOW |
| Tribal/E2E/trace_ledger/inference engines available but unwired | Agent-1 | 1 day each | LOW-MEDIUM |
| LoRA checkpoint persistence (in-memory only) | Agent-8 | 4 hours | MEDIUM |

---

## TIME-TO-SHIP BREAKDOWN

### Phase A — JM Die Haas VF-2 Pilot (1-2 days)
**Goal:** First real mill cut on Haas VF-2, supervised, re-running FONTANA B-1289-11.

1. **BLOCKER-1: Register milling router** (5 min)
2. Frontend trio fixes — useEffect getMillingResult + handleEdit extractedData (11 min)
3. Smoke test upload→wizard→results with Fontana grip block (30 min)
4. Add `optionalToken` auth middleware (30 min)
5. Compare PRISM-generated G-code to proven `O01289.nc` (1 day)
6. Supervised cut on Haas VF-2 (1 day)

**Output:** "PRISM made a real mill program, machined a real grip block on JM Die's VF-2."

### Phase B — Hurco VM30i + Multi-Machine (2-3 weeks)
1. Phase A complete
2. **BLOCKER-2: Fix Hurco engine target** (VMX24 → VM30i, 2-3 days)
3. Add Haas OM2 to catalog + verify NGC routing (2-3 days)
4. Create RokuRokuMillMasterPostEngine + spindle thermal comp (3-4 days)
5. Okuma M460V proof-of-concept (3-axis on P300M, 2-3 days)
6. Phase 2A: DB persistence migrations (4 hours)
7. Phase 2C: ERP machine_rates lookup (3 hours)

### Phase C — Paid Second Customer (8-12 weeks)
1. Phase A+B complete
2. **BLOCKER-3: Build 8 safety gate UI cards** (Agent-4 punch list, 65-82 hours)
3. Create MillCostEngine (BLOCKER-5, 1-2 days)
4. Phase 2B + 2D: Approval workflow + GL integration (7 hours)
5. Migrate Batch 1-5 to lazy `callOrThrow` (BLOCKER-6, 2-3 hours)
6. Multi-material prove-out: 4140 + Ti + Inconel + 6061 across fleet (1-2 weeks)
7. EULA + liability disclaimer (1 week legal)
8. Marketing assets + sales playbook (1 week)

---

## WHAT GOES INTO THE MASTER ROADMAP

### Section: MILL-CRITICAL-PATH (Phase A — 2 days)
- MILL-S1: Register createMillingRouter in routes/index.ts (5 min)
- MILL-S2: Frontend trio fixes (16 min)
- MILL-S3: Add optionalToken auth middleware (30 min)
- MILL-S4: Haas VF-2 supervised pilot — re-run FONTANA B-1289-11 (1 day)

### Section: MILL-PHASE-B-FLEET (2-3 weeks)
- MILL-S5: Fix Hurco VM30i engine target (2-3 days, BLOCKER-2)
- MILL-S6: Add Haas OM2 to machine catalog + routing (2-3 days)
- MILL-S7: Create RokuRokuMillMasterPostEngine (3-4 days)
- MILL-S8: Okuma M460V 5-axis proof-of-concept (2-3 days)
- MILL-S9: Phase 2A — DB persistence (mill_quotes, mill_jobs, mill_invoices) (4 hours)
- MILL-S10: Phase 2C — ERP machine_rates lookup with caching (3 hours)
- MILL-S11: Wire 15 missing lazy engine imports for Batch 1-5 (2-3 hours)

### Section: MILL-PHASE-C-SHIP (8-12 weeks)
- MILL-S12 → MILL-S24: 13 safety gate UI cards (Agent-4 punch list, 65-82h)
- MILL-S25: Create MillCostEngine.ts (1-2 days)
- MILL-S26: Phase 2B — approval workflow integration (4 hours)
- MILL-S27: Phase 2D — gl_record_invoice() after Stripe (4 hours)
- MILL-S28: Multi-material prove-out matrix (1-2 weeks)
- MILL-S29: 5-axis RTCP/singularity dedicated audit + UI (3 days)
- MILL-S30: Spindle thermal compensation engine for Roku-Roku (1 day)
- MILL-S31: Probing routines (Haas WIPS, Okuma G65, Fanuc) (2 days)
- MILL-S32: Tool magazine per-machine config (5 days)
- MILL-S33: LoRA checkpoint persistence (4 hours)
- MILL-S34: Externalize CuttingThermal material DB (4 hours)
- MILL-S35: EULA + liability disclaimer (1 week legal)

### Items to deprecate / archive
- MillStudioPage.tsx (672 LOC orphaned scaffold) — delete or implement
- MillStudioContext.tsx (245 LOC) — same fate
- MillTurnPage.tsx (90 LOC stub) — implement or delete
- MillScientificPipelineEngine 14-LOC stub — implement or delete
- WEDMLoRADatasetBuilderEngine empty engine (cross-reference to WEDM finding)

---

## CROSS-VENDOR CONSISTENCY (Mill vs WEDM)

| Dimension | WEDM | Mill | Winner |
|---|---:|---:|---|
| Engine count | 179 | 71 | WEDM (volume) |
| Test files | 162 | 141 | WEDM |
| Test grade | B+/A | A (8.8/10) | Mill (rigor) |
| ML reasoning traces | 311 | **7,986** | **Mill (25.7×)** |
| Training scripts | 0 (inferred) | **3 complete** | **Mill** |
| Frontend studio score | 79/100 | 67/100 | WEDM |
| Safety UI visibility | 2 of 10 gates | **0 of 8 gates** | WEDM |
| Cost/ERP integration | 30% | **5%** | WEDM |
| Router status | ✓ registered | ✗ unregistered | WEDM |
| Real shop program validation | ITW SHAKEPROOF + NOZE TEST | 26 Haas + 1 Roku programs | Tie (different scopes) |
| Real machine prove-out | 0 | 0 | Tie (both need pilots) |
| **Composite ship-readiness** | **82** | **68** | **WEDM** |

**Pattern:** Mill has stronger backend (engines, ML, physics, tests) but weaker shipping path (router, UI, ERP). WEDM has the inverse profile — more polished frontend and ERP path but smaller ML stack.

---

## CONFIDENCE NOTES

**High confidence findings (cross-validated by ≥2 agents):**
- Mill router unregistered (Agent-2 + Agent-9, both verified by reading routes/index.ts)
- 8 safety gates exist with 0 UI surfacing (Agent-3 + Agent-4)
- HurcoV11MillMasterPostEngine targets VMX24 not VM30i (Agent-7 + user correction)
- ML stack exceeds WEDM (Agent-8 with 7,986 trace entries as evidence)

**Medium confidence (single-source):**
- 65-82 hour UI estimate for safety cards (Agent-4 alone)
- 0 mill cost engines (Agent-9 grep)
- 30 half-wired Batch 1-5 actions (Agent-2 only)

**Low confidence / requires re-run:**
- Agent-10 roadmap reconciliation: 72 unfinished items at ~400-500 person-days — exact effort estimates need verification per item
- 5-axis physics: Agent-6 noted "NOT FULLY AUDITED" — separate slice required
- Haas OM2 routing: Agent-7 said "unclear if shares NGC with VF-2"

---

## NEXT FLAGSHIP

After user reviews this Mill consolidation, proceed to **Lathe** (Task #3). Lathe template has these per-flagship adaptations:
- Lathe path: turning_* trio (working) vs lathe_p2p_* pipeline (unrouted) — clarification from prior audits
- LatheStudioPage dormant since Apr 18 — confirm archive
- JM Die machine is **Okuma B250IIW** (lathe analog of Okuma M460V-5AX mill); check `OkumaB250LatheMasterPostEngine`
- Lathe has 6 unwired physics engines per earlier audit — Mill had similar pattern (Batch 1-5 half-wired)
- Lathe-prod-ready, lathe-pro-v3, lathe-pro-v3-bookkeeping worktrees are active — sync with their work

The Lathe audit will reveal whether the mill pattern (production-grade backend, shipping-path-broken) holds across pipelines or whether lathe inverts it.

---

## SUMMARY: HIGHEST-LEVERAGE COMMITS

If the user wants 1 commit that buys the most ship-readiness:
- **Single best commit (5 minutes):** Register `createMillingRouter` in `routes/index.ts` lines 43 + 133. Unblocks entire mill HTTP surface, 5 frontend pages, 12 endpoints.

If the user wants 1 day of work that buys the most:
- **Day 1 plan:** Router registration + frontend trio fixes (16 min) + auth middleware (30 min) + Hurco VM30i target verification (start, not finish, 4 hours) + supervised Haas VF-2 cut on FONTANA B-1289-11 (rest of day).

If the user wants 1 week of work that buys the most:
- **Week 1:** Phase A complete (Day 1-2) + Hurco VM30i fix (Days 3-5) + Phase 2A DB persistence (Day 6) + multi-machine smoke tests (Day 7). Output: 3 of 5 JM Die mills covered, real mill cut on PRISM-generated program.
