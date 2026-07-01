---
title: Mill Galaxy Foundations (Verified Method & Structure Facts)
galaxy: mill
owner_slot: foxtrot
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09)"
verification_method: "WebFetch of each cited source URL; only claims the fetched page text actually confirmed were promoted. Numeric cutting constants deliberately NOT promoted (PRISM sources those only from mcp-server/src/physics/constants.ts). Sources whose content WebFetch could not actually read (binary PDFs) left owner-gated."
tags: [mill, milling, kienzle, chip-thinning, entering-angle, tool-deflection, mrr, method, verified-partial]
---

# Mill Galaxy Foundations (Verified Method & Structure Facts)

Method descriptions, formula STRUCTURE, vendor/standards pointers, and qualitative domain facts for the milling galaxy that were each confirmed by fetching the cited source page. This is the promoted, live subset of the staged research packet `knowledge/wiki/mill/_staging/deep-domain-research-2026-06-09.md`.

R12/safety note: every numeric cutting constant (kc1.1, mc/Zc values, specific speeds/feeds, Taylor C/n) is deliberately EXCLUDED from this live entry. PRISM sources those only from `mcp-server/src/physics/constants.ts`; they stay owner-gated in `_staging` for foxtrot. See "## Owner-gate (NOT promoted)" below.

---

## Kienzle specific cutting force — model STRUCTURE (no numbers)

- The Kienzle specific cutting force follows a power law in uncut chip thickness `h`: `kc = kc1.1 * h^(-mc)`, equivalently the cutting force `Fc = kc1.1 * b * h^(1-mc)` where `b` = chip width. Width scales linearly; thickness scales by the power law. (Confirmed structure — the page states `KC = KC1.1 x HM^(-MC) x (1 - 0.01 x GAMF)`, the same power-law form with a rake-angle correction term.)
- `kc1.1` is DEFINED as the specific cutting force "required to cut a chip area of one square millimeter that has a thickness of 1 millimeter" — the force at the normalized point `b = h = 1 mm`. Reported in N/mm^2 (MPa).
- `mc` (the chip-thickness exponent, also written `Zc`) governs how `kc` varies as chip thickness moves away from the 1 mm normalized point; at `h = 1 mm` the exponent has no effect (`h^0 = 1`).
- Source: [Machining Doctor — Specific Cutting Force (KC & KC1)](https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/)

## Material Removal Rate (MRR) — formula STRUCTURE

