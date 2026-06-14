---
status: VERIFIED-PARTIAL
owner_slot: quality-owner
staged_by: papa-deepdomain-research
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
date: 2026-06-09
galaxy: quality
domain_focus: SPC + metrology — Cpk/Ppk, control-chart rules, Gage R&R / MSA, ISO 14253 decision rules
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/quality/quality-foundations.md; numeric/safety specifics below stay owner-gated for quality-owner. -->**

# Quality Galaxy — Deep-Domain Research Packet (SPC + Metrology)

This packet stages high-value, cited domain facts that would make the PRISM `quality` galaxy authoritative on Statistical Process Control and measurement-system metrology. Every fact carries an inline citation. Owner must independently verify against the cited source.

---

## 1. Shewhart Control Charts — Limit Convention & Variation Theory

- **3-sigma control limits are the convention, and they correspond to ~0.001 probability limits.** Per the NIST/SEMATECH e-Handbook: "In the U.S., whether X is normally distributed or not, it is an acceptable practice to base the control limits upon a multiple of the standard deviation. Usually this multiple is 3." And: "the 3σ limits are the practical equivalent of 0.001 probability limits" — meaning ~2 of every 1,000 in-control points fall outside the limits by chance alone. (Source: NIST/SEMATECH e-Handbook §6.3.1, `itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm`)

- **Common-cause vs special-cause variation is the foundational distinction.** "Chance causes" are normal random variation within limits; a point outside the limits implies "the process is probably out of control and that an investigation is warranted to find and eliminate the cause." Distinguishing common (chance) from special (assignable) causes traces to Walter A. Shewhart's 1920s work at Bell Labs. (Sources: NIST/SEMATECH e-Handbook §6.3.1; Wikipedia, *Western Electric rules* — Shewhart origin)

## 2. Xbar-R Chart Control-Limit Constants (small subgroups)

- **Xbar chart limits use A2; R-chart limits use D3 (lower) and D4 (upper); σ is estimated as R̄/d2.** Formulas: `UCL_X, LCL_X = X̄ ± A2·R̄`; `UCL_R = D4·R̄`, `LCL_R = D3·R̄`; `σ̂ = R̄ / d2`. (Source: NIST/SEMATECH e-Handbook §6.3.1.1 / §6.3.2.1, `itl.nist.gov/div898/handbook/pmc/section3/pmc311.htm`; ASTM-derived constant tables)

- **Constant values for n=2 and n=3** (verify the full n=2..25 table before coding):
  | n | A2 | d2 | D3 | D4 |
  |---|------|-------|------|------|
  | 2 | 1.880 | 1.128 | 0.000 | 3.267 |
  | 3 | 1.023 | 1.693 | 0.000 | 2.574 |

  Note: D3 = 0 (no lower R-limit) for subgroup size n ≤ 6. The constants are interrelated: `A2(n) = 3 / (d2(n)·√n)` — e.g. for n=3, d2=1.6926 ⇒ A2=1.0233. (Sources: NIST/SEMATECH e-Handbook §6.3.1.1; ASTM/Bessegato constant table `bessegato.com.br/.../table_of_control_chart_constants_old.pdf`. CAUTION: one web source mis-listed A2=1.187 for n=3; the standard value is 1.023 — verify.)

- **s̄/c4 is the unbiased estimator of σ when using the S-chart (standard-deviation) approach** instead of the range approach. (Source: NIST/SEMATECH e-Handbook §6.3.2.1)

## 3. Out-of-Control Detection Rules — Zones, Western Electric, Nelson

- **The control band is split into zones measured in sigma from the center line:** Zone A = 2σ–3σ, Zone B = 1σ–2σ, Zone C = 0–1σ (each side). Rules detect non-random patterns even when all points lie inside the 3σ limits. (Source: web SPC references summarizing the 1956 Western Electric handbook; Wikipedia *Western Electric rules*)

- **Western Electric Rules (4 rules, 1956 handbook):**
  1. One point beyond 3σ from the center line.
  2. Two of three consecutive points beyond 2σ on the same side.
  3. Four of five consecutive points beyond 1σ on the same side.
  4. Eight consecutive points on the same side of the center line.
  (Source: Wikipedia *Western Electric rules*; QI Macros WECO summary)

