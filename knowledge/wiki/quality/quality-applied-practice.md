---
title: Quality Galaxy Applied Practice (failure modes, gotchas, technique decisions)
galaxy: quality
owner_slot: quality-owner
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: "Each practitioner claim below was confirmed by a live WebFetch against a free/legal reputable source (NIST/SEMATECH e-Handbook gov pages, and Wikipedia topic pages for control-chart / process-capability / thermal-expansion / machining-vibration doctrine) on 2026-06-10. Quoted sentences are reproduced from the fetched page. This entry is the PRACTITIONER-KNOWLEDGE layer and deliberately does NOT repeat the theory in quality-foundations.md (formulas, Western Electric / Nelson rule lists, GUM definitions, EWMA/CUSUM mechanics) or the link directory in quality-source-atlas.md -- it captures what goes WRONG in real use and how an expert avoids it. R12: no numeric Cpk / control-limit constant / AQL / cutting value is asserted; every number stays owner-gated. Fetches that returned 404/302-to-generic-host (several vendor and practitioner-blog URLs) were retried once then dropped, never fabricated."
tags: [quality, spc, control-charts, process-capability, cpk, ppk, gauge-rr, msa, metrology, measurement-error, tampering, over-control, normality, acceptance-sampling, rational-subgroup, thermal-expansion, chatter, failure-modes, gotchas, practitioner-knowledge]
---

# Quality Galaxy Applied Practice

The hard-won practitioner layer for the PRISM `quality` galaxy: the FAILURE MODES, GOTCHAS, and TECHNIQUE DECISIONS that pure theory does not teach. A world-class quality engineer knows the formulas (those live in `quality-foundations.md`) -- but the difference between a number and a *trustworthy* number is the set of traps below. Each item states the gotcha, WHY it bites, and the expert's avoidance, with the source cited inline.

Scope note (R8 -- no duplication): read `quality-foundations.md` first for the confirmed theory and `quality-source-atlas.md` for the living source directory. This file does not restate either; it is "what goes wrong and how an expert avoids it."

R12 safety note: this is a cutting / capability / safety galaxy. Only qualitative technique, failure-mode descriptions, decision-logic, and the DIRECTION of a trade-off are promoted here. No numeric Cpk, control-limit, AQL, or cutting value appears; any number a source states is described qualitatively and gated to the owner (`constants.ts`).

---

## Common failure modes

### 1. Computing capability on a process that is not in statistical control

The single most common quality blunder is reporting a capability index for a process that has not first been demonstrated stable. Capability math assumes a single, predictable distribution; an out-of-control process is a *mixture* of distributions whose "sigma" and "mean" change from sample to sample, so the index summarizes nothing real.

- **Why it bites:** the customer-facing number looks authoritative but is computed from a moving target. Re-run it next week and it changes, and nobody can say which value is "the" capability.
- **Expert avoidance:** prove statistical control on a control chart FIRST (stable mean, stable spread, no out-of-control signals), THEN compute capability. Wikipedia's *Process capability* article states the rule bluntly: *"If the process is not in statistical control then capability has no meaning."* NIST frames the same prerequisite -- *"Process capability compares the output of an in-control process to the specification limits"* -- the words "in-control" are load-bearing.

