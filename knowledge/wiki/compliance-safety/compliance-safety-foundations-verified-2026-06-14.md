---
name: compliance-safety-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the compliance-safety galaxy (machine safety & functional safety — ISO 13849/IEC 62061, ANSI B11, OSHA 29 CFR). 7 fetched sources. PHYSICS-SAFE (regulatory/standards only, no cutting constants). FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: compliance-safety
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# compliance-safety galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. **PHYSICS-SAFE: regulatory/standards content only** (ISO 13849, IEC 62061, OSHA 29 CFR, ANSI B11) — no machining cutting constants. Performance-Level / SIL / 29-CFR references are safety-standard identifiers, not cutting parameters.

## Synthesis
Three interlocking tiers. **Foundational risk-assessment methodology** — ISO 12100 / ANSI B11.0 (risk assessment + reduction lifecycle). **Safety-function performance quantification** — ISO 13849-1 Performance Levels a-e (Categories B-4) and IEC 62061 SIL 1-4, both derived from IEC 61508. **US regulatory enforcement** — OSHA 29 CFR 1910 Subpart O (machine guarding) + 1910.147 LOTO. **IFA/DGUV** provides the most comprehensive free implementation guidance (SISTEMA tool + the 324-page IFA Report 2/2017e, 52 worked circuit examples across electromechanics/fluidics/electronics/programmable for PL a-e). **Critical distinction:** ANSI B11.0 applies to **both suppliers AND end-users** of machinery (ISO 12100 applies only to suppliers) — so US shops *operating* machines (not just building them) are within scope of the full risk-assessment obligation. The Tacchini 2023 Wiley text is the only single English volume unifying ISO 13849-1 + IEC 62061.

## Verified sources
### [IFA/DGUV EN ISO 13849: Practical Solutions for Machine Safety](https://www.dguv.de/ifa/praxishilfen/practical-solutions-machine-safety/sicherheit-von-maschinensteuerungen/index.jsp) — report
> "the operator's safety is dependent upon the reliability of the control system. The fourth edition published in 2023, representing a further fundamental revision of requirements for safety-related machine controls."

**Knowledge:** The free SISTEMA software tool + IFA Report 2/2017e for applying EN ISO 13849-1 across electromechanics/fluidics/electronics/programmable systems, 52 worked examples covering Performance Levels a-e and Categories B-4.

### [ANSI B11 Standards — Scope Catalog](https://www.b11standards.org/b11scopes) — standard
> "general principles and requirements for safety of machinery... risk reduction measures for new, existing, modified or rebuilt power driven industrial and commercial machinery"

**Knowledge:** Scope of the ANSI B11 machine-type family: B11.0 foundational risk assessment, B11.1 power presses, B11.2 hydraulic/pneumatic presses, B11.3 bending, B11.13 bar/chucking machines, B11.19 safeguarding performance, B11.20 integrated manufacturing systems.

### [OSHA Machine Guarding Standards — 29 CFR 1910 Subpart O](https://www.osha.gov/machine-guarding/standards) — standard
> "1910 Subpart O - Machinery and Machine Guarding; 1910.212, General requirements for all machines; 1910.217, Mechanical power presses..."

**Knowledge:** US regulatory machine-guarding framework: 29 CFR 1910 Subpart O (general industry), 1910.147 LOTO pairs with 1910.212. Named hazard classes: point-of-operation, ingoing nip points, rotating parts, flying chips/sparks.

### [Functional Safety of Machinery (Wiley 2023, Tacchini)](https://books.google.com/books/about/Functional_Safety_of_Machinery.html?id=wkyzEAAAQBAJ) — textbook
> "The Categories of ISO 13849-1 and the Basic Subsystem Architectures of IEC 62061."

**Knowledge:** 352-page unified treatment of ISO 13849-1 + IEC 62061 in one volume; author is a participant in IEC 61508/62061/ISO 13849 committees. The only single English text covering both standards jointly.

### [ANSI B11.0-2020 — Foundational Machine Safety Standard](https://www.b11standards.org/storeitems/ansi-b110-2020) — standard
> "specifies basic terminology, principles and a methodology for achieving acceptable risk... deviations... shall be based on a documented risk assessment."

**Knowledge:** US foundational machine-safety standard — risk assessment/reduction lifecycle; covers BOTH suppliers and end-users (vs ISO 12100 suppliers-only); machine-specific B11.X type-C standards take precedence; documented risk assessment required for any deviation.

### [IFA Report 2/2017e — Functional Safety of Machine Controls (EN ISO 13849-1)](https://www.dguv.de/ifa/publikationen/reports-download/reports-2017/ifa-report-2-2017/index-2.jsp) — report
> "explains its application with reference to numerous examples from the fields of electromechanics, fluidics, electronics and programmable electronics. The Performance Level PL which is actually attained is explained in detail."

**Knowledge:** Authoritative free English implementation guide for EN ISO 13849; PL a-e across Categories B-4; IFA helped revise the standard (research feeds back into standards development).

### [Functional Safety of Machine Controls (DGUV/IFA, 17 authors)](https://books.google.com/books/about/Functional_safety_of_machine_controls.html?id=SLeqDwAAQBAJ) — textbook
> "Numerous example circuits show, down to component level, how Performance Levels a to e can be engineered in the selected technologies."

**Knowledge:** 324-page book (Hauke/Schaefer/Apfeld/Bomer/Huelke et al.) — risk assessment, PL determination, SRP/CS design, verification/validation, component-level circuit examples across all technology families.

---
_Physics-safety: regulatory/standards content only; no numeric cutting constant (R12)._
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._