- **Nelson Rules (8 rules, Lloyd S. Nelson, *Journal of Quality Technology*, October 1984)** — extend Western Electric so each test has roughly equal chance-detection probability:
  1. One point > 3σ from the mean.
  2. Nine+ points in a row on the same side of the mean.
  3. Six+ points in a row continually increasing or decreasing (trend).
  4. Fourteen+ points in a row alternating up/down (oscillation).
  5. Two of three points in a row > 2σ from mean, same direction.
  6. Four of five points in a row > 1σ from mean, same direction.
  7. Fifteen points in a row all within 1σ of the mean (under-dispersion / stratification).
  8. Eight points in a row all > 1σ from mean, on both sides (mixture / over-dispersion).
  (Source: Wikipedia *Nelson rules*; LeanSixSigmaDefinition glossary)

- **False-alarm tradeoff:** combined Western Electric rules give roughly a 7.5% false-alarm rate over ten subgroups; adding the full Nelson set raises false-alarm risk further (more tests = more chances for a chance signal). Owner: treat as approximate, source is secondary. (Source: web SPC reference / Grokipedia summary of WE rules — SECONDARY, verify)

## 4. Process Capability Indices — Cp / Cpk / Cpm and Defect Rates

- **Core formulas** (population form; sample estimators substitute x̄ for μ and s for σ):
  - `Cp = (USL − LSL) / (6σ)`
  - `Cpk = min[ (USL − μ)/(3σ), (μ − LSL)/(3σ) ]`
  - `Cpu = (USL − μ)/(3σ)` (one-sided upper); `Cpl = (μ − LSL)/(3σ)` (one-sided lower)
  - `Cpm = (USL − LSL) / (6·√(σ² + (μ − T)²))` (Taguchi index, penalizes off-target mean T)
  (Source: NIST/SEMATECH e-Handbook §6.1.6, `itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm`)

- **Capability-to-reject-rate table (assumes a centered, normal process, μ at center):**
  | Cp | Spec width | Reject rate |
  |-----|-----------|-------------|
  | 1.00 | 6σ | 0.27% (2700 ppm) |
  | 1.33 | 8σ | 64 ppm |
  | 1.66 | 10σ | 0.6 ppm |
  | 2.00 | 12σ | 2 ppb |
  (Source: NIST/SEMATECH e-Handbook §6.1.6. The table explicitly notes "the reject figures are based on the assumption that the distribution is centered at μ.")

- **Cp vs Cpk distinction (verify for galaxy doctrine):** Cp measures potential capability (spread only); Cpk measures actual capability (spread *and* centering). Cpk ≤ Cp always, with equality only when the process is perfectly centered (μ at the midpoint of USL/LSL). This follows directly from the `min[...]` form of Cpk above. (Derivation from NIST formulas in §6.1.6 — owner confirm the inequality framing.)

## 5. Measurement System Analysis — Gage R&R Acceptance (AIAG MSA)

- **%GRR (Gage R&R as % of total variation) three-tier acceptance per AIAG MSA 4th ed.:**
  - ≤ 10% → measurement system acceptable.
  - 10%–30% → conditionally acceptable, depending on application criticality, cost, customer requirement, risk.
  - > 30% → not acceptable, must be improved.
  (Source: AIAG MSA 4th Edition as summarized by QualityEngineer.ai and Six Sigma Study Guide — SECONDARY summaries of the AIAG manual; verify against the AIAG MSA reference manual itself, which is not free.)

- **Number of Distinct Categories (ndc): AIAG minimum is ndc ≥ 5.** ndc = how many statistically distinct part groups the gage can resolve. `ndc = (σ_part / σ_gage) · √2`, conventionally truncated to an integer. ndc = 1 ⇒ cannot distinguish parts; ndc = 2 ⇒ only high/low; ndc ≥ 5 ⇒ enough resolution for process-control decisions. (Source: AIAG MSA 4th ed. as summarized by QualityEngineer.ai / learnqctools — SECONDARY)

- **%GRR and ndc must be evaluated together AND are not statistically independent.** %GRR can look good while ndc is low (narrow part variation), or %GRR marginal while ndc is high (wide part variation). Peer-reviewed work shows an *exact* analytic relationship between ndc and %GRR, arguing the common "two independent rules of thumb" treatment is incoherent and should be reviewed. (Source: Buffe/related papers via ResearchGate & ScienceDirect, e.g. "Number of distinct data categories and gage repeatability and reproducibility — a double (but single) requirement," *Measurement*, ScienceDirect `S0263224113001760`)

## 6. Conformance Decision Rules — ISO 14253-1 (Metrology Guard-Banding)

- **ISO 14253-1** (GPS — *Inspection by measurement of workpieces and measuring equipment — Part 1: Decision rules for verifying conformity or nonconformity with specifications*) defines three zones around each spec limit: **conformance, nonconformance, and an uncertainty (guard-band) zone.** (Source: ISO 14253-1 official abstract, `iso.org/standard/63638.html`; ISO/OBP `iso.org/obp/ui/#iso:std:iso:14253:-1:en`)

