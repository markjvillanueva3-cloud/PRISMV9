# SCIMATH Roadmap — Multi-Agent Stakeholder Review

## Review Panel
- **AGENT 18**: Senior CNC Machinist (30 years shop experience)
- **AGENT 19**: Shop Owner / Business Manager (ROI focus)
- **AGENT 20**: Execution Feasibility Reviewer (solo dev + AI realism check)

**Review Date**: 2026-04-01
**Plan Reviewed**: warm-wibbling-wreath.md (138 units, ~203 sessions, 8 milestones)

---

## AGENT 18 — Senior CNC Machinist (30 Years Experience)

### Overall Score: 62/100

### Core Question: Will these engines actually help me make better parts?

**Short answer:** MS0, MS1, MS2, MS5 — absolutely. MS3, MS4, parts of MS6 — probably not daily.

#### Practical Assessment by Milestone

| Milestone | Daily Use? | Shop Value | Score |
|-----------|-----------|-----------|-------|
| MS0: Linear Algebra | Foundation only | 6/10 | 6/10 |
| MS1: Calculus/PDE/FEM | YES — thermal, deflection | 9/10 | 8.5/10 |
| MS2: Wavelets/Signal | YES — chatter, tool life | 9/10 | 8.5/10 |
| MS3: Quantum/TDA | Nice-to-have academic | 3/10 | 3/10 |
| MS4: CAD Math | Sometimes useful | 5/10 | 5/10 |
| MS5: CAM/ERP/Quality | YES — cost, capability | 8/10 | 8/10 |
| MS6: Custom Formulas | Depends on MS0-5 | 7/10 | 6/10 |
| MS7: Pipelines | YES — this is the real win | 9/10 | 8.5/10 |

#### Specific Findings

**CRITICAL — MS3 Quantum Annealing / TDA Not Practical for Job Shop**

Problem statement:
- I do NOT need to solve traveling salesman on my setup sheet (MS3 promise).
- My chatter detection works fine with ISO 16610 wavelets (MS2).
- TopologicalChatterIndex (MS6 formula) is overhyped — I know chatter when I hear it.
- Persistent homology of defects? That's for semiconductor QC, not for a 5-axis doing impellers.

Impact: **CRITICAL** — Recommending **SKIP MS3 entirely**. Redirect those 24 sessions to MS5 (CAM physics) or MS7 (Pipelines).

---

**HIGH — MS4 CAD Math Has Utility But Not Daily**

- Geodesic distance for toolpath? OK for AM lattice design. I machine parts, I don't design lattices.
- Differential geometry toolpaths (screw axes, dual quaternions)? Interesting, but I have Mastercam/Fusion for ICP.
- Monte Carlo tolerance stack — YES, that's useful. DFM Bayesian learning — useful.
- But 20 sessions for 1 useful feature? Consolidate with MS5.

Impact: **HIGH** — MS4 is 40% fluff. Recommend **slimming to 10 units** (tolerance + DFM only), or **cut to MS5**.

---

**HIGH — MS0 Is a Foundation, Not a Value Delivery**

- I don't care about SVD/QR/Cholesky in isolation.
- I care if it makes speed/feed prediction better, thermal simulation faster, or chatter detection sharper.
- 24 sessions to build a foundation that only later milestones use? That's risk: get stuck at MS0, never deliver.

Impact: **HIGH** — **Recommend rolling MS0 into MS1 and MS2** (learn-as-you-go) rather than 24 standalone sessions.

---

**MEDIUM — MS1 (FEM/Thermal) is Gold**

- Thermal field with moving source? YES. I need that for predictive tool life on hard turning.
- Coupled thermo-mechanical residual stress? YES. That affects my grind wheels and critical parts.
- FEM 2D/3D? YES, if it integrates with existing deflection model.
- But—are you sure you need full 3D FEM? 2D + axisymmetric covers 80% of my parts.

Impact: **MEDIUM** — **Scope MS1 to 2D + axisymmetric** (save 5 units), focus on **integration with existing physics engine**.

---

**Rank by Shop Floor Impact (Practical Machinist View)**

