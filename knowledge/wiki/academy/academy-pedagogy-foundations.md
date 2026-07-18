---
title: Academy Pedagogy Foundations — competency frameworks, skill-progression models, deliberate practice
galaxy: academy
owner_slot: lima
status: VERIFIED-PARTIAL
verified_by: papa (claude-b5de5424, 2026-06-09); deepened 2026-06-09 (claude-b5de5424) — sections 5-8 added from untapped source categories; deepened again 2026-06-10 — sections 9-11 added from NPTEL courseware + 2nd OpenStax title + OSHA/NIST gov sources
verification_method: institutional facts WebFetch-confirmed against primary sources (eCFR/Cornell-LII + govinfo.gov CFR XML, O*NET, NIMS, NIST e-Handbook + NIST CUU + NIST SI base units, OpenStax CC-BY x2, CMU Eberly Center, NPTEL/IIT open courseware, OSHA machine-guarding + welding hazards); pedagogy + ISD models (Bloom, Dreyfus, ADDIE, andragogy, Ericsson) are established literature asserted with citation
tags: [academy, pedagogy, competency-framework, NIMS, apprenticeship, instructional-design, deliberate-practice, ADDIE, andragogy, SPC, measurement-uncertainty, OpenStax, NPTEL, OSHA, NIST-SI, machine-guarding, metrology, gov-data]
---

# Academy Pedagogy Foundations

The domain-knowledge spine for the **academy** galaxy: how PRISM Academy should structure courses, sequence competencies, and assess mastery. Promoted from the deep-domain research packet (`knowledge/wiki/academy/_staging/deep-domain-research-2026-06-09.md`) after papa verified the institutional facts against primary sources. **Pedagogy models below are established peer-reviewed/standard literature** (asserted with citation); **institutional/regulatory facts are WebFetch-confirmed** (marked CONFIRMED). Claims still requiring lima's domain check are marked **[lima-gate]** and were left in `_staging/`, not promoted here.

## 1. Competency frameworks (how to define + assess machining mastery)

