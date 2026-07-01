---
title: CAM Toolpath Foundations (verified institutional/method facts)
galaxy: cam
owner_slot: kilo
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09)"
verification_method: "Live WebFetch of each cited vendor/standards/method source; only formula STRUCTURE, process METHOD descriptions, and qualitative domain facts promoted. ALL numeric cutting constants (kc1.1, Taylor C/n, specific speeds/feeds/SFM/IPM, material constants) left owner-gated in _staging — PRISM sources those ONLY from mcp-server/src/physics/constants.ts, never the web."
tags: [cam, toolpath, chip-thinning, scallop, trochoidal, rest-machining, climb-milling, finishing, roughing]
---

# CAM Toolpath Foundations

WebFetch-confirmed institutional / method / formula-structure facts for the CAM (toolpath-strategy)
galaxy, promoted from the deep-domain research packet
(`knowledge/wiki/cam/_staging/deep-domain-research-2026-06-09.md`).

Each claim below was confirmed by actually fetching its cited source on 2026-06-09. Numeric cutting
data (specific cutting force, Taylor exponents, recommended speeds/feeds, material constants) is NOT
here — it stays owner-gated in `_staging` (see "Owner-gate" section) because PRISM sources every
physics constant from `mcp-server/src/physics/constants.ts`, never from a web page.

---

## Radial chip thinning (feed restoration when RDOC is small)