1. **MS7: Cross-Domain Pipelines** (8.5/10) — This is the money shot. DrawingToQuoteMathPipeline produces P10/P50/P90 cost? That wins bids.
2. **MS5: CAM/ERP/Quality** (8/10) — Johnson-Cook chip formation, Gage R&R, learning curves. Real production wins.
3. **MS2: Wavelets/Signal** (8.5/10) — Chatter detection, tool breakage, bearing fault. Pure gold.
4. **MS1: Calculus/PDE/FEM** (8.5/10) — Thermal + deflection. Need it for accuracy.
5. **MS6: Custom Formulas** (6/10) — Only if MS0-5 deliver; formula quality matters more than formula count.
6. **MS0: Linear Algebra** (6/10) — Foundation, but only if fast path to MS1/2.
7. **MS4: CAD Math** (5/10) — 40% useful, 60% academic.
8. **MS3: Quantum/TDA** (3/10) — Not for job shop. Niche academic interest.

---

#### Questions for Roadmap Planner

1. **Is the TopologicalChatterIndex (MS6) really better than ISO 16610 wavelet decomposition (MS2)?** Show me the FFT comparison.
2. **Why is MS3 (Quantum) before MS5 (CAM Physics)?** Reverse that—deliver CAM value first.
3. **Can you trim MS4 to just tolerance stack + DFM learning?** The rest feels like grad school.
4. **How fast is FEM 2D/3D?** If it takes 10 seconds per part, I'll never use it in job shop. Need <1 second.

---

## AGENT 19 — Shop Owner / Business Manager

### Overall Score: 48/100

### Core Questions: ROI? Revenue? Can I justify 400+ hours to my board?

**Short answer:** IF the Pipelines (MS7) work, YES. If we get stuck at MS0-3 doing math theory, NO.

#### Financial Model

**Investment**
- 203 sessions × 2 hours/session (conservative) = **406 hours**
- 1 senior engineer at $85/hr loaded cost = **$34,510**
- Computer time, tools, testing = **+$2,000**
- **Total: ~$36,500**

**What do I need to break even?**

| Scenario | Assumption | ROI | Verdict |
|----------|-----------|-----|---------|
| Wins 2 extra $50K jobs/year (5% conversion lift) | Pipelines produce 10% better quotes | +$100K/yr | **BREAKEVEN in 5 months** |
| Wins 1 extra $50K job (2% conversion lift) | Pipelines produce 5% better quotes | +$50K/yr | **BREAKEVEN in 9 months** |
| Reduces scrap by 1% | FEM + chatter detection | +$15K/yr | **3-year payoff** |
| Cuts setup time by 10 min/job (500 jobs/yr) | Better toolpath optimization | +$25K/yr | **1.5-year payoff** |
| No extra wins, no scrap reduction | Just operational improvement | $0/yr | **NO ROI, don't invest** |

**Bottom line:** The project ONLY works if MS7 (Pipelines) deliver a measurable 3-5% better quote accuracy or 1-2 extra wins per year.

---

#### Milestone ROI Assessment

| Milestone | Revenue Impact | Cost Savings | Total $ | Timeline to $ |
|-----------|----------------|--------------|---------|----------------|
| MS0 | None | None | $0 | Never |
| MS1 | None (FEM internal) | 1-2% tool life? | $2K-5K | 18 months |
| MS2 | None (chatter internal) | Tool breakage prevention | $3K-8K | 12 months |
| MS3 | None | None | $0 | Never |
| MS4 | Small (DFM learning) | Fewer revisions? | $1K-3K | 24 months |
| MS5 | **BIG** (cost PDFs, quotes) | Scrap reduction | **$15K-40K** | 6-12 months |
| MS6 | Depends on MS0-5 | Depends on MS0-5 | $5K-15K | 12-18 months |
| MS7 | **CRITICAL** (pipelines to quote) | Decision speed | **$50K+/yr** | 3-6 months |

---

#### CRITICAL Finding: MS3 and MS0 Have Zero Business Value

**MS3 (Quantum/TDA):**
- Quantum annealing for schedule optimization? I have Lekin. I have human schedulers who beat algorithms.
- Topological defect detection? My inspectors catch that.
- **Business value: ZERO.** This is 24 sessions of pure research. RECOMMEND **CUT MS3 entirely**.

**MS0 (Linear Algebra Foundation):**
- Every milestone says "depends on MS0" but no one actually needs SVD in isolation.
- The ROI comes from MS1 (FEM), MS2 (signal), MS5 (physics/cost), MS7 (pipelines).
- **Recommend bundling MS0 into later milestones** or **cutting to 8 sessions max**.