Sources: [Wikipedia -- Process capability](https://en.wikipedia.org/wiki/Process_capability) · [NIST/SEMATECH e-Handbook 6.1.6 -- Process Capability Indices](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm)

### 2. Trusting a capability index on non-normal data

The standard capability indices are built on the normal distribution. Feed them data that is skewed (e.g., a one-sided geometric feature like flatness or runout that cannot go below zero), bimodal, or truncated, and the index silently misrepresents the real defect rate.

- **Why it bites:** the index still returns a clean number, so the analyst never sees the violated assumption. A skewed distribution can show a comfortable index while the long tail is throwing scrap.
- **Expert avoidance:** check the distribution shape before quoting the index. NIST states plainly: *"The Cp, Cpk, and Cpm statistics assume that the population of data values is normally distributed,"* and points to data transformation or non-parametric alternatives when it is not. Wikipedia's *Process capability* page echoes that the standard description holds only *"where the output data shows a normal distribution."*

Sources: [NIST/SEMATECH e-Handbook 6.1.6](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm) · [Wikipedia -- Process capability](https://en.wikipedia.org/wiki/Process_capability)

### 3. Treating a capability point estimate as exact truth

A capability index computed from a finite sample is itself a random variable -- two samples from the *same* process give two different indices. Practitioners who report a single decimal and gate a launch on it are gating on noise.

- **Why it bites:** small subgroups produce wide swings in the estimate. A "passing" index from a lucky sample, or a "failing" one from an unlucky sample, drives the wrong decision.
- **Expert avoidance:** treat the index as an estimate with a confidence interval, gather enough data, and never act on a difference smaller than the estimator's own scatter. NIST cautions that the index "variations are not negligible due to the randomness of capability indices" -- i.e., the index has built-in sampling variability that a bare point estimate hides.

Source: [NIST/SEMATECH e-Handbook 6.1.6](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm)

### 4. Believing acceptance sampling controls or measures quality

Acceptance sampling answers exactly one question -- accept or reject *this lot* -- and is routinely mistaken for a quality-measurement or quality-improvement activity. It is neither.

- **Why it bites:** a shop that relies on lot sampling to "ensure quality" is sorting, not improving; the process that made the defects is untouched, and the sample does not estimate how good (or bad) the lot actually is.
- **Expert avoidance:** use acceptance sampling only as a disposition gate, and drive quality upstream with process control instead. NIST is explicit: *"the main purpose of acceptance sampling is to decide whether or not the lot is likely to be acceptable, not to estimate the quality of the lot,"* and it separates the two concepts directly -- *"Acceptance Quality Control is not the same as Acceptance Sampling."*

Source: [NIST/SEMATECH e-Handbook 6.2.1 -- What kinds of Lot Acceptance Sampling Plans (LASPs) are there?](https://www.itl.nist.gov/div898/handbook/pmc/section2/pmc21.htm)

---

## Control-chart misuse (over-control / under-control)

### 5. Confusing control limits with specification (tolerance) limits

The most damaging chart error is drawing the customer's spec limits on a control chart, or reading the control limits as if they were the tolerance. They are unrelated by construction: control limits come from the process's own variation; spec limits come from the design/customer.

- **Why it bites:** a process can sit perfectly inside its control limits (stable) and still produce out-of-tolerance parts (not capable) -- and vice versa. Mixing the two leads operators to "adjust to the spec line," which destabilizes a stable process.
- **Expert avoidance:** keep the two on separate analyses -- control chart for stability, capability study for conformance to spec. Wikipedia's *Control chart* article states it directly: *"The control limits provide information about the process behavior and have no intrinsic relationship to any specification targets or engineering tolerance."*

Source: [Wikipedia -- Control chart](https://en.wikipedia.org/wiki/Control_chart)

### 6. Tampering -- reacting to common-cause variation as if it were a special cause (over-control)

When a stable process drifts a little inside its limits and an operator "corrects" it, they are responding to ordinary chance variation. Each correction injects a new disturbance, and the corrections compound.

- **Why it bites:** adjusting a process whose natural center is already where it can be only adds variance. This is the classic over-control failure (Deming's funnel): well-intentioned intervention makes the output worse.
- **Expert avoidance:** act ONLY on a genuine out-of-control signal; leave a process that is in control alone. Wikipedia's *Control chart* article records the historical lesson that *"continual process-adjustment in reaction to non-conformance actually increased variation and degraded quality,"* and warns that forcing an off-center process to a target *"increases process variability and increases costs significantly and is the cause of much inefficiency."*

Source: [Wikipedia -- Control chart](https://en.wikipedia.org/wiki/Control_chart)

### 7. Under-control -- declaring "in control" on within-limits points alone (missing patterns)

The opposite error: a chart whose points are all inside the limits but march in a trend, a sustained shift, or a cycle is NOT in control. An analyst who only checks "are all points inside the limits?" misses a process that is already failing.

- **Why it bites:** a slow trend (tool wear, thermal growth, a drifting fixture) stays within the limits for many points before it breaks out -- by which time scrap has already been made. The signal was in the *pattern*, not the limit breach.
- **Expert avoidance:** require BOTH conditions -- inside the limits AND a random pattern -- and apply the zone/run tests from `quality-foundations.md`. NIST states the standard: *"'In control' implies that all points are between the control limits and they form a random pattern,"* and warns that *"if the points exhibit some form of systematic behavior, there is still something wrong."*

Source: [NIST/SEMATECH e-Handbook 6.3.1 -- Univariate Control Charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)

---

## Measurement-system gotchas (gauge R&R / metrology)

### 8. A gauge R&R study only sees the variation its design exposes

A measurement-system study decomposes the variation it is *structured* to see (e.g., short-term repeatability, day-to-day reproducibility, run-to-run stability). Sources of error outside that structure are simply absent from the result, and the percentage looks better than reality.

- **Why it bites:** practitioners read a tidy %R&R and assume the gauge is fully characterized, when the study never excited the dominant error mode (operator technique, part-fixturing, thermal drift between runs, datum variation).
- **Expert avoidance:** judge the measurement error relative to what matters -- the tolerance or the part variation (the precision-to-tolerance idea) -- and treat the study as a floor, not a ceiling, on measurement error. NIST cautions directly that *"There may be other sources of uncertainty in the measurement process that must be accounted for in a formal analysis of uncertainty,"* and its nested design isolates only time-dependent variability (short-term / daily / run-to-run). Wikipedia's *ANOVA gauge R&R* page frames the acceptance judgment relative to tolerance via the precision-to-tolerance ratio.

Sources: [NIST/SEMATECH e-Handbook 2.4.4 -- Analysis of variability (gauge R&R nested design)](https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc44.htm) · [Wikipedia -- ANOVA gauge R&R](https://en.wikipedia.org/wiki/ANOVA_gauge_R%26R)

### 9. Trying to "average away" bias

Bias (a systematic offset between the gauge's average reading and the true value) and precision (random scatter) are fundamentally different, and operators conflate them. Taking more readings shrinks the random scatter -- but the systematic offset stays exactly where it was.

- **Why it bites:** a confidently-tight set of readings can be tightly *wrong*. More samples make the wrong average more precise, not more correct.
- **Expert avoidance:** attack bias with calibration / check-standards / measurement-assurance, and attack precision with repeated measurement -- never substitute one for the other. NIST defines bias as *"the difference between the average of measurements made on the same object and its true value"* (a property of the *average*, so averaging more does not remove it) and notes bias is reduced "through calibration, check standards, and measurement assurance programs."

Source: [NIST/SEMATECH e-Handbook 2.1.3 -- Bias and Accuracy](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc113.htm)

### 10. Ignoring temperature when measuring precision dimensions

Metal grows and shrinks with temperature, so a precision measurement taken on a warm part -- or with a warm gauge, or shortly after machining, or while held in a warm hand -- reads a different size than the same feature at thermal equilibrium.

- **Why it bites:** the dimensional error from thermal expansion can swamp the tolerance on a tight feature, and it is invisible: the part conforms when checked warm and fails when checked cold (or at the customer's lab at a different temperature). Direction of the trade is fixed: higher temperature -> larger measured/actual dimension on a positive-expansion metal.
- **Expert avoidance:** let parts and gauges soak to a common reference temperature before measuring, minimize handling heat, and (for the tightest work) correct for thermal expansion. Wikipedia's *Thermal expansion* article states the physics -- *"Thermal expansion is the tendency of matter to increase in size with increasing temperature"* -- and that *"Precision engineering nearly always requires the engineer to pay attention to the thermal expansion of the product."* (The standard metrology reference temperature is a specific value -- owner-gated, see `constants.ts`.)

Source: [Wikipedia -- Thermal expansion](https://en.wikipedia.org/wiki/Thermal_expansion)

---

## Technique decisions (cutting-context trade-offs)

### 11. Slender tooling trades reach for stability -- and stability for finish/accuracy

When the same feature can be reached with a short stout tool or a long slender one, the choice has a direct quality consequence. A high length-to-diameter (L/D) tool is less stiff, deflects more, and is more prone to chatter -- which prints onto the surface and shifts the dimension.

- **Why it bites:** an operator picks the long tool for convenient clearance and then fights surface-finish defects and out-of-tolerance walls that look like a "machine problem" but are really a tooling-stiffness problem.
- **Expert avoidance, as a direction-of-trade only:** prefer the shortest reach that clears the part; when reach is unavoidable, expect to lighten the cut (lower engagement) to keep forces -- and therefore deflection and chatter -- in check. Wikipedia's *Machining vibrations* article confirms the mechanism: *"The machining vibration is often coming from the tool holder having a high L/D ratio and low stiffness,"* and that vibration *"may appear up to levels which can seriously degrade the machined surface quality"* (noise, bad surface, sometimes tool breakage). The specific stable spindle speeds / engagement values are owner-gated -- see `constants.ts` and the SFC galaxy; this entry asserts only the *direction* (higher L/D -> lower stiffness -> more deflection/chatter -> worse finish and dimensional accuracy).

Source: [Wikipedia -- Machining vibrations](https://en.wikipedia.org/wiki/Machining_vibrations)

---

## Verification

### 12. The chart proves stability; the capability study proves conformance -- run both, in order

A recurring process-mistake is using one analysis to answer the other's question. Stability (control chart) and conformance-to-spec (capability study) are independent properties; a process can have either without the other.

- **Why it bites:** "the chart is in control, so we're good to ship" ignores capability; "Cpk passed, so the process is fine" ignores stability and hides the in-control prerequisite from gotcha #1.
- **Expert avoidance:** sequence the verification -- (a) demonstrate statistical control on the chart, (b) confirm the distribution is adequately normal, (c) only then compute and interpret the capability index against the spec. This chains gotchas #1, #2, #5, and #7 into one disciplined order and is the standard reading of NIST's "in-control process ... compared to the specification limits."

Source: [NIST/SEMATECH e-Handbook 6.1.6](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm)

---

## Owner-gate (NOT promoted)

The following items are numeric or could not be confirmed against a fetched primary source. `quality-owner` must verify each before it is asserted as galaxy doctrine.

- **Capability/performance acceptance thresholds** (numeric Cpk/Ppk pass values, the "1.33/1.67" tiers). Numeric -- gated to `constants.ts`. Foundations already gates the centered-normal reject-rate ppm table; the same applies to any acceptance gate.
- **The Cp/Cpk vs Pp/Ppk (capability vs performance) numeric framing** -- within-subgroup sigma (R-bar/d2) vs overall sigma (s). The *conceptual* distinction (within-subgroup vs overall variation) is sound and lives in foundations as an owner-gated item; the NIST 6.1.6 page fetched here does NOT cover Pp/Ppk, so no performance-index claim is asserted in this practitioner file. Gated until confirmed against the AIAG SPC manual.
- **Gauge R&R %GRR acceptance tiers and ndc minimum**, and the precision-to-tolerance (P/T) numeric cutoff. The qualitative ideas (judge measurement error relative to tolerance/part variation; the nested design sees only what it is structured to see) are promoted; the numeric cutoffs are owner-gated (AIAG MSA manual is not a free source).
- **Standard metrology reference temperature** (the specific degrees value for dimensional measurement) and any coefficient-of-thermal-expansion numbers. Numeric -- gated to `constants.ts`. Only the qualitative relationship (higher temperature -> larger dimension on positive-expansion metal) is promoted.
- **Chatter-avoidance cutting values** -- stable spindle speeds (stability-lobe), L/D ratio thresholds, radial engagement, depth of cut. All numeric -- gated to `constants.ts` and the SFC galaxy. Only the direction-of-trade is promoted.
- **Rational-subgrouping minimum sample/subgroup counts.** The principle (form subgroups so within-subgroup variation is common-cause only) is sound but the dedicated free page did not confirm the methodology text in this pass; the specific count Shewhart recommended is numeric and owner-gated.

---

## Sources (actually WebFetched and confirmed during verification, 2026-06-10)

- [NIST/SEMATECH e-Handbook 6.1.6 -- Process Capability Indices](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm) *(in-control prerequisite, normality assumption, index randomness)*
- [NIST/SEMATECH e-Handbook 6.2.1 -- Lot Acceptance Sampling Plans](https://www.itl.nist.gov/div898/handbook/pmc/section2/pmc21.htm) *(acceptance sampling is disposition, not measurement/improvement)*
- [NIST/SEMATECH e-Handbook 6.3.1 -- Univariate Control Charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm) *(non-random pattern within limits = out of control)*
- [NIST/SEMATECH e-Handbook 2.4.4 -- Analysis of variability (gauge R&R nested design)](https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc44.htm) *(study sees only the variability its design exposes; other uncertainty sources exist)*
- [NIST/SEMATECH e-Handbook 2.1.3 -- Bias and Accuracy](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc113.htm) *(bias is systematic; reduced by calibration, not by averaging)*
- [Wikipedia -- Process capability](https://en.wikipedia.org/wiki/Process_capability) *("capability has no meaning" out of control; normality)*
- [Wikipedia -- Control chart](https://en.wikipedia.org/wiki/Control_chart) *(control limits vs spec limits; tampering/over-control increases variation)*
- [Wikipedia -- ANOVA gauge R&R](https://en.wikipedia.org/wiki/ANOVA_gauge_R%26R) *(precision-to-tolerance framing)*
- [Wikipedia -- Thermal expansion](https://en.wikipedia.org/wiki/Thermal_expansion) *(temperature affects precision measurement; direction of trade)*
- [Wikipedia -- Machining vibrations](https://en.wikipedia.org/wiki/Machining_vibrations) *(high L/D ratio -> low stiffness -> chatter -> degraded surface quality)*
