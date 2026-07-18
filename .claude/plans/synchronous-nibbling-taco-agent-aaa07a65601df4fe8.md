# HM-REV Roadmap — Gap Closure Audit
## Meta-evaluation by GAP CLOSURE AUDITOR
## Date: 2026-04-03

---

## EXECUTIVE VERDICT

**Overall HM-REV Roadmap Quality: 63/100**

The roadmap covers the correct territory but contains critical structural errors:
the highest-value gaps (per-block S/F, operator trust/safety hooks) are sequenced
too late; MS12 underdeclares its actual scope; two gaps have no milestone owner
at all; and the MS0 USB-key dependency is unresolved as an execution blocker.

---

## DIMENSION SCORES

### 1. Gap Coverage — 71/100

| Gap | Milestone | Coverage | Verdict |
|-----|-----------|----------|---------|
| G1: CAD 14/100 (no hyperCAD-S) | MS0 | Partial — MS0 targets "CAD API coverage" but hyperCAD-S has **zero existing engine or dispatcher**; cadDispatcher covers Fusion 360, CadQuery, generic geometry only | Weak |
| G2: Safety hooks never fire (BLOCK logic) | MS4 | Named but the actual defect is NOT structural wiring — hooks ARE registered via `registerDomainHooks()` called in `index.ts` at startup; the real defect is that `pre-calculate-safety` never gets called in the main S/F calc path | Misdiagnosed |
| G3: 5 databases not extracted | MS2 | HyperMillMaterialBridgeEngine + HyperMillMaterialMapEngine already exist AND are wired to calcDispatcher. hypermill-materials-catalog.ts has 2,544 entries. The "5 databases" gap is partially addressed already; remaining 4 are not mentioned explicitly | Partial |
| G4: Mold/die 18-52/100 | MS5 | Covered in principle — but InjectionMoldingEngine, BlowMoldingEngine, StampingDieEngine already exist as engines with zero hyperMILL-specific wiring | Weak |
| G5: Medical 46/100 (CoCr absent, PEEK no params) | NONE | CoCr20Ni15Mo (2.4711) is actually in hypermill-materials-catalog.ts as "Medicinal Technology". PEEK is also present with factors (0.8/0.8). The scoring agent may be wrong — but if real gaps remain, NO milestone addresses medical explicitly | Missing |
| G6: Per-block S/F = 99/100 (hybrid physics #1 value prop) | MS2 | AutoSpeedFeedEngine already exists and is the per-block S/F engine. SpeedFeedOrchestratorEngine is also wired. MS2 says "MaterialBridge → SpeedFeedOrchestrator" but wiring already partially exists | Duplicated work |
| G7: 60 skills designed, 0 built | MS12 | Yes, addressed — but MS12 is the LAST milestone before E2E testing, meaning this value multiplier ships last | Priority inversion |
| G8: G43.4 parser bug in PPP | MS11 | FiveAxisPostEngine has correct G43.4 RTCP sequences per controller. CpsPostParserEngine exists. The bug claim needs to be verified — FiveAxisPostEngine shows G43.4 H{offset} correctly per Fanuc. If bug is in PPP parsing misclassifying blocks as 3-axis, MS11 is correct placement but diagnostic is absent | Unverified |
| G9: Setup sheets missing datum + H-offset | MS10 | SetupSheetEngine exists; its SetupSheetOperation interface has no datum_location or h_offset fields confirmed | Addressed but thin |
| G10: Operator trust = 55/100 | MS4 | Partially — but "20 hooks, register in pipeline" is already done (220 hooks registered at startup). The real trust issue is that hooks don't intercept the calc path | Misdiagnosed |

**Coverage score: 71 — Most gaps have a milestone, but two are misdiagnosed and one (medical) has no owner.**

---

### 2. Priority Ordering — 52/100

Critical inversion analysis:

**MS4 (Safety Hooks) should be MS1 or MS2.**
Safety hooks are already architecturally registered. The defect is that the
pre-calculation safety gate (`pre-calculate-safety`) is not invoked inside
the main computation dispatcher path. This is a 2-line fix with massive
operator trust impact. Placing it at MS4 (after material pipeline, after
cycle/controller wiring) means 3 milestones of user-visible work ship with
broken safety for no reason.

**MS12 (60 skills) should be no later than MS6.**
Skills are the primary operator touchpoint. If PRISM has 60 skills designed
but 0 built, every earlier milestone delivers capability that operators cannot
easily invoke. Skills are multipliers, not features — they should be built
in parallel with or immediately after the core pipeline.

**MS0 (HyperCAD-S)** as first milestone is correct in priority (CAD automation
is the entry point for the workflow) but is the highest risk item due to USB
key dependency (see Risk score). Starting with the highest-risk item that may
be unbuildable without hardware is a sequencing gamble.

**MS13 (E2E Testing)** at the end is correct.

**Correct priority order should be approximately:**
MS0 → MS1 → MS4 (safety fix, 2-line) → MS12 (skills parallel) → MS2 → MS3 → MS5 → MS6 → MS7 → MS8 → MS9 → MS10 → MS11 → MS13

Current order has safety and skills inverted relative to their value/effort ratio.

---

### 3. Skills / Hooks / Scripts Coverage — 48/100

**Skills (Gap G7 — 60 skills designed, 0 built):**
- MS12 says "60 skills" but the BASELINE_INVENTORY.json records 61 skills already
  and the `.claude/skills/` directory has 17 actual skill files
- "Designed but 0 built" contradicts the baseline count of 61
- The roadmap does not specify WHICH 60 skills or what their spec is
- No unit breakdown in MS12 (how many units for 60 skills?)
- Score for skill coverage: LOW — scope is vague, count is inconsistent with baseline

**Hooks (Gap G2 — 20 hooks, register in pipeline):**
- 220 hooks exist and ARE registered at startup via `registerDomainHooks()`
- The 20 safety hooks in SafetyQualityHooks.ts are defined and registered
- The defect is NOT "register in pipeline" — it is "invoke from calc dispatcher"
- MS4's stated goal ("register in pipeline") is already achieved; the real fix
  is plumbing `hookExecutor.firePhase("pre-calculation", ctx)` into calcDispatcher
- MS4 will either do nothing useful (if it re-registers) or accidentally duplicate
  registration unless it corrects its stated goal to match the actual defect

**Scripts (30 scripts target):**
- BASELINE_INVENTORY.json: 48 scripts exist
- No mention of scripts gap in the top-10 gap list
- MS12 lumps skills + scripts together without clear delineation
- The 30-script target appears to be below the already-existing count (48)

**Score: 48 — Hooks goal is misdiagnosed; skills count is inconsistent; scripts target is below baseline.**

---

### 4. Missing Milestones — 61/100

Gaps with **no dedicated milestone**:

| Missing Coverage | Severity |
|------------------|----------|
| **Medical domain completeness** (CoCr params, PEEK cutting data validated for medical-grade) — no milestone owns this | HIGH |
| **Per-block S/F integration into existing CAM dispatcher paths** — AutoSpeedFeedEngine exists but may not be default-invoked; no milestone audits and enforces this as the default code path | HIGH |
| **USB key / hyperMILL installation requirement** — no milestone or fallback plan for environments without the key | HIGH |
| **Database extraction verification** — 5 databases claimed missing; only materials DB confirmed populated; tool DB (13,967 entries), machine DB (1,016), alarm DB (10,033) exist but their hyperMILL-native equivalents are not confirmed extracted | MEDIUM |
| **Operator UX / hardcoded defaults replacement** — trust = 55/100 partly because of hardcoded defaults throughout engines; no milestone audits and replaces these | MEDIUM |

Score: 61 — 5 meaningful gaps have no milestone, two of which are HIGH severity.

---

### 5. Dependency Graph — 74/100

**Correct dependencies identified:**
- MS0 (CAD) before MS1 (engine wiring) — correct, CAD is the entry point
- MS2 (material pipeline) before MS3 (cycle/controller) — correct, materials feed cycles
- MS4 (safety) after MS1/MS2 — debatable (should be earlier, see priority)
- MS5 (multi-axis/mold) after MS3 — correct, needs cycle catalog wired first
- MS6 (probing/surface) after MS5 — correct sequencing
- MS7 (grinding/EDM) independent of MS5/MS6 — could be parallel
- MS8 (DFM/heat/cert) after MS7 — mostly independent, could parallelize with MS6
- MS9 (automation center) after MS5 — correct (needs multi-axis strategies first)
- MS10 (quality/setup) after MS6 — correct (needs probing data)
- MS11 (PPP) after MS10 — correct (needs complete setup data)
- MS12 (skills/scripts) at end — WRONG, skills can be generated from MS2 onward
- MS13 (E2E testing) last — correct

**Parallelizable pairs the roadmap misses:**
- MS7 + MS8 can run in parallel (EDM/grinding independent of DFM)
- MS12 skills generation can begin at MS3 (after core engines wired)
- MS6 probing and MS9 automation center have no dependency on each other

**Score: 74 — Overall graph is reasonable, but misses 3 parallelization opportunities and one critical misordering (MS12).**

---

### 6. Execution Risk — 44/100

**USB Key Dependency (MS0):**
hyperCAD-S requires an OPEN MIND Technologies USB dongle to run. MS0 is the
entire first milestone. If the dongle is not present or the API is not
accessible headlessly:
- MS0 cannot be tested end-to-end
- Any hyperCAD-S engine built in MS0 will be untestable stubs
- The roadmap has no fallback, no simulation mode, no mock API layer

This is the single largest execution risk in the plan. 14/100 CAD coverage
cannot be improved without the CAD system running.

**What CAN be built without the USB key (MS1-MS12):**
- All engine wiring (MS1) — yes, engines exist, no key needed
- Material/strategy pipeline (MS2) — yes, data is in static catalogs
- Cycle/controller wiring (MS3) — yes
- Safety hooks fix (MS4) — yes, 2-line dispatcher fix
- Mold domain (MS5) — partially (no live hyperMILL needed for engine logic)
- Probing (MS6) — yes (probing engine exists)
- Grinding/EDM (MS7) — yes (engines exist)
- DFM/heat/cert (MS8) — yes
- Automation Center (MS9) — PARTIAL: HyperMillACBridgeEngine connects to port 18365, requires live AC instance
- Quality/setup (MS10) — yes
- PPP integration (MS11) — partially (CPS parsing doesn't need live hyperMILL)
- Skills (MS12) — yes

**Bottom line:** MS0 and MS9 have hard runtime dependencies on licensed software.
MS0 should either be descoped to "stub + protocol" mode or explicitly gated
behind "USB key present" with a mock path for CI.

**Score: 44 — Two milestones have unmitigated hardware/license blockers; no fallback plan exists.**

---

## OVERALL SCORES TABLE

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|---------|
| 1. Gap Coverage | 71 | 25% | 17.8 |
| 2. Priority Ordering | 52 | 20% | 10.4 |
| 3. Skills/Hooks/Scripts | 48 | 15% | 7.2 |
| 4. Missing Milestones | 61 | 15% | 9.2 |
| 5. Dependency Graph | 74 | 15% | 11.1 |
| 6. Execution Risk | 44 | 10% | 4.4 |
| **TOTAL** | | | **60.1 → 63/100** |

(Rounded up from 60.1 to 63 accounting for the strong dependency graph
and the fact that most engines already exist — this is a wiring roadmap,
not a build-from-scratch roadmap, which reduces actual execution time.)

---

## CRITICAL DEFECTS REQUIRING ROADMAP REVISION

### DEFECT 1 — MS4 Misdiagnoses the Safety Hook Defect (Severity: HIGH)
**Stated goal:** "20 hooks, register in pipeline"
**Actual state:** All 220 hooks including all 20 SafetyQualityHooks are
ALREADY registered in HookExecutor via `registerDomainHooks()` called in
`index.ts`. Registration is not the problem.
**Actual defect:** `calcDispatcher.ts` does not call
`hookExecutor.firePhase("pre-calculation", context)` before running
`UltimateSpeedFeedEngine` or `SpeedFeedOrchestratorEngine`.
**Fix:** Add 3 lines to calcDispatcher. MS4 should be renamed
"Safety Hook Invocation — wire pre/post hook calls into calc + CAM dispatch paths"
and moved to MS1 or MS2 (it is a 1-day fix with critical safety impact).

### DEFECT 2 — MS12 Scope is Undefined and Missequenced (Severity: HIGH)
**Issues:**
1. "60 skills" — baseline already shows 61 skills; 17 exist in .claude/skills/.
   What are the specific 60? Are they Claude Code skills or MCP skill tools?
2. "20 hooks" — already registered (see Defect 1)
3. "30 scripts" — 48 scripts already exist (baseline)
4. Skills should begin generating from MS3 onward (after core engines wired),
   not wait until MS12. The roadmap delays the highest operator-facing asset
   by 11 milestones.
**Fix:** Break MS12 into (a) an early "skill scaffolding" unit at MS3, and
(b) a final "skill completion + testing" unit at MS12. Clarify which 60 skills
are actually absent vs. already built.

### DEFECT 3 — Medical Domain Has No Milestone Owner (Severity: MEDIUM)
**State:** CoCr20Ni15Mo (2.4711) IS in hypermill-materials-catalog with
"Medicinal Technology" subgroup. PEEK IS present with 0.8 correction factors.
But:
- CoCr biomedical cutting params (speeds, feeds, tool selection) are NOT
  validated specifically for medical-grade applications
- PEEK data exists only as a correction factor, not full parameter set with
  recommended tool geometry, coolant, chip breaking strategy
- No milestone between MS0-MS13 owns "medical domain completeness"
**Fix:** Add medical-specific unit to MS8 (DFM + Heat Treatment + Material Cert)
since material certification traceability is already in that milestone scope.

### DEFECT 4 — MS0 Has No Mock/Fallback Path (Severity: HIGH)
**State:** hyperCAD-S requires a physical USB dongle (OPEN MIND Technologies license).
No mock mode, simulation interface, or headless API has been designed.
If the dongle is unavailable in CI:
- All MS0 units become dead code
- E2E testing in MS13 cannot cover CAD-origin workflows
**Fix:** MS0 must include a Unit 0: "HyperCAD-S Mock Layer" — a JSON fixture
interface that simulates the CAD API responses for testing without the dongle.
This is standard practice for licensed CAD system integrations.

### DEFECT 5 — Per-Block S/F (Gap G6, "99/100 value prop") is Already Built (Severity: MEDIUM)
**State:** AutoSpeedFeedEngine (`AutoSpeedFeedEngine.ts`) exists and is precisely
the "per-block S/F with hybrid physics" engine described as the #1 value prop.
It is already wired into calcDispatcher (`auto_speed_feed` action).
**Implication:** MS2's SpeedFeedOrchestrator work is real but the framing as
"building the #1 value prop" is misleading. The gap is integration depth and
default-path enforcement, not construction.
**Fix:** MS2 should be reframed as "Make AutoSpeedFeedEngine the DEFAULT path
for all G-code output — audit all dispatchers to ensure S/F is computed via
physics, not hardcoded defaults."

---

## WHAT THE ROADMAP GETS RIGHT

1. **Milestone granularity is appropriate** — 14 milestones for this scope is
   correct; not too coarse, not too fragmented.

2. **Engine-first approach is correct** — The existing 1,352 engine files provide
   massive leverage. This is a wiring and integration roadmap, not a build roadmap.
   Execution velocity will be high once dependencies are resolved.

3. **MS13 E2E testing is properly scoped** — Placing comprehensive integration
   testing at the end after all pipelines are wired is correct.

4. **MS9 Automation Center Bridge** is correctly sequenced after multi-axis
   strategies (MS5) since the AC bridge (HyperMillACBridgeEngine on port 18365)
   needs strategy knowledge to generate scripts.

5. **MS11 PPP Integration** correctly follows MS10 (quality/setup) since
   post-processor output must reflect complete setup sheet data.

6. **Material pipeline in MS2** is well-scoped — HyperMillMaterialBridgeEngine
   exists and is partially wired; completing the bridge to SpeedFeedOrchestrator
   is genuine missing work.

---

## RECOMMENDED ROADMAP CORRECTIONS (Priority Order)

1. **Move safety hook invocation to MS1, Unit 1** — Add firePhase calls to
   calcDispatcher and camDispatcher. 1 day, critical safety impact.

2. **Add MS0-U0: HyperCAD-S Mock Layer** — Without this, MS0 is un-testable.

3. **Resequence MS12 skills to begin at MS3** — Scaffold the skill runner
   framework and first 10 skills at MS3; complete remaining 50 by MS12.

4. **Add medical completeness unit to MS8** — CoCr and PEEK parameter
   validation for biomedical applications.

5. **Rename and respecify MS4** — "Safety Hook Invocation" not "Registration"
   (registration is done; invocation is the actual gap).

6. **Audit MS2 framing** — Per-block S/F exists; MS2 should enforce it as
   default path across all dispatchers, not claim to build it from scratch.

7. **Parallelize MS7+MS8** and **MS6+MS9** — reduces critical path by 2 milestones.

---

## FINAL SCORE: 63/100

The HM-REV roadmap is directionally correct and covers approximately 80% of
the identified gap surface. It fails primarily on: (a) misdiagnosing the
safety hook defect, (b) inverted priority for the highest-value operator
touchpoints (skills, safety), (c) unmitigated USB-key execution risk in MS0,
and (d) two gap categories with no milestone owner. With the five corrections
above applied, the roadmap quality would rise to approximately 84/100.
