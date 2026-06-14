---
title: Quality Galaxy Advanced Techniques (DOE strategy, Six Sigma, MSA + FMEA risk, advanced SPC selection)
galaxy: quality
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Each advanced technique below was confirmed by a live WebFetch against a free/legal reputable source on 2026-06-10 -- NIST/SEMATECH Engineering Statistics Handbook (gov), and Wikipedia topic pages for DMAIC / FMEA / fractional-factorial / response-surface / control-chart doctrine. Quoted phrases are reproduced from the fetched page. This is the WORLD-LEADER-DEPTH STRATEGY layer and deliberately does NOT repeat quality-foundations.md (intro theory: capability formulas, WE/Nelson rule lists, GUM, EWMA/CUSUM mechanics, DOE definition, CLT) or quality-applied-practice.md (common practitioner gotchas: out-of-control capability, non-normal data, tampering, control-vs-spec limits, bias-vs-precision). It captures the advanced STRATEGY an expert reaches for -- the method, WHEN it is used, and the DIRECTION of the trade-off. R12-SAFETY: NO numeric Cpk / sigma / RPN cutoff / resolution-run-count / coverage factor / cutting constant is asserted; every threshold/number stays owner-gated to golf in mcp-server/src/physics/constants.ts. Fetches that returned an intro-only excerpt (NIST 5.3.3.4, 6.3.2) were superseded by a page that confirmed the detail (Wikipedia fractional-factorial / the foundations entry), never fabricated."
tags: [quality, doe, design-of-experiments, fractional-factorial, screening, response-surface-methodology, rsm, six-sigma, dmaic, fmea, rpn, risk-priority, msa, gauge-rr, nested-design, control-chart-selection, variables-attributes, sequential-experimentation, advanced-techniques, strategy]
---

# Quality Galaxy Advanced Techniques

The state-of-the-art STRATEGY layer for the PRISM `quality` galaxy -- the advanced methods a top quality engineer reaches for *beyond* the intro theory and the common gotchas. The foundations entry teaches the formulas; the applied-practice entry teaches the traps. This entry teaches the **strategic moves that make the difference at the top of the field**: how to spend experimental effort, which improvement framework to run, how to design a measurement study, how to prioritize risk before failures occur, and which monitoring tool to choose for a given signal.

Scope note (R8 -- no duplication): read `quality-foundations.md` (intro theory) and `quality-applied-practice.md` (practitioner gotchas) first. This file restates neither. Where a topic touches both (e.g. EWMA/CUSUM), foundations owns the *mechanics* and this file owns the *selection strategy* -- when an expert chooses one over another.

R12-SAFETY: this is a cutting / capability / safety galaxy. Only the qualitative METHOD, the WHEN, and the DIRECTION of a trade-off are promoted. No numeric capability target, sigma level, RPN cutoff, resolution run-count, coverage factor, or cutting value (SFM/RPM/IPR/chip-load/feed/depth/coolant-psi) appears; any number a source states is described qualitatively and gated to golf in `constants.ts`.

---

## 1. Experiment-design strategy: spend effort in proportion to what you know

### 1.1 Match the design to the objective, and sequence exploratory before confirmatory

The expert move in Design of Experiments (DOE) is to never reach for one design. Design *type* follows the *objective*, and the objectives run in a deliberate order: screen many factors cheaply first, then model the survivors precisely.

- **When an expert uses it:** at the start of any process-improvement campaign with several candidate input factors, before committing to an expensive full study.
- **Trade-off direction:** a screening design buys breadth (many factors examined) at the cost of depth (interactions and curvature are not yet resolved); a response-surface design buys depth at the cost of breadth (only the few factors that survived screening). Spending a large, high-resolution design on factors that turn out inert is the classic waste.
- **Source confirms:** NIST's design-selection guidance frames the choice as objective-driven -- a **screening design** (fractional factorial) is recommended when you have "more than 3 factors and want to begin with as small a design as possible," and **response-surface** modeling "follows screening," for objectives like hitting a target, optimizing, or robustness. The strategy is "a progression from exploratory (screening) to confirmatory (response surface/regression) experimentation."
- **PRISM applies it:** when the galaxy tunes a process (e.g. which mill/lathe/WEDM inputs move a quality response), it should screen the candidate factor set first and only build the costly second-order study on the proven-active factors -- never burn the full design on the full factor list up front.

