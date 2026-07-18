---
status: VERIFIED-PARTIAL
owner_slot: shop-floor-owner
staged_by: papa-deepdomain-research
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
date: 2026-06-09
galaxy: shop-floor
focus: machine monitoring (MTConnect), live OEE, scheduling/dispatch, andon, 5S/lean, traceability
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/shop-floor/shop-floor-foundations.md; numeric/safety specifics below stay owner-gated for shop-floor-owner. -->**

This packet is DRAFT research staged for the shop-floor galaxy owner. Every factual/numeric claim below carries an inline citation. The owner must independently verify each claim against the cited source (and ideally the primary standard document) before promoting any of this into the live galaxy CLAUDE.md / MEMORY.md or any engine. Citations point to public, free, legal sources only.

---

## Machine Monitoring — MTConnect

1. **MTConnect is a read-only, one-directional standard.** It defines the extraction (reading) of data from control devices but does NOT define writing data back to a controller; the agent never sends instructions back to machines. This contrasts with OPC UA, which allows both reading and writing. (Source: Wikipedia "MTConnect" / Modern Machine Shop "Understanding MTConnect Agents and Adapters", via web search 2026-06-09.) — *Design implication for PRISM: any "shop-floor command/dispatch back to machine" capability cannot ride on MTConnect alone; it needs OPC UA or a vendor API.*

2. **MTConnect was built on the open web stack — HTTP, XML, TCP/IP — chosen deliberately early in development, with the initial version introduced in 2008.** The agent provides a RESTful, stateless interface. (Source: Real Time Automation "An Overview of MTConnect"; Wikipedia "MTConnect", via web search 2026-06-09.)

3. **MTConnect architecture is a layered model: Device → Adapter → Agent → Client Applications.** The Adapter translates the device's native, low-level vocabulary into a plain-text, pipe-delimited string; the Agent is a web server that consumes that string, parses at the delimiters, and serves it as standardized XML over HTTP GET. (Source: Real Time Automation "An Overview of MTConnect"; Modern Machine Shop, via web search 2026-06-09.)

4. **The MTConnect agent exposes standard HTTP REST endpoints:** `/probe` (device discovery / XML schema for a controller), `/current` (latest values), `/sample` (historical time-series data), `/assets` and `/asset` (tooling or program assets). XPATH is supported to limit a request to a subset of data values. (Source: web-search synthesis of MTConnect endpoint docs / "Part I - MTConnect Driver" blog, 2026-06-09.) — *Owner: verify the exact endpoint list against the primary spec at docs.mtconnect.org before coding a client.*

5. **The standard provides a normalized, manufacturer-independent semantic vocabulary** so machines from different builders report common values, units, names, and context; each Device in an `MTConnectDevices` document MUST carry a unique `uuid`. (Source: Wikipedia "MTConnect"; MTConnect Standard Part 2.0 – Devices Information Model, docs.mtconnect.org, via web search 2026-06-09.)

6. **The standard is referenced as ANSI/MTC1.4-2018 and claims adoption on more than 250,000 devices in over 50 countries.** (Source: mtconnect.org homepage, fetched 2026-06-09.) — *Owner: the adoption count is a vendor/institute marketing figure; treat as approximate.*

## Live OEE — Overall Equipment Effectiveness

7. **OEE = Availability × Performance × Quality.** An OEE of 100% means only good parts produced at maximum speed with zero interruption. (Source: Wikipedia "Overall equipment effectiveness", fetched 2026-06-09.)
   - **Availability** = Operating Time / Scheduled Time (worked example: 390 min / 480 min = 81.25%).
   - **Performance** = (Parts Produced × Ideal Cycle Time) / Operating Time (worked example: (242 × 1.5 min) / 390 min = 93.1%).
   - **Quality** = (Units Produced − Defective Units) / Units Produced (worked example: (242 − 21) / 242 = 91.32%).
   (Source: Wikipedia "Overall equipment effectiveness", fetched 2026-06-09.)

8. **OEE decomposes into the "Six Big Losses":** Breakdowns and Waiting (Availability losses); Minor Stops and Reduced Speed (Performance losses); Scrap and Rework (Quality losses). (Source: Wikipedia "Overall equipment effectiveness", fetched 2026-06-09.)

9. **TEEP (Total Effective Equipment Performance) = OEE × Loading,** measuring effectiveness against all calendar hours (24/7/365) rather than only scheduled operating hours. (Source: Wikipedia "Overall equipment effectiveness", fetched 2026-06-09.)