### DOL Registered Apprenticeship — three measurement models (29 CFR Part 29.5)
**CONFIRMED** against Cornell LII / eCFR ([29 CFR 29.5](https://www.law.cornell.edu/cfr/text/29/29.5)):
- §29.5(b)(2) permits **three ways to measure an apprenticeship term: time-based, competency-based, or hybrid.**
- **Time-based** requires **at least 2,000 hours of on-the-job learning (OJL).**
- §29.5(b)(4): **a minimum of 144 hours per year of organized Related Technical Instruction (RTI) is recommended** alongside the OJL.
- The choice of model rests with the program sponsor, subject to Registration Agency approval.

**Design implication for academy:** model courses as a competency-based progression (skill demonstration), but track the time-based + RTI floors so a PRISM-issued credential maps cleanly onto a registered apprenticeship.

### NIMS — National Institute for Metalworking Skills
- **CONFIRMED** ([NIMS Credentialing](https://www.nims-skills.org/credentialing)): most NIMS credentials require **two components — a knowledge/theory exam AND a hands-on performance evaluation.**
- NIMS organizes machining credentials into **skill Levels (I/II/III)** across machining/tooling/metalforming/industrial-maintenance, using a **duty-based competency framework** (each duty = a performance standard with accuracy + time requirements). [src: [NIMS Machining Level I Standards PDF](https://www.nims-skills.org/sites/default/files/media/document/NIMS%20Machining%20Level%20I%20Standards.pdf)]
- **[lima-gate]** exact per-exam question counts (e.g. "Milling I = 56 questions") come from a secondary career-advice source and were NOT promoted — lima should confirm directly against current NIMS exams before any academy module hardcodes them.

### Machinist occupation standard
- **CONFIRMED** ([O*NET](https://www.onetonline.org/link/details/51-4041.00)): the machinist trade is **O*NET-SOC 51-4041.00 "Machinists."** RAPIDS apprenticeship code 0296. **[lima-gate]** the "8,000 OJT hours" figure for the full time-based machinist apprenticeship varies by state program — verify per sponsor.

## 2. Skill-progression models (how to SEQUENCE a curriculum)

### Bloom's Taxonomy (1956; revised 2001)
Established instructional-design literature: learning objectives split into **three domains — cognitive (knowledge), affective (attitude), psychomotor (physical/action).** The cognitive domain's revised levels are **Remember -> Understand -> Apply -> Analyze -> Evaluate -> Create**, hierarchical (each subsumes the prior). The **psychomotor domain is the most relevant to hands-on machining**; Simpson (1972) extended it into seven levels from perception to origination. [src: [UWaterloo CTE](https://uwaterloo.ca/centre-for-teaching-excellence/catalogs/tip-sheets/blooms-taxonomy), [NIU CITL](https://www.niu.edu/citl/resources/guides/instructional-guide/blooms-taxonomy.shtml)]

### Dreyfus model of skill acquisition (Stuart & Hubert Dreyfus, 1980)
Five stages: **Novice -> Advanced Beginner -> Competent -> Proficient -> Expert** (a later sixth "Mastery"). Learners shift from context-free rule-following (novice) toward holistic, intuitive performance (expert). **Instructional implication:** novices need step-by-step rules + foundational principles; competent learners need problem-solving + independent-decision practice; experts are leveraged for complex problems + mentoring. Tailor instruction per stage. [src: [Dreyfus 1980 report PDF](https://devmts.org.uk/dreyfus.pdf)]

## 3. Workplace learning + deliberate practice (how OJT actually builds skill)

- **70-20-10 model** (McCall, Lombardo & Eichinger, CCL, 1980s): ~70% of workplace learning from on-the-job experience, ~20% from social/coaching, ~10% from formal training. **These ratios are guidelines, not laws — empirical support is debated.** [src: [Training Industry wiki](https://trainingindustry.com/wiki/content-development/the-702010-model-for-learning-and-development/)]
- **Deliberate practice (Ericsson)** is the corrective to "experience alone makes experts": observed performance correlates only weakly with years of experience. Expertise requires **structured deliberate practice** — focused effort on specific weaknesses, immediate feedback, repetition-with-refinement, stretching beyond comfort. [src: [Ericsson 2008, Acad. Emergency Medicine](https://onlinelibrary.wiley.com/doi/10.1111/j.1553-2712.2008.00227.x)]
- **The "10,000-hour rule" is widely misread** — Ericsson himself stated there is nothing magical about 10,000 hours; *quality* of practice matters more than raw hours, and required hours vary by domain. Practice is necessary but not sufficient. [src: [PMC review of Ericsson/Krampe/Tesch-Romer 1993](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6731745/)]
- **Design implication for academy:** the 70% experiential portion only produces real skill when it carries deliberate-practice hallmarks (focused, feedback-rich, progressively harder). Routine repetition without these produces automaticity + plateau, not mastery — so academy's shop-floor OJT modules must inject targeted feedback + escalating difficulty, not just hours.

## 4. Free / legal curriculum corpora (the academy's external knowledge base)

- **MIT 2.008x "Fundamentals of Manufacturing Processes"** (free via MITx/edX) — strongest free structured online analog: machining, injection molding, casting, 3D printing, cost estimation, quality/variation, physics-first. [src: [MIT Open Learning](https://openlearning.mit.edu/courses-programs/mitx-courses/fundamentals-manufacturing-processes)]
- **MIT 2.810 "Manufacturing Processes and Systems"** — hands-on, process-physics emphasis (textbook: Kalpakjian & Schmid). [src: [MIT 2.810](https://web.mit.edu/2.810/www/)]
- **MIT OCW:** 2.830J Control of Manufacturing Processes (SPC/DOE/yield), 2.852 Manufacturing Systems Analysis (throughput/scheduling). [src: [2.830J](https://ocw.mit.edu/courses/2-830j-control-of-manufacturing-processes-sma-6303-spring-2008/), [2.852](https://ocw.mit.edu/courses/2-852-manufacturing-systems-analysis-spring-2010/)]
- Full source corpus: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (academy section).

## 5. Instructional-design process models (how to BUILD a course)

### ADDIE — the canonical instructional-systems-design framework
**CONFIRMED** ([ADDIE model, Wikipedia](https://en.wikipedia.org/wiki/ADDIE_model)):
- ADDIE is **an acronym for the five phases it defines for building training and performance support tools: Analysis, Design, Development, Implementation, Evaluation.**
- **Florida State University initially developed the ADDIE framework in 1975** for military training purposes.
- Phase roles as stated: **Analysis** clarifies the instructional problem + learner characteristics/constraints; **Design** sets learning objectives, assessment tools, content structure + media selection; **Development** builds the content assets + tests/revises them; **Implementation** trains facilitators + delivers; **Evaluation** is both *formative* (ongoing throughout) and *summative* (on the finished product).

**Design implication for academy:** ADDIE's formative-during / summative-after split maps directly onto PRISM's closed-loop ethos — each academy module should carry an *ongoing* formative checkpoint (mid-lesson knowledge check) plus a *terminal* summative gate (the hands-on performance evaluation NIMS already requires), not a single end-of-course test.

### Andragogy — adult-learner assumptions (the academy's audience is adults, not children)
**CONFIRMED** ([Andragogy, Wikipedia](https://en.wikipedia.org/wiki/Andragogy)):
- The term **"andragogy" was originally coined by German educator Alexander Kapp in 1833**; **Malcolm Knowles** popularized the modern theory of adult education in the U.S. (began using it in 1967).
- Knowles identified **six key assumptions** distinguishing adult learning: (1) **Need to Know** — adults need the reason for learning something; (2) **Experience as Foundation** — prior experience (including errors) is the basis for learning; (3) **Self-Concept** — adults need responsibility for + involvement in planning/evaluating their instruction; (4) **Readiness to Learn** — adults prioritize subjects with immediate work/personal relevance; (5) **Problem-Centered Orientation** — focus on solving problems, not content mastery alone; (6) **Internal Motivation** — adults respond better to internal motivators than to external pressure like grades.

**Design implication for academy:** machinists/operators are experience-rich adult learners. Academy lessons should open with the *why* (assumption 1), build on the learner's shop experience as a resource rather than treating them as blank (assumption 2), and be framed as problem-solving on real parts (assumption 5) — consistent with the deliberate-practice + 70% experiential design already noted in section 3.

## 6. Research-based learning principles (the evidence base for course design)

### Carnegie Mellon Eberly Center — seven principles ("How Learning Works")
**CONFIRMED** ([CMU Eberly Center, Principles of Learning](https://www.cmu.edu/teaching/principles/learning.html)) — research-based principles:
1. **Prior Knowledge** — "Students' prior knowledge can help or hinder learning" depending on whether it is accurate, robust, and appropriately activated.
2. **Knowledge Organization** — how learners structure connections between ideas governs their ability to retrieve + apply.
3. **Motivation** — "Students' motivation determines, directs, and sustains what they do to learn."
4. **Mastery Development** — learners must acquire individual (component) skills, practice *combining* them, and learn *when* to apply the integrated knowledge.
5. **Practice and Feedback** — goal-focused practice paired with specific, timely feedback against clear criteria enhances learning.
6. **Course Climate** — the intellectual/social/emotional environment interacts with development to affect outcomes.
7. **Metacognition** — students become independent learners by monitoring, evaluating, and adjusting their own strategies.

**Design implication for academy:** principle 4 (component-skills -> combination -> conditional application) is the pedagogical justification for sequencing toward the Dreyfus expert stage; principle 5 is the same deliberate-practice feedback loop section 3 demands — two independent authoritative sources converging on *feedback-rich, criteria-referenced practice* as the load-bearing mechanism.

## 7. Measurement + assessment foundations (gov-data spine for the quality/SPC modules)

### NIST/SEMATECH e-Handbook of Statistical Methods — control charts
**CONFIRMED** ([NIST/SEMATECH e-Handbook, control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)):
- A control chart is **"a graphical display of one quality characteristic"** (univariate) or of a statistic representing more than one (multivariate).
- The **center line represents "the mean value for the in-control process"**; the **UCL/LCL** are chosen so almost all data points fall within them while the process stays in control.
- Control limits typically use a multiple of the standard deviation — **"usually this multiple is 3 and thus the limits are called 3-sigma limits"**; for normal data the 3-sigma limits are the practical equivalent of 0.001 probability limits.
- A process is **"in control" when "all points are between the control limits and they form a random pattern"** — and is investigated when a point falls outside the limits OR exhibits systematic behavior inside them.

### NIST measurement-uncertainty model (Type A vs Type B)
**CONFIRMED** ([NIST CUU, Uncertainty basics](https://physics.nist.gov/cuu/Uncertainty/basic.html)):
- **Type A** evaluation of standard uncertainty is **"by the statistical analysis of series of observations"**; **Type B** is **"by means other than the statistical analysis of series of observations."**
- Each uncertainty component is represented by an estimated standard deviation regardless of whether it was Type A- or Type B-evaluated.

**Design implication for academy:** these are the canonical, freely-licensed gov references for an academy "Statistical Process Control + Metrology" course leg — they let the quality module teach *why* a control limit is 3-sigma and *how* measurement uncertainty is classified, citing primary federal sources rather than vendor training decks. (Specific control-limit values / Cpk targets remain **[owner-gate]** — left for lima to bind against JM Die's actual tolerances, not hardcoded here.)

## 8. Free / legal textbook + course corpus (additions)

- **OpenStax "Introductory Statistics"** (Rice University) — **CONFIRMED** free and openly licensed: the page states "This book uses the Creative Commons Attribution License" (CC BY 4.0), authors Barbara Illowsky & Susan Dean. Covers descriptive statistics, sampling methods, frequency tables, probability + hypothesis testing — a zero-cost textbook spine for the academy's data/quality leg. [src: [OpenStax Introductory Statistics](https://openstax.org/books/introductory-statistics/pages/1-introduction)]
- **DOL apprenticeship standard re-verified at the primary federal source** — the 29 CFR 29.5 facts in section 1 (three measurement models; "at least 2,000 hours of on-the-job learning"; "a minimum of 144 hours for each year of apprenticeship is recommended" for related instruction) are now **CONFIRMED a second time against govinfo.gov's published CFR XML**, not only the Cornell LII mirror. [src: [govinfo.gov CFR-2011 Title 29 §29.5](https://www.govinfo.gov/content/pkg/CFR-2011-title29-vol1/xml/CFR-2011-title29-vol1-sec29-5.xml)]

## 9. NPTEL free university courses — Indian Institute of Technology open courseware (untapped category)

NPTEL (National Programme on Technology Enhanced Learning, India) publishes full IIT/IISc lecture courses free — an open-courseware corpus distinct from MIT OCW, useful for cross-institutional curriculum triangulation.

- **NPTEL "Manufacturing Processes I"** — **CONFIRMED** offered by **IIT Roorkee**, taught by **Prof. H.S. Shan, Prof. S.R. Gupta, and Dr. Pradeep Kumar**. [src: [NPTEL 112107144](https://nptel.ac.in/courses/112107144)]
- **NPTEL "Manufacturing Processes II"** — **CONFIRMED** offered by **IIT Kharagpur**, taught by **Prof. A.B. Chattopadhyay, Prof. A.K. Chattopadhyay, and Prof. S. Paul**. [src: [NPTEL 112105126](https://nptel.ac.in/courses/112105126)]

**Design implication for academy:** NPTEL's two-part Manufacturing Processes sequence (IIT Roorkee + IIT Kharagpur, separate faculty) gives academy a second free, faculty-authored structured manufacturing curriculum to cross-check against the MIT 2.008/2.810 spine already in section 4 — convergence across two independent national engineering-education systems strengthens any topic the academy adopts as canonical. (Detailed week-by-week module lists were behind syllabus-PDF links not rendered on the course landing pages — **[lima-gate]** for module-level adoption.)

## 10. Free / legal textbook corpus — second OpenStax statistics title (additions)

- **OpenStax "Statistics"** (Illowsky & Dean, OpenStax / Houston TX, published 2020-03-27) — **CONFIRMED** a *distinct* openly-licensed title from the "Introductory Statistics" already cited in section 8: this one states **"This book uses the Creative Commons Attribution License and you must attribute Texas Education Agency (TEA)"**, with source material via Texas Gateway. Chapter 1 learning objectives: differentiate key terms, apply sampling methods to data collection, create + interpret frequency tables. [src: [OpenStax Statistics](https://openstax.org/books/statistics/pages/1-introduction)]

**Design implication for academy:** two parallel OpenStax statistics titles (the Rice-attributed "Introductory Statistics" and the TEA-attributed "Statistics") give the data/quality leg a choice of zero-cost, freely-redistributable spines — both CC-BY, so academy may excerpt + adapt either directly without licensing cost, provided the required attribution is preserved.

## 11. Government safety + metrology references (gov-data spine for the shop-safety + metrology modules)

### OSHA machine guarding — the hands-on-safety regulatory base
**CONFIRMED** ([OSHA Machine Guarding](https://www.osha.gov/machine-guarding)):
- "**Moving machine parts have the potential to cause severe workplace injuries, such as crushed fingers or hands, amputations, burns, or blindness. Safeguards are essential for protecting workers from these preventable injuries.**"
- "**Any machine part, function, or process that may cause injury must be safeguarded.**" When the operation of a machine or accidental contact injures the operator or others in the vicinity, the hazards must be eliminated or controlled.
- Machine guarding hazards are addressed in specific OSHA standards for agriculture, general industry, maritime, and construction; the page points to OSHA Publication 3170 ("Safeguarding Equipment and Protecting Workers from Amputations") and a National Emphasis Program on amputation hazards in manufacturing.

### OSHA welding, cutting & brazing — process-safety hazards
**CONFIRMED** ([OSHA Welding, Cutting & Brazing — Hazards & Solutions](https://www.osha.gov/welding-cutting-brazing/hazards-solutions)):
- "**Health hazards from welding, cutting, and brazing operations include exposures to metal fumes and to ultraviolet (UV) radiation.**"
- "**Safety hazards from these operations include burns, eye damage, electrical shock, cuts, and crushed toes and fingers.**"

### NIST — the seven SI base units (metrology foundation)
**CONFIRMED** ([NIST PML/OWM, SI base units](https://www.nist.gov/pml/owm/metric-si/si-units)):
- The **seven SI base units** are: **Length — meter (m); Time — second (s); Amount of substance — mole (mol); Electric current — ampere (A); Temperature — kelvin (K); Luminous intensity — candela (cd); Mass — kilogram (kg).**
- NIST describes the SI as the international standard for measurement and notes the **definitions of all seven base units are expressed using an explicit-constant formulation and experimentally realized using a specific *mise en pratique* (practical technique).**

**Design implication for academy:** sections 9-11 hand the academy three federally-authored, free-to-cite spines for the *non-cognitive* legs the pedagogy sections above could not cover: a **shop-safety module** (OSHA machine-guarding + welding hazards — primary-source justification for why a guard or fume-extraction rule exists, before any vendor manual), and a **metrology module** (the NIST seven-base-unit/explicit-constant model — the canonical answer to "what is a meter / kelvin" that underpins every measurement the SPC + uncertainty legs in section 7 already teach). All specific exposure limits, guard-distance dimensions, and tolerance/uncertainty *values* remain **[owner-gate]** — bound by lima against JM Die's actual machines + standards, not hardcoded here.

## Owner note (lima)

papa promoted the institutional + established-literature facts above (verified). The full packet (`_staging/deep-domain-research-2026-06-09.md`) retains the **[lima-gate]** specifics (NIMS exam question counts, exact OJT-hour figures, the "eleven Level-1 certs" count) for your direct confirmation against the NIMS standards PDFs before any academy engine/module hardcodes a number. Once you confirm, fold them in and flip the packet status to VERIFIED.

## Sources (newly WebFetch-confirmed in the 2026-06-09 deepening pass — untapped categories)

> Each URL below was fetched + confirmed during the deepening pass (sections 5-8). Prioritized previously-unused categories: gov data reports (NIST), free OER textbooks (OpenStax), university teaching centers (CMU), and primary federal regulatory text (govinfo.gov).

- **NIST/SEMATECH e-Handbook of Statistical Methods — control charts** (gov data report) — https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm
- **NIST CUU — Uncertainty of measurement results (Type A / Type B)** (gov data report) — https://physics.nist.gov/cuu/Uncertainty/basic.html
- **OpenStax "Introductory Statistics" (Rice University, CC BY 4.0)** (free OER textbook) — https://openstax.org/books/introductory-statistics/pages/1-introduction
- **Carnegie Mellon Eberly Center — Principles of Learning** (university teaching center) — https://www.cmu.edu/teaching/principles/learning.html
- **govinfo.gov — 29 CFR §29.5 (CFR-2011 Title 29 vol 1)** (primary federal regulatory text; second-source confirmation of the DOL apprenticeship facts) — https://www.govinfo.gov/content/pkg/CFR-2011-title29-vol1/xml/CFR-2011-title29-vol1-sec29-5.xml
- **ADDIE model** (established ISD framework, FSU 1975) — https://en.wikipedia.org/wiki/ADDIE_model
- **Andragogy / Knowles's six assumptions** (established adult-learning theory) — https://en.wikipedia.org/wiki/Andragogy

> Not promoted (fetch failed twice or undecodable — left out per R12): BLS OOH Machinists page (HTTP 403 x2), NASA Systems Engineering Handbook PDF (binary stream, undecodable), MIT OCW 2.008 Spring-2004 page (404).

### Second deepening pass (2026-06-10, claude — sections 9-11; categories: free university courseware [NPTEL], OER textbook, gov safety/metrology [OSHA + NIST])

> Each URL below was independently WebFetched + confirmed during the second pass. NONE duplicates a URL already in the lists above — they reach into NPTEL (Indian IIT open courseware), a second distinct OpenStax title, OSHA gov safety standards, and a NIST gov metrology page (the seven SI base units), all categories not previously cited.

- **NPTEL "Manufacturing Processes I" — IIT Roorkee** (free university course / open courseware) — https://nptel.ac.in/courses/112107144
- **NPTEL "Manufacturing Processes II" — IIT Kharagpur** (free university course / open courseware) — https://nptel.ac.in/courses/112105126
- **OpenStax "Statistics" (Illowsky & Dean, 2020, CC BY, attribute TEA)** (free OER textbook — distinct title from the "Introductory Statistics" cited above) — https://openstax.org/books/statistics/pages/1-introduction
- **OSHA — Machine Guarding** (gov safety standard) — https://www.osha.gov/machine-guarding
- **OSHA — Welding, Cutting & Brazing: Hazards & Solutions** (gov safety standard) — https://www.osha.gov/welding-cutting-brazing/hazards-solutions
- **NIST PML/OWM — SI base units (the seven base units, explicit-constant formulation)** (gov data / metrology) — https://www.nist.gov/pml/owm/metric-si/si-units

> Not promoted in the second pass (fetch failed twice — left out per R12): MIT OCW 2.008 Spring-2004 + Spring-2018 pages (404), MIT OCW 2.810 Fall-2023 page (404), archive.org "Shop Theory" scan (404), OSHA welding-fume fact-sheet page (404 x2), NIST `/pml/owm/metric-si-units` alt path (404).

## Cross-refs
- [[reference_galaxy_free_source_corpus_2026_06_09]] · [[reference_galaxy_enrichment_program_2026_06_09]]
- Galaxy brain: `mcp-server/src/engines/academy/MEMORY.md`
- Staged packet: `knowledge/wiki/academy/_staging/deep-domain-research-2026-06-09.md`
