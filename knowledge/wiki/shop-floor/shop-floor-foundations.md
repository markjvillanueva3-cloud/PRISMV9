---
title: Shop-Floor Foundations — machine monitoring, live OEE, lean dispatch, andon, 5S, traceability
galaxy: shop-floor
owner_slot: shop-floor-owner
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); DEEPENED by shop-floor-owner workflow (2026-06-09); SECOND DEEPEN pass by shop-floor-owner workflow (2026-06-10)"
verification_method: institutional/standards/method facts WebFetch-confirmed against primary public sources. Original pass (sections 1-5) — Wikipedia MTConnect/OEE/Andon/5S, Lean Enterprise Institute Heijunka Box. First DEEPEN pass (sections 6-12) broadened into untapped source categories — free college courses (MIT OCW 2.854/2.852/16.660J), a free textbook (OpenStax Introduction to Business 2e), and government/standards reports (NIST Smart Manufacturing, NIST Baldrige, OSHA Ergonomics), plus ISA-95/MES standards context. Second DEEPEN pass (sections 13-17, 2026-06-10) added distinct NEW sources — MIT OCW 15.760A Operations Management (Sloan/Charles Fine), OpenStax Principles of Management 3.4/3.6 (management-history chapter), OSHA Control-of-Hazardous-Energy + Machine-Guarding, and Wikipedia Total Productive Maintenance. Numeric physics/control/cost specifics left owner-gated in _staging.
tags: [shop-floor, mtconnect, oee, lean, heijunka, andon, jidoka, 5s, traceability, isa-95, mes, tqm, six-sigma, ergonomics, smart-manufacturing, baldrige, mit-ocw, openstax, tpm, scientific-management, hawthorne, lockout-tagout, machine-guarding, osha]
---

# Shop-Floor Foundations

The domain-knowledge spine for the **shop-floor** galaxy: how PRISM should model live machine monitoring, OEE, lean dispatch/scheduling, andon signalling, 5S workplace organization, and traceability. Promoted from the deep-domain research packet (`knowledge/wiki/shop-floor/_staging/deep-domain-research-2026-06-09.md`) after papa-workflow WebFetch-confirmed the institutional/method facts below against their primary public sources. Every claim here was verified by an actual fetch of the cited page. **Numeric physics/control specifics, vendor adoption counts, and any value that should be shop-configurable stay owner-gated in `_staging/`** (see the "Owner-gate" section) for `shop-floor-owner` to confirm before any engine hardcodes them.

## 1. Machine monitoring — MTConnect