- **The core decision rule:** to *prove conformance*, the tolerance is **reduced** by the measurement uncertainty at each limit (conformance zone shrinks by ~2× the uncertainty); to *prove nonconformance*, the tolerance is **expanded** by the uncertainty. A part is provably in-tolerance only if measured inside the tolerance by *more than* the measurement uncertainty. This rewards better metrology by enlarging the usable conformance zone. (Source: H.N. Metrology "ISO 14253-1 Decision Rules" `hn-metrology.com/papers/decrules.htm`; ISO 14253-1 abstract)

- **2017 edition change:** the older default expanded-uncertainty coverage factor `k = 2` was replaced by a **default 95% conformance probability**, making the decision risk constant regardless of the spec-interval-to-uncertainty ratio. Terms "acceptance limit," "acceptance interval," "guard band," and "conformance probability" align with ISO/IEC Guide 98-4 (JCGM 106). (Source: ISO 14253-1:2017 introduction as summarized in iteh.ai sample PDF and ISO/OBP — verify the 95% figure against the standard text)

- **Guard-band sizing vs ILAC G8:** ISO 14253-1's method effectively uses ~83% of the expanded uncertainty as the guard band (vs 100% for the ILAC G8 simple-acceptance rule), giving ~5% probability of false acceptance with a smaller probability of false rejection. (Source: ISOBudgets "Guard Banding — How to Take Uncertainty Into Account" `isobudgets.com/guard-banding-how-to-take-uncertainty-into-account/` — SECONDARY, verify the 83% figure)

## 7. Cpk vs Ppk — Within vs Overall Variation (high-value galaxy distinction)

- **Cp/Cpk use *within-subgroup* (short-term) sigma (estimated R̄/d2 or s̄/c4); Pp/Ppk use *overall* (long-term) sigma (the ordinary sample standard deviation of all data).** A large gap between Cpk and Ppk signals the process mean is shifting between subgroups (special-cause / instability not captured by within-subgroup spread). This pairing is standard in PPAP/SPC practice. Owner: this is a widely-taught distinction; verify the exact within-sigma estimator wording against AIAG SPC manual before asserting as doctrine. (Source: derived from NIST §6.3.1.1 within-subgroup σ̂ = R̄/d2 definition + standard AIAG SPC practice — UNVERIFIED framing, confirm.)

---

## Sources

- NIST/SEMATECH e-Handbook of Statistical Methods, §6.3.1 Univariate Control Charts: https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm
- NIST/SEMATECH e-Handbook, §6.3.1.1 / §6.3.2.1 Shewhart X-bar and R and S Control Charts: https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc311.htm and https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc321.htm
- NIST/SEMATECH e-Handbook, §6.1.6 Process Capability Indices (Cp/Cpk/Cpm/Cpu/Cpl + reject-rate table): https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm
- Wikipedia, "Western Electric rules": https://en.wikipedia.org/wiki/Western_Electric_rules
- Wikipedia, "Nelson rules": https://en.wikipedia.org/wiki/Nelson_rules
- Lean Six Sigma Definition glossary, "Nelson Rules": https://www.leansixsigmadefinition.com/glossary/nelson-rules/
- QI Macros, "Western Electric Rules | WECO Rules": https://www.qimacros.com/control-chart/western-electric-rules/
- ASTM-derived control-chart constant table (Bessegato/UFJF mirror): https://www.bessegato.com.br/UFJF/resources/table_of_control_chart_constants_old.pdf
- QualityEngineer.ai, "Gauge R&R Acceptance Criteria: %GRR, NDC, and What AIAG MSA Requires": https://app.qualityengineer.ai/blog/gauge-rr-acceptance-criteria
- Six Sigma Study Guide, "Gage Repeatability and Reproducibility (GR&R)": https://sixsigmastudyguide.com/gage-repeatability-and-reproducibility-rr/
- ScienceDirect (Measurement journal), "Number of distinct data categories and gage repeatability and reproducibility — a double (but single) requirement": https://www.sciencedirect.com/science/article/abs/pii/S0263224113001760
- ISO 14253-1:2013 standard abstract (ISO.org): https://www.iso.org/standard/63638.html
- ISO 14253-1:2017 online browsing platform (ISO/OBP): https://www.iso.org/obp/ui/#iso:std:iso:14253:-1:en
- H.N. Metrology, "ISO 14253-1 Decision Rules": https://www.hn-metrology.com/papers/decrules.htm
- ISOBudgets, "Guard Banding — How to Take Uncertainty Into Account": https://www.isobudgets.com/guard-banding-how-to-take-uncertainty-into-account/