- Radial chip thinning occurs when the radial depth of cut (Ae) is smaller than the cutter radius
  (i.e. Ae < D/2). In that regime the maximum chip thickness depends on Ae and is always smaller
  than the programmed feed-per-tooth, so the feed must be increased to restore proper chip thickness.
  Confirmed on [Machining Doctor — Chip Thinning](https://www.machiningdoctor.com/calculators/chip-thinning-calculator/):
  "When Ae<R, the Maximum Chip thickness depends on the radial depth of Cut (Ae) and will always be
  smaller than the Feed Per Tooth."
- Radial Chip Thinning Factor (formula STRUCTURE only):
  `RCTF = 1 / sqrt( 1 - (1 - 2*(Ae/D))^2 )`, applied as `Fz = RCTF * Cl` (adjusted feed-per-tooth =
  factor x recommended chip load). Confirmed verbatim on the same Machining Doctor page.
  *(Geometry only — the recommended chip-load value `Cl` is a material/tool number that PRISM
  sources from its own constants, not from this page.)*

## Scallop (cusp) height and stepover — ball-nose finishing geometry

- Scallop-height geometry (formula STRUCTURE): `h = r - sqrt(r^2 - p^2/4)` with inverse stepover
  `p = 2*sqrt(2*h*r - h^2)`, where `r` = ball-nose radius, `p` = stepover, `h` = scallop/cusp height.
  Confirmed on [Machining Doctor — Ball Nose Surface Finish](https://www.machiningdoctor.com/calculators/ball-nose-surface-finish/).
  (Algebraically identical to the packet's `h = r - sqrt(r^2 - (p/2)^2)` form.)
- Larger tool -> smaller scallop, and smaller stepover -> smaller scallop / better finish (with
  diminishing returns), both confirmed on the same page: "as r increases, h decreases. Therefore, a
  larger ball nose diameter will give a better surface finish for the same stepover," and an
  exponential stepover-vs-finish relationship "with diminishing returns beyond 30% of radius."

## Trochoidal milling (slots wider than the tool)

- Trochoidal milling is a high-efficiency-milling method that machines a slot wider than the cutter
  diameter using a series of circular cuts (a trochoidal tool path), maintaining a low radial depth
  of cut (RDOC) and a high axial depth of cut (ADOC) to reduce cutting forces and heat, distribute
  wear across the whole tool edge, improve chip evacuation, and extend tool life. Confirmed on
  [Harvey Performance — Intro to Trochoidal Milling](https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/):
  "a method of machining used to create a slot wider than the cutting tool's cutting diameter ...
  using a series of circular cuts known as a trochoidal tool path" while keeping "a low radial depth
  of cut (RDOC) and a high axial depth of cut (ADOC)."

## Climb vs conventional milling (chip-thickness direction)

- Climb (down) milling starts each tooth at maximum chip thickness and decreases (thick-to-thin), so
  heat tends to transfer into the chip; conventional (up) milling starts the chip near zero and
  increases (thin-to-thick), diffusing more heat into the workpiece, producing work hardening, and
  the tooth rubs more at the start of the cut, causing faster tool wear. Confirmed on
  [Harvey Performance — Climb vs Conventional Milling](https://www.harveyperformance.com/in-the-loupe/conventional-vs-climb-milling/):
  "Chip width starts from maximum and decreases" (climb) vs "Chip width starts from zero and
  increases which causes more heat to diffuse into the workpiece and produces work hardening"
  (conventional), and the page calls climb milling "the preferred way" / "generally the best way to
  machine parts today." *(Qualification: the page demonstrates the thick-to-thin chip mechanism and
  states climb is preferred, but does not phrase a standalone "always cut thick to thin" industry
  rule as a direct quote — promoted as confirmed mechanism + preference, not as a verbatim rule.)*

## Rest machining (residual-stock / reference-tool toolpaths)

- Rest machining targets material a previous (larger) tool could not reach by following with a
  smaller tool; the smaller tool reworks only the leftover stock. Remaining-stock can be detected
  from three sources in Fusion CAM: "From previous operation(s)" (all prior ops in the setup),
  "From bodies" (modeled remaining-stock bodies), or "From setup stock." Confirmed on
  [Autodesk Fusion CAM — Machine remaining stock](https://help.autodesk.com/cloudhelp/ENU/Fusion-CAM/files/MFG-3D-FLAT-REST-MACHINING.htm):
  "the tool you use in this operation should generally be smaller than the tool used in previous
  operations," plus the three Source options quoted above.

---

## Owner-gate (NOT promoted)

The following from the `_staging` packet remain UNVERIFIED / owner-gated for kilo and were NOT
promoted here. Reasons given per R12.

- **Every numeric cutting constant** — specific cutting force / kc1.1, Taylor `C`/`n` exponents,
  material constants, recommended chip-load `Cl` values, specific SFM/IPM/RPM/feed numbers (e.g. the
  CNCCookbook 6747 rpm / 125.8 ipm reference case, the 16000 rpm / 2500 mm/min adaptive parameter
  set, the ~+30% / 2x / 3-4x feed rule-of-thumb table). **Reason:** PRISM sources all physics/cutting
  constants ONLY from `mcp-server/src/physics/constants.ts`; web pages are never a source of truth for
  a number that drives a tool. Safety-critical galaxy — a wrong number breaks a tool or scraps a part.
- **Quantified vendor performance figures** — "~5x greater MRR," 8:09 vs 2:01 roughing times,
  ">50% tool rigidity," "20-30% feed/DOC increase," "~25% processing-time saving." **Reason:**
  single-source vendor/marketing figures, material/part-specific; directional only, not a constant.
- **Material-fit hardness ranges** (e.g. trochoidal "mid-40s to 55 HRC") and the
  Ti-6Al-4V trochoidal wear study specifics. **Reason:** numeric/material-specific; owner re-derives
  against PRISM material registry before any engine default.
- **The "~12.5% of diameter" vs "~30% of radius" stepover diminishing-returns floor.** **Reason:**
  two sources frame it differently (%-of-D vs %-of-radius); only the %-of-radius framing was
  WebFetch-confirmed here (Machining Doctor "beyond 30% of radius") — the CNCCookbook 12.5%-of-D
  figure and the Ra ~= 1/4 cusp-height estimate were not independently fetched, so they stay gated.
- **3+2 vs 5-axis, gouge/collision, lead-lag sign conventions** — the qualitative method framing is
  sound, but those specific source pages (Okuma / RapidDirect / BobCAD / NX / Hurco) were not
  WebFetched in this pass, so they stay owner-gated rather than promoted on trust.

---

# CAM Foundations — DEEPEN pass (free college course + standards-body + gov sources, 2026-06-09)

The sections below were appended in a DEEPEN pass that deliberately reaches into source categories the
original entry had NOT used: a **free college course** (MIT OpenCourseWare / MIT 2.810 lecture material),
**standards-body and government** sources (ISO via the STEP-NC standard, NIST smart-manufacturing program,
ASME Y14.5), rather than vendor blogs. Each claim was confirmed by a live WebFetch on 2026-06-09. As with
the original pass, ONLY formula STRUCTURE / process METHOD / mechanism-theory / standards-framing is
promoted — every numeric cutting constant stays owner-gated in `mcp-server/src/physics/constants.ts`.

## Metal-cutting theory — the basis CAM toolpaths sit on top of (MIT 2.810, free college course)

CAM strategy choices (chip thinning, climb-vs-conventional, finishing stepover) are downstream of the
classical orthogonal-cutting model taught in MIT's 2.810 *Manufacturing Processes and Systems* course
(Prof. T. Gutowski). Confirmed from the lecture "Subtractive Processes: Machining"
([web.mit.edu/2.810 lec5-machining-2018.pdf](https://web.mit.edu/2.810/www/files/lectures/lec5-machining-2018.pdf)):

- **Why machining is not a fully digital ("press-print") technology.** Unlike additive processes, machining
  generates large cutting forces, so it requires secure *fixturing*, robust *tools and tool holders*, and is
  limited by *geometric access* of the tool to the surface. This is the physical reason CAM must reason about
  workholding, tool reach, and rigidity — not just geometry. *(Method/constraint framing only.)*
- **Orthogonal cutting / shear-plane model.** Material separates from the workpiece by plastic deformation in
  a shear zone along a defined *shear plane* ahead of the tool; chip formation is the result of that shear.
  *(Qualitative mechanism.)*
- **Merchant model — structure only.** The Merchant analysis relates the *shear angle*, the *friction angle*,
  and the tool *rake angle* through a geometric relationship that determines the cutting-force direction. This
  is the structural basis for "rake angle and chip-thinning change the force" — promoted as the relationship
  *form*, NOT as any force value. *(Equation structure, no constants.)*
- **Taylor tool-life relationship — equation FORM only.** Tool life follows a power-law of the structural form
  `V * T^n = C`, where `V` = cutting speed, `T` = tool life, and `n`, `C` are constants. Higher speed shortens
  usable life (inverse power-law). **The constants `n` and `C` are explicitly NOT promoted** — they are
  material/tool numbers PRISM sources only from `constants.ts`. Promoting just the *form* lets CAM reason
  "faster speed costs tool life" without inlining a forbidden constant.
- **Tool-wear mechanisms (qualitative).** Edge degradation occurs via *flank wear*, *crater wear*, and
  *thermal fatigue* — the mechanisms a roughing/finishing strategy trades against. *(Mechanism list only.)*

## STEP-NC — feature-based CAD→CAM→CNC data model (ISO standards-body source)

The CAM galaxy emits toolpaths that are ultimately consumed by a controller. The dominant legacy interface is
ISO 6983 G-code; the standards-body alternative is **STEP-NC**, confirmed from the
[STEP-NC Wikipedia article](https://en.wikipedia.org/wiki/STEP-NC) and the
[NIST Smart Manufacturing Operations Planning and Control program](https://www.nist.gov/programs-projects/smart-manufacturing-operations-planning-and-control-program):

- **Two ISO standards under one name.** "STEP-NC" denotes both **ISO 14649** — the Application Reference Model
  (ARM) machining data model — and **ISO 10303-238 / AP238** — the Application Interpreted Model (AIM) that
  re-expresses ISO 14649 inside the broader STEP product-data standard (ISO 10303). *(Standards framing.)*
- **What it replaces and why.** It is designed to supersede **ISO 6983 / RS-274D G-code**, which is
  "often machine-specific and limited to axis-motion commands" carrying "little or no information about the
  desired result of the machining." STEP-NC instead carries the *manufacturing intent*. *(Method contrast.)*
- **The "Workingstep" hierarchy.** A STEP-NC process plan decomposes into executable **Workingsteps**; each
  Workingstep contains *machining operations* performed on specific *manufacturing features* (e.g. a pocket →
  the appropriate milling operation), so the CNC understands *what* is being made, not only *how* to move axes.
  This is the same feature → operation decomposition a CAM strategy engine already models. *(Method structure.)*
- **Post-processor-free interoperability.** Because the program is feature/intent-based, an AP238 program can be
  retargeted across machines with fundamentally different kinematics (e.g. AB tool-tilt vs BC table-tilt 5-axis)
  *without* a traditional vendor post-processor — the interoperability goal CAM post-processing exists to bridge.
  *(Capability/method framing.)*
- **NIST smart-manufacturing standards context.** NIST's program advanced the surrounding "digital thread of
  product and process information from design to realization, quality assurance and maintenance," referencing
  **STEP AP242** (ISO 10303-242), the **Quality Information Framework (QIF)**, and **MTConnect** for machine
  data streaming. These are the standards a model-based CAM pipeline interoperates with. *(Standards list.)*

## GD&T and tolerancing — the design intent CAM must hold (ASME standards-body source)

A finishing toolpath exists to hold a tolerance; the controlling US standard is **ASME Y14.5**, confirmed from
the [ASME Y14.5 Wikipedia article](https://en.wikipedia.org/wiki/ASME_Y14.5):

- **Scope.** ASME Y14.5 establishes the "rules, symbols, definitions, requirements, defaults, and recommended
  practices for stating and interpreting geometric dimensioning and tolerancing (GD&T)," spanning **15 sections**
  that cover symbols, datums, and tolerances of *form, orientation, position, profile, and runout*. These are
  the geometric characteristics a CAM finishing/profiling strategy is ultimately trying to achieve. *(Standard scope.)*
- **Mathematical companion.** Y14.5 is complemented by **ASME Y14.5.1 — Mathematical Definition of Dimensioning
  and Tolerancing Principles**, which gives the unambiguous math behind each tolerance zone — the basis any
  automated CAM/inspection reasoning needs to evaluate conformance. *(Companion-standard framing.)*

## Surface roughness — the metric finishing toolpaths optimize (ISO / ASME standards source)

CAM finishing stepover (the scallop section above) is chosen to hit a surface-roughness target. The
roughness *metric structure* is confirmed from the
[Surface roughness Wikipedia article](https://en.wikipedia.org/wiki/Surface_roughness):

- **Ra — formula STRUCTURE only.** The arithmetic-average roughness Ra is the mean absolute deviation of the
  filtered profile from its centerline, of the structural form `Ra = (1/lr) * integral( |z(x)| dx )` over the
  evaluation length `lr`. It is an *amplitude average*, not a peak measure. *(Integral structure, no values.)*
- **Ra vs Rz.** Where Ra averages all deviations into one value, **Rz** captures the maximum peak-to-valley
  height within a sampling length, structurally `Rz = Rp + Rv` (max peak height + max valley depth) — so Rz is
  sensitive to outliers that Ra smooths away. A finishing spec may call out either. *(Parameter distinction.)*
- **Governing standards.** Surface-texture measurement is governed by **ISO 4287** and the US **ASME B46.1**
  standard (and the surface-texture *symbols* by ASME Y14.36). *(Standards list — these complement Y14.5.)*
- **Feed / nose-radius geometry (structure only).** Theoretical finish in turning/milling is geometric: a
  *tighter feed* reduces peak-to-peak feed-mark spacing (lower roughness), and a *larger tool nose radius*
  smooths the profile by filling feed-mark valleys, while a *smaller* radius leaves deeper traces. This is the
  geometric driver behind the scallop/stepover and feed-per-tooth trade-offs CAM already models — promoted as
  the *direction* of the relationship, NOT any numeric Ra/feed/radius value. *(Geometric relationship form.)*

---

## Owner-gate (DEEPEN pass — NOT promoted)

Consistent with the original owner-gate, the DEEPEN pass left the following out (R12):

- **All Taylor `n` / `C` values, specific cutting energy / specific-force numbers, and any Ra/feed/nose-radius
  numeric targets.** Only the *equation form* (`V*T^n=C`, `Ra = (1/lr)∫|z(x)|dx`) was promoted; every constant
  stays in `constants.ts`. A wrong tool-life or roughness constant in a safety-critical galaxy scraps parts.
- **The NIST "State of Integrated CAM/CNC Control Systems" PDF (pub_id 928733).** The fetch returned raw PDF
  stream bytes, not readable text, so NO claim was promoted from it (per R12 rule: an unreadable fetch is not a
  confirmation). It is listed below only as an attempted-but-unconfirmed source, not cited for any claim.
- **ASME Y14.5 datum primary/secondary/tertiary hierarchy, Feature Control Frame internals, and the
  cylindrical-vs-rectangular tolerance-zone advantage.** Although widely known, the *specific Wikipedia page
  fetched* did not state these in its returned text, so they were NOT promoted on that page's authority — only
  the 15-section scope + Y14.5.1 companion (which the fetch DID confirm) were promoted.

---

# CAM Foundations — DEEPEN pass 2 (free textbook + free college course + OSHA gov-standard + cutting-mechanics theory, 2026-06-10)

A SECOND deepening pass appended below, deliberately reaching for source categories and specific URLs the
first two passes did NOT cite: an **OpenStax free textbook chapter** (University Physics Vol. 1), an **OSHA
government safety standard** (29 CFR 1910.212), a **free college course** index (NPTEL / IIT Roorkee), and
additional **process-mechanism theory** pages not previously fetched. Each claim was confirmed by a live
WebFetch on 2026-06-10. As before, ONLY mechanism/theory/method/standards framing is promoted — every numeric
cutting constant (speeds, feeds, coefficients, ratings, Taylor `n`/`C`) stays owner-gated in
`mcp-server/src/physics/constants.ts`.

## Friction at the tool–chip interface — the physics CAM heat/wear reasoning sits on (OpenStax, free textbook)

The cooling/lubrication trade-offs a CAM strategy balances are downstream of basic friction physics, confirmed
from [OpenStax University Physics Vol. 1, §6.2 Friction](https://openstax.org/books/university-physics-volume-1/pages/6-2-friction):

- **Static vs. kinetic friction (definitions).** "If two systems are in contact and stationary relative to one
  another, then the friction between them is called static friction"; "if two systems are in contact and moving
  relative to one another, then the friction between them is called kinetic friction." The page confirms
  **"static friction is usually greater than the kinetic friction"** — so once a chip is moving, it is easier to
  keep it sliding than to start it. *(Theory — qualitative, no coefficient values.)*
- **Why friction exists (mechanism).** "Friction arises in part because of the roughness of the surfaces in
  contact," and "much of the friction is actually due to attractive forces between molecules making up the two
  objects." This is the surface-and-adhesion mechanism behind tool–chip seizure and lubrication need. *(Mechanism.)*
- **Friction → heat (mechanism).** When surfaces rub, "surface atoms adhere and cause atomic lattices to
  vibrate," and their energy "is converted into heat." This is the first-principles reason metal cutting generates
  heat and a CAM strategy must reason about cooling/MQL. *(Mechanism — no values.)*

## Built-up edge (BUE) — the speed/material effect CAM finishing strategy avoids (cutting-mechanics theory)

A finishing toolpath's surface-finish outcome is corrupted by built-up edge; the mechanism is confirmed from the
[Built-up edge (Wikipedia)](https://en.wikipedia.org/wiki/Built-up_edge) article:

- **What it is.** BUE is "an accumulation of material against the rake face that seizes the tool tip, separating
  it from the chip" — effectively making the workpiece material temporarily part of the cutting edge. *(Mechanism.)*
- **Formation by work-hardening.** "The first layer of metal impacting and seizing on it work-hardens more than
  the rest of the volume of metal," becoming stronger than the surrounding material and adhering; the cycle
  repeats and builds up. *(Mechanism — qualitative.)*
- **Speed dependence (DIRECTION only, no values).** Low cutting speed promotes BUE; at higher speed "the metal
  moving away from the workpiece becomes hot enough to recover before seizing onto the tool, preventing the
  formation of a BUE." This is the qualitative reason a finishing pass often runs at higher speed — the *number*
  stays in `constants.ts`. *(Relationship direction only.)*
- **Material susceptibility.** Work-hardening alloys "such as steel … are prone to forming a BUE," whereas pure
  metals resist it. *(Material-class qualitative fact.)*
- **Surface-finish + tool-wear effect.** BUE fragments "break off and stick to the workpiece" and, having
  work-hardened, "become abrasive," degrading finish; conversely BUE marginally extends tool life because cutting
  is "partly being done by the built up edge rather than the tool itself." This is the exact finish-vs-life
  trade-off a CAM strategy navigates. *(Trade-off mechanism.)*

## Machinability — how CAM judges which strategy/material is "easy to cut" (cutting-theory source)

Strategy and parameter selection presupposes a notion of machinability; its definition and the four assessment
methods are confirmed from [Machinability (Wikipedia)](https://en.wikipedia.org/wiki/Machinability):

- **Definition.** Machinability is "the ease with which a metal can be cut permitting the removal of the material
  with a satisfactory finish at low cost." Good machinability ⇒ minimal power, fast cutting, good finish, minimal
  tool wear. *(Definition.)*
- **Governing factors.** Two categories: *material-condition* factors (microstructure, grain size, heat
  treatment, chemical composition, hardness, yield/tensile strength) and *inherent physical properties* (modulus
  of elasticity, thermal conductivity, thermal expansion, work-hardening behaviour) — plus operating conditions
  and tool material/geometry. These are the inputs a CAM material/strategy selector reasons over. *(Factor list.)*
- **Four assessment methods (method structure).** Machinability is judged by (1) **tool-life**, (2) **cutting
  forces / power** (using specific energy as the metric), (3) **surface finish**, and (4) a **machinability
  rating** — a percentage comparing a material's cutting speed to a reference standard, used predictively *with
  the Taylor tool-life equation*. The rating *percentages* and reference numbers are NOT promoted — only the
  four-method structure. *(Method structure — no numeric ratings.)*

## Speeds, feeds, and depth of cut — the parameter trio CAM tunes (cutting-parameter theory)

The relationship CAM optimizes (without any value being promoted) is confirmed from
[Speeds and feeds (Wikipedia)](https://en.wikipedia.org/wiki/Speeds_and_feeds):

- **Definitions.** Cutting speed is "the speed difference (relative velocity) between the cutting tool and the
  surface of the workpiece"; feed rate is "the relative velocity at which the cutter is advanced along the
  workpiece; its vector is perpendicular to the vector of cutting speed." *(Definitions — kinematic, no values.)*
- **Speed ↔ tool-life trade-off (direction).** "Higher cutting speeds generally reduce tool life, while lower
  speeds extend it" — the same inverse relationship the Taylor form `V·Tⁿ = C` encodes; promoted as direction, not
  as any `V`/`T`/`n`/`C` number. *(Relationship direction.)*
- **The three parameters act together.** "Cutting speed and feed rate combine with depth of cut to determine
  material removal rate" and "all three parameters work together rather than independently" — the reason a CAM
  optimizer cannot tune one in isolation. *(Method framing.)*
- **Models are approximate, observation closes the loop.** Theoretical models "cannot know the exact optimal
  values until running the job"; rigidity, vibration, and coolant modify the ideal, and operators adjust by
  observable conditions. This justifies PRISM's closed-loop / outcome-feedback approach over open-loop table
  lookup. *(Method/limitation framing.)*

## Cutting fluid — functions, types, and delivery methods a CAM setup specifies (process-method source)

A CAM operation's coolant strategy (flood / MQL / through-tool / dry) is confirmed from
[Cutting fluid (Wikipedia)](https://en.wikipedia.org/wiki/Cutting_fluid):

- **Three functions.** *Cooling* — "metal cutting generates heat due to friction and energy lost deforming the
  material"; *lubrication* — fluid aids cutting "by lubricating the interface between the tool's cutting edge and
  the chip"; *chip management* — it helps "prevent the chips from being welded onto the tool." *(Function list.)*
- **Types.** Liquids (mineral / semi-synthetic / synthetic), pastes/gels (for hand drilling and tapping),
  aerosols/mists (including **MQL**, minimum-quantity lubrication), gases (CO₂, liquid nitrogen, compressed air),
  and specialty **dielectric fluid** for EDM. *(Type taxonomy.)*
- **Application methods.** *Flood cooling*, *through-tool* delivery ("plumbed to deliver coolant through passages
  inside the spindle and through the tool"), *MQL* (precisely targeted aerosol), *cryogenic* (pressurized liquid),
  and *dry machining* (no fluid). These are the coolant modes a CAM/post setup selects per operation. *(Method list.)*

## CNC control + the CAD→CAM→CNC chain (numerical-control theory source)

The toolpath CAM emits is realized by the controller; the chain and the interpolation primitives are confirmed
from [Numerical control (Wikipedia)](https://en.wikipedia.org/wiki/Numerical_control):

- **CAD→CAM→post→machine workflow.** "The part's mechanical dimensions are defined using CAD software," then
  "translated into manufacturing directives by CAM software," then a **post-processor** transforms those directives
  "into the specific commands necessary for a particular machine to produce the component." This is exactly the
  post-processing boundary the CAM galaxy owns and STEP-NC (pass-1) aims to eliminate. *(Workflow framing.)*
- **Coordinate basis.** "The G & M code positions are all based on a three-dimensional Cartesian coordinate
  system." *(Method framing.)*
- **Interpolation primitives.** Motion is built from `G01` *linear interpolation*, `G02` *circular interpolation
  clockwise* and its counter-clockwise variant — the primitives a CAM toolpath is fundamentally discretized into.
  *(Method/primitive list — code letters are standard syntax, not cutting constants.)*

## Machine guarding — the safety standard a CAM/shop pipeline must respect (OSHA 29 CFR 1910.212, gov standard)

The CAM galaxy is safety-critical; the governing US machine-guarding rule is confirmed from
[OSHA 1910.212 — General requirements for all machines](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.212):

- **Guarding is mandatory for the listed hazards.** "One or more methods of machine guarding shall be provided
  to protect the operator and other employees in the machine area from hazards such as those created by point of
  operation, ingoing nip points, rotating parts, flying chips and sparks." Milling machines and power saws are
  named among the equipment requiring guards. *(Standard requirement.)*
- **Point of operation (definition).** "Point of operation is the area on a machine where work is actually
  performed upon the material being processed," and "the point of operation of machines whose operation exposes an
  employee to injury, shall be guarded." *(Definition + requirement.)*
- **Guard must not itself be a hazard.** "Guards shall be affixed to the machine where possible … The guard shall
  be such that it does not offer an accident hazard in itself." *(Standard requirement — design constraint.)*

## Free college course index — additional open courseware lineage (NPTEL / IIT Roorkee)

To broaden the free-college-course lineage beyond MIT 2.810 (pass-1), the
[NPTEL course 112107144](https://nptel.ac.in/courses/112107144) page confirms a freely-available Indian open
courseware unit: **"Manufacturing Processes I, IIT Roorkee,"** taught by **Prof. H.S. Shan, Prof. S.R. Gupta, and
Dr. Pradeep Kumar**. *(Course-existence/lineage fact — the page returned the title, institution, and instructors;
its detailed syllabus PDF did not load in-page, so no topic-level claim is drawn from it beyond the course's
existence and authorship.)*

---

## Owner-gate (DEEPEN pass 2 — NOT promoted)

Consistent with both prior owner-gates, this pass left out (R12):

- **Every numeric cutting parameter** — all speeds/feeds/depths/SFM/IPR, friction *coefficients*, machinability
  *rating percentages*, and Taylor `n`/`C` values. Only definitions, mechanisms, relationship *directions*, and
  method structures were promoted; the numbers stay in `constants.ts`. A wrong number in this safety-critical
  galaxy breaks a tool or scraps a part.
- **NPTEL 112107144 syllabus details.** The course page's syllabus PDF did not render in-page, so no module/topic
  content was promoted — only the course title, institution, and instructors (which the fetch DID return).
- **NPTEL archive lecture PDF (LM-25.pdf, course 112105127).** Fetch returned HTTP 403 Forbidden; no claim drawn.
- **MIT OCW 2.008 / 2.810 lecture-notes index pages.** Both returned "Too many redirects" on this pass; pass-1's
  direct MIT 2.810 lecture PDF remains the cited MIT source — these index pages contributed no new claim.

## Sources (actually WebFetched and confirmed, 2026-06-09)

- [Machining Doctor — Chip Thinning: Calculators and Formulas](https://www.machiningdoctor.com/calculators/chip-thinning-calculator/)
- [Machining Doctor — Ball Nose Surface Finish: Calculators & Formulas](https://www.machiningdoctor.com/calculators/ball-nose-surface-finish/)
- [Harvey Performance — Intro to Trochoidal Milling](https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/)
- [Harvey Performance — Climb Milling vs. Conventional Milling](https://www.harveyperformance.com/in-the-loupe/conventional-vs-climb-milling/)
- [Autodesk Fusion CAM — Machine remaining stock (flat / rest machining)](https://help.autodesk.com/cloudhelp/ENU/Fusion-CAM/files/MFG-3D-FLAT-REST-MACHINING.htm)

### Added in DEEPEN pass (free college course + standards-body + gov, 2026-06-09)

- [MIT 2.810 Manufacturing Processes and Systems — "Subtractive Processes: Machining" lecture (T. Gutowski, PDF)](https://web.mit.edu/2.810/www/files/lectures/lec5-machining-2018.pdf) *(free college course)*
- [NIST — Smart Manufacturing Operations Planning and Control Program (STEP AP242 / QIF / MTConnect / digital thread)](https://www.nist.gov/programs-projects/smart-manufacturing-operations-planning-and-control-program) *(gov / standards)*
- [STEP-NC — ISO 14649 (ARM) + ISO 10303-238 / AP238 (AIM), vs ISO 6983 G-code (Wikipedia)](https://en.wikipedia.org/wiki/STEP-NC) *(standards)*
- [ASME Y14.5 — Geometric Dimensioning and Tolerancing standard (Wikipedia)](https://en.wikipedia.org/wiki/ASME_Y14.5) *(standards)*
- [Surface roughness — Ra/Rz structure, ISO 4287 / ASME B46.1, feed & nose-radius geometry (Wikipedia)](https://en.wikipedia.org/wiki/Surface_roughness) *(standards / metrology)*

### Added in DEEPEN pass 2 (free textbook + free college course + OSHA gov-standard + cutting-mechanics theory, 2026-06-10)

- [OpenStax — University Physics Vol. 1, §6.2 Friction (static/kinetic definitions, surface + adhesion mechanism, friction→heat)](https://openstax.org/books/university-physics-volume-1/pages/6-2-friction) *(free textbook)*
- [OSHA — 29 CFR 1910.212 General requirements for all machines (machine guarding, point of operation)](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.212) *(gov / safety standard)*
- [NPTEL course 112107144 — "Manufacturing Processes I," IIT Roorkee (Shan / Gupta / Kumar)](https://nptel.ac.in/courses/112107144) *(free college course)*
- [Built-up edge — formation mechanism, speed/material dependence, finish & tool-wear effect (Wikipedia)](https://en.wikipedia.org/wiki/Built-up_edge) *(cutting-mechanics theory)*
- [Machinability — definition, factors, four assessment methods (Wikipedia)](https://en.wikipedia.org/wiki/Machinability) *(cutting theory)*
- [Speeds and feeds — speed/feed definitions, speed↔tool-life direction, parameter interdependence (Wikipedia)](https://en.wikipedia.org/wiki/Speeds_and_feeds) *(cutting-parameter theory)*
- [Cutting fluid — three functions, type taxonomy, application methods incl. MQL/through-tool/cryogenic (Wikipedia)](https://en.wikipedia.org/wiki/Cutting_fluid) *(process method)*
- [Numerical control — CAD→CAM→post→machine workflow, Cartesian basis, G01/G02 interpolation primitives (Wikipedia)](https://en.wikipedia.org/wiki/Numerical_control) *(numerical-control theory)*

### Attempted but NOT confirmed (no claim promoted — listed per R12)

- NIST tsapps publication "The State of Integrated CAM/CNC Control Systems" (pub_id 928733) — fetch returned
  unreadable raw PDF stream bytes; no claim was drawn from it.
- NPTEL archive lecture PDF `LM-25.pdf` (course 112105127) — HTTP 403 Forbidden; no claim drawn.
- MIT OCW 2.008 and 2.810 lecture-notes index pages — "Too many redirects" on the 2026-06-10 pass; no new claim
  (pass-1's direct MIT 2.810 lecture PDF remains the cited MIT source).