10. **The widely-quoted "85% OEE = world class" figure is contested.** The Wikipedia article explicitly flags the "85% is World Class" assumption as "in many cases incorrect," depending on situational factors. (Source: Wikipedia "Overall equipment effectiveness", fetched 2026-06-09.) — *Owner: avoid hard-coding 85% as a universal target in any PRISM OEE engine; make it shop-configurable.*

## Standardized KPIs — ISO 22400 / NIST

11. **ISO 22400 is the international standard defining manufacturing KPIs; it identifies and defines a total of 34 KPIs.** Part 1 (ISO 22400-1:2014) gives the industry-neutral framework (overview, concepts, terminology); Part 2 (ISO 22400-2:2014) defines the selected KPIs with their formula, elements, time behaviour, unit/dimension, and the user group / production methodology each applies to. (Source: connect981.com "ISO 22400 Overview"; iso.org standard pages 56847 / 54497; NIST hierarchical-KPI publication get_pdf pub_id 919754, via web search 2026-06-09.)

12. **ISO 22400 operates at the Manufacturing Operations Management (MOM) layer — Level 3 in the IEC 62264 hierarchy** — sitting between enterprise planning (Level 4) and shop-floor control. Its KPIs consume parameters from the lower control/sensor levels and pass results up to business planning. The standard defines what the metrics MEAN, not which to use or what targets to set. (Source: connect981.com; NIST standards-landscape work, via web search 2026-06-09.) — *Owner: ISO 22400-2 is noted as expected to be replaced by ISO/DIS 22400-2; re-check currency before citing as final.*

## Scheduling / Dispatch — Lean (Heijunka, Takt, Kanban)

13. **Takt time = the rate at which a product must be produced to meet customer demand (the "customer buying rate").** It sets the target pace for the production schedule. (Source: KanbanBOX / Learn Lean Sigma / Process Navigation "Heijunka" articles, via web search 2026-06-09.)

14. **Heijunka ("leveling") is a TPS pillar that levels production volume AND mix in small, mixed-model batches** to eliminate Mura (unevenness) and Muri (overburden) and approach Just-In-Time. The physical dispatch tool is the **heijunka box**: rows = product/part number, columns = fixed time intervals for paced kanban withdrawal. (Source: Lean Enterprise Institute "Heijunka Box"; KanbanBOX; Kanban Zone, via web search 2026-06-09.)

15. **Heijunka and Kanban have complementary roles in dispatch: the leveling board says WHAT and WHEN to make; the kanban system controls HOW MUCH (flow).** Dispatch runs on a fixed cadence — a material handler withdraws kanban from the box at a set interval (worked example cited: every 20 minutes from a 7:00 a.m. shift start). One kanban slot = one "pitch" of production, where **pitch = takt time × pack-out quantity.** (Source: KanbanBOX "Heijunka for levelling production"; Lean Enterprise Institute, via web search 2026-06-09.)

## Andon / Jidoka — Visual Signals & Stop-the-Line

16. **Andon is the illuminated visual signal of TPS; it is the principal element of Jidoka ("automation with a human touch"), one of the two pillars of TPS (the other is Just-In-Time).** When an abnormality occurs the machine stops automatically OR the operator stops the line by pulling the cord; the philosophy is to surface and fix the problem at source rather than pass a defect downstream. (Source: Wikipedia "Andon (manufacturing)"; Toyota UK Magazine "Andon - Toyota Production System guide", via web search 2026-06-09.)

17. **At Toyota the andon is primarily an ALERT system, not an automatic full line-stop.** The traditional system uses two pulls: first pull = request for help (team leader assesses, line keeps moving); the line only stops if the team leader cannot resolve the issue within the team member's takt time. (Source: Toyota UK Magazine; Kanban Zone "Andon", via web search 2026-06-09.) — *Owner: PRISM andon modeling should distinguish "help-request" from "line-stop" states, not collapse them.*

18. **Andon uses color-coded status lights on an overhead signboard that identifies the specific workstation/area with the problem.** The earliest authoritative manufacturing description of andon appears in Taiichi Ohno's *Toyota Production System: Beyond Large-Scale Production*. Modern implementations have largely replaced the physical cord with a button/digital interface for safety and tidiness. (Source: Wikipedia "Andon (manufacturing)"; supplychaintoday.com, via web search 2026-06-09.)

## 5S / Lean Workplace Organization

