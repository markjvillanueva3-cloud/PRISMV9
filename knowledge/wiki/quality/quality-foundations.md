---
title: Quality Galaxy Foundations (SPC + Capability + Detection Rules)
galaxy: quality
owner_slot: quality-owner
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); DEEPEN pass (claude-b5de5424, 2026-06-09); DEEPEN-2 pass (2026-06-10)"
verification_method: "Each claim below was confirmed by a live WebFetch call against its cited primary/canonical source (NIST/SEMATECH e-Handbook and Wikipedia rule pages). The 2026-06-09 DEEPEN pass appended Sections 4-10 from newly-untapped free/legal source categories -- gov reports (NIST measurement-uncertainty/GUM, NIST measurement-process-characterization, NIST gauge R&R, NIST EWMA/CUSUM, NIST SPC history), a free textbook (OpenStax Introductory Statistics 2e), and free college courseware (MIT OCW 2.830J and 16.660J) -- each confirmed by a live WebFetch. The 2026-06-10 DEEPEN-2 pass appended Sections 11-15 from source URLs NOT previously cited: two public-domain Shewhart primary texts on the Internet Archive (Economic Control of Quality 1931/1980; Statistical Method from the Viewpoint of Quality Control 1939, ed. Deming), a new NIST e-Handbook section (5.1.1 DOE), a second OpenStax book (Introductory Business Statistics 2e, CLT), a NASA workmanship standard (NASA-STD-8739.6), and a third MIT OCW course (15.075J) -- each confirmed by a live WebFetch. Claims that could not be confirmed against a fetched primary source -- numeric control-chart constants, Gage R&R/MSA thresholds, ndc, and ISO 14253-1 guard-band specifics -- were left owner-gated in the _staging packet and are NOT asserted here."
tags: [quality, spc, control-charts, process-capability, cpk, western-electric, nelson-rules, metrology, measurement-uncertainty, gum, msa, gauge-rr, ewma, cusum, empirical-rule, doe, central-limit-theorem, workmanship, shewhart, mit-ocw, openstax, nasa, internet-archive]
---

# Quality Galaxy Foundations (SPC + Capability + Detection Rules)

WebFetch-confirmed institutional / methodology facts for the PRISM `quality` galaxy. The source of each claim was actually fetched during verification and the page confirmed the wording. Numeric constants, acceptance thresholds, and standards-text specifics that could not be confirmed against a fetched primary source remain owner-gated in the staging packet (see `## Owner-gate (NOT promoted)`).

---

## 1. Shewhart Control Limits -- the 3-sigma convention (NIST-confirmed)

- In the U.S., it is acceptable practice to base control limits on a multiple of the standard deviation, and that multiple is usually 3 -- regardless of whether the variable is normally distributed. The NIST/SEMATECH e-Handbook states verbatim: *"In the U.S., whether X is normally distributed or not, it is an acceptable practice to base the control limits upon a multiple of the standard deviation. Usually this multiple is 3."*
- For normal distributions, the 3-sigma limits are the practical equivalent of 0.001 probability limits: *"For normal distributions, therefore, the 3 sigma limits are the practical equivalent of 0.001 probability limits."* Under chance causes alone, exceeding the 3-sigma limit has a probability of roughly one in a thousand in each direction.
- The common-cause / special-cause decision is the foundational SPC rule: *"If a data point falls outside the control limits, we assume that the process is probably out of control and that an investigation is warranted to find and eliminate the cause or causes."*

Source: [NIST/SEMATECH e-Handbook, Section 6.3.1 (Univariate Control Charts)](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)

---

## 2. Process Capability Indices -- canonical formulas (NIST-confirmed)

The NIST/SEMATECH e-Handbook gives the canonical capability-index formulas (population form; sample estimators substitute x-bar for mu and s for sigma):

- `Cp  = (USL - LSL) / (6 * sigma)` -- potential capability (spread only).
- `Cpk = min[ (USL - mu)/(3*sigma), (mu - LSL)/(3*sigma) ]` -- actual capability (spread and centering).
- `Cpu = (USL - mu)/(3*sigma)` -- one-sided upper.
- `Cpl = (mu - LSL)/(3*sigma)` -- one-sided lower.
- `Cpm = (USL - LSL) / (6 * sqrt(sigma^2 + (mu - T)^2))` -- Taguchi index, penalizes departure of the mean from target T.

