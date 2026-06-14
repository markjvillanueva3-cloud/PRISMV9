---
title: Post-Processor Foundations — CNC G-code standards, work offsets, canned-cycle structure, Fanuc high-speed look-ahead
galaxy: post-processor
owner_slot: echo
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); DEEPEN pass (claude, 2026-06-09); SECOND DEEPEN pass (claude, 2026-06-10)"
verification_method: institutional/standards-lineage + method/structure facts WebFetch-confirmed against primary/reference sources (Wikipedia G-code + ISO 14649, LinuxCNC docs, Fanuc-AI reference article, and 3 NIST gov reports — RS274NGC Interpreter v3 / NISTIR 6556 + STEP-NC interoperability roadmap); ALL numeric cutting constants + controller-specific numeric defaults left owner-gated in _staging (PRISM sources physics numbers ONLY from src/physics/constants.ts, never the web)
tags: [post-processor, g-code, iso-6983, rs-274, rs274ngc, nistir-6556, step-nc, iso-14649, ap238, work-offsets, canned-cycles, fanuc-aicc, look-ahead, modal-groups, controller-dialect]
---

# Post-Processor Foundations

The domain-knowledge spine for the **post-processor** galaxy: the standards lineage and the
method/structure of the G/M-code constructs a CNC post must emit correctly per controller dialect.
Promoted from the deep-domain research packet
(`knowledge/wiki/post-processor/_staging/deep-domain-research-2026-06-09.md`) after papa WebFetch-confirmed
the institutional and method-structure facts against their cited sources.

**Safety discipline (this is a safety-critical galaxy):** only standards lineage, formula/cycle
**structure**, process **method** descriptions, and vendor/standards **pointers** are promoted here.
**No numeric cutting constant** (kc1.1, specific cutting force, Taylor C/n, material constants, specific
speeds/feeds, IPM/SFM) and **no controller-specific numeric default** (Haas Setting 22/85/191 values,
Fanuc parameter 5210/5212/1422 values, retract distances, look-ahead block counts) is promoted — those
stay **owner-gated** in `_staging/` for echo, because PRISM sources physics numbers **only** from
`mcp-server/src/physics/constants.ts` and controller numerics from the **specific machine's manual**,
never the web. See `## Owner-gate (NOT promoted)`.

## 1. The standard: ISO 6983 / RS-274 lineage