19. **5S is five Japanese pillars (Hirano, 1995):** Seiri = Sort (remove unnecessary items), Seiton = Set in order (arrange for access/flow), Seiso = Shine (clean + inspect to detect problems early), Seiketsu = Sustaining hygiene/Standardize (make cleanliness a daily routine), Shitsuke = Sustain/Self-discipline (training + audits). It emerged in Japan and was instrumental in enabling just-in-time manufacturing; some organizations extend it to **6S by adding Safety**. (Source: Wikipedia "5S (methodology)", fetched 2026-06-09.) — *Owner: note Seiketsu is commonly translated "Standardize" but the more literal sense is "sustaining hygiene"; cite carefully.*

20. **5S is a foundational lean / visual-management practice and a prerequisite amplifier — heijunka is most effective only after lean foundations like 5S are already in place.** (Source: Wikipedia "5S (methodology)"; Learn Lean Sigma "Heijunka" prerequisite note, via web search 2026-06-09.)

## Traceability / Genealogy (ISA-95 / IEC 62264 context)

21. **Traceability, genealogy, and lot/serial tracking are core Level 3 (MES) functions in the ISA-95 / IEC 62264 model** (ANSI/ISA-95 and IEC 62264 are the technically-identical same standard family, derived from the Purdue Enterprise Reference Architecture). The MES captures time-stamped execution data and proves production happened correctly; ERP (Level 4) plans and accounts for it. (Source: connect981.com "ISA-95 MES-ERP Boundary"; symestic.com "ISA-95"; integra2r.com, via web search 2026-06-09.)

22. **Genealogy tracks parent-child relationships (for unsplit lots) and sibling relationships (for split lots);** products are identified by serial number, lot number, batch number, or similar attributes, and ISA-95 integration commonly uses B2MML (XML data model for ERP↔MES) plus OPC UA for real-time OT/IT communication. (Source: connect981.com; eazyworks.com "Product Tracking and Genealogy", via web search 2026-06-09.) — *Owner: for JM Die's discrete die/mold parts, serialized + lot genealogy is the relevant model; verify against the live ISA-95 object definitions.*

---

## Sources
- MTConnect Institute homepage — https://www.mtconnect.org/
- MTConnect Getting Started — https://www.mtconnect.org/getting-started
- MTConnect Standard Part 2.0, Devices Information Model (primary spec PDF) — https://docs.mtconnect.org/MTConnect_Part_2-0_Devices_Information_Model_1-8-0.pdf
- Wikipedia, "MTConnect" — https://en.wikipedia.org/wiki/MTConnect
- Real Time Automation, "An Overview of MTConnect" — https://www.rtautomation.com/technologies/mtconnect/
- Modern Machine Shop, "Understanding MTConnect Agents and Adapters" — https://www.mmsonline.com/articles/understanding-mtconnect-agents-and-adapters
- Wikipedia, "Overall equipment effectiveness" — https://en.wikipedia.org/wiki/Overall_equipment_effectiveness
- NIST, "A Hierarchical structure of key performance indicators for ..." (publication) — https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=919754
- ISO 22400-1:2014 — https://www.iso.org/standard/56847.html
- ISO 22400-2:2014 — https://www.iso.org/standard/54497.html
- connect981.com, "ISO 22400 Overview" — https://connect981.com/blog-posts/iso-22400-overview-manufacturing-kpis-basics
- connect981.com, "ISA-95 MES-ERP Boundary" — https://connect981.com/blog-posts/isa95-mes-erp-boundary-20260122
- symestic.com, "ISA-95" — https://www.symestic.com/en-us/blog/mes/isa95
- Wikipedia, "5S (methodology)" — https://en.wikipedia.org/wiki/5S_(methodology)
- Wikipedia, "Andon (manufacturing)" — https://en.wikipedia.org/wiki/Andon_(manufacturing)
- Toyota UK Magazine, "Andon - Toyota Production System guide" — https://mag.toyota.co.uk/andon-toyota-production-system/
- Kanban Zone, "Andon" — https://kanbanzone.com/resources/lean/toyota-production-system/andon/
- Lean Enterprise Institute, "Heijunka Box" — https://www.lean.org/lexicon-terms/heijunka-box/
- KanbanBOX, "The Heijunka for levelling production" — https://www.kanbanbox.com/heijunka-levelling-production/
- Learn Lean Sigma, "Heijunka 101" — https://www.learnleansigma.com/lean-manufacturing/heijunka-in-lean/
- eazyworks.com, "Product Tracking and Genealogy" — https://eazyworks.com/features-product-tracking-and-genealogy