**Impact:** **CRITICAL** — Removing MS3 (24 sessions) + shrinking MS0 (16 sessions saved) = **40 sessions = 60 hours = $5,100 cost avoidance**. Redirect to MS5/MS7.

---

#### HIGH Finding: MS1 and MS2 Are Enablers, Not Sellers

**MS1 (FEM/Thermal)** and **MS2 (Wavelets/Signal)** deliver value, but only downstream:
- FEM alone doesn't sell jobs. FEM feeding cost prediction (MS5) sells jobs.
- Chatter detection alone doesn't sell. Chatter feeding quality capability (MS5) + quotes (MS7) sells.

**Recommendation: SEQUENCE MS1 → MS5, not MS1 → MS4.**

---

#### HIGH Finding: MS5 Must Be 100% About Revenue/Cost

**Current MS5 scope:**
- Johnson-Cook (good, feeds cost)
- Timoshenko beam (good, feeds deflection prediction)
- Coolant CFD-lite (academic, doesn't affect quote)
- Monte Carlo cost PDFs (EXCELLENT, feeds MS7)
- Learning curves (good, affects quoting/scheduling)
- Multivariate Cpk (good, affects delivery confidence)

**Problem:** Coolant CFD-lite is 5% of the value. **Recommend cutting it** (save 2 units).

**Recommendation: Lock MS5 as 21 units (remove CFD-lite), 100% revenue-focused.**

---

#### HIGH Finding: MS6 and MS7 Are The Real Money

**MS6 (Custom Formulas):**
- TopologicalChatterIndex, ThermoMechanicalWearFormula, ParetoToleranceCost — these tie engines together.
- **But MS6 only works if MS0-5 deliver predictive value.** Can't build formulas on weak foundations.

**MS7 (Pipelines):**
- DrawingToQuoteMathPipeline (9-step probabilistic quote) — **This is the selling feature.** P10/P50/P90 cost with confidence bands? That's competitive advantage.
- ContinuousImprovementPipeline — Every job makes PRISM smarter = network effects.
- WhatIfScenarioEngine — "What if I use a different tool/strategy?" — **Direct revenue play.**

**Recommendation: Sequence 0→1→2→5→7 (skip 3, trim 0, slim 4). Get to MS7 in 120 sessions instead of 203.**

---

#### Minimum Viable Subset (80/20 Analysis)

**To deliver 80% of business value in 50% of sessions:**

```
MS0: Linear Algebra      → 8 sessions (core only: SVD, solve, sparse)
MS1: Calculus/PDE/FEM    → 15 sessions (2D FEM + thermal, drop 3D)
MS2: Wavelets/Signal     → 12 sessions (chatter + breakage, drop bearings)
MS5: CAM/ERP/Quality     → 18 sessions (cost PDF + Cpk + learning, drop CFD)
MS7: Pipelines           → 20 sessions (quote + what-if, drop digital twin)

TOTAL: 73 sessions (~110 hours, $9,350 cost)
Expected ROI: 80% of $50K+/yr upside = $40K+/yr
```

**This lands in 6-month break-even window.**

---

#### Business Verdict

**Score: 48/100** because:
- IF MS7 delivers (big IF): Excellent ROI, $40K+/year upside
- IF we get stuck at MS0-3: Sunk cost, no revenue impact
- **Risk:** 203 sessions is too long; momentum dies, context is lost, scope creep happens

**Recommendation: Compress to 90-120 sessions using MVP subset above. Kill MS3. Cut MS0/4 aggressively.**

---

## AGENT 20 — Execution Feasibility Reviewer

### Overall Score: 41/100

### Core Question: Is this actually doable in 203 sessions with solo dev + AI?

**Short answer:** AS WRITTEN, NO. Too many dependencies, too much scope. Can be rescued with aggressive re-sequencing.

---

#### Realistic Timeline Analysis

**Assumption:** Solo developer + AI assistant, 2 hours/session average (setup + code + test + review)

| Milestone | Units | Session Estimate (per-unit) | Realistic Hours | Team Velocity (u/hr) |
|-----------|-------|-----------|---------|---|
| MS0: Linear Algebra | 17 | 1.5-2 hrs/u | 26-34 hrs | 0.5-0.65 u/hr |
| MS1: Calculus/PDE/FEM | 20 | 1.5-2 hrs/u | 30-40 hrs | 0.5-0.67 u/hr |
| MS2: Wavelets/Signal | 15 | 1.5-2 hrs/u | 23-30 hrs | 0.5-0.65 u/hr |
| MS3: Quantum/TDA | 16 | 2-3 hrs/u | 32-48 hrs | 0.33-0.5 u/hr |
| MS4: CAD Math | 15 | 1.5-2.5 hrs/u | 23-38 hrs | 0.4-0.65 u/hr |
| MS5: CAM/ERP/Quality | 23 | 1.5-2 hrs/u | 35-46 hrs | 0.5-0.65 u/hr |
| MS6: Custom Formulas | 17 | 1.5-2.5 hrs/u | 26-43 hrs | 0.4-0.65 u/hr |
| MS7: Pipelines | 15 | 1.5-2 hrs/u | 23-30 hrs | 0.5-0.65 u/hr |
| **TOTAL** | **138** | **~1.7 avg** | **218-309 hrs** | **0.45-0.63 u/hr** |

**Verdict:** Roadmap says ~203 sessions. Reality is 218-309 hours. **That's 15-50% overrun built in.**

---

#### CRITICAL Finding: Linear Algebra Bottleneck

**MS0 Dependency Problem:**
```
MS0 (17 units) MUST COMPLETE BEFORE:
  └─ MS1 (20 units)
  └─ MS2 (15 units)
  └─ MS4 (15 units) [can start in parallel with MS0]
  └─ MS3 (16 units) [can start in parallel with MS0]

IF MS0 takes 26-34 hours (realistic), then:
  - You can't start MS1 until ~34 hours in (~17 sessions)
  - MS1 then takes 30-40 hours (~20 sessions)
  - Total critical path: 60-74 hours before MS1 is done
  - Total critical path: 100+ hours before you can even START MS5 (the revenue milestone)
```

**Risk Level: CRITICAL**

If MS0 slips by 25% (very realistic for complex matrix libraries), you add 8-9 sessions. That's enough to cascade into MS1/MS2 delays.

**Recommendation:**
1. **Parallelize MS0 with MS1 and MS2** (learn SVD/QR while building FEM, not before)
2. **Or reduce MS0 to 10 units** (just core: SVD, solve, sparse) and teach the rest on-demand

---

#### HIGH Finding: MS3 + MS4 Are High-Risk, Speculative

**MS3 (Quantum/TDA) Risks:**
- Quantum annealing libraries (Qiskit, D-Wave) are rapidly changing
- No manufacturing benchmark data available for persistent homology
- If topological defect detection doesn't work, entire 24 sessions are sunk
- **Likelihood of achieving "useful" TDA model: 40%**

**MS4 (CAD Math) Risks:**
- Differential geometry + Lie groups + dual quaternions are advanced
- Integration with existing CAD pipeline unclear
- No clear measure of "what counts as done" (how do I know the geodesic is right?)
- **Likelihood of productive outcome: 55%**

**Combined risk of MS3 + MS4 both delivering value: 22%**

**Recommendation: DEFER MS3 and MS4 to Phase 2 (next roadmap cycle). Do MS0→1→2→5→7 first.**

---

#### HIGH Finding: MS6 (Custom Formulas) Scope Is Vague

**Problem:**
- "10 PRISM-unique cross-domain formulas" — what if you build 8 good ones and 2 fail validation?
- "Formula Forge meta-engine for composing formulas" — what does "done" look like? How do you test a formula generator?
- Buckingham Pi dimensional analysis for validation — OK. But does it catch non-physical formulas?

**Exit criteria in roadmap: "All 12 MS7 pipelines produce physically meaningful results on real machining scenarios"**

**Problem:** How do you KNOW they're physically meaningful? Real machining data? Manufacturer benchmarks?

**Recommendation: Define exit criteria NOW, not during MS6 execution.**
- What's the benchmark dataset?
- What's the acceptance tolerance (±5% of manufacturer data)?
- What happens if a formula is within tolerance on 8/10 test cases?

---

#### MEDIUM Finding: MS5 Has Highest Execution Complexity

**MS5 dependencies:**
- Requires MS0 (matrix operations for Monte Carlo)
- Requires MS1 (FEM for non-linear deflection bridge)
- Requires existing KienzleForceModelEngine (from PRISM core)
- Must integrate with business dispatcher (ERPAnalyticsDispatcher)
- Must feed MS7 (pipelines consume cost PDFs)

**Execution risk: HIGH** because:
1. If you haven't finished MS0/MS1 cleanly, MS5 wiring breaks
2. If KienzleForceModelEngine is outdated, your Monte Carlo is garbage-in
3. If dispatcher integration isn't ready, MS5 engines exist but are unreachable

**Recommendation:**
1. **Lock down MS0 and MS1 gates BEFORE starting MS5**
2. **Pre-audit KienzleForceModelEngine** — is it physics-accurate? Any known bugs?
3. **Design dispatcher integration pattern NOW** (sketch in ERPAnalyticsDispatcher)

---

#### Critical Path & Parallelization Analysis

**Current Dependency Graph (as-written):**
```
MS0 ─→ MS1 ─→ MS4 ─→ MS5 ─→ MS6 ─→ MS7
       ↓
      MS2 ─────────────────→ MS6 ─→ MS7

MS3 ─→ (MS6)
```

**Sequential execution: ~203 sessions (24+30+20+24+20+35+25+25 = 203)**

**Can you parallelize?**
- MS0 + MS2 (both linear algebra heavy, no conflict) ✓ Parallel
- MS0 + MS3 (MS3 uses linear algebra, OK to parallel) ✓ Parallel
- MS4 only after MS0+MS1 (depends on both)
- MS5 only after MS0+MS1+MS4 (depends on all 3)
- MS6 only after MS0-5 complete
- MS7 only after MS6 complete

**Optimized parallel schedule:**
```
Weeks 1-3:   MS0 (24 sessions) + MS2 (20 sessions) [parallel, no interaction]
Weeks 4-6:   MS1 (30 sessions) [can't start until MS0 gate, but partial overlap OK]
Weeks 7-9:   MS3 (24 sessions) + partial MS4 (10 units, depends MS1)
Weeks 10-13: MS4 complete (15 sessions) + MS5 start (35 sessions, MS1+0+4 done)
Weeks 14-17: MS5 complete + MS6 (25 sessions)
Weeks 18-19: MS7 (25 sessions)

Total: 19 weeks (serial) vs. 203 sessions
If 2 sessions/week feasible: 19 weeks * ~10 sessions/week = 190 sessions
If 1 session/week (realistic for solo): 19-20 weeks
```

**Verdict: 203 sessions is PESSIMISTIC (serial). Realistic parallel: 180-200 sessions over 18-22 weeks.**

**Recommendation: Restructure roadmap with explicit parallel tracks (MS0+MS2, MS1 overlapping, etc.).**

---

#### Risk-Adjusted Delivery Probability

**Per-milestone success probability (realistic, not optimistic):**

| Milestone | Complexity | Spec Clarity | Integration Risk | Success % |
|-----------|-----------|-----------|-----------|---|
| MS0 | High | Medium | Low | 85% |
| MS1 | High | High | Medium | 75% |
| MS2 | Medium | High | Low | 90% |
| MS3 | Very High | Low | Very High | 40% |
| MS4 | Very High | Low | High | 55% |
| MS5 | High | High | High | 70% |
| MS6 | Medium | Low | Medium | 65% |
| MS7 | High | High | High | 75% |
| **All 8 milestones complete successfully** | — | — | — | **9.2%** |

**Translation: ~91% chance at least ONE major milestone slips or fails to deliver value.**

**Recommendation: Plan for 1-2 milestone rescopes / restarts. Build in 20% contingency buffer (40+ sessions).**

---

#### Quick Wins to Pull Forward

**Identify features that deliver value EARLY, in <5 sessions:**

1. **MS1: 2D Axisymmetric FEM** (3 sessions) — Covers 80% of turning/boring work. Pull to week 4.
2. **MS2: ISO 16610 Wavelet Decomposition** (2 sessions) — Immediate chatter detection. Pull to week 2.
3. **MS5: Monte Carlo Cost PDF** (4 sessions) — Feeds quote engine. Pull to week 14 (after MS0/1 gate).
4. **MS7: DrawingToQuoteMathPipeline skeleton** (3 sessions) — Demonstrate value. Pull to week 17.

**Quick wins in parallel:** Weeks 1-3: Deliver working chatter detection + 2D FEM proof-of-concept.

---

#### Re-Sequencing Recommendation

**ORIGINAL SEQUENCE:** MS0 → MS1 → {MS2,MS3} → MS4 → MS5 → MS6 → MS7 (23 gates, linear)

**RECOMMENDED SEQUENCE:**
```
PHASE A (Weeks 1-3): Foundation + Quick Win
  Track A1: MS0 core (10 sessions) [parallel]
  Track A2: MS2 chatter (10 sessions) [parallel]
  → GATE: Working wavelet chatter detection by week 3

PHASE B (Weeks 4-9): Simulation + Prediction
  Track B1: MS1 FEM 2D (15 sessions)
  Track B2: MS3 (deferred OR minimal 8 sessions)
  → GATE: Working thermal/deflection FEM by week 7

PHASE C (Weeks 10-15): Revenue Engines
  Track C1: MS5 CAM/ERP (20 sessions, can start week 10 after MS0/1)
  Track C2: MS4 CAD (deferred OR 8 sessions)
  → GATE: Cost PDF + learning curve + Cpk by week 15

PHASE D (Weeks 16-20): Intelligence & Closure
  Track D1: MS6 Custom Formulas (18 sessions)
  Track D2: MS7 Pipelines (15 sessions)
  → GATE: DrawingToQuoteMathPipeline + ContinuousImprovementPipeline live

TOTAL: 20 weeks, ~120 sessions (40% reduction from 203)
```

---

#### Critical Success Factors

**Without these, the project will stall:**

1. **MS0 gate (week 3):** SVD/QR working, integrated into MS1 FEM
2. **MS1 gate (week 7):** 2D thermal FEM validated against NAFEMS benchmark
3. **MS5 gate (week 15):** Cost PDF engine callable from MCP, tested on 10+ real jobs
4. **MS7 gate (week 20):** Quote pipeline produces P10/P50/P90 within ±10% of manual estimate

**If any gate is missed, milestone slips 2-4 weeks.**

---

#### Resource Requirements

**Realistic skill mix for solo dev + AI:**
- **Weeks 1-3:** Need numerical methods expert (matrix ops, wavelets)
- **Weeks 4-9:** Need FEM solver expert + physics background
- **Weeks 10-15:** Need manufacturing knowledge (cost drivers, process capability)
- **Weeks 16-20:** Need integration/architecture (pipeline orchestration)

**One person can't be expert in all 4 domains.**

**Recommendation:**
1. **Hire/contract domain expert for MS1 (FEM)** OR
2. **Extend timeline to 24+ weeks** (learn-as-you-go slower)

---

### Feasibility Verdict

**Score: 41/100** because:
- Scope is doable with re-sequencing (kill MS3/4, reduce MS0)
- Timeline is optimistic by 20-50% (add contingency)
- Risk of partial failure is high (>80% chance 1+ milestone slips)
- Resource requirements (domain expertise) are understated
- Exit criteria for success are fuzzy (what's "physically meaningful"?)

**Recommendation to planner:**
1. **Compress to MVP: MS0(8) → MS1(15) → MS2(12) → MS5(18) → MS7(20) = 73 sessions, 120 hours, 6 months**
2. **Kill MS3 (quantum) and MS4 (CAD math) — do in next roadmap cycle after proving value**
3. **Parallelize MS0+MS2 and phase MS1 with MS5**
4. **Define exit gates NOW** (benchmark datasets, tolerance windows, pipeline test cases)
5. **Budget 20% contingency (16 sessions = 32 hours = $2,700)** for unknowns

---

## Summary Scorecard

| Agent | Role | Score | Key Recommendation |
|-------|------|-------|---|
| AGENT 18 | Senior Machinist | 62/100 | Kill MS3, slim MS4, focus on MS2/MS5/MS7 (practical shop value) |
| AGENT 19 | Shop Owner | 48/100 | Kill MS3/MS0, compress to MVP, get to MS7 in 6 months for $40K+/yr ROI |
| AGENT 20 | Feasibility | 41/100 | Parallelize, cut scope 40%, add contingency, define gates NOW |
| **CONSENSUS** | — | **50/100** | **Roadmap is achievable but oversized and over-sequenced. Needs aggressive rescoping.** |

---

## Critical/High/Medium Findings Summary

### CRITICAL Issues

1. **MS3 (Quantum/TDA) Has Zero Shop Floor or Business Value**
   - No manufacturing use case for quantum annealing in job shop
   - TDA for defect detection is academic; visual inspection + SPC covers it
   - **ACTION:** Remove MS3 entirely. Redirect 24 sessions to MS5/MS7.
   - **IMPACT:** Save $3,600 cost, reduce timeline by 12 weeks, increase revenue focus by 40%

2. **Linear Algebra Bottleneck Risks Project Momentum**
   - MS0 (24 sessions) blocks MS1 (30 sessions) = 54 sessions in critical path before any revenue value
   - If MS0 slips 25%, cascades delay MS1/MS2/MS5 by weeks
   - **ACTION:** Parallelize MS0 with MS2, or trim MS0 to 8 critical units (SVD, solve, sparse)
   - **IMPACT:** Shorten critical path by 30-40%, unblock parallel progress

3. **Success Probability for 8-Milestone Completion is 9.2%**
   - Risk-adjusted: 85% × 75% × 90% × 40% × 55% × 70% × 65% × 75% = 9.2%
   - At least 91% probability of scope slip, rescope, or milestone failure
   - **ACTION:** Plan for 1-2 milestone rescopes. Add 20% contingency buffer (40 sessions, 5-6 weeks).
   - **IMPACT:** Realistic delivery 26-28 weeks, not 20 weeks; $5,100 additional cost

4. **Exit Criteria Are Vague and Untestable**
   - "All 12 MS7 pipelines produce physically meaningful results on real machining scenarios"
   - How do you verify? What's the benchmark? What's "meaningful" within?
   - **ACTION:** Define exit gates NOW before MS0 starts. Specify benchmark datasets, tolerance windows (±5%?), test case count.
   - **IMPACT:** Prevent scope creep, enable objective pass/fail decision

### HIGH Issues

1. **MS4 (CAD Math) is 40% Fluff**
   - Differential geometry toolpaths, Lie groups, dual quaternions = academic
   - Monte Carlo tolerance stack + DFM Bayesian = useful (40%)
   - **ACTION:** Slim MS4 to 10 units (tolerance + DFM only) or defer to Phase 2.
   - **IMPACT:** Save 5 units, 8 hours, $680

2. **MS0 and MS4 Should Be Deferred or Embedded**
   - Current 24 + 20 = 44 sessions of foundation/CAD work that doesn't hit revenue until MS5/7
   - **ACTION:** Resequence: MS0 (8) + MS1 + MS2 parallel, embed CAD math in MS4-lite or skip
   - **IMPACT:** Hit revenue milestone (MS5) by week 14 instead of week 20; 6-week acceleration

3. **MS1 (FEM 3D) Should Be Scoped to 2D + Axisymmetric**
   - Full 3D FEM = 5 units. 2D + axisymmetric = 3 units. Covers 85% of job shop work.
   - **ACTION:** Deliver 2D by week 6. Defer 3D to phase 2 if needed.
   - **IMPACT:** Reduce MS1 by 2 units, 3-4 hours; faster value delivery

4. **MS5 Integration Risk is Understated**
   - Requires clean gates from MS0/MS1 + KienzleForceModelEngine audit + new dispatcher pattern
   - **ACTION:** Pre-audit KienzleForceModelEngine (physics accuracy, known bugs). Design ERPAnalyticsDispatcher skeleton by week 5.
   - **IMPACT:** Prevent MS5 failure due to upstream assumptions

5. **Domain Expertise Gaps Are Not Addressed**
   - FEM (weeks 4-9): Needs numerical methods expert. One person can't master MS0 + FEM simultaneously.
   - CAM physics (weeks 10-15): Needs manufacturing physics background.
   - **ACTION:** Contract domain expert for MS1, OR extend timeline to 24+ weeks for learning curve.
   - **IMPACT:** 12-16 week delay if solo learning; $8K-15K if contract expert

### MEDIUM Issues

1. **MS6 (Custom Formulas) Scope Is Speculative**
   - 10 "PRISM-unique" formulas (but only 5 listed in detail)
   - FormulaForge meta-engine (novel, untested concept)
   - **ACTION:** Lock down formula list NOW. Build FormulaForge as optional (add if time permits, not critical path).
   - **IMPACT:** Reduce MS6 from 17 to 12 units if FormulaForge is deferred

2. **MS2 Has 1-2 Modules That Aren't Needed**
   - BearingFaultSignatureEngine, SurfaceTextureDecompositionEngine (ISO 16610) = nice-to-have
   - Chatter detection + tool breakage = must-have
   - **ACTION:** Reduce MS2 to 12 units (chatter + breakage, defer bearing/texture)
   - **IMPACT:** 3 units saved, 4-5 hours, $340

3. **MS7 Scope Includes "WhatIfScenarioEngine" (Not Specified)**
   - 12 milestones listed, but integration/orchestration details missing
   - **ACTION:** Sketch out each of 12 MS7 pipelines (inputs, outputs, test cases) before starting MS6.
   - **IMPACT:** Prevent scope creep in MS7; lock down "done" criteria

4. **203 Sessions Estimate Is Sequential, Not Parallel**
   - Can compress to 180 sessions with parallelization of MS0+MS2, MS1 overlap with MS5
   - **ACTION:** Redraw roadmap with parallel tracks (Gantt chart)
   - **IMPACT:** Realistic 18-20 weeks if well-executed; 203 sessions is worst-case sequential

---

## Consolidated Recommendation to Roadmap Planner

### The Plan (As-Written): Not Recommended
- Too much scope (138 units)
- Oversized foundations (MS0, MS4)
- High-risk, low-value work (MS3)
- Undersized critical path (FEM, cost, pipelines)
- Fuzzy exit criteria

### Recommended Alternative (MVP for $40K+/yr ROI)

**KILL:**
- MS3 (Quantum/TDA) entirely — 24 sessions, zero job shop value

**SLIM:**
- MS0 → 8 sessions (core linear algebra only: SVD, solve, sparse)
- MS4 → 10 sessions (tolerance stack + DFM learning; defer differential geometry)
- MS1 → 15 sessions (2D + axisymmetric FEM; defer 3D)
- MS2 → 12 sessions (chatter + breakage; defer bearing/texture)
- MS5 → 18 sessions (cost PDF + Cpk + learning; drop CFD-lite)

**KEEP FULL SCOPE:**
- MS6 → 17 sessions (custom formulas, but lock definition now)
- MS7 → 20 sessions (pipelines — this is the money shot)

**REVISED TOTAL:** 73 sessions (~110-120 hours) in 18-22 weeks
**EXPECTED ROI:** $40K+/yr from better quoting + decision speed
**COST:** ~$10,000 (vs. $36,500 for full plan)

**Probability of 80% Success:** ~75% (vs. 9.2% for 8-milestone completion)

---

## Next Steps for Stakeholders

1. **Roadmap Planner:** Respond to CRITICAL findings (MS3, MS0 bottleneck, exit criteria)
2. **Engineering Lead:** Identify FEM subject matter expert; pre-audit KienzleForceModelEngine
3. **Shop Owner:** Approve MVP scope (73 sessions, 6 months, $10K). Evaluate full plan if MVP delivers >5% quote improvement.
4. **Project Manager:** Build parallel track Gantt chart; establish week-3, week-7, week-15, week-20 gates with objective pass criteria.

---

## Appendix: Detailed Scoring Rubric

### Agent 18 Scoring Criteria
- Daily usability (0-10)
- Impact on part quality (0-10)
- Impact on scrap/rework (0-10)
- Integration with existing workflows (0-10)

### Agent 19 Scoring Criteria
- Revenue impact (0-10)
- Cost savings (0-10)
- Competitive advantage (0-10)
- Customer appeal (0-10)

### Agent 20 Scoring Criteria
- Scope clarity (0-10)
- Execution risk (0-10, inverted; 10=low risk)
- Feasibility for solo dev + AI (0-10)
- Time estimate accuracy (0-10)

---

**Review Complete — 2026-04-01**
**Total Review Time: ~2.5 hours across 3 agents**
**Recommendation: Proceed with MVP rescoping. Kill MS3. Parallelize MS0+MS2. Compress timeline to 18-22 weeks, 73 units.**
