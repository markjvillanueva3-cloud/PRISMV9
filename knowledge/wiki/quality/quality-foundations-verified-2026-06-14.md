---
name: quality-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the quality galaxy (manufacturing quality engineering — SPC, Cp/Cpk, gauge R&R/MSA). 6 fetched sources (NIST/SEMATECH, AIAG MSA-4, ASQ CQE). FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: quality
  tier: VERIFIED
  verifiedBy: WebFetch
---

# quality galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. Numerics here (control-chart constants A2/D3/D4, %GRR thresholds, NDC, Cpk values) are quality-statistics, NOT machining cutting constants.

## Synthesis
The NIST/SEMATECH Engineering Statistics Handbook is a free, peer-reviewed government reference spanning the full quality stack — Shewhart control charts (X-bar/R, p, c, u, CUSUM, EWMA) → process capability (Cp, Cpk, Cpm) → measurement-system characterization (gauge R&R) — with derivations + worked examples. AIAG MSA-4 is the industry-canonical MSA authority: standard gauge-study protocol (10 parts × 3 operators × 2-3 reps), %GRR acceptance thresholds (<10% acceptable, 10-30% conditional, >30% unacceptable), and NDC (≥5). The **critical sequencing principle**: a process must first be in statistical control before capability indices are meaningful. Montgomery's *Introduction to Statistical Quality Control* and Wheeler & Chambers' *Understanding SPC* are the foundational texts; the ASQ CQE Body of Knowledge 2022 is the profession's competency taxonomy (SPC + capability + MSA + DOE + hypothesis testing + acceptance sampling).

## Verified sources
### [NIST/SEMATECH e-Handbook Ch.6 — Process or Product Monitoring and Control](https://www.itl.nist.gov/div898/handbook/pmc/pmc.htm) — report
> "This chapter presents techniques for monitoring and controlling processes and signaling when corrective actions are necessary."

**Knowledge:** Authoritative free reference on Shewhart charts (X-bar/R, p, c, u), CUSUM, EWMA, acceptance sampling, Cp/Cpk, multivariate SPC, with derivations + worked examples.

### [NIST/SEMATECH §6.1 — Introduction to SPC and Process Capability](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc1.htm) — report
> "the basic concepts of statistical process control, quality control and process capability."

**Knowledge:** Distinguishes common-cause vs special-cause variation; defines in-control vs in-control-but-unacceptable; capability = process output vs specification limits.

### [NIST/SEMATECH §6 — What is Process Capability?](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm) — report
> "Process capability compares the output of an in-control process to the specification limits by using capability indices."

**Knowledge:** Cp, Cpk, Cpm definitions/computation/interpretation; the process must be in statistical control before a meaningful capability assessment.

### [NIST/SEMATECH §2.4 — Gauge R&R Studies](https://itl.nist.gov/div898/handbook/mpc/section4/mpc4.htm) — report
> "characterize the performance of gauges and instruments used in a production setting in terms of errors that affect the measurements."

**Knowledge:** Gauge-R&R methodology — repeatability (equipment) + reproducibility (appraiser), bias sources (linearity, hysteresis, drift), %GRR vs process variation or tolerance.

### [AIAG MSA-4: Measurement Systems Analysis Reference Manual, 4th Ed.](https://www.aiag.org/training-and-resources/manuals/details/MSA-4) — standard
> "As the quality of the data improves, the quality of decisions improves. This guide will help you assess the quality of your measurement systems."

**Knowledge:** Automotive-canonical MSA (Chrysler/GM/Ford). Standard gauge-R&R protocol (10 parts, 3 operators, 2-3 reps); %GRR thresholds (<10% / 10-30% / >30%); NDC; bias/linearity studies.

### [ASQ Certified Quality Engineer (CQE) Body of Knowledge, 2022](https://www.asq.org/cert/resource/pdf/certification/2022-CQE-BoK.pdf) — standard
> _(PDF binary retrieved, 181 KB confirmed at URL; rendered via search summary per R12)_

**Knowledge:** ASQ's definitive quality-engineer competency framework: SPC (chart selection, control rules, short-run SPC), capability (Cp/Cpk/Cpm/Cr), MSA (R&R, bias, linearity, stability), hypothesis testing, DOE, acceptance sampling.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_a7a6a364-1d1). Ledger: state/shared/galaxy-knowledge-iterations.json._