- For milling, `MRR = (depth of cut) x (width of cut) x (feed rate) / 1000` (the `/1000` converts mm inputs to cm^3/min). MRR is the product of the two depth-of-cut dimensions and the feed velocity. (Confirmed: page states `MRR = (D x W x F / 1000) cc/min`, D = depth of cut, W = width of cut, F = feed rate.)
- Source: [CADEM — Material removal rate formula for milling, turning](https://cadem.com/material-removal-rate/)

## Entering / lead angle and chip thickness — METHOD & force direction

- Decreasing the entering angle reduces the maximum chip thickness `hex` for a given feed per tooth `fz` — the chip-thinning effect spreads the engagement over a longer part of the cutting edge, which allows higher feed at equal load. (Confirmed verbatim direction; specific numeric feed multipliers left gated.)
- Entering angle steers the cutting-force DIRECTION: a 90-degree entering angle generates mostly radial force (in the feed direction), 45 degrees gives well-balanced radial and axial force, and a small angle (~10 degrees) yields a dominating axial force directed toward the spindle (which stabilizes long/slender setups).
- Round inserts have a higher maximum chip-thickness capability than straight-edge solutions, and at lower depths of cut the feed must be increased to obtain the proper chip thickness.
- Source: [Sandvik Coromant — Entering angle and chip thickness in milling](https://www.sandvik.coromant.com/en-us/knowledge/milling/entering-angle-and-chip-thickness)

## Tool deflection — qualitative METHOD + core-diameter rule

- Tool deflection is governed by tool overhang/stickout and diameter: as overhang increases, deflection increases; reducing the distance from holder to tool tip minimizes deflection, and diameter strongly affects rigidity. (Confirmed qualitatively. The exact cantilever exponent law `delta proportional to L^3 / d^4` is NOT stated on this page and is therefore left gated.)
- Deflection must be computed using the CORE diameter of the fluted section, not the nominal cutter diameter, because the flute valleys are an absence of material; for a reached/necked tool the core (or neck) diameter is the dimension that drives deflection. Using nominal cutter diameter under-predicts deflection.
- Source: [Harvey Performance / In The Loupe — Tool Deflection & Its Remedies](https://www.harveyperformance.com/in-the-loupe/tool-deflection-remedies/)

---

# Deepening pass 2 (2026-06-09, foxtrot-workflow) — untapped source categories: free textbook + gov reports

The sections above were sourced from vendor/glossary pages. This pass DEEPENS the entry by reaching into the source categories the original entry had NOT used: a **free college-course textbook** (Engineering LibreTexts) and **government statistics reports** (NIST/SEMATECH Engineering Statistics Handbook). Every claim below was confirmed by fetching the cited source. Numeric cutting constants remain owner-gated; the few NUMBERS that appear (the SPC 3-sigma multiple) are STATISTICAL-method constants, not cutting/material constants, and are not owner-gated.

## Milling process taxonomy — METHOD (free college-course textbook)

- Milling is fundamentally material removal using a **rotating multi-point cutting tool**; it supports complex surfaces, precise features, and tight dimensional tolerances. (Confirmed.)
- **Face milling** — the cutting edges are located on the FACE and periphery of the cutter; it produces flat surfaces PERPENDICULAR to the tool axis and is suited to surface finishing and large-area removal.
- **Peripheral milling** — the cutting edges are located on the PERIPHERY of the tool; it produces surfaces PARALLEL to the cutter axis and is used for contouring, slotting, and side milling.
- Terminology lock: **up-milling = conventional milling**; **down-milling = climb milling**. (Confirmed verbatim by the textbook — this anchors PRISM's climb/conventional naming to a course source.)
- Tool materials taught for milling: high-speed steel (HSS), carbide, and coated tools for wear resistance. (Material CLASS only — no grade-specific cutting numbers.)
- Source: [Engineering LibreTexts — Topic 09: Milling Operations (Cal Poly Humboldt, Manufacturing Processes)](https://eng.libretexts.org/Courses/California_State_Polytechnic_University_Humboldt/Manufacturing_Processes/Topic_09:_Milling_Operations) — free open-access engineering textbook.

## Statistical Process Control for milling QC — METHOD & rationale (NIST gov report)

- A **control chart** routinely monitors a quality characteristic over time. It has a center line at the in-control process mean plus an **upper control limit (UCL)** and **lower control limit (LCL)** chosen so that almost all data points fall within them while the process stays in control. (Confirmed verbatim.)
- **The 3-sigma rule (statistical-method constant, NOT a cutting constant):** U.S. practice bases control limits on a multiple of the standard deviation, and that multiple is usually **3**; for a normal distribution the 3-sigma limits are the practical equivalent of 0.001-probability limits (~1 in 1000 chance of a point falling outside by chance alone). (Confirmed verbatim.)
- **Common cause vs assignable cause:** "chance causes" generate random variation that stays within the limits; a point OUTSIDE the limits signals an **assignable (special) cause** that must be investigated. (Confirmed verbatim.)
- **Out of control** means a point falls outside the limits OR the points show systematic (non-random) behavior; "in control" requires all points between the limits AND a random pattern. (Confirmed verbatim.)
- **SPC vs SQC** — SPC monitors the process DURING production (Phase I establishes limits from historical data/process models, then monitoring compares current measurements, investigates outliers, and recomputes limits) to PREVENT defects; SQC (lot-acceptance / skip-lot / MIL-STD sampling) inspects finished product AFTER processing to verify a quality level. (Confirmed verbatim.)
- The "seven quality tools" listed: histograms, check sheets, Pareto charts, cause-and-effect diagrams, scatter diagrams, and control charts (Shewhart / CUSUM / EWMA / multivariate). (Confirmed.)
- Historical anchor: Walter Shewhart (Bell Labs) issued the memo featuring "a sketch of a modern control chart" on **May 16, 1924** and published the foundational 1931 book; sampling-inspection theory was advanced by Dodge and Romig. (Confirmed verbatim.)
- Sources: [NIST/SEMATECH e-Handbook 6.3.1 — What are Control Charts?](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm) · [6.1.2 — Statistical/Engineering process control techniques (SPC vs SQC)](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc12.htm) · [6.1.1 — History of quality control](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc11.htm). All three are U.S. Government (NIST) free engineering reference reports.

## Surface roughness Ra / Rz — DEFINITION & measurement METHOD (no cutting numbers)

- **Ra (arithmetic average roughness)** is the arithmetic average of the ABSOLUTE values of the profile-height deviations from the centerline (mean line) over the sampling length. Lower Ra = smoother surface. (Confirmed.)
- **Rz (peak-to-valley roughness)** is the vertical distance from the highest peak to the lowest valley within the scanned profile (modern ISO/ASME treatments average extreme peak/valley distances per sampling length). It is more sensitive to occasional defects/scratches than Ra. (Confirmed.)
- **Ra and Rz cannot be exactly converted** because they measure fundamentally different surface properties ("like asking how to convert height to weight"). Engineering practice: always MEASURE by the method the drawing specifies the roughness in, rather than converting. (Confirmed verbatim.) — this is a method/QC discipline fact, important for mill surface-finish callout verification.
- The measurement instrument is a **stylus profilometer** that traces the micro hills/valleys of the surface; a cutoff/filter separates roughness from waviness. (Confirmed.)
- Source: [Machining Doctor — Ra to Rz Conversion (and why it is not a true conversion)](https://www.machiningdoctor.com/ra-to-rz-conversion-and-rz-to-ra/).

## Radial & axial chip thinning — qualitative MECHANISM (milling-specific, no factors promoted)

- **Radial chip thinning** occurs when the RADIAL depth of cut is smaller than the cutter's radius: at reduced radial engagement the cutting edge contacts material at a shallower arc, so the ACTUAL chip thickness drops BELOW the programmed feed per tooth. (Confirmed direction; numeric factors stay gated.)
- **Axial chip thinning** occurs when the cutting edge approaches the material at an angle SMALLER than 90 degrees — characteristic of round inserts, ballnose, and chamfered cutters whose oblique engagement makes feed per tooth exceed the actual chip load. (Confirmed.)
- Core insight for PRISM feed logic: the edge "feels" the CHIP LOAD, not the programmed feed per tooth; therefore feed must be COMPENSATED upward (within the recommended chip-load range) to restore the intended chip thickness. The qualitative method is promoted; the numeric chip-thinning factor / multiplier is owner-gated. (Confirmed.)
- Source: [Machining Doctor — Chip Thinning Calculator (qualitative mechanism section)](https://www.machiningdoctor.com/calculators/chip-thinning-calculator/).

---

# Deepening pass 3 (2026-06-10, foxtrot-workflow) — untapped categories: MIT OpenCourseWare + free machining textbook + OSHA/NIST gov reports

The pass-2 college-course content came from a single LibreTexts textbook page plus NIST/SEMATECH. This pass reaches sources NOT cited above: **two MIT manufacturing courses** (2.810 on web.mit.edu and 2.008 on ocw.mit.edu), a different **free machining textbook** (LibreTexts *Workforce — Introduction to Machining*), an **OSHA government safety report** (OSHA 3170, Machine Guarding), and a **NIST metrology reference** (SI unit of length). Every claim was confirmed by fetching the cited page. No cutting/material constant is promoted; the meter definition is an SI base-unit definition (a metrology constant, not an owner-gated cutting constant).

## Manufacturing-process framing — METHOD/curriculum (MIT free college courses)

- MIT 2.810 frames manufacturing as the study of **the physics and randomness and how they influence quality, rate, cost, and flexibility** — i.e., a process is understood through its governing physics AND its statistical variation, not either alone. This anchors PRISM's pairing of a deterministic physics core with statistical (SPC) quality logic. (Confirmed.)
- 2.810 teaches machining alongside assembly, injection molding, casting, and thermoforming, and explicitly studies the relationship between an individual process and the broader manufacturing SYSTEM (process ↔ product design, process ↔ system). (Confirmed — supports treating a mill operation as one node in a larger production system.)
- The metal-cutting curriculum is taught as a three-part progression: **Metal Cutting I — cutting analysis: mechanics, forces, and power**; **Metal Cutting II — forces and power demos**; **Metal Cutting III — machining in practice**. Quality is taught as **Variation and Quality I & II** covering quality measurement and statistical process control. (Confirmed from the MIT 2.008 Spring 2025 lecture list — establishes the canonical teaching order: mechanics → forces/power → practice, with variation/quality as a co-equal pillar.)
- Sources: [MIT 2.810 Manufacturing Processes and Systems (T.G. Gutowski)](https://web.mit.edu/2.810/www/) · [MIT 2.008 Design and Manufacturing II — Lecture Notes (OCW, Spring 2025; Prof. Jung-Hoon Chun, Dr. Josh Ramos)](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2025/lists/lecture-notes/). Both are free MIT college-course materials.

## Face milling as the datum-setting first operation — METHOD (free machining textbook)

- **Face milling (facing) is the process of establishing an accurate surface of the part**, and that surface is **used as a reference for other feature depths** — for that reason **it is often the first operation performed on raw material on a milling machine**. (Confirmed verbatim.) This is the method rationale behind "face the stock first": the faced surface becomes the datum from which subsequent depths are measured.
- The textbook flags a **tool-selection distinction**: chip-per-tooth (CPT) selection **for a face mill is different than for an end mill** because a face mill **can often handle a larger CPT than will look good for a surface finish** — i.e., the face-mill CPT ceiling is set by the required finish, not by the same limit that constrains an end mill. (Confirmed — qualitative direction only; the example chip-load numbers are left owner-gated.)
- Source: [LibreTexts (Workforce) — Introduction to Machining, 9.10 Face Milling](https://workforce.libretexts.org/Sandboxes/a072766d-16cb-4dbc-9dd2-2f3c784c59e6/Introduction_to_Machining/09:_Manual_Vertical_Milling_Machines/9.10:_Face_Milling) — free open-access machining course textbook (distinct from the Cal Poly Humboldt LibreTexts book cited in pass 2).

## Machine-guarding safety on the mill — METHOD & standards (OSHA gov report)

- OSHA classifies machine hazards by **mechanical motion** (rotating, reciprocating, transverse) and by **mechanical action** (cutting, punching, shearing, bending). A milling spindle/cutter is a **rotating + cutting** hazard by this taxonomy. (Confirmed.)
- The **point of operation** is defined as **"the area on a machine where work is being performed upon the material being processed"** — the zone where operator contact is most likely. For a mill this is the cutter-engagement region. (Confirmed verbatim.)
- A safeguard must meet three requirements: **prevent contact** with the hazardous part, **stay affixed** (remain secure on the machine), and **withstand normal operational stress** without degrading or being displaced. (Confirmed.)
- OSHA's four guard types: **fixed** (permanent barrier), **interlocked** (interrupts machine function when opened), **adjustable** (operator-set barrier for varying work), and **self-adjusting** (automatically conforms to the workpiece). (Confirmed — gives PRISM a standards-grounded vocabulary for machine-safety / shop-floor compliance facts.)
- Source: [OSHA 3170 — Safeguarding Equipment and Protecting Employees from Amputations / Machine Guarding](https://www.osha.gov/sites/default/files/publications/osha3170.pdf) — U.S. Government (OSHA) publication.

## Length-measurement traceability — metrology foundation (NIST gov report)

- The **meter is defined by taking the fixed numerical value of the speed of light in vacuum c to be 299,792,458 when expressed in m·s⁻¹** — a definition tied to a fundamental physical constant, not an artifact. (Confirmed verbatim. This is an SI base-unit definition / metrology constant, not a cutting or material constant, so it is not owner-gated.)
- The meter was **once defined by a physical artifact** — two marks on a platinum-iridium bar (NIST holds the U.S. National Prototype Meter from the late 1800s) — and moved to the constant-based definition for reproducibility/traceability. (Confirmed.)
- Method relevance for the mill galaxy: every dimensional tolerance a milled part is verified against (CMM, micrometer, gauge block) is ultimately **traceable to this single SI definition of length** — the basis for measurement traceability that PRISM's tolerance/QC logic assumes. (Confirmed framing from the NIST page.)
- Source: [NIST — SI Units: Length (the meter)](https://www.nist.gov/pml/owm/si-units-length) — U.S. Government (NIST Office of Weights and Measures).

---

## Owner-gate (NOT promoted) — stays UNVERIFIED in _staging for foxtrot

The following remain owner-gated in `knowledge/wiki/mill/_staging/deep-domain-research-2026-06-09.md`. Foxtrot must verify each against its primary source (and reconcile any physics number ONLY in `mcp-server/src/physics/constants.ts`, never in docs) before any live engine/doctrine use.

- ALL numeric cutting constants — kc1.1 per-ISO values (P/M/K/N/S/H), the `mc`/`Zc` 0.2-0.3 range, specific cutting forces, any SFM/IPM/feeds-speeds, Taylor C/n. PRISM sources these ONLY from `mcp-server/src/physics/constants.ts`; the web is never authoritative for them. (Safety-critical — a wrong constant scales force/power/tool-life predictions.)
- The Kienzle worked power example (ap/ae/vf/eta/kW numbers) and the +-15% / +25-50%-dull-tool / 10-20%-variance figures — numeric, gated.
- Radial Chip Thinning Factor formula and its numeric outputs (RCTF arithmetic, "~1.67 at 10% engagement", the 12 mm / 1.2 mm worked example) — gated pending a primary recompute by foxtrot.
- Entering-angle numeric feed-modification factors (90->x1.0, 45->x1.4, 10->x5.8) and round-insert 1.16x-2.3x range — numeric, gated (the qualitative direction is promoted above; the multipliers are not).
- Tool-deflection cantilever exponent law `delta proportional to L^3 / d^4`, `I = pi*d^4/64`, "8x / 16x / 3x rigidity" figures — the cited Harvey page did NOT state the formula or exponents (WebFetch read only the qualitative principles), so the math stays gated.
- Altintas-Budak ZOA stability method, the `a_lim` closed form, the regenerative phase-shift derivation, and the Altintas & Budak (1995) CIRP citation — the cited sources are binary PDFs (MIT CBA course PDF + MTRC reprint) that WebFetch could NOT actually read; the "confirmations" it returned were inferred from title/authorship/metadata, not from the substantive text. Left owner-gated; foxtrot should verify against the actual paper text.
- HEM/trochoidal numeric parameter bands (RDOC 5-15% of D, ADOC 1-2x D, 0.031"/0.062" small-diameter limits) — numeric, gated.
- Climb-vs-conventional doctrine claims tagged "secondary engineering context via WebSearch — verify against Machinery's Handbook" in the packet — not fetched from a primary, gated.
- Chip-thinning <50% / <30% engagement thresholds and failure-mode rubbing claims — the conceptual method (low engagement -> sub-fz chip thickness -> compensate feed) is broadly supported by the Sandvik source, but the specific percentage thresholds were not independently fetched/confirmed here; gated.

---

## Sources (each was WebFetched and confirmed a promoted claim)

1. [Machining Doctor — Specific Cutting Force (KC & KC1)](https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/) — confirmed Kienzle power-law STRUCTURE + kc1.1 definition + units + mc behavior at h=1mm.
2. [CADEM — Material removal rate formula for milling, turning](https://cadem.com/material-removal-rate/) — confirmed milling MRR formula structure.
3. [Sandvik Coromant — Entering angle and chip thickness in milling](https://www.sandvik.coromant.com/en-us/knowledge/milling/entering-angle-and-chip-thickness) — confirmed entering-angle chip-thinning method + force-direction (90/45/10 deg) + round-insert capability.
4. [Harvey Performance / In The Loupe — Tool Deflection & Its Remedies](https://www.harveyperformance.com/in-the-loupe/tool-deflection-remedies/) — confirmed qualitative deflection drivers + the use-CORE-diameter (not nominal) rule.

### Deepening pass 2 (2026-06-09) — untapped categories: free textbook + gov reports

5. [Engineering LibreTexts — Topic 09: Milling Operations (Cal Poly Humboldt)](https://eng.libretexts.org/Courses/California_State_Polytechnic_University_Humboldt/Manufacturing_Processes/Topic_09:_Milling_Operations) — FREE COLLEGE-COURSE TEXTBOOK. Confirmed milling = rotating multi-point cutter; face-vs-peripheral edge location + surface produced; up=conventional / down=climb terminology lock; HSS/carbide/coated tool-material classes.
6. [NIST/SEMATECH e-Handbook 6.3.1 — What are Control Charts?](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm) — U.S. GOV REPORT. Confirmed control-chart structure (center line/UCL/LCL), the 3-sigma statistical-method rule (~0.001 prob), common-vs-assignable cause, out-of-control definition.
7. [NIST/SEMATECH e-Handbook 6.1.2 — SPC vs SQC process-control techniques](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc12.htm) — U.S. GOV REPORT. Confirmed SPC (Phase I → monitor → investigate → recompute, prevents defects during production) vs SQC (post-process lot/MIL-STD sampling) + the seven quality tools.
8. [NIST/SEMATECH e-Handbook 6.1.1 — History of quality control](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc11.htm) — U.S. GOV REPORT. Confirmed Shewhart's May 16, 1924 control-chart memo + 1931 book + Dodge/Romig sampling-inspection lineage.
9. [Machining Doctor — Ra to Rz Conversion](https://www.machiningdoctor.com/ra-to-rz-conversion-and-rz-to-ra/) — confirmed Ra (arithmetic-average-of-absolute-deviations-from-centerline) + Rz (peak-to-valley) definitions, why they are not inter-convertible, stylus-profilometer method.
10. [Machining Doctor — Chip Thinning Calculator (qualitative section)](https://www.machiningdoctor.com/calculators/chip-thinning-calculator/) — confirmed radial chip thinning (radial DOC < cutter radius) + axial chip thinning (approach angle < 90 deg / round inserts) mechanism + the edge-feels-chip-load feed-compensation rationale (numeric factors NOT promoted).

### Deepening pass 3 (2026-06-10) — untapped categories: MIT OpenCourseWare + free machining textbook + OSHA/NIST gov reports

11. [MIT 2.810 Manufacturing Processes and Systems (T.G. Gutowski)](https://web.mit.edu/2.810/www/) — FREE COLLEGE COURSE. Confirmed the "physics + randomness → quality/rate/cost/flexibility" framing + process-within-a-system framing + the set of processes taught alongside machining.
12. [MIT 2.008 Design and Manufacturing II — Lecture Notes (OCW, Spring 2025)](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2025/lists/lecture-notes/) — FREE COLLEGE COURSE (MIT OpenCourseWare). Confirmed the three-part metal-cutting teaching order (mechanics/forces/power → forces & power demos → machining in practice) + Variation & Quality I/II covering SPC, taught by Prof. Jung-Hoon Chun and Dr. Josh Ramos.
13. [LibreTexts (Workforce) — Introduction to Machining, 9.10 Face Milling](https://workforce.libretexts.org/Sandboxes/a072766d-16cb-4dbc-9dd2-2f3c784c59e6/Introduction_to_Machining/09:_Manual_Vertical_Milling_Machines/9.10:_Face_Milling) — FREE OPEN-ACCESS MACHINING TEXTBOOK (distinct from pass-2's Cal Poly Humboldt book). Confirmed face milling = accurate-reference-surface, often the first operation; face-mill vs end-mill CPT-selection distinction (numbers gated).
14. [OSHA 3170 — Machine Guarding / Safeguarding Equipment](https://www.osha.gov/sites/default/files/publications/osha3170.pdf) — U.S. GOV REPORT (OSHA). Confirmed the hazard taxonomy (rotating/reciprocating/transverse motions; cutting/punching/shearing/bending actions), the point-of-operation definition, the three safeguard requirements, and the four guard types (fixed/interlocked/adjustable/self-adjusting).
15. [NIST — SI Units: Length (the meter)](https://www.nist.gov/pml/owm/si-units-length) — U.S. GOV REPORT (NIST OWM). Confirmed the speed-of-light meter definition (c = 299,792,458 m·s⁻¹), the prior platinum-iridium artifact, and length-measurement traceability (a metrology constant, NOT an owner-gated cutting constant).