The page also presents a capability-to-reject-rate table for a **centered, normal** process, and explicitly notes the figures assume the distribution is centered at mu:

| Cp | Reject rate |
|-----|-------------|
| 1.00 | 0.27% |
| 1.33 | 64 ppm |
| 1.66 | 0.6 ppm |
| 2.00 | 2 ppb |

NIST states the reject figures *"are based on the assumption that the distribution is centered at mu."* Because `Cpk = min[...]`, it follows structurally that `Cpk <= Cp` always, with equality only when the process is perfectly centered.

Source: [NIST/SEMATECH e-Handbook, Section 6.1.6 (Process Capability Indices)](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm)

---

## 3. Out-of-Control Detection Rules (Wikipedia-confirmed)

### Western Electric rules (1956 handbook, zone tests)

Origin: the 1956 Western Electric Statistical Quality Control Handbook. The chart band is split into zones measured in sigma from the center line: Zone A = 2-sigma to 3-sigma, Zone B = 1-sigma to 2-sigma, Zone C = within 1-sigma. The four zone-test rules:

1. Any single point falls outside the 3-sigma limit from the center line.
2. Two out of three consecutive points fall beyond the 2-sigma limit (zone A or beyond), on the same side of the center line.
3. Four out of five consecutive points fall beyond the 1-sigma limit (zone B or beyond), on the same side of the center line.
4. Eight consecutive points fall on the same side of the center line.

