---
title: Compliance-Safety Foundations — functional safety, hazard/risk methodology, audit-trail traceability, defense-in-depth
galaxy: compliance-safety
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: regulatory/standards-framing facts WebFetch-confirmed against primary + reputable free sources (OSHA hazard-ID + machine-guarding + control-of-hazardous-energy, NIST CSRC glossary + RMF project page, CDC/NIOSH Hierarchy of Controls); established standards/engineering methodology (IEC 61508 SIL framing, ISO 45001 management-system structure, FMEA/RPN, general risk-assessment, ALARP, audit-trail) WebFetch-confirmed against the public encyclopedic framing pages and asserted as standard literature with citation. NO numeric safety threshold (S(x), Omega, Cpk gate, exposure limit) is promoted here — those stay owner-gated.
tags: [compliance-safety, functional-safety, IEC-61508, SIL, ISO-45001, hazard-identification, risk-assessment, hierarchy-of-controls, NIOSH, defense-in-depth, NIST-RMF, FMEA, ALARP, audit-trail, traceability, machine-guarding, lockout-tagout, OSHA, gov-data]
---

# Compliance-Safety Foundations

The domain-knowledge spine for the **compliance-safety** galaxy (owner: golf): the methodology and standards framing behind PRISM's safety gate `S(x)`, the alarm/compliance surfaces, and the audit-trail/traceability spine. **Regulatory and standards facts below are WebFetch-confirmed** against OSHA / NIST / CDC-NIOSH primary pages and the public encyclopedic framing of the named standards (marked CONFIRMED). **Methodology models** (FMEA, risk matrices, ALARP) are established engineering/standards literature asserted with citation.

> SAFETY-CRITICAL SCOPE NOTE: this entry establishes **method and framework only**. Every numeric safety threshold — S(x) pass values, Omega targets, Cpk gate floors, SIL probability bands, occupational exposure limits — is deliberately **NOT promoted** here. Those live owner-gated in `state/shared/omega-thresholds.json` and `mcp-server/src/physics/constants.ts`. Where a source names a number, this entry names the source and gates the number (see `## Owner-gate`), it does not copy the value into the wiki.

## 1. Hazard identification + assessment (how a safety program finds risk before it controls it)