Source: [NIST/SEMATECH e-Handbook 5.3.1 -- Choosing an experimental design](https://www.itl.nist.gov/div898/handbook/pri/section3/pri31.htm)

### 1.2 Fractional factorial screening rests on the sparsity-of-effects principle -- and you pay for it in resolution

The reason a fraction of the runs is enough is a substantive engineering assumption, not a free lunch. An expert states the assumption out loud and chooses the *resolution* that protects the effects that matter.

- **When an expert uses it:** screening many factors where running every combination is impractical, and where high-order interactions are believed negligible.
- **Trade-off direction:** fewer runs -> effects become **aliased/confounded** -- you cannot separately estimate everything. The lower the resolution, the more main effects risk being tangled with two-factor interactions; the higher the resolution, the more runs you spend. The expert buys *just enough* resolution to keep main effects (and, when needed, two-factor interactions) clean, and no more.
- **Source confirms:** the fractional design works because of the **sparsity-of-effects principle** -- "If higher-order interactions between main effects are negligible, it can be considered a reasonable method to study the main effects." The cost is aliasing: estimating an effect actually estimates "a combination of the main effect ... and the two-factor interaction." Resolution measures the cleanliness of that separation (Resolution III, IV, V tiers), and NIST notes resolutions above a point are "wasteful ... the bulk of the additional effort goes into the estimation of very high-order interactions which rarely occur in practice."
- **PRISM applies it:** the galaxy's screening designs must record the alias structure / resolution alongside the result, so a downstream consumer never reads a confounded effect as a clean cause. (The specific run counts per resolution are numeric -- owner-gated.)

Source: [Wikipedia -- Fractional factorial design](https://en.wikipedia.org/wiki/Fractional_factorial_design)

### 1.3 Response Surface Methodology: climb to the optimum region, then model the curvature there

Once screening has isolated the active factors, the advanced move is sequential optimization -- use cheap first-order experiments to *move* toward the optimum, then a second-order design to *map* the curvature once you are in its neighborhood.

- **When an expert uses it:** to find the factor settings that optimize a response (yield, finish, a quality characteristic), after the factor set is small and active.
- **Trade-off direction:** a first-order (linear) model is cheap and good for *direction* (where to move next) but cannot locate a peak; a second-order (quadratic) model is needed to capture curvature near the optimum but costs more runs. The expert defers the expensive quadratic design until experimentation has walked the process into the curved region -- fitting a quadratic far from the optimum wastes runs on a region you are about to leave.
- **Source confirms:** RSM "uses a sequence of designed experiments to obtain an optimal response"; Box and Wilson recommend a "second-degree polynomial model" near the optimum, "starting with factorial designs to identify significant variables, then progressing to more sophisticated designs like central composite designs for second-degree modeling near the optimum." NIST adds that "a complete description of the process behavior might require a quadratic or cubic model" where curvature exists, and that classical quadratic designs (central composite, Box-Behnken) prize **rotatability** so prediction variance depends only on distance from the design center.
- **PRISM applies it:** process-optimization workflows in the galaxy should be staged -- linear screen/ascent first, quadratic central-composite (or Box-Behnken) only once the response is locally curved -- not a single monolithic optimization sweep.

Sources: [NIST/SEMATECH e-Handbook 5.3.3.6 -- Response surface designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri336.htm) · [Wikipedia -- Response surface methodology](https://en.wikipedia.org/wiki/Response_surface_methodology)

---

## 2. Six Sigma improvement strategy: DMAIC for an existing process

### 2.1 Run the five-phase DMAIC cycle in order -- and do not skip Measure or Control

The flagship Six Sigma strategy for improving an *existing* process is the DMAIC cycle. The expertise is in the discipline of the sequence: most failed improvement efforts skip Measure (no baseline) or skip Control (the gain decays).

- **When an expert uses it:** to improve and stabilize an existing, underperforming process -- as opposed to designing a new one (which uses a different cycle).
- **Trade-off direction:** DMAIC front-loads rigor (a defined problem, a measured baseline, a *validated* root cause) before touching the process -- slower to first change, but the change is the right one and it sticks. Jumping straight to "Improve" (the tempting shortcut) optimizes against an unmeasured baseline and an unvalidated cause.
- **Source confirms:** DMAIC is "a data-driven improvement cycle used for optimizing and stabilizing business processes," applied to existing processes. **Define** "clearly pronounce[s] the business problem, goal ... scope"; **Measure** establishes "baseline performance metrics for comparison"; **Analyze** is "to identify, validate and select a root cause for elimination"; **Improve** is "to identify, test and implement a solution"; **Control** is "to embed the changes and ensure sustainability" through monitoring and standard procedures. The phases "operate sequentially as a required cycle."
- **PRISM applies it:** the galaxy's improvement playbook should map to DMAIC -- a quality issue is Defined, a baseline is Measured (the control chart + capability study from foundations), the root cause is Analyzed and *validated* (often via the DOE strategy in Section 1), the fix is Improved, and the gain is locked with a Control plan (the SPC monitoring in Section 4). The Control phase is where SPC and the improvement cycle join.

Source: [Wikipedia -- DMAIC](https://en.wikipedia.org/wiki/DMAIC)

---

## 3. Measurement-system analysis strategy: design the study to separate the variance you care about

### 3.1 Use a nested gauge study so each variance component lands in its own bucket

Beyond *running* a gauge R&R (foundations), the advanced skill is *designing* the study so repeatability, reproducibility, and stability are mathematically separable -- structuring the data collection across the right hierarchy of conditions.

- **When an expert uses it:** before trusting any measurement on a tight feature, and especially when deciding whether measurement error is small relative to the tolerance or part variation.
- **Trade-off direction:** a richer nested design (more operators, parts, days, runs) isolates more variance sources but costs more measurement time; a thin design is cheap but cannot tell you *which* component dominates, so you cannot target the fix. The expert structures the study to excite the component most likely to dominate (often reproducibility / day-to-day / run-to-run), not just short-term repeatability, which is the easy one to capture and the least informative.
- **Source confirms:** NIST's analysis-of-variability design is a "3-level nested design" that separates variability into "time-dependent components" -- Level 1 repeatability/short-term precision, Level 2 reproducibility/day-to-day, Level 3 stability/run-to-run -- collected as "a 2-level table ... for the repeatability/reproducibility measurements" repeated "across L runs to capture the third variance component."
- **PRISM applies it:** the galaxy's MSA workflows should record which nested levels were actually exercised, so a clean %R&R is never over-trusted when the study never crossed days or runs (this is the design-side complement to the applied-practice gotcha "a study only sees the variation its design exposes"). The numeric acceptance tiers (%GRR, ndc) remain owner-gated.

Source: [NIST/SEMATECH e-Handbook 2.4.4 -- Analysis of variability (gauge R&R nested design)](https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc44.htm)

---

## 4. Advanced SPC selection: pick the chart and the rule-set for the signal you must catch

### 4.1 Choose the chart family by data type before anything else

The first advanced decision in monitoring is not the control limit -- it is the **chart family**, set by whether the quality characteristic is *measured* (variables) or *counted* (attributes). Using the wrong family makes every downstream limit meaningless.

- **When an expert uses it:** at the design of any new monitoring scheme.
- **Trade-off direction:** variables charts (X-bar & R, X-bar & S, individuals/moving-range) carry more information per point and detect shifts faster, but require a measurable continuous characteristic and the metrology to capture it; attributes charts (p, np, c, u) work on pass/fail or defect counts and are cheaper to collect but need more data to detect the same shift. The expert spends on variables data where the feature is critical and the gauge exists, and accepts attributes data where only conformance can be observed.
- **Source confirms:** "X-bar and R charts, X-bar and S charts, and individuals charts are designed for 'Variables' data (continuous measurements), while p-charts, np-charts, c-charts, and u-charts handle 'Attributes' data (counts or proportions)." Chart constants "are based on the subgroup size (n)," so the chart structure itself depends on how the data is grouped.
- **PRISM applies it:** the galaxy should route a quality characteristic to a variables-vs-attributes chart family by its data type as the first step of any monitoring recommendation, before any limit is computed.

Source: [Wikipedia -- Control chart](https://en.wikipedia.org/wiki/Control_chart)

### 4.2 Reach for EWMA / CUSUM when the threat is a small, sustained shift -- not a single spike

The Shewhart 3-sigma chart is optimal for catching a *large* sudden shift but slow on a *small sustained* one. The advanced selection move is to switch monitoring tool by the kind of drift you must detect.

- **When an expert uses it:** when the process risk is slow drift -- tool wear, thermal growth, a gradually fouling fixture -- where a small mean shift persists for many points without breaching a 3-sigma limit.
- **Trade-off direction:** EWMA and CUSUM detect small sustained shifts far faster than Shewhart because their decision rests on accumulated history, not just the latest point -- but they are correspondingly *less* responsive to a one-off large spike and require choosing a tuning parameter (EWMA's weighting). The expert keeps Shewhart for gross excursions and adds EWMA/CUSUM where the failure mode is creep. (Foundations owns the EWMA/CUSUM mechanics; this is the *when-to-switch* strategy.)
- **Source confirms:** NIST states CUSUM charts "are better than Shewhart control charts when it is desired to detect shifts in the mean that are [small]," and EWMA "can be made sensitive to a small or gradual drift in the process, whereas the Shewhart control procedure can only react when the last data point is outside a control limit."
- **PRISM applies it:** for galaxy processes whose dominant risk is wear/thermal creep (well-aligned with the applied-practice "under-control / trend within limits" trap), the monitoring recommendation should prefer EWMA/CUSUM over a bare Shewhart chart. The numeric tuning values (lambda, the slack/decision interval) are owner-gated.

Source: [NIST/SEMATECH e-Handbook 6.3.2.4 -- EWMA](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc324.htm) · [NIST/SEMATECH e-Handbook 6.3.2.3 -- CUSUM](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc323.htm)

### 4.3 Choose the detection rule-set deliberately -- more sensitivity costs more false alarms

Layering extra run/zone tests (Western Electric, Nelson) onto a chart raises sensitivity to subtle patterns -- but every added rule raises the chance of a false alarm on a process that is actually fine. The advanced move is to select the rule-set to the cost of a missed signal versus the cost of a false stop.

- **When an expert uses it:** when tuning a monitoring scheme for a process where either over-reaction (tampering) or under-reaction (missed drift) carries real cost.
- **Trade-off direction:** adding rules -> catches subtler out-of-control patterns sooner (fewer missed signals) BUT raises the combined false-alarm rate, which can drive the over-control / tampering failure that the applied-practice entry warns against. The expert turns on only the rules whose target pattern is a credible failure mode for that process, rather than enabling all eight reflexively.
- **Source confirms:** the foundations entry's Western Electric / Nelson rule lists (zone and run tests) are the menu; the strategic point -- that "in control" requires both inside-the-limits *and* a random pattern, and that adding pattern tests is what catches systematic behavior -- is NIST's: "'In control' implies that all points are between the control limits and they form a random pattern." (The combined false-alarm rate across rules is a numeric figure -- owner-gated.)
- **PRISM applies it:** the galaxy should treat the active rule-set as a tunable per process, defaulting to the minimal set whose patterns are plausible failure modes, not the maximal set.

Source: [NIST/SEMATECH e-Handbook 6.3.1 -- Univariate Control Charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)

---

## 5. Proactive risk strategy: prioritize failure modes before they happen (FMEA)

### 5.1 Use FMEA to rank-and-attack failure modes at design time -- and know the RPN's limits

The highest-leverage quality move is preventive: rank potential failure modes by risk *before* production, and spend mitigation effort on the worst first. The expert runs FMEA early and treats its risk score as a prioritizer, not a precise metric.

- **When an expert uses it:** at the earliest point in product/process development, to eliminate or minimize critical failure modes by design rather than by inspection after the fact.
- **Trade-off direction:** FMEA front-loads analysis effort (a structured team review before anything is built) to buy the cheapest possible fix -- a design change -- instead of the most expensive -- a field failure. The classic risk score is the **Risk Priority Number = Severity x Occurrence x Detection**; ranking by RPN focuses scarce mitigation effort, but the expert knows the score is an ordinal product and can mislead.
- **Source confirms:** FMEA enables "early identification of all critical and catastrophic ... failure modes so they can be eliminated or minimized" via "design modification at the earliest point in the development effort." RPN is "Severity ... x probability ... x detection." Crucially, the article flags the limitation: "the multiplication of the severity, occurrence and detection rankings may result in rank reversals, where a less serious failure mode receives a higher RPN than a more serious failure mode" -- because ordinal numbers don't support meaningful multiplication. The modern AIAG/VDA handbook (2019) replaced RPN with **Action Priority (AP)** to address this.
- **PRISM applies it:** the galaxy should drive risk prioritization with FMEA-style Severity/Occurrence/Detection reasoning, and -- because Severity is the dimension that protects against catastrophe -- never let a raw RPN product demote a high-Severity mode beneath a high-product low-Severity one. The specific 1-to-N rating scales and any RPN/AP cutoff are numeric -- owner-gated.

Source: [Wikipedia -- Failure mode and effects analysis](https://en.wikipedia.org/wiki/Failure_mode_and_effects_analysis)

### 5.2 Validate the root cause with a designed experiment, not just analysis

The advanced bridge between FMEA/DMAIC and Section 1: a suspected cause from an Analyze phase or an FMEA is a *hypothesis*. The expert confirms it with a designed experiment before spending money on the fix.

- **When an expert uses it:** in the Analyze->Improve transition of DMAIC, or when an FMEA flags an occurrence cause whose mechanism is uncertain.
- **Trade-off direction:** a confirmation experiment costs runs and time but converts a plausible cause into a demonstrated one; skipping it risks "fixing" a correlation that was never the cause -- the most expensive mistake in process improvement because the defect returns.
- **Source confirms:** DOE is "an efficient procedure for planning experiments so that the data obtained can be analyzed to yield valid and objective conclusions," working by deliberately changing input factors and observing the response -- exactly the operation needed to validate (not just assert) a root cause. NIST: DMAIC's Analyze phase is "to identify, validate and select a root cause."
- **PRISM applies it:** the galaxy's improvement chain should route a candidate root cause through the Section 1 screening/RSM strategy as the validation step, so the "validated" in DMAIC-Analyze is backed by an experiment, not an opinion.

Sources: [NIST/SEMATECH e-Handbook 5.1.1 -- What is experimental design? (DOE)](https://www.itl.nist.gov/div898/handbook/pri/section1/pri11.htm) · [Wikipedia -- DMAIC](https://en.wikipedia.org/wiki/DMAIC)

---

## Owner-gate (NOT promoted)

The following are numeric constants/thresholds or specifics that could not be confirmed against a fetched free primary source. They remain owner-gated for `golf` (the quality owner) and live ONLY in `mcp-server/src/physics/constants.ts` (or the relevant cutting/SFC galaxy). Only the qualitative strategy and trade-off DIRECTION above is promoted.

- **Six Sigma capability / sigma-level targets** -- the "Six Sigma" defect-rate goal and any process-sigma or capability acceptance value. Numeric -- gated. (DMAIC the *method* is promoted; the numeric target is not.)
- **Fractional-factorial run counts per resolution** -- the exact number of runs for Resolution III/IV/V at a given factor count, and the design-generator words. Numeric -- gated; only the resolution *trade-off direction* is promoted.
- **EWMA weighting parameter (lambda) and CUSUM slack/decision-interval (k, h) values**, and the ARL figures that quantify "faster." All numeric -- gated; only the when-to-switch direction is promoted.
- **Western Electric / Nelson combined false-alarm rate** across an enabled rule-set, and any per-rule false-alarm probability. Numeric -- gated; only the "more rules -> more false alarms" direction is promoted.
- **FMEA Severity/Occurrence/Detection rating scales (1-to-N), the RPN/AP numeric cutoffs, and any action-threshold.** All numeric -- gated; only the prioritize-by-risk strategy and the RPN rank-reversal caution are promoted.
- **Gauge R&R %GRR acceptance tiers and ndc minimum** -- the numeric MSA acceptance cutoffs (AIAG MSA manual is not a free source). Gated; only the nested-design strategy is promoted. (Foundations and applied-practice already gate these.)
- **Central-composite / Box-Behnken axial distances and run counts** for rotatability. Numeric -- gated; only the sequential second-order strategy is promoted.
- **Any cutting constant** (SFM/RPM/IPR/chip-load/feed/depth-of-cut/coolant pressure) that a DOE/RSM optimization would tune. Owner-gated to `constants.ts` and the SFC galaxy; this entry promotes only that the optimization *exists* and its *direction*, never a setpoint.

---

## Sources (actually WebFetched and confirmed during verification, 2026-06-10)

- [NIST/SEMATECH e-Handbook 5.3.1 -- Choosing an experimental design](https://www.itl.nist.gov/div898/handbook/pri/section3/pri31.htm) *(objective-driven design selection; screen-before-optimize sequence)*
- [Wikipedia -- Fractional factorial design](https://en.wikipedia.org/wiki/Fractional_factorial_design) *(sparsity-of-effects principle; aliasing/confounding; resolution trade-off)*
- [NIST/SEMATECH e-Handbook 5.3.3.6 -- Response surface designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri336.htm) *(quadratic/central-composite/Box-Behnken; rotatability)*
- [Wikipedia -- Response surface methodology](https://en.wikipedia.org/wiki/Response_surface_methodology) *(sequential experiments; second-degree model near optimum)*
- [Wikipedia -- DMAIC](https://en.wikipedia.org/wiki/DMAIC) *(five-phase data-driven improvement cycle for existing processes; validate root cause in Analyze)*
- [NIST/SEMATECH e-Handbook 2.4.4 -- Analysis of variability (gauge R&R nested design)](https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc44.htm) *(3-level nested design isolates repeatability/reproducibility/stability)*
- [Wikipedia -- Control chart](https://en.wikipedia.org/wiki/Control_chart) *(variables vs attributes chart family selection; constants depend on subgroup size)*
- [NIST/SEMATECH e-Handbook 6.3.2.4 -- EWMA control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc324.htm) *(EWMA sensitive to small/gradual drift)*
- [NIST/SEMATECH e-Handbook 6.3.2.3 -- CUSUM control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc323.htm) *(CUSUM better for small sustained shifts)*
- [NIST/SEMATECH e-Handbook 6.3.1 -- Univariate Control Charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm) *(in-control = inside limits AND random pattern; rule-set selection)*
- [Wikipedia -- Failure mode and effects analysis](https://en.wikipedia.org/wiki/Failure_mode_and_effects_analysis) *(proactive risk prioritization; RPN = S x O x D; rank-reversal limitation; AP)*
- [NIST/SEMATECH e-Handbook 5.1.1 -- What is experimental design? (DOE)](https://www.itl.nist.gov/div898/handbook/pri/section1/pri11.htm) *(DOE validates root cause objectively)*