WebFetch-CONFIRMED against [Wikipedia "MTConnect"](https://en.wikipedia.org/wiki/MTConnect):
- **MTConnect is a read-only standard.** It "only defines the extraction (reading) of data from control devices, not the writing of data to a control device." *Design implication for PRISM:* any "shop-floor command/dispatch back to a machine" capability cannot ride on MTConnect alone -- it needs OPC UA or a vendor API.
- **It is built on open web technology:** XML data presented over HTTP as the underlying transport protocol.
- **It was established in 2008** -- Version 1.0 launched December 2008, first publicly demonstrated at IMTS Chicago in September 2008.
- **It provides a manufacturer-independent semantic vocabulary:** "a common vocabulary with standardized definitions for the meaning of data that machine tools generate," so machines from different builders report common values and context.

## 2. Live OEE -- Overall Equipment Effectiveness

WebFetch-CONFIRMED against [Wikipedia "Overall equipment effectiveness"](https://en.wikipedia.org/wiki/Overall_equipment_effectiveness):
- **OEE = Availability x Performance x Quality.** "An OEE of 100% means that only good parts are produced (100% quality), at the maximum speed (100% performance), and without interruption (100% availability)."
- **OEE decomposes into the "Six Big Losses":** Breakdowns and Waiting (availability), Minor Stops and Reduced Speed (performance), Scrap and Rework (quality).
- **TEEP = Loading rate x OEE** (Total Effective Equipment Performance measures against all calendar hours rather than only scheduled operating hours).
- **The "85% OEE = World Class" figure is explicitly contested.** The article states that "to assume that 85% OEE is a 'world Class' target value is in many cases incorrect." *Design implication for PRISM:* do not hardcode 85% as a universal target in any OEE engine -- make it shop-configurable.

## 3. Scheduling / dispatch -- lean leveling (Heijunka)

WebFetch-CONFIRMED against [Lean Enterprise Institute "Heijunka Box"](https://www.lean.org/lexicon-terms/heijunka-box/):
- **The heijunka box is "a tool used to level the mix and volume of production by distributing kanban within a facility at fixed intervals."**
- **Its grid structure is precise:** "Each horizontal row is for one type of product (one part number). Each vertical column represents identical time intervals for paced withdrawal of kanban." *Design implication for PRISM:* a dispatch board model should key rows on part number and columns on fixed time intervals (pitches), distributing work in small paced increments rather than releasing large batches.

## 4. Andon / Jidoka -- visual signals & stop-the-line

WebFetch-CONFIRMED against [Wikipedia "Andon (manufacturing)"](https://en.wikipedia.org/wiki/Andon_(manufacturing)):
- **Andon is one of the principal elements of the Jidoka quality-control method** "pioneered by Toyota as part of the Toyota Production System."
- **The alert is operator-activated:** "The alert can be activated manually by a worker using a pullcord or button"; workers have "the ability, and moreover the empowerment, to stop production when a defect is found."
- Stack lights are among the most commonly used signalling forms; modern andon systems can include text, graphics, or audio elements. *Design implication for PRISM:* model the andon as an operator-triggered, problem-surfacing signal tied to a specific workstation, not a silent log.

## 5. 5S / lean workplace organization

WebFetch-CONFIRMED against [Wikipedia "5S (methodology)"](https://en.wikipedia.org/wiki/5S_(methodology)):
- **The five pillars are:** Seiri = Sort, Seiton = Set in order, Seiso = Shine, Seiketsu = Sustaining hygiene, Shitsuke = Sustain / self-discipline. (Note: Wikipedia translates Seiketsu literally as "Sustaining hygiene"; many secondary lean sources render it "Standardize" -- cite the literal sense.)
- **5S emerged in Japan and enabled JIT:** "5S was developed in Japan and has been identified as one of the techniques that enabled just-in-time manufacturing."
- **A 6S variant exists:** "In some organizations, 5S has become 6S, the sixth element being safety (safe)."

## 6. Smart manufacturing -- the NIST institutional definition

WebFetch-CONFIRMED against [NIST "Smart Manufacturing Operations Planning and Control Program"](https://www.nist.gov/programs-projects/smart-manufacturing-operations-planning-and-control-program):
- **NIST defines smart manufacturing as** "fully-integrated, collaborative manufacturing systems that respond in real time to meet changing demands and conditions in the factory, in the supply network, and in customer needs." *Design implication for PRISM:* a shop-floor galaxy that aspires to "smart manufacturing" must close the loop in real time across the factory AND the supply network AND customer demand -- machine telemetry alone is not "smart."
- **NIST frames the goal around five measurement-science needs:** wireless performance/security standards, extending "the digital thread of product and process information from design to realization, quality assurance and maintenance," characterizing manufacturing-process complexity for health monitoring, cybersecurity guidelines/methods/metrics, and efficient integration of "smart manufacturing systems models and engineering analysis models."
- **The "digital thread" is a NIST-named primitive** -- product and process information carried continuously "from design to realization, quality assurance and maintenance." *Design implication:* traceability/genealogy in PRISM should be modeled as one continuous thread spanning design through maintenance, not a per-stage silo.
- The program concluded in 2018, with related research continuing under the NIST Model-Based Enterprise Program. *(Currency note: cite the definition, not the program as "active.")*

## 7. ISA-95 / IEC 62264 -- the enterprise-to-control integration hierarchy

WebFetch-CONFIRMED against [Wikipedia "ANSI/ISA-95"](https://en.wikipedia.org/wiki/ANSI/ISA-95) and [Wikipedia "Manufacturing execution system"](https://en.wikipedia.org/wiki/Manufacturing_execution_system):
- **ANSI/ISA-95 is** "an international standard from the International Society of Automation for developing an automated interface between enterprise and control systems." Its stated objectives are "consistent terminology," "consistent information models," and "consistent operations models." *This closes one owner-gated item: the ISA-95 framework IS the standard layer between ERP and shop-floor control.*
- **The standard centers on Level 3** -- "the functions and activities at level 3 (Production / MES layer)." It defines "which tasks can be executed by which function and what information must be exchanged between applications."
- **MES sits at Level 3**, "positioned between enterprise resource planning (ERP) at Level 4 and process control systems at Levels 0, 1, and 2." *Design implication for PRISM:* the shop-floor galaxy operates at ISA-95 Level 3 -- it consumes Level-4 (ERP) orders and Level-0/1/2 (machine/control) telemetry, and is the layer that reconciles the two.
- **The 2005 standard divided Level-3 activities into four operations:** production, quality, logistics, and maintenance. *Design implication:* a complete Level-3 model needs all four operation types, not just production tracking.
- **The MESA-defined "11 MES functions"** were merged with the Purdue Reference Model in the 2000 ANSI/ISA-95 standard to establish the Level-3 hierarchy. *(This partially confirms the previously owner-gated MESA/Purdue lineage; the specific 11-function list still needs the primary MESA source.)*

## 8. Manufacturing Execution Systems (MES) -- track, trace & genealogy

WebFetch-CONFIRMED against [Wikipedia "Manufacturing execution system"](https://en.wikipedia.org/wiki/Manufacturing_execution_system):
- **MES are** "computerized systems used in manufacturing to track and document the transformation of raw materials to finished goods." *This grounds the previously owner-gated "traceability/genealogy" claim in a primary-class definition.*
- **MES functions span** product-definition/version control, resource scheduling and dispatching, production-order execution monitoring, **"as-built" record creation** capturing data/processes/outcomes, **production track-and-trace for lot-history documentation**, and OEE/performance analysis. *Design implication for PRISM:* OEE (section 2) is itself an MES function, and "as-built" + lot-history are the concrete shapes of shop-floor genealogy.
- *Design implication:* PRISM's dispatch board (section 3) and OEE surface (section 2) are both MES Level-3 functions -- they should share one Level-3 data model rather than living as disconnected features.

## 9. Quality management theory -- TQM, Deming, Six Sigma, ISO 9000

WebFetch-CONFIRMED against [OpenStax "Introduction to Business 2e", 10.6 Improving Production and Operations](https://openstax.org/books/introduction-business-2e/pages/10-6-looking-for-a-better-way-improving-production-and-operations):
- **Quality control (textbook definition)** "involves creating quality standards, producing goods that meet them, and measuring finished goods and services against them." *Design implication for PRISM:* a quality surface needs all three -- a standard, conforming production, and a measurement step against the standard.
- **Total Quality Management (TQM)** "emphasizes the use of quality principles in all aspects of a company's production and operations" and focuses on "continuous improvement, a commitment to constantly seek better ways of doing things in order to achieve greater efficiency and improve quality." **W. Edwards Deming** was the first to advocate that quality control should be company-wide, requiring top management to foster a culture dedicated to producing quality.
- **Six Sigma** aims for "no more than 3.4 defects per million" and uses the **DMAIC** process (Define, Measure, Analyze, Improve, Control). *Design implication:* the 3.4-DPMO figure is the textbook target definition of Six Sigma -- but treat the actual control limits a given shop adopts as owner-configurable, not the literal 3.4.
- **Lean manufacturing** "streamlines production by eliminating steps in the production process that do not add benefits customers want," and **Just-in-Time (JIT)** means materials arrive "exactly when they are needed for production, rather than being stored on-site." *(This corroborates section 5's 5S->JIT link from a second independent source.)*
- ISO 9000 (introduced in the 1980s) is the quality-procedure conformance standard; per this 2e edition, "over 1.4 million organizations worldwide have met ISO 9000 standards as of 2024." ISO 14000 addresses environmental concerns. *(Treat the 1.4M adoption count as a dated textbook figure, not a control value.)*

## 10. Worker safety & ergonomics -- the OSHA framework

WebFetch-CONFIRMED against [OSHA "Ergonomics"](https://www.osha.gov/ergonomics):
- **OSHA defines ergonomics as** "fitting a job to a person," which "helps lessen muscle fatigue, increases productivity and reduces the number and severity of work-related MSDs" (musculoskeletal disorders).
- **MSDs** "affect the muscles, nerves, blood vessels, ligaments and tendons" -- examples include carpal tunnel syndrome, tendinitis, rotator cuff injuries, and low back injuries. Exposure comes from "lifting heavy items, bending, reaching overhead, pushing and pulling heavy loads, working in awkward body postures and performing the same or similar tasks repetitively."
- **OSHA asserts "Work-related MSDs can be prevented"** and outlines a seven-element process: provide management support, involve workers directly, provide training, identify problems proactively, encourage early symptom reporting, implement control solutions, and evaluate progress continuously. *Design implication for PRISM:* a shop-floor galaxy that models workstation tasks can surface ergonomic-risk flags (repetitive/awkward-posture/heavy-lift task patterns) as a first-class safety signal alongside andon (section 4) -- worker safety is a process metric, not just machine uptime.

## 11. Production-systems theory -- the MIT OCW curriculum spine

WebFetch-CONFIRMED against three free MIT OpenCourseWare graduate courses (lecture-note topic lists fetched verbatim):
- **MIT 2.854 "Introduction to Manufacturing Systems"** (Dr. Stanley Gershwin) -- the canonical topic spine for a manufacturing-systems engine is: Manufacturing Systems Overview, Probability, Queueing Systems, Inventory, Optimization, Single-Part-Type Systems, Single-Part-Type Multiple-Stage Systems, Material Requirements Planning (MRP), Multi-Stage Control and Scheduling, Simulation, the Toyota Production System, and Quality/Quantity Interactions. ([course page](https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/pages/lecture-notes/)) *Design implication for PRISM:* dispatch/scheduling (section 3) and OEE (section 2) are downstream of queueing + inventory + MRP theory -- a rigorous shop-floor model treats them as a stochastic flow system, not ad-hoc heuristics.
- **MIT 2.852 "Manufacturing Systems Analysis"** (Dr. Stanley Gershwin) -- the deeper analytical layer: Markov chains and processes, the M/M/1 queue, **transfer lines (models and bounds)**, two-machine lines, "deterministic" lines, long-line optimization, assembly/disassembly systems, **"Efficient Buffer Design Algorithms for Production Line Profit Maximization,"** quality/quantity models, and real-time control of manufacturing systems. ([course page](https://ocw.mit.edu/courses/2-852-manufacturing-systems-analysis-spring-2010/pages/lecture-notes/)) *Design implication:* line throughput depends on buffer sizing between machines -- a multi-machine cell model in PRISM should expose buffer/WIP between stations, because that (not just per-machine speed) determines line output.
- **MIT 16.660J "Introduction to Lean Six Sigma Methods"** (Murman, McManus, Weigel, Madsen) -- covers "fundamental principles, practices and tools of Lean Six Sigma methods that underlay modern organizational productivity approaches," applied in "aerospace, automotive, health care, and other sectors." ([course page](https://ocw.mit.edu/courses/16-660j-introduction-to-lean-six-sigma-methods-january-iap-2012/)) *This corroborates the cross-sector generality of the lean/Six-Sigma methods in sections 5 and 9 from an academic source.*

## 12. Organizational performance excellence -- the NIST Baldrige framework

WebFetch-CONFIRMED against [NIST "About Baldrige"](https://www.nist.gov/baldrige/how-baldrige-works/about-baldrige):
- **The Baldrige Performance Excellence Program** is "the nation's public-private partnership dedicated to improving the performance, resilience, and long-term success of U.S. businesses and other organizations."
- **It serves six sectors:** Manufacturing, Service, Small Business, Education, Health Care, and Nonprofit/Government -- and recognizes role models via the Malcolm Baldrige National Quality Award, "the only Presidential Award for organizational resilience and long-term success." *Design implication for PRISM:* the manufacturing sector is one explicit Baldrige sector; a shop-floor maturity/scorecard model can lean on the Baldrige "assessment tools, frameworks, and award criteria centered on long-term organizational success" rather than inventing an ad-hoc maturity scale.

## 13. Operations-management curriculum spine -- MIT OCW 15.760A (Sloan)

WebFetch-CONFIRMED against [MIT OCW 15.760A "Operations Management" (Spring 2002), Lecture Notes](https://ocw.mit.edu/courses/15-760a-operations-management-spring-2002/pages/lecture-notes/) (Prof. Charles H. Fine, MIT Sloan School of Management). This is a business-school (vs. the section-11/12 engineering-school) treatment, so it frames the shop floor inside the firm's operations strategy, not only its physics:
- **The course's verbatim lecture spine is:** "Introduction Operations Overview," "Project Management / New Product Development and 3-DCE," "Operations Strategy / Operations Analysis," "Inventory Management," "Process Technology," "Process Technology / ERP Systems," "Process Analysis / Process Flow Models," "Process Quality," "Process Analysis / Queueing Systems," "Process Quality / Quality Tools and Philosophies," "TQM / Process Capability," "Toyota Production System," "Process Quality / Management of Constraints," "Supply Chain Design," "Supply Chain Management / Postponement," and "Supply Chain Management / Vendor-managed Inventory."
- *Design implication for PRISM:* the shop-floor galaxy's OEE/dispatch/quality surfaces are three lectures of a wider arc that also includes **operations strategy, process technology/ERP, queueing, management of constraints, and supply-chain postponement/VMI**. A "world-leader" shop-floor model should expose hooks to that upstream (strategy, ERP at ISA-95 Level 4 from section 7) and downstream (supply-chain) context rather than treating the cell as a closed system. ("Management of Constraints" is the Theory-of-Constraints lecture -- it independently corroborates section 11's buffer/bottleneck emphasis from a business-school source.)

## 14. The classical roots of shop-floor work measurement -- scientific management & motion study

WebFetch-CONFIRMED against [OpenStax "Principles of Management", 3.4 Taylor-Made Management](https://openstax.org/books/principles-management/pages/3-4-taylor-made-management) (a free college textbook; the management-history chapter not used in the section-9 Intro-to-Business fetch):
- **Frederick Winslow Taylor (1856-1915) "is known as the father of scientific management."** His **four principles** are (verbatim): "(1) A manager should develop a rule of science for each aspect of a job. (2) Scientifically select and train each worker. (3) Management and the workforce should work together to ensure that work is performed according to the principles of management. (4) Work and responsibility should be equally divided between management and workers."
- **Time study (the root of the modern cycle-time / standard-time concept):** "Using a stopwatch to time the workers' actions, Taylor determined the most effective and efficient way to accomplish a given task." **"Soldiering"** is defined as "a deliberate reduction of productivity on the part of the worker." *Design implication for PRISM:* the "standard time / standard rate" that every OEE-Performance ratio (section 2) and takt calc is measured against descends directly from Taylor's time study -- a shop-floor model should treat the standard as a *measured, revisable* quantity (owner-configurable), exactly as Taylor framed it, not a fixed constant.
- **The Gantt chart** "tracked what was supposed to be done versus what was actually done" -- the planned-vs-actual scheduling primitive behind any dispatch board (section 3). **Frank and Lillian Gilbreth added motion study** -- "motion studies, in which he would film various motions while someone worked on the job" -- the ancestor of modern work-element / ergonomic-motion analysis (section 10).

## 15. The human factor on the shop floor -- the Hawthorne studies & human-relations theory

WebFetch-CONFIRMED against [OpenStax "Principles of Management", 3.6 Human Relations Movement](https://openstax.org/books/principles-management/pages/3-6-human-relations-movement):
- **The Hawthorne studies** are "the most influential, misunderstood, and criticized research experiment in all of the social sciences." **Elton Mayo (1880-1949)** "researched, theorized, and developed human relations theory" from experiments at Western Electric's Hawthorne plant.
- **The human-relations movement** "was a natural response to some of the issues related to scientific management and the under-socialized view of the worker." Its central insight, verbatim: "The major difference between scientific management and human relations theory was that human relations theory recognized that social factors were a source of power in the workplace" -- it "acknowledged that peoples' attitudes, perceptions, and desires play a role in their workplace performance," whereas scientific management "tended to downplay the effects of social pressures on human interactions." *Design implication for PRISM:* an andon/empowerment model (section 4 -- worker-activated stop-the-line) is the operational descendant of human-relations theory. A shop-floor galaxy that only models machine telemetry inherits scientific management's "under-socialized" blind spot; operator-surfaced signals (andon, early-symptom reporting from section 10) are first-class data, not noise.

## 16. Equipment-reliability discipline -- Total Productive Maintenance (TPM)

WebFetch-CONFIRMED against [Wikipedia "Total productive maintenance"](https://en.wikipedia.org/wiki/Total_productive_maintenance):
- **TPM "started as a method of physical asset management, focused on maintaining and improving manufacturing machinery in order to reduce the operating cost to an organization."**
- **TPM's objective is stated directly in terms of OEE (section 2):** "The main objective of TPM is to increase the overall equipment effectiveness (OEE) of plant equipment. TPM addresses the causes for accelerated deterioration and production losses while creating the correct environment between operators and equipment to create ownership." *Design implication for PRISM:* OEE is not just a scoreboard -- it is the optimization target of a maintenance program. The "Availability" loss in section 2's Six Big Losses is the surface a TPM model attacks; an OEE engine should be able to attribute availability loss to breakdown vs. planned-maintenance causes so TPM action is possible.
- **The eight pillars of TPM** (verbatim): "1. Autonomous maintenance 2. Focused improvement 3. Planned maintenance 4. Quality maintenance 5. Early/equipment management 6. Education and training 7. Administrative & office TPM 8. Safety health environmental conditions." **Autonomous maintenance** is operator-led -- "operators who use all of their senses to help identify causes for losses." *Design implication:* autonomous maintenance ties the maintenance model back to the operator-empowerment thread (sections 4 and 15) -- the operator, not only a separate maintenance crew, is a sensor and first responder for equipment health.

## 17. Worker safety on the shop floor -- two more OSHA control standards

WebFetch-CONFIRMED against two OSHA safety topic pages not used in the section-10 ergonomics fetch:
- **Control of hazardous energy (lockout/tagout)** -- [OSHA, "Control of Hazardous Energy"](https://www.osha.gov/control-hazardous-energy): hazardous energy includes "electrical, mechanical, hydraulic, pneumatic, chemical, thermal, or other sources in machines and equipment." OSHA's standard **29 CFR 1910.147** "outlines specific action and procedures for addressing and controlling hazardous energy during servicing and maintenance of machines and equipment," because "workers servicing or maintaining machines or equipment may be seriously injured or killed if hazardous energy is not properly controlled." Employers "are also required to train each worker" on the energy-control procedures, including the "prohibition against attempting to restart or reenergize machines or other equipment that are locked or tagged out." *Design implication for PRISM:* any "machine state" model must represent a **locked-out / under-maintenance** state that is distinct from "down/breakdown" -- a machine in LOTO is intentionally de-energized and must never be auto-dispatched or counted as an availability loss to be "recovered."
- **Machine guarding** -- [OSHA, "Machine Guarding"](https://www.osha.gov/machine-guarding): "Moving machine parts have the potential to cause severe workplace injuries, such as crushed fingers or hands, amputations, burns, or blindness." The rule, verbatim: "Any machine part, function, or process that may cause injury must be safeguarded," and "when the operation of a machine or accidental contact injure the operator or others in the vicinity, the hazards must be eliminated or controlled." *Design implication:* a shop-floor safety surface should treat guarding status as a precondition gate alongside LOTO and ergonomics (section 10) -- machine safety is a process metric on equal footing with uptime.

## Owner-gate (NOT promoted -- left UNVERIFIED in _staging for shop-floor-owner)

The following remain in `_staging/deep-domain-research-2026-06-09.md` and were NOT promoted, because they are either numeric values that should be shop-configurable, vendor marketing figures, or claims this verification pass did not confirm against a fetched primary source:

- **MTConnect device `uuid` requirement** (packet claim 5) -- the Wikipedia fetch confirmed the manufacturer-independent vocabulary but did NOT surface the "each Device MUST carry a unique uuid" rule; that must be confirmed against the primary MTConnect Part 2.0 Devices Information Model spec before relying on it.
- **MTConnect endpoint list** `/probe` `/current` `/sample` `/assets` `/asset` and XPATH support (packet claim 4) -- not fetched this pass; verify against the primary spec at docs.mtconnect.org before coding a client.
- **"ANSI/MTC1.4-2018, 250,000+ devices in 50+ countries"** (packet claim 6) -- a vendor/institute marketing figure; treat as approximate, not promoted.
- **OEE worked-example numbers** (390/480 = 81.25% availability, (242 x 1.5)/390 = 93.1% performance, (242-21)/242 = 91.32% quality; packet claim 7) -- the formulas are confirmed but the specific example numbers are illustrative; do not hardcode any of these as control limits or targets.
- **ISO 22400 "34 KPIs", Part 1/Part 2 split, IEC 62264 Level-3/MOM placement** (packet claims 11-12) -- standards-content claims sourced from secondary blogs (connect981.com) + NIST; not fetched against iso.org/the primary standard this pass; owner-gate until confirmed (and the noted ISO/DIS 22400-2 replacement currency check).
- **Takt-time / pitch formulas, "every 20 minutes" withdrawal cadence, heijunka-after-5S prerequisite** (packet claims 13, 15, 20) -- the heijunka-box structure is confirmed; the specific cadence number and the takt/pitch algebra are illustrative/secondary-sourced and stay owner-gated.
- **Andon "two pulls / help-request vs line-stop", color-coded overhead signboard textual detail, "two pillars of TPS" framing** (packet claims 16-18) -- the Wikipedia fetch confirmed Andon-as-Jidoka-element and operator pullcord/button empowerment, but did NOT textually confirm the two-pull model, the overhead-signboard color description, or the explicit "two pillars (Jidoka + JIT)" wording; those stay owner-gated pending the Toyota UK / Ohno primary sources.
- **Traceability / genealogy / ISA-95 Level-3 MES claims** (packet claims 21-22) -- sourced from secondary blogs (connect981.com, symestic.com, eazyworks.com); the ISA-95/IEC-62264 framework is real but the specific parent-child/sibling genealogy and B2MML+OPC-UA integration details were not fetched this pass; owner-gate against the live ISA-95 object definitions.

No cutting/physics constants exist in this packet (shop-floor is a monitoring/process galaxy, not a physics galaxy), so there were no speed/feed/force constants to gate -- only process-metric numbers and vendor figures, all left UNVERIFIED above.

## Sources (URLs actually WebFetched + confirmed this pass)
- [Wikipedia, "MTConnect"](https://en.wikipedia.org/wiki/MTConnect)
- [Wikipedia, "Overall equipment effectiveness"](https://en.wikipedia.org/wiki/Overall_equipment_effectiveness)
- [Wikipedia, "Andon (manufacturing)"](https://en.wikipedia.org/wiki/Andon_(manufacturing))
- [Wikipedia, "5S (methodology)"](https://en.wikipedia.org/wiki/5S_(methodology))
- [Lean Enterprise Institute, "Heijunka Box"](https://www.lean.org/lexicon-terms/heijunka-box/)

### Sources added 2026-06-09 (DEEPEN pass -- untapped categories: free college courses, free textbooks, gov reports)
Free college courses (MIT OpenCourseWare):
- [MIT OCW 2.854 "Introduction to Manufacturing Systems" (Gershwin), Lecture Notes](https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/pages/lecture-notes/)
- [MIT OCW 2.852 "Manufacturing Systems Analysis" (Gershwin), Lecture Notes](https://ocw.mit.edu/courses/2-852-manufacturing-systems-analysis-spring-2010/pages/lecture-notes/)
- [MIT OCW 16.660J "Introduction to Lean Six Sigma Methods" (Murman/McManus/Weigel/Madsen)](https://ocw.mit.edu/courses/16-660j-introduction-to-lean-six-sigma-methods-january-iap-2012/)

Free textbook (OpenStax):
- [OpenStax, "Introduction to Business 2e", 10.6 Improving Production and Operations](https://openstax.org/books/introduction-business-2e/pages/10-6-looking-for-a-better-way-improving-production-and-operations)

Government / standards-body reports:
- [NIST, "Smart Manufacturing Operations Planning and Control Program"](https://www.nist.gov/programs-projects/smart-manufacturing-operations-planning-and-control-program)
- [NIST Baldrige Performance Excellence Program, "About Baldrige"](https://www.nist.gov/baldrige/how-baldrige-works/about-baldrige)
- [OSHA, "Ergonomics"](https://www.osha.gov/ergonomics)

Standards-context (ISA-95 / MES):
- [Wikipedia, "ANSI/ISA-95"](https://en.wikipedia.org/wiki/ANSI/ISA-95)
- [Wikipedia, "Manufacturing execution system"](https://en.wikipedia.org/wiki/Manufacturing_execution_system)

### Sources added 2026-06-10 (SECOND DEEPEN pass -- sections 13-17, distinct URLs not cited above)
Free college course (MIT OpenCourseWare, Sloan business-school treatment):
- [MIT OCW 15.760A "Operations Management" (Charles H. Fine, Spring 2002), Lecture Notes](https://ocw.mit.edu/courses/15-760a-operations-management-spring-2002/pages/lecture-notes/)

Free textbook (OpenStax "Principles of Management" -- management-history chapter, distinct from the section-9 "Introduction to Business 2e" chapter):
- [OpenStax, "Principles of Management", 3.4 Taylor-Made Management](https://openstax.org/books/principles-management/pages/3-4-taylor-made-management)
- [OpenStax, "Principles of Management", 3.6 Human Relations Movement](https://openstax.org/books/principles-management/pages/3-6-human-relations-movement)

Government / standards-body safety reports (OSHA -- two topic pages distinct from the section-10 Ergonomics page):
- [OSHA, "Control of Hazardous Energy" (lockout/tagout, 29 CFR 1910.147)](https://www.osha.gov/control-hazardous-energy)
- [OSHA, "Machine Guarding"](https://www.osha.gov/machine-guarding)

Reliability/maintenance context:
- [Wikipedia, "Total productive maintenance"](https://en.wikipedia.org/wiki/Total_productive_maintenance)

NOTE on attempted-but-not-added sources (R12 honesty): NPTEL course pages (nptel.ac.in `noc25_me59`, `110107141`, `112107143`) render their syllabus client-side (JS) and returned only a loading state to WebFetch; the NPTEL syllabus PDF (`archive.nptel.ac.in/content/syllabus_pdf/112107238.pdf`) returned HTTP 403 on two attempts. Several NIST MEP / DOE-IAC / NIST-OEE-blog URLs returned 404. These were left OUT rather than cited unverified.

## Cross-refs
- Galaxy brain: `mcp-server/src/engines/shop-floor/MEMORY.md`
- Staged packet (owner-gated remainder): `knowledge/wiki/shop-floor/_staging/deep-domain-research-2026-06-09.md`
- Free-source corpus: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (shop-floor section)