**CONFIRMED** against [Wikipedia: G-code](https://en.wikipedia.org/wiki/G-code):
- G-code is **standardized today in ISO 6983-1** and is **also called RS-274** (the EIA US lineage) —
  "G-code ... also called RS-274, standardized today in ISO 6983-1 ... is the most widely used CNC ...
  programming language."

**Method implication for the post:** ISO 6983 standardizes the *format*, but each builder implements its
own dialect/extensions, which is exactly why CAM must run a **controller-specific post-processor** to
translate a generic toolpath into the format the target control accepts. (The modal word-address syntax
detail, the full G/M function families, and the STEP-NC/ISO-14649 successor framing were drafted in the
packet but were **NOT confirmed** by the Wikipedia page fetched — left gated below, not promoted.)

## 2. Work coordinate systems (G54-G59.3) — structure + addressing

**CONFIRMED** against [LinuxCNC: Coordinate Systems](https://linuxcnc.org/docs/html/gcode/coordinates.html):
- There are **nine work coordinate systems**: **G54-G59 (systems 1-6)** plus **G59.1 / G59.2 / G59.3
  (systems 7-9)**.
- **G53 is a non-modal command** that moves to the **machine absolute (homed) position**, ignoring the
  active work offset — used for safe-Z / tool-change moves.
- Offsets can be set programmatically with **`G10 L2 P<n>`** (P1 = G54 ... P9 = G59.3).
- **G92 is a global offset** that shifts **all** workpiece coordinate systems G54-G59.3; **G52 is a local
  offset applied after the workpiece offset (including its rotation).**

**Method implication for the post:** these are the work-offset constructs a post must address correctly;
a post that emits a stale offset or confuses G53 (machine) with the part offset is a collision-class
defect.

## 3. Drilling / boring / tapping canned-cycle STRUCTURE (G81-G89, G98/G99, G80)

**CONFIRMED** against [LinuxCNC: Mill Canned Cycles](http://linuxcnc.org/docs/2.4/html/gcode_mill_canned.html):
- **G81** — basic drilling: feed Z to depth at feed rate, then **rapid (traverse) retract**.
- **G82** — drilling with a **dwell** at the bottom before the rapid retract.
- **G83** — **peck drilling**: feed down by the **Q increment**, **retract to clear Z**, repeat until the
  Z depth is reached (full-retract pecking to clear chips). Q is "delta increment along the Z-axis."
- **G98** retracts to the **Z position prior to the cycle** (initial level, when higher than R);
  **G99** retracts to the **R value** between holes.
- **G80** turns off all canned-cycle motion (cancel).
- **G84** is intended for **right-hand tapping**; **G85** is **boring/reaming** (feed-in and feed retract,
  no rapid retract for a clean wall); **G89** is boring with a **dwell** then a feed-rate retract.

**Method implication for the post:** these are the cycle *shapes* the post emits as `G8x X.. Y.. Z.. R..`
on ISO-dialect controls. (The G73 high-speed/in-hole-retract chip-break cycle is real and shop-standard
but was **NOT on the LinuxCNC page fetched** — left gated below; its Haas per-peck retract distance is a
controller numeric and stays gated regardless.)

## 4. Fanuc high-speed look-ahead (AI Contour Control, G05.1 Q1) — method

**CONFIRMED** against [FANUC AI High-Speed Modes Simplified (Tim Markoski)](https://www.linkedin.com/pulse/fanuc-ai-high-speed-modes-simplified-tim-markoski):
- The **"AI" in Fanuc AI Contour Control / AI Advanced Preview Control is the Alpha-I servo system, NOT
  "artificial intelligence."** ("AI represents FANUC's Alpha I Series Servo System.")
- **`G05.1 Q1 Rx` enables; `G05.1 Q0` cancels.**
- **Programming order matters:** `G05.1 Q1 Rx` should be engaged **BEFORE** `G43` (tool-length comp).
- AICC/AIAPC must be **turned on and off per tool**, and **does NOT apply to canned drilling cycles.**

**Method implication for the post:** a Fanuc HSM post must wrap the high-speed mode per tool, sequence it
ahead of `G43`, and suppress it around drilling cycles — getting the *ordering* wrong is the common
dialect bug. (The R1-R10 priority numbers, the ~40-block look-ahead count, and alarm numbers
5111/5112/5157 are controller numerics and stay gated below.)

## 5. Modal-group + order-of-execution structure (the parser model a post must honor)

**CONFIRMED** against [LinuxCNC: G-code Overview](https://linuxcnc.org/docs/html/gcode/overview.html):
- **Modal groups** organize commands — **only one member of a modal group may be in force at any given
  time**, and **two members of the same modal group may not appear on the same line.** Group 1 (motion)
  is always active — one member must be in effect.
- A line is **an optional line number followed by one or more words**; a **word is a letter followed by
  a number (or something that evaluates to a number).** Input is **case-insensitive except in comments**,
  and **spaces/tabs are allowed anywhere on a line.**
- **Order of execution is NOT the left-to-right position of items on the line** — it follows a fixed
  canonical sequence (feed-rate mode → feed rate → spindle speed → tool select → tool change → spindle
  control → coolant → overrides → dwell → plane select → **units (G20/G21)** → cutter compensation →
  coordinate-system select → path control → distance mode → retract mode → reference locations →
  **motion** → stops).
- **G20 = inch, G21 = mm**, and the docs warn explicitly: **"If you do not include G20 or G21, then
  different machines will mill the program at different scales."**

**Method implication for the post:** the post must emit a deterministic preamble that fixes the modal
state (units, plane, distance mode, feed mode) *before* the first motion, because the control executes
by canonical order, not line order — a post that relies on word position rather than modal-group state is
a silent-scale / wrong-plane defect. This is the UNITS-FIRST rule expressed at the controller layer
([[feedback_check_units_first]]).

## 6. The canonical-machining-functions interpreter model (NIST RS274NGC, NISTIR 6556)

**CONFIRMED** against [NIST: The NIST RS274NGC Interpreter — Version 3](https://www.nist.gov/publications/nist-rs274ngc-interpreter-version-3)
and the [NISTIR 6556 full text (tsapps.nist.gov PDF)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=823374):
- The interpreter **reads numerical control code and produces calls to a set of canonical machining
  functions** — written in **C++**, it can be used to **drive 3-axis to 6-axis machining centers.**
- Input is **RS274 code in the dialect defined by the Next Generation Controller (NGC) project, with
  modifications.**
- Historical lineage: **the most recent standard version of RS274 is RS274-D, completed in 1979**
  (EIA Standard **EIA-274-D**) — this is the EIA root of what ISO 6983 standardized.
- A **"word" is a letter (other than N) followed by a real value**, and **input is case-insensitive
  except in comments** (matching the LinuxCNC overview above — LinuxCNC/EMC descends directly from this
  NIST interpreter).

**Method implication for the post:** the "canonical machining functions" layer is the architecture PRISM's
post emitters mirror — a generic *intermediate* set of machining intents that a controller-specific
back-end renders into the target dialect. This is exactly why a post is controller-specific while the
upstream toolpath stays generic. (The NIST interpreter is gov-published reference code — its *structure*
is promotable here; any numeric defaults inside it remain machine-manual-gated.)

## 7. STEP-NC (ISO 14649 / AP238) — the standards successor to ISO 6983 G-code

**CONFIRMED** against [NIST: A Roadmap for STEP-NC Enabled Interoperable Manufacturing](https://www.nist.gov/publications/roadmap-step-nc-enabled-interoperable-manufacturing)
and [STEP-NC (ISO 14649) — Wikipedia](https://en.wikipedia.org/wiki/ISO_14649):
- **STEP-NC is the result of a ten-year international effort to replace the RS274D (ISO 6983) G and M
  code standard with a modern associative language** (NIST roadmap abstract, verbatim).
- It **connects CAD design data to CAM process data** so smart applications understand **both the design
  requirements for a part and the manufacturing solution**; it uses **modern geometric constructs to
  specify device-independent tool paths** and **CAM-independent volume-removal features** (NIST roadmap).
- Standardized form: STEP-NC **extends the ISO 10303 STEP standard with the machining model in ISO 14649**
  and is published as **ISO 10303-238 (AP238)** (Wikipedia).
- The G-code limitation it targets: traditional G-code input is **"often machine-specific and limited to
  axis motion commands. The machine tool is given little or no information about the desired result of the
  machining"** (Wikipedia) — corroborating the NIST interpreter's "little or no information about the
  desired result" framing in §6.
- STEP-NC's data model carries four categories: **product description** (geometry, manufacturing features,
  dimensions, tolerances), **general process description** (project / executable / operation / toolpath),
  **technology-specific process** (milling, turning, inspection operations), and the full **STEP geometric
  constructs** that make the toolpaths device-independent (Wikipedia).

**Method implication for the post:** STEP-NC is the trajectory away from the dialect-translation problem
this whole galaxy exists to solve — a feature-and-result-based program instead of axis-motion lines. PRISM
should track AP238 as the long-horizon target while the live post emitters stay on the ISO 6983 dialects
shops actually run today. (No numerics here — this is purely standards/architecture framing.)

## 8. Circular-interpolation arc physics — the centripetal identity a controller honors (free-textbook theory)

**CONFIRMED** against [OpenStax University Physics Vol. 1 — 4.4 Uniform Circular Motion](https://openstax.org/books/university-physics-volume-1/pages/4-4-uniform-circular-motion):
- A body moving on a circular path at **constant speed still accelerates**, because the **velocity
  vector is continuously changing direction** even though its magnitude is constant.
- That **centripetal ("center-seeking") acceleration points toward the center of the circle**, along the
  radius, and has the structure **`a_c = v² / r`** (a public physics identity — speed squared over radius).

**Method implication for the post:** this is the theory under a `G02`/`G03` arc move and under HSM
look-ahead corner control. On a programmed arc the control must continuously redirect the velocity vector,
so the *normal* (centripetal) acceleration demanded grows with the **square of feed speed** and **inversely
with arc radius** — which is *why* a post/controller must throttle feed on tight radii and why
look-ahead/AICC exists at all (§4). The structure `a_c = v²/r` is a general kinematic identity, **not** a
machining constant; the specific feed/radius/accel limits that turn it into a feedrate cap remain
controller-numeric and stay owner-gated. (Pairs with the modal arc words `G02/G03 + I,J,K` / `R` the post
emits.)

## 9. STEP-NC machining-vision: machine setup + kinematics + tolerances carried in the program (NIST gov report)

**CONFIRMED** against [NIST: Enabling Machining Vision Using STEP-NC](https://www.nist.gov/publications/enabling-machining-vision-using-step-nc):
- STEP-NC is **"a new data format for manufacturing control"** that lets a machine tool's models carry,
  beyond geometry: **the machine setup** (so the part configuration "can be identified and corrected"),
  **the machine kinematics** (so "the actions of a machine while adding or subtracting material can be
  verified"), and **the product tolerances** (so "the quality of the final part can be predicted and
  corrected during the machining").

**Method implication for the post:** this is the concrete payoff of the §7 STEP-NC trajectory — a program
that carries setup, kinematics, and tolerance intent enables **on-machine measurement and in-process
correction**, which a bare ISO 6983 axis-motion stream cannot. It frames the long-horizon PRISM target:
the post's output should eventually be associative/result-bearing, not just a list of moves. (Purely
standards/architecture framing — no numerics.)

## 10. Dimensional metrology + GD&T — the verification half of the post→part loop (NIST gov report)

**CONFIRMED** against [NIST Journal of Research — A Knowledge-Navigation System for Dimensional Metrology (Moncarz)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4859258/):
- **GD&T (geometric dimensioning and tolerancing) is "a method to specify the dimensions and form of a
  part so that it will meet its design intent"** — balancing tolerances **tight enough for function but
  loose enough for reasonable manufacturing cost.**
- **ASME Y14.5M-1994** is the standardized system that communicates GD&T information on a part drawing
  (with comparable ISO standards noted); it holds the rules for **how to specify each tolerance type and
  the proper symbology.**
- A dimensional-metrology knowledge base organizes around six concepts: **Part**, **Tolerance Entities**
  (features, datum reference frames, tolerance zones, GD&T symbology), **Inspection Process** (hierarchical
  task decomposition from cell down to servomechanism level), **Interfaces** (information exchange between
  inspection applications), **Inspection Device** (CMMs and related equipment), and **Machining Errors**
  (deviations from design specs caused by manufacturing anomalies).

**Method implication for the post:** the program a post emits is graded at inspection against the GD&T it
was supposed to satisfy — so the post's correctness ultimately means *the produced part is inside the
datum-referenced tolerance zones*, not merely "the code parsed." The **Machining Errors** concept is the
closed-loop signal back to the toolpath/post; the **datum reference frame** is the same coordinate-origin
discipline the post handles at G54-G59 (§2). (Standards/method framing — no numerics.)

## 11. Machine-data interoperability (MTConnect) + the parameter categories that drive toolpaths (NIST gov report)

**CONFIRMED** against [NIST: A virtual milling machine model to generate machine monitoring data from process plans (tsapps PDF)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=918858):
- **MTConnect is an open communication standard for manufacturing equipment** that enables **real-time
  data exchange between machine tools and manufacturing systems**, providing **interoperability across
  different platforms and vendors** (it is an XML-based representation of machine-monitoring data).
- The **categories of process parameters that drive tool-path strategies** are named as: **spindle speed,
  feed rate, cutting depth, tool geometry, and machine constraints** (categories only — the document is
  used here for the *category taxonomy*, not for any numeric value).

**Method implication for the post:** MTConnect is the *read-back* counterpart to the post's *write-out* —
the post emits the program; MTConnect standardizes the machine's live state coming back, closing the loop
for monitoring/verification. And the five parameter categories are exactly the inputs a post/CAM chain must
bind per operation; PRISM sources every one of their **numeric values** from `src/physics/constants.ts` or
the machine manual (never the web), so only the **category taxonomy** is promoted here. (No numerics.)

## 12. Machine-safeguarding framing — the safety envelope the program runs inside (OSHA gov)

**CONFIRMED** against [OSHA: Machine Guarding](https://www.osha.gov/machine-guarding):
- The governing requirement: **"any machine part, function, or process that may cause injury must be
  safeguarded"**, and hazards must be **eliminated or controlled** wherever an operation could cause injury.
- Moving machine components create hazards including **crushed fingers/hands, amputations, burns, or
  blindness** — the "various hazards of mechanical motion" as a general category requiring safeguards.

**Method implication for the post:** a CNC program drives a machine whose **mechanical motion is itself the
hazard** — this is the regulatory backdrop for why PRISM treats the post-processor as a **safety-critical**
galaxy and why controller numerics (retract clearances, rapid-plane heights, look-ahead corner limits) are
machine-manual-gated rather than web-sourced. A post that emits a wrong work offset or a missing
safe-Z (§2) is not just a scrap defect — it is a guarding/operator-safety event. (Qualitative safety
framing — no thresholds.)

## Owner-gate (NOT promoted — echo verifies before any live engine/doctrine use)

Everything below stays **UNVERIFIED in `_staging/`**, owner-gated for echo, and is **not** load-bearing
here. Two reasons: (a) it is a **numeric cutting/controller constant** that PRISM must source from
`mcp-server/src/physics/constants.ts` or the **exact machine's manual** (never the web); or (b) papa
**could not WebFetch-confirm it** from a reachable cited source this pass.

Numeric / controller-numeric (gated as **safety** — never promote from web):
- **All physics cutting constants** — kc1.1 / specific cutting force, Taylor C and n exponents, any
  material constant, any specific speed/feed/IPM/SFM. (PRISM canonical: `src/physics/constants.ts`.)
- **Haas** Setting 22 (G73 per-peck retract distance), Setting 85 (max corner rounding) and its G187 P1
  ×4 / P3 ÷4 interaction, Setting 191 default smoothness value, and the "~20% cycle-time" magnitude.
- **Fanuc** rigid-tap parameters 5210/5212/5200, the AICC R1-R10 priority mapping, the ~40-block
  look-ahead count, alarms 5111/5112/5157, and feedrate/accel params 1422/1432/1420/1770/1771.
- **The "deep hole > 5× diameter" rule of thumb** (numeric threshold — shop heuristic, gated).

Method/dialect facts drafted but **not WebFetch-confirmed this pass** (left for echo to confirm against
the cited source / live PRISM corpus before promotion):
- G-code modal word-address syntax detail, the full G/M preparatory/miscellaneous function families,
  and the STEP-NC (ISO 14649) successor framing (the fetched Wikipedia page confirmed only the
  ISO 6983 / RS-274 lineage, not these).
- **G73** high-speed/in-hole-retract chip-break cycle structure (not on the LinuxCNC page fetched).
- **Siemens 840D named-cycle dialect** (`CYCLE81(RTP, RFP, SDIS, DP, DPR)`, CYCLE832 HSC settings,
  G641/G642/COMPCAD smoothing) — the cited Siemens manuals (ManualsLib) and Siemens forums were not
  WebFetch-reachable this pass (403 / redirect). The dialect-divergence *thesis* (Siemens emits cycle
  *calls*, not Fanuc-style `G81 X.. Y.. Z.. R..` lines) is plausible and important but stays gated until
  confirmed against a reachable Siemens source.
- **Okuma OSP** tool-nose-radius-vs-cutter-radius comp nuance, **Fanuc M29** rigid-tap engagement
  semantics, and **G41/G42** cutter-comp lead-in/plane rules — drafted from community/vendor refs but not
  fetched this pass.

## Sources (URLs actually WebFetched and confirmed this pass)

- [G-code — Wikipedia](https://en.wikipedia.org/wiki/G-code) — confirmed the ISO 6983-1 / RS-274 standards lineage.
- [Coordinate Systems — LinuxCNC](https://linuxcnc.org/docs/html/gcode/coordinates.html) — confirmed G54-G59.3 nine systems, G53 non-modal machine-absolute, G10 L2 P<n>, G92 global / G52 local offsets.
- [Mill Canned Cycles — LinuxCNC](http://linuxcnc.org/docs/2.4/html/gcode_mill_canned.html) — confirmed G81/G82/G83 structure (Q peck), G98/G99 retract levels, G80 cancel, G84/G85/G89 cycle shapes.
- [FANUC AI High-Speed Modes Simplified (Tim Markoski) — LinkedIn](https://www.linkedin.com/pulse/fanuc-ai-high-speed-modes-simplified-tim-markoski) — confirmed Alpha-I (not artificial intelligence), G05.1 Q1 enable / Q0 cancel, engage-before-G43, per-tool, not-in-canned-cycles.

### Added 2026-06-09 (DEEPEN pass — gov-report + standards-encyclopedia + canonical-reference categories)

- [G-code Overview — LinuxCNC](https://linuxcnc.org/docs/html/gcode/overview.html) — confirmed modal-group "one member in force / not two on a line" rule, word/line structure, case-insensitivity, **order-of-execution by canonical sequence not line position**, and the G20/G21 explicit-units warning. (Canonical NIST-EMC-descendant reference.)
- [The NIST RS274NGC Interpreter — Version 3 (publication page) — NIST](https://www.nist.gov/publications/nist-rs274ngc-interpreter-version-3) — **gov report**; confirmed the interpreter reads NC code → calls canonical machining functions, is written in C++, accepts the NGC-dialect RS274 code, and drives 3-to-6-axis machining centers.
- [NISTIR 6556 — RS274NGC Interpreter Version 3 full text (tsapps.nist.gov PDF)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=823374) — **gov report (PDF)**; confirmed RS274-D / EIA-274-D completed 1979, the "word = letter (other than N) + real value" definition, case-insensitivity, and the canonical-machining-functions architecture + "little/no info about the desired result" framing.
- [A Roadmap for STEP-NC Enabled Interoperable Manufacturing — NIST](https://www.nist.gov/publications/roadmap-step-nc-enabled-interoperable-manufacturing) — **gov report**; confirmed STEP-NC = ten-year effort to replace RS274D/ISO 6983, connecting CAD design data to CAM process data with device-independent toolpaths + CAM-independent volume-removal features.
- [STEP-NC / ISO 14649 — Wikipedia](https://en.wikipedia.org/wiki/ISO_14649) — confirmed ISO 14649 + ISO 10303 STEP = ISO 10303-238 (AP238), the four data-model categories, and the "G-code is machine-specific / limited to axis motion / little info about the desired result" limitation framing.

### Added 2026-06-10 (SECOND DEEPEN pass — free-textbook + additional gov-report categories, none re-citing the above)

- [OpenStax University Physics Vol. 1 — 4.4 Uniform Circular Motion](https://openstax.org/books/university-physics-volume-1/pages/4-4-uniform-circular-motion) — **free textbook**; confirmed the centripetal-acceleration identity `a_c = v²/r`, its inward radial direction, and that constant-speed circular motion still accelerates (velocity vector continuously redirects). Theory under G02/G03 arc feedrate limiting and HSM corner control (§8).
- [NIST: Enabling Machining Vision Using STEP-NC](https://www.nist.gov/publications/enabling-machining-vision-using-step-nc) — **gov report**; confirmed STEP-NC carries machine setup + machine kinematics + product tolerances enabling on-machine identify/verify/predict-and-correct during machining (§9).
- [NIST Journal of Research — A Knowledge-Navigation System for Dimensional Metrology (Moncarz, PMC4859258)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4859258/) — **gov report**; confirmed GD&T definition ("specify dimensions and form so the part meets design intent"), the ASME Y14.5M-1994 standard + symbology role, and the six-concept inspection knowledge base incl. datum reference frames + machining-error classification (§10).
- [NIST: A virtual milling machine model to generate machine monitoring data from process plans (tsapps PDF, pub_id 918858)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=918858) — **gov report (PDF)**; confirmed MTConnect = open XML-based communication standard for real-time machine-tool data exchange / cross-vendor interoperability, and the toolpath-driving parameter *categories* (spindle speed, feed rate, cutting depth, tool geometry, machine constraints — taxonomy only, no numerics) (§11).
- [OSHA: Machine Guarding](https://www.osha.gov/machine-guarding) — **gov (OSHA)**; confirmed the "any machine part/function/process that may cause injury must be safeguarded" requirement and the mechanical-motion hazard categories — the safety-envelope framing for why post-processor controller numerics stay machine-manual-gated (§12).

> **NOTE (R12 honesty):** NPTEL CNC course pages (e.g. `archive.nptel.ac.in/courses/112/105/112105211/`) and several MIT OCW lecture pages (2.008 / 2.810 / 16.810 `l8.pdf`) appeared in search but were **NOT directly WebFetch-reachable this pass** (404 / too-many-redirects / PDF-rendered-as-binary). Per the only-add-what-I-confirmed rule, no claim from those was promoted — the free-college-course category remains under-tapped for this galaxy and is a target for a future pass with a reachable courseware URL.

## Cross-refs
- Galaxy brain: `mcp-server/src/engines/post-processor/MEMORY.md`
- Staged packet (owner-gated remainder): `knowledge/wiki/post-processor/_staging/deep-domain-research-2026-06-09.md`
- Galaxy doctrine: `mcp-server/src/engines/post-processor/CLAUDE.md`
- [[feedback_psn_definition]] · [[feedback_check_units_first]] (UNITS-FIRST: G20/G21 resolution is a post's job)