### OSHA Recommended Practices — six hazard-ID action items
**CONFIRMED** ([OSHA Hazard Identification and Assessment](https://www.osha.gov/safety-management/hazard-Identification)) — OSHA's Recommended Practices for Safety and Health Programs name six action items:
1. **Collect existing information** about workplace hazards (equipment manuals, SDS, inspection/injury records, plus external OSHA/NIOSH/trade-association data).
2. **Inspect the workplace** for safety hazards via regular inspections of all operations/equipment/areas, with worker participation and checklists.
3. **Identify health hazards** — chemical, physical, biological exposures and ergonomic risk factors, via SDS review, quantitative assessment, and medical-record analysis.
4. **Conduct incident investigations** that find **root causes** (the "Why?" approach), not just the single triggering factor — covering injuries, illnesses, AND near-misses.
5. **Identify hazards of emergency + nonroutine situations** (fires, chemical release, shutdown, maintenance).
6. **Characterize hazards and prioritize for control** — evaluate severity and likelihood, apply interim controls, rank by risk so the greatest risk is addressed first.

**Galaxy relevance:** this is the upstream pipeline feeding `S(x)`. The compliance-safety galaxy should treat a build/program as un-gated until each operation has passed hazard-ID (steps 1-5) and produced a prioritized control list (step 6) — near-misses and nonroutine/maintenance states included, not just the happy-path cut.

### General risk-assessment methodology — three phases + the risk matrix
**CONFIRMED** ([Risk assessment](https://en.wikipedia.org/wiki/Risk_assessment)): the standard structure is (1) **hazard identification**, (2) **risk analysis** = estimate **likelihood** AND **severity/consequence**, (3) **risk evaluation** = compare the estimated risk against decision criteria to decide whether controls are required. A **risk matrix** (likelihood x consequence) is the qualitative prioritization tool — plot the two dimensions to separate "mitigate now" from "tolerable at current level".

**Galaxy relevance:** the likelihood x consequence matrix is the shape of every PRISM safety/alarm scoring surface. The *axes and ordering* are methodology (live here); the *cut value* that flips tolerable to unacceptable is a threshold (owner-gated).

## 2. Hierarchy of controls (how you actually reduce a found hazard, best-first)

### NIOSH Hierarchy of Controls — five ranked levels
**CONFIRMED** ([CDC/NIOSH Hierarchy of Controls](https://www.cdc.gov/niosh/hierarchy-of-controls/about/index.html)) — ranked most-effective to least, on the principle that **controls needing minimal human intervention protect best**:
1. **Elimination** — remove the hazard entirely (the preferred solution; "no exposure can occur").
2. **Substitution** — replace with a safer alternative (verify the substitute introduces no new risk).
3. **Engineering controls** — barriers, guards, ventilation that keep the hazard from reaching the worker; most effective when designed in.
4. **Administrative controls** — work practices (training, rotation, breaks, access limits) that reduce exposure duration/frequency/intensity.
5. **PPE** — worn equipment as the last line; requires ongoing worker effort and should not replace higher controls when those are available.

### ISO 12100 three-step risk reduction (machinery)
*[golf-gate]* — the ISO 12100 framing page (Safety of machinery — risk assessment + the three-step method: inherently-safe design → safeguarding/protective measures → information for use) returned 404 on both attempted URLs this pass and was NOT WebFetch-confirmed. It is the machinery-specific parallel of the NIOSH hierarchy above; golf should confirm against a current ISO/standards-framing source before any CNC-machine-safety module cites it. Left out of the CONFIRMED count deliberately (R12).

**Galaxy relevance:** PRISM is a manufacturing platform, so engineering controls (guards/interlocks) and elimination/substitution (a safer toolpath, a safer fixture) outrank an administrative "operator be careful" note. A compliance-safety recommendation that lands at PPE/admin when an engineering control was available should be flagged as a weak control.

## 3. Functional safety (IEC 61508 — engineering a system to fail safe)

**CONFIRMED** framing ([IEC 61508](https://en.wikipedia.org/wiki/IEC_61508)):
- **Functional safety** = the part of overall safety that depends on a system (electrical/electronic/programmable) **operating correctly or failing in a predictable, safe way** relative to the Equipment Under Control (EUC).
- A **safety function** is a specific protective action — detect a hazard, initiate mitigation.
- **Safety Integrity Level (SIL)** is the *target rigor* assigned to a safety function from risk assessment: higher SIL = progressively more stringent design + validation. Achieving a target SIL rests on three integrated measures — **systematic capability** (design-quality control/verification/validation/failure analysis), **architectural constraints** (redundancy), and **probabilistic failure-rate analysis** appropriate to the demand mode.
- The standard mandates a **safety lifecycle** (analysis → realization → operation/decommission) so safety is engineered from concept through disposal, not bolted on.

**Galaxy relevance:** SIL as a *concept* (assign rigor proportional to assessed risk; require redundancy + verification for safety-relevant functions) is exactly how PRISM should treat its own safety-relevant engines. The **numeric SIL failure-rate bands are thresholds and are owner-gated** — this entry names SIL as a method, never the probability values.

### ALARP — when is risk reduction "enough"
**CONFIRMED** ([ALARP](https://en.wikipedia.org/wiki/ALARP)): residual risk must be reduced **As Low As Reasonably Practicable** — further reduction is only forgone when its cost is in **gross disproportion** to the benefit (an *asymmetric* test favoring safety, from *Edwards v. National Coal Board*, 1949). The tolerability-of-risk framing has three zones: **unacceptable** (too great regardless of benefit), **tolerable/ALARP** (acceptable only if assessed and kept ALARP), **broadly acceptable** (further reduction not normally required).

**Galaxy relevance:** ALARP is the principled answer to "the gate passed, do we still harden?" — in the tolerable band, PRISM keeps driving risk down until the next reduction is grossly disproportionate. The *boundary values* between the three zones are thresholds (owner-gated); the three-zone *shape* and the disproportionality test are methodology (here).

## 4. Failure analysis (FMEA — structured prediction of how things break)

**CONFIRMED** ([Failure mode and effects analysis](https://en.wikipedia.org/wiki/Failure_mode_and_effects_analysis)): FMEA systematically reviews components/assemblies/subsystems to identify (1) **failure modes** (how a part could fail, at multiple levels of detail), (2) **effects** (local → next-level → end-effect consequences), (3) **causes** (design weakness, manufacturing defect, environmental stress, misapplication). The **Risk Priority Number (RPN)** prioritization model multiplies three factors — **Severity x Occurrence x Detection** (the last = probability the failure escapes notice before it reaches the user) — to rank where mitigation effort goes.

**Galaxy relevance:** FMEA is the method behind a compliance-safety "what can go wrong with this program/fixture/toolpath, and which failure do we guard first" pass. The Severity/Occurrence/Detection **rating scales and any RPN action-threshold are owner-gated numbers**; the three-factor structure and the "detection matters as much as severity" insight are methodology (here).

## 5. Management system + continual improvement (ISO 45001)

**CONFIRMED** framing ([ISO 45001](https://en.wikipedia.org/wiki/ISO_45001)): an occupational-health-and-safety **management system** standard built on the ISO **Annex SL High-Level Structure** (shared with ISO 9001 / ISO 14001, so safety/quality/environmental systems integrate rather than silo), driving **continual improvement** via the Plan-Do-Check-Act cycle. Required elements: **assess organizational context** (internal/external issues), **engage stakeholders/workers** and their needs, **address risks and opportunities**, and **leadership accountability** (top management owns the system's effectiveness, not a side office).

**Galaxy relevance:** the compliance-safety galaxy is the PRISM analogue of a 45001 management system — the gate is not a one-shot check but a Plan-Do-Check-Act loop with worker (operator) participation and a documented improvement trail. Integration with the quality galaxy (Cpk/SPC) mirrors the Annex-SL shared-structure intent.

## 6. Defense-in-depth + audit-trail traceability (layered protection + provable history)

### Defense-in-depth
**CONFIRMED** ([NIST CSRC glossary — defense in depth](https://csrc.nist.gov/glossary/term/defense_in_depth)): an "information security strategy integrating people, technology, and operations capabilities to establish variable barriers across multiple layers". The method = apply **multiple coordinated, layered, heterogeneous** countermeasures so that **if one layer fails, the next still protects** (redundant safeguards, no single point of failure).

**Galaxy relevance:** PRISM's own safety posture is layered — hazard-ID, the `S(x)` gate, the alarm surface, the hierarchy-of-controls recommendation, and the audit trail are independent layers; no single one is load-bearing. A compliance-safety design that puts all trust in one check violates defense-in-depth.

### Audit trail + traceability
**CONFIRMED** ([Audit trail](https://en.wikipedia.org/wiki/Audit_trail)): a **security-relevant chronological record providing documentary evidence of the sequence of activities** — capturing **who** acted, **what** was done, **when**, and the full progression from initiation to completion. Its purpose is **traceability and accountability**: reconstruct any transaction's lifecycle, satisfy regulatory mandates, support forensic analysis, and demonstrate procedures were followed. Audit logs should run privileged/tamper-resistant so they remain reliable.

### NIST Risk Management Framework — the lifecycle wrapper
**CONFIRMED** ([NIST RMF](https://csrc.nist.gov/projects/risk-management/about-rmf)): seven steps — **Prepare → Categorize → Select → Implement → Assess → Authorize → Monitor**. Categorize by impact, select controls, implement + document, assess effectiveness, a senior official makes a **risk-based authorization decision**, then **continuously monitor**.

**Galaxy relevance:** the RMF "authorize on a documented risk basis, then continuously monitor" loop, plus a tamper-resistant audit trail, is the traceability spine the compliance-safety galaxy provides to every other galaxy — the proof that a gate decision was made, by what evidence, and when. The Categorize→Authorize→Monitor shape maps onto gate → pass/defer → re-check.

## 7. Manufacturing-floor controls (OSHA — the concrete engineering controls)

### Machine guarding
**CONFIRMED** ([OSHA Machine Guarding](https://www.osha.gov/machine-guarding)): "Moving machine parts have the potential to cause severe workplace injuries, such as crushed fingers or hands, amputations, burns, or blindness." OSHA's rule: **"Any machine part, function, or process that may cause injury must be safeguarded"** and hazards **"must be eliminated or controlled."** (Detailed safeguard specifications live in the agriculture/general-industry/maritime/construction standards, not the overview page.)

### Control of hazardous energy (Lockout/Tagout)
**CONFIRMED** ([OSHA Control of Hazardous Energy](https://www.osha.gov/control-hazardous-energy)): LOTO prevents injury from **unexpected energization or startup, or release of stored energy, during servicing/maintenance**. Energy sources span electrical, mechanical, hydraulic, pneumatic, chemical, thermal. The **energy control program** method = identify all hazardous energy sources, isolate/control energy before maintenance, use **energy-isolating devices** (locks + tags) to physically prevent energization, train authorized workers on energy types/magnitudes/isolation, and prohibit restart on locked/tagged equipment.

**Galaxy relevance:** these are the concrete engineering + administrative controls (the §2 hierarchy made physical) that a manufacturing compliance-safety surface must check for — a generated program/setup that exposes a point of operation or a serviceable state without an isolation procedure is an un-safeguarded machine hazard, not a passing job.

## Owner-gate (NOT promoted)

The following are **threshold values** that this entry deliberately does NOT promote — they stay owner-gated in `state/shared/omega-thresholds.json` and `mcp-server/src/physics/constants.ts`, settable only by the galaxy owner (golf) / safety owner, never copied from a source into the wiki:
- **`S(x)` pass/fail cut values** and the likelihood x consequence **risk-matrix boundary** that flips tolerable → unacceptable (method in §1/§3 ALARP; numbers gated).
- **Omega targets** per milestone.
- **Cpk gate floors** (quality galaxy; method belongs there).
- **SIL numeric failure-rate / probability-of-failure-on-demand bands** from IEC 61508 (§3) — SIL as a *concept* is here; the bands are gated.
- **FMEA Severity/Occurrence/Detection rating scales and RPN action thresholds** (§4) — the three-factor *structure* is here; the scale numbers and the act/no-act cutoff are gated.
- **Occupational exposure limits** (PELs/TLVs) named by OSHA/NIOSH sources — named as a source category in §1, never copied as a value.

If a future source quotes any such number, name the source and route the value through the owner-gate; do not promote it into this entry.

## Sources

All URLs below were WebFetch-confirmed during this entry's creation (2026-06-10). The ISO 12100 framing page is intentionally absent — both attempted URLs 404'd and the claim was left unpromoted (R12).

1. OSHA — Hazard Identification and Assessment (Recommended Practices): https://www.osha.gov/safety-management/hazard-Identification *(gov)*
2. CDC / NIOSH — Hierarchy of Controls: https://www.cdc.gov/niosh/hierarchy-of-controls/about/index.html *(gov)*
3. NIST CSRC — Glossary: Defense in Depth: https://csrc.nist.gov/glossary/term/defense_in_depth *(gov)*
4. NIST CSRC — Risk Management Framework (RMF) project: https://csrc.nist.gov/projects/risk-management/about-rmf *(gov)*
5. OSHA — Machine Guarding: https://www.osha.gov/machine-guarding *(gov)*
6. OSHA — Control of Hazardous Energy (Lockout/Tagout): https://www.osha.gov/control-hazardous-energy *(gov)*
7. IEC 61508 (functional safety / SIL framing): https://en.wikipedia.org/wiki/IEC_61508
8. ISO 45001 (OH&S management system): https://en.wikipedia.org/wiki/ISO_45001
9. Failure mode and effects analysis (FMEA / RPN): https://en.wikipedia.org/wiki/Failure_mode_and_effects_analysis
10. Risk assessment (general methodology + risk matrix): https://en.wikipedia.org/wiki/Risk_assessment
11. ALARP (tolerability of risk): https://en.wikipedia.org/wiki/ALARP
12. Audit trail (traceability + accountability): https://en.wikipedia.org/wiki/Audit_trail