Source: [Wikipedia, "Western Electric rules"](https://en.wikipedia.org/wiki/Western_Electric_rules)

### Nelson rules (Lloyd S. Nelson, Journal of Quality Technology, October 1984)

Authored by Lloyd S. Nelson, published in the *Journal of Quality Technology* 16, no. 4 (October 1984). The eight rules:

1. One point is more than 3 standard deviations from the mean.
2. Nine (or more) points in a row are on the same side of the mean.
3. Six (or more) points in a row are continually increasing (or decreasing).
4. Fourteen (or more) points in a row alternate in direction, increasing then decreasing.
5. Two (or three) out of three points in a row are more than 2 standard deviations from the mean in the same direction.
6. Four (or five) out of five points in a row are more than 1 standard deviation from the mean in the same direction.
7. Fifteen points in a row are all within 1 standard deviation of the mean (on either side).
8. Eight points in a row exist with none within 1 standard deviation of the mean, on both sides (mixture / over-dispersion).

Source: [Wikipedia, "Nelson rules"](https://en.wikipedia.org/wiki/Nelson_rules)

---

## 4. Measurement Uncertainty -- the GUM framework (NIST-confirmed)

A second body of quality doctrine, distinct from SPC, governs how a measurement result's reliability is expressed. The canonical reference is the GUM (Guide to the Expression of Uncertainty in Measurement); NIST's measurement-uncertainty pages quote its definitions verbatim.

- **Measurement uncertainty (GUM definition):** *"A parameter, associated with the result of a measurement, that characterizes the dispersion of the values that could reasonably be attributed to the measurand."* The VIM phrases it as *"A non-negative parameter characterizing the dispersion of the quantity values being attributed to a measurand, based on the information used."* NIST emphasizes that measurement uncertainty *"expresses incomplete knowledge"* about the measurand.
- **Type A evaluation:** *"method of evaluation of uncertainty by the statistical analysis of series of observations."*
- **Type B evaluation:** *"method of evaluation of uncertainty by means other than the statistical analysis of series of observations."*
- **Standard uncertainty:** *"Each component of uncertainty, however evaluated, is represented by an estimated standard deviation, termed standard uncertainty"* -- equal to the positive square root of the estimated variance. For a Type A component the standard uncertainty `ui = si` (the statistically estimated standard deviation).
- **Expanded uncertainty (U) and coverage factor (k):** the expanded uncertainty is `U = k * uc(y)`, defining the interval `Y = y +/- U`. The coverage factor k is *"chosen on the basis of the desired level of confidence to be associated with the interval defined by U = k*uc"* and typically ranges from 2 to 3. For a normal distribution with a reliable `uc` estimate, *"U = 2*uc (i.e., k = 2) defines an interval having a level of confidence of approximately 95%."*

The k=2 / ~95% convention is the metrology analogue of the SPC 3-sigma convention (Section 1): both are deliberately-chosen multiples of an estimated standard deviation, not derived constants.

Sources: [NIST -- Measurement Uncertainty (GUM/VIM definitions)](https://www.nist.gov/itl/sed/topic-areas/measurement-uncertainty) · [NIST CUU -- Basic uncertainty (Type A/B, standard uncertainty)](https://physics.nist.gov/cuu/Uncertainty/basic.html) · [NIST CUU -- Expanded uncertainty and coverage factor](https://physics.nist.gov/cuu/Uncertainty/coverage.html)

---

## 5. The Measurement Process as a Production Process (NIST-confirmed)

NIST's Measurement Process Characterization handbook frames metrology in the same statistical-control language as manufacturing:

- *"A measurement process can be thought of as a well-run production process in which measurements are the output."*
- The "goodness" of measurements is judged on four factors: **bias**, **short-term variability (instrument precision)**, **day-to-day / long-term variability**, and **uncertainty**.
- Precision and bias are distinct issues: precision is *"short-term variability or instrument precision,"* while bias and day-to-day variability are controlled through a long-term variability program.
- **Measurement assurance:** *"The continuation of goodness is guaranteed by a statistical control program that controls both short-term variability or instrument precision [and] long-term variability which controls bias and day-to-day variability of the process."*
- Scope caveat: these techniques apply to *"ongoing processes"* (calibration, certification, production); *"one-time tests and special tests or destructive tests are difficult to characterize."*

Source: [NIST/SEMATECH e-Handbook, Section 2.1.1 -- What is a measurement process?](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc11.htm)

---

## 6. Measurement System Analysis / Gauge R&R (NIST-confirmed)

NIST's gauge-study section defines the purpose and structure of measurement system analysis (MSA):

- Purpose: *"to outline the steps that can be taken to characterize the performance of gauges and instruments used in a production setting in terms of errors that affect the measurements."*
- The primary variability components NIST identifies are **repeatability** (variation from repeated measurements), **reproducibility** (variation across different operators or conditions), and **stability** (consistency of measurements over time).
- Bias is decomposed into categories NIST enumerates: resolution, linearity (accuracy across the measurement range), hysteresis, drift, differences among gauges, and differences among geometries/configurations.
- Study design centers on examining artifacts, operators, and gauges/parameter-levels/configurations as the design elements.

This is the free, primary-source foundation under the more familiar AIAG %GRR / ndc acceptance tiers -- which remain owner-gated below because the AIAG MSA manual itself is not a free source.

Source: [NIST/SEMATECH e-Handbook, Section 2.4 -- Gauge R&R studies](https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc4.htm)

---

## 7. Advanced Control Charts for Small Shifts: EWMA and CUSUM (NIST-confirmed)

The 3-sigma Shewhart chart (Section 1) reacts only when the most recent point breaches a limit; it is comparatively slow to detect small, sustained shifts. NIST documents two alternatives built for that regime.

### EWMA (Exponentially Weighted Moving Average)

- *"The Exponentially Weighted Moving Average (EWMA) is a statistic for monitoring the process that averages the data in a way that gives less and less weight to data as they are further removed in time."*
- The weighting parameter lambda governs memory: *"A value of lambda = 1 implies that only the most recent measurement influences the EWMA (degrades to Shewhart chart)."* Typical values run between 0.2 and 0.3.
- Advantage: EWMA *"can be made sensitive to a small or gradual drift in the process, whereas the Shewhart control procedure can only react when the last data point is outside a control limit"* -- because the decision rests on an exponentially weighted average of all prior data, not just the current point.

Source: [NIST/SEMATECH e-Handbook, Section 6.3.2.4 -- EWMA control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc324.htm)

### CUSUM (Cumulative Sum)

- The CUSUM chart plots cumulative sums of deviations from a target mean.
- NIST states CUSUM charts *"have been shown to be more efficient in detecting small shifts in the mean of a process. In particular, analyzing ARL's for CUSUM control charts shows that they are better than Shewhart control charts when it is desired to detect shifts in the mean that are 2 sigma or less."*

Source: [NIST/SEMATECH e-Handbook, Section 6.3.2.3 -- CUSUM control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc323.htm)

---

## 8. Statistical Foundations: the Empirical Rule (OpenStax-confirmed)

Why 3-sigma limits and 2/1-sigma zones (Sections 1 and 3) carry the probabilities they do traces to the normal distribution's empirical rule. From OpenStax's free *Introductory Statistics* textbook:

- A **z-score** *"is measured in units of the standard deviation"*; via `z = (x - mu) / sigma` it *"tells you how many standard deviations the value x is above (to the right of) or below (to the left of) the mean, mu."* The standard normal distribution is `Z ~ N(0, 1)`.
- The **empirical rule (68-95-99.7 rule)** for a normally distributed variable: *"About 68% of the x values lie between -1 sigma and +1 sigma of the mean"*; *"About 95% ... between -2 sigma and +2 sigma"*; *"About 99.7% ... between -3 sigma and +3 sigma."*

These three bands map directly onto the Western Electric Zone C (within 1 sigma), Zone B (1-2 sigma), and Zone A (2-3 sigma) tests, and onto the ~99.7% / 3-sigma Shewhart limit.

Source: [OpenStax, Introductory Statistics 2e, Section 6.1 -- The Standard Normal Distribution](https://openstax.org/books/introductory-statistics-2e/pages/6-1-the-standard-normal-distribution)

---

## 9. Historical Origin of SPC (NIST-confirmed)

NIST's e-Handbook records the origin of modern statistical quality control:

- *"It was not until the 1920s that statistical theory began to be applied effectively to quality control as a result of the development of sampling theory."*
- Walter Shewhart *"issued a memorandum on May 16, 1924 that featured a sketch of a modern control chart"* -- the document NIST credits as the genesis of the control chart still used today.

Source: [NIST/SEMATECH e-Handbook, Section 6.1.1 -- Introduction to Process/Product Monitoring](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc11.htm)

---

## 10. Quality Methodology in University Courseware (MIT OCW-confirmed)

Free graduate courseware situates PRISM's quality galaxy in the broader academic framing of process control and improvement.

- **MIT 2.830J / SMA 6303 -- Control of Manufacturing Processes** (Profs. David Hardt and Duane Boning) covers *"statistical modeling and control in manufacturing processes,"* spanning experimental design and response-surface modeling of process physics, *"defect and parametric yield modeling and optimization,"* and *"statistical process control, run by run and adaptive control, and real-time feedback control,"* across semiconductor, metal/polymer, and micro-nano manufacturing.
- **MIT 16.660J -- Introduction to Lean Six Sigma Methods** covers *"the fundamental principles, practices and tools of Lean Six Sigma methods that underlay modern organizational productivity approaches applied in aerospace, automotive, health care, and other sectors,"* using a physical enterprise/clinic simulation to demonstrate the methods hands-on.

These confirm that SPC is one layer of a wider stack -- design of experiments, yield modeling, adaptive/feedback control, and Lean Six Sigma -- that the quality galaxy can grow into.

Sources: [MIT OCW 2.830J -- Control of Manufacturing Processes (Spring 2008)](https://ocw.mit.edu/courses/2-830j-control-of-manufacturing-processes-sma-6303-spring-2008/) · [MIT OCW 16.660J -- Introduction to Lean Six Sigma Methods (IAP 2012)](https://ocw.mit.edu/courses/16-660j-introduction-to-lean-six-sigma-methods-january-iap-2012/)

---

## 11. Primary-Source Origins of SPC: Shewhart's Own Books (Internet Archive-confirmed)

Section 9 dates the control chart to Shewhart's 1924 memo via NIST. The two foundational books are themselves in the public domain and catalogued on the Internet Archive, which lets the galaxy cite the primary literature rather than only secondary summaries:

- **Shewhart, *Economic Control of Quality of Manufactured Product*** -- the founding monograph of statistical quality control. The Internet Archive record states it was *"Originally published: New York : Van Nostrand, 1931"* and the catalogued copy is the *"50th anniversary commemorative reissue"* by the American Society for Quality Control (Milwaukee, 1980), *"xiv, 501 pages"*. Its Library of Congress subject headings are *"Factory management,"* *"Statistics -- Graphic methods,"* and *"Quality control -- Statistical methods."* This is the book that introduced the control chart and the assignable-vs-chance-cause distinction that Section 1 codifies.
- **Shewhart, *Statistical Method from the Viewpoint of Quality Control*** (1939) -- *"a series of four lectures ... before the Graduate School of the Department of Agriculture,"* edited by **W. Edwards Deming** and published by *"Washington, The Graduate School, The Department of Agriculture."* Its subject tags are *"Statistics"* and *"Quality control."* This is the work in which Shewhart laid out the operational / specify-produce-inspect cycle that Deming later popularized.

Together these establish that the 3-sigma chart, the chance/assignable-cause dichotomy, and the statistical-control concept all trace to a single primary author (Shewhart) and that the second book's editorship links the SPC lineage directly to Deming.

Sources: [Internet Archive -- Shewhart, Economic Control of Quality of Manufactured Product (1931 / 1980 reissue)](https://archive.org/details/economiccontrolo0000shew) · [Internet Archive -- Shewhart, Statistical Method from the Viewpoint of Quality Control (1939, ed. Deming)](https://archive.org/details/statisticalmetho00shew)

---

## 12. Design of Experiments -- the layer above SPC (NIST-confirmed)

SPC monitors a running process; Design of Experiments (DOE) is the complementary discipline for *improving* it by deliberately changing inputs. NIST's Engineering Statistics Handbook frames DOE as follows:

- DOE is *"an efficient procedure for planning experiments so that the data obtained can be analyzed to yield valid and objective conclusions."* It works by deliberately changing process input factors and observing the effect on response variables.
- The guiding principle is information economy: *"well chosen experimental designs maximize the amount of 'information' that can be obtained for a given amount of experimental effort."*
- The DOE model distinguishes **controlled input factors** (which the experimenter can vary), measured **output responses**, and **uncontrolled factors** -- both discrete (e.g., different machines) and continuous (e.g., temperature) -- with empirical models (typically linear or quadratic) linking outputs to inputs.

This is the NIST-primary foundation under the "experimental design and response-surface modeling" content that MIT 2.830J lists (Section 10): SPC catches a process leaving control, DOE finds the factor settings that move the process to a better center in the first place.

Source: [NIST/SEMATECH e-Handbook, Section 5.1.1 -- What is experimental design?](https://www.itl.nist.gov/div898/handbook/pri/section1/pri11.htm)

---

## 13. Why Subgroup Averages Work: the Central Limit Theorem (OpenStax-confirmed)

Shewhart charts plot **subgroup averages** (x-bar charts), not individual readings -- and the statistical reason is the Central Limit Theorem (CLT). From OpenStax's free *Introductory Business Statistics 2e* (a different OpenStax book than the Introductory Statistics 2e cited in Section 8):

- The CLT states that *"the theoretical distribution of the means of samples from the population will be normally distributed"* regardless of the shape of the underlying population distribution, provided *"the sample size is 'large enough' which has been shown to be only 30 observations or more."*
- The sampling distribution of the mean is centered on the population mean (`mu_xbar = mu`) and has a smaller spread, the **standard error**, given by `sigma_xbar = sigma / sqrt(n)`.

This explains two SPC facts at once: (1) charting averages makes the normal-distribution / empirical-rule assumptions of Sections 1, 3, and 8 hold approximately even for non-normal process outputs, and (2) the control limits on an x-bar chart are narrower than on an individuals chart by a factor of `sqrt(n)`, because the dispersion of subgroup means is `sigma/sqrt(n)`.

Source: [OpenStax, Introductory Business Statistics 2e, Section 7.1 -- The Central Limit Theorem for Sample Means](https://openstax.org/books/introductory-business-statistics-2e/pages/7-1-the-central-limit-theorem-for-sample-means)

---

## 14. Quality Beyond Statistics: Workmanship Standards (NASA-confirmed)

SPC and capability indices govern measurable, variable characteristics; a parallel branch of quality doctrine governs **workmanship** -- attribute conformance to documented build requirements. A free, authoritative government example is NASA's workmanship standard:

- **NASA-STD-8739.6, "Implementation Requirements for NASA Workmanship Standards,"** exists to *"provide manufacturing, quality, and training requirements for the manufacture of NASA mission hardware and electrostatic discharge (ESD) control."*
- It augments the requirements found in a referenced family of workmanship-requirements documents, tying manufacturing, quality assurance, and operator training together for mission-critical hardware.

This confirms a distinct quality axis the galaxy should model alongside SPC: documented manufacturing/quality/training requirements and ESD control, where conformance is judged against a written standard rather than a statistical control limit.

Source: [NASA Technical Standards -- NASA-STD-8739.6, Implementation Requirements for NASA Workmanship Standards](https://standards.nasa.gov/standard/NASA/NASA-STD-87396)

---

## 15. Statistical-Methods Curriculum Behind Quality (MIT OCW-confirmed)

Beyond the manufacturing-specific courses in Section 10, MIT publishes a free general statistics course whose syllabus is exactly the analytical toolkit the quality galaxy draws on:

- **MIT 15.075J -- Statistical Thinking and Data Analysis** (Prof. Cynthia Rudin et al., MIT Sloan, Fall 2011): *"This course is an introduction to statistical data analysis. Topics are chosen from applied probability, sampling, estimation, hypothesis testing, linear regression, analysis of variance, categorical data analysis, and nonparametric statistics."*

Sampling, estimation, hypothesis testing, regression, and ANOVA are the exact inference operations underneath control-limit estimation, capability-index estimation, Gage R&R variance decomposition (Section 6), and DOE analysis (Section 12) -- confirming that the quality galaxy rests on a standard, openly-taught statistics foundation, not domain-specific heuristics.

Source: [MIT OCW 15.075J -- Statistical Thinking and Data Analysis (Fall 2011)](https://ocw.mit.edu/courses/15-075j-statistical-thinking-and-data-analysis-fall-2011/)

---

## Owner-gate (NOT promoted)

The following claims from the staging packet (`_staging/deep-domain-research-2026-06-09.md`) were NOT promoted. They remain owner-gated for `quality-owner` to verify against a primary source before integrating into galaxy doctrine. Reasons given per item.

- **Xbar-R control-chart constants (A2, d2, D3, D4 tables; e.g. n=2 A2=1.880, n=3 A2=1.023).** These are specific numeric constants; the cited constant-table mirror (Bessegato/UFJF PDF) was NOT fetched/confirmed during this pass. The packet itself flags a conflicting web value (A2=1.187 vs 1.023 for n=3). Numeric constants stay gated until confirmed against ASTM / the NIST constant table directly.
- **Reject-rate ppm values as production thresholds.** The 2700 ppm / 64 ppm / 0.6 ppm / 2 ppb figures ARE confirmed against NIST Section 6.1.6 as a centered-process illustration -- but they are an idealized centered-normal table, not a production acceptance threshold. Do not adopt as a process gate without owner sign-off on the centering/normality assumptions.
- **Gage R&R %GRR acceptance tiers (<=10% acceptable, 10-30% conditional, >30% reject) and ndc >= 5 minimum.** Sourced only from secondary summaries of the AIAG MSA 4th-edition manual (the AIAG reference is not free). The AIAG manual itself was not fetched. Gated until confirmed against the AIAG MSA reference.
- **ndc analytic relationship `ndc = (sigma_part / sigma_gage) * sqrt(2)` and the %GRR/ndc non-independence claim.** Sourced from secondary summaries plus a paywalled ScienceDirect paper that was not fetched. Gated.
- **ISO 14253-1 decision-rule specifics** -- three-zone (conformance / nonconformance / uncertainty) structure, the guard-band shrink/expand rule, the 2017 default 95% conformance-probability change, and the ~83%-of-expanded-uncertainty guard-band figure. The ISO.org abstract URL returned HTTP 403 on two attempts and could not be confirmed against the primary standard text; secondary sources (H.N. Metrology, ISOBudgets) were not independently fetched. The entire ISO 14253-1 section stays owner-gated until the standard text (or a confirmable abstract) is verified.
- **Cpk-vs-Ppk within-vs-overall sigma framing** -- the exact within-subgroup estimator wording (R-bar/d2 vs s-bar/c4) as AIAG SPC doctrine. The NIST within-subgroup sigma definition is sound, but the AIAG SPC-manual framing was not fetched. Gated until confirmed against the AIAG SPC manual.
- **Western Electric / Nelson combined false-alarm rate (~7.5% over ten subgroups).** Sourced from a secondary SPC summary, not a primary source. Gated.

---

## Sources (actually WebFetched and confirmed during verification)

- [NIST/SEMATECH e-Handbook, Section 6.3.1 -- Univariate Control Charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- [NIST/SEMATECH e-Handbook, Section 6.1.6 -- Process Capability Indices](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm)
- [Wikipedia -- Western Electric rules](https://en.wikipedia.org/wiki/Western_Electric_rules)
- [Wikipedia -- Nelson rules](https://en.wikipedia.org/wiki/Nelson_rules)
- [NIST -- Measurement Uncertainty (GUM/VIM definitions)](https://www.nist.gov/itl/sed/topic-areas/measurement-uncertainty) *(added 2026-06-09 DEEPEN pass -- gov)*
- [NIST CUU -- Basic uncertainty: Type A/B + standard uncertainty](https://physics.nist.gov/cuu/Uncertainty/basic.html) *(added 2026-06-09 DEEPEN pass -- gov)*
- [NIST CUU -- Expanded uncertainty and coverage factor](https://physics.nist.gov/cuu/Uncertainty/coverage.html) *(added 2026-06-09 DEEPEN pass -- gov)*
- [NIST/SEMATECH e-Handbook, Section 2.1.1 -- What is a measurement process?](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc11.htm) *(added 2026-06-09 DEEPEN pass -- gov)*
- [NIST/SEMATECH e-Handbook, Section 2.4 -- Gauge R&R studies](https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc4.htm) *(added 2026-06-09 DEEPEN pass -- gov)*
- [NIST/SEMATECH e-Handbook, Section 6.3.2.4 -- EWMA control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc324.htm) *(added 2026-06-09 DEEPEN pass -- gov)*
- [NIST/SEMATECH e-Handbook, Section 6.3.2.3 -- CUSUM control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc323.htm) *(added 2026-06-09 DEEPEN pass -- gov)*
- [NIST/SEMATECH e-Handbook, Section 6.1.1 -- Introduction to Process/Product Monitoring (SPC history)](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc11.htm) *(added 2026-06-09 DEEPEN pass -- gov)*
- [OpenStax, Introductory Statistics 2e, Section 6.1 -- The Standard Normal Distribution](https://openstax.org/books/introductory-statistics-2e/pages/6-1-the-standard-normal-distribution) *(added 2026-06-09 DEEPEN pass -- free textbook)*
- [MIT OCW 2.830J -- Control of Manufacturing Processes (Spring 2008)](https://ocw.mit.edu/courses/2-830j-control-of-manufacturing-processes-sma-6303-spring-2008/) *(added 2026-06-09 DEEPEN pass -- free college course)*
- [MIT OCW 16.660J -- Introduction to Lean Six Sigma Methods (IAP 2012)](https://ocw.mit.edu/courses/16-660j-introduction-to-lean-six-sigma-methods-january-iap-2012/) *(added 2026-06-09 DEEPEN pass -- free college course)*
- [Internet Archive -- Shewhart, Economic Control of Quality of Manufactured Product (1931 Van Nostrand orig / 1980 ASQC reissue)](https://archive.org/details/economiccontrolo0000shew) *(added 2026-06-10 DEEPEN-2 pass -- public-domain primary text)*
- [Internet Archive -- Shewhart, Statistical Method from the Viewpoint of Quality Control (1939, ed. W. Edwards Deming)](https://archive.org/details/statisticalmetho00shew) *(added 2026-06-10 DEEPEN-2 pass -- public-domain primary text)*
- [NIST/SEMATECH e-Handbook, Section 5.1.1 -- What is experimental design? (DOE)](https://www.itl.nist.gov/div898/handbook/pri/section1/pri11.htm) *(added 2026-06-10 DEEPEN-2 pass -- gov)*
- [OpenStax, Introductory Business Statistics 2e, Section 7.1 -- The Central Limit Theorem for Sample Means](https://openstax.org/books/introductory-business-statistics-2e/pages/7-1-the-central-limit-theorem-for-sample-means) *(added 2026-06-10 DEEPEN-2 pass -- free textbook)*
- [NASA Technical Standards -- NASA-STD-8739.6, Implementation Requirements for NASA Workmanship Standards](https://standards.nasa.gov/standard/NASA/NASA-STD-87396) *(added 2026-06-10 DEEPEN-2 pass -- gov standard)*
- [MIT OCW 15.075J -- Statistical Thinking and Data Analysis (Fall 2011)](https://ocw.mit.edu/courses/15-075j-statistical-thinking-and-data-analysis-fall-2011/) *(added 2026-06-10 DEEPEN-2 pass -- free college course)*
