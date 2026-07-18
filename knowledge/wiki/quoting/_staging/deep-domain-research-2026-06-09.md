---
status: VERIFIED-PARTIAL
owner_slot: charlie
staged_by: papa-deepdomain-research
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
date: 2026-06-09
galaxy: quoting
focus: CNC quoting/estimation — cycle-time, cost model, NRE amortization, should-cost
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/quoting/quoting-foundations.md; numeric/safety specifics below stay owner-gated for charlie. -->**

# Deep-Domain Research — CNC Quoting & Cost Estimation

Drafted for the PRISM quoting galaxy (print-to-quote, cost models, NRE amortization, should-cost). Every numeric/factual claim below carries an inline citation. All sources are free + legal (NIST gov pubs, Protolabs public design-tip/blog pages, public machining-estimation references). Charlie owns verification before any of this lands in a live engine, schema, or doctrine file.

## 1. The bottom-up should-cost equation

- A defensible CNC should-cost is layered: **Total Cost = Material Cost + (Machining Time × Hourly Rate) + Setup/NRE Cost + Post-Processing Cost + Overhead** — material (with scrap factor), machining time (cycle time × burden rate), tooling cost-per-edge, and amortized setup/NRE [src: CNC Optimization, "CNC Machining Cost Estimation Guide", https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- At the part level, NIST decomposes manufacturing cost into three dominant drivers — **machine cost, labor cost, and material cost** — and explicitly found that power consumption and space rental each contributed **less than 1% of total cost**, so they were excluded from the model [src: NIST Special Publication 1176, https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1176.pdf].
- Average part cost in the NIST model is computed by **dividing total annual cost by total annual production volume** — i.e., per-part cost is a function of throughput, not just per-piece operations [src: NIST SP 1176, https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1176.pdf].

## 2. Hourly machine rate (burden) construction

- The shop rate is built as **Shop Rate = (Fixed Costs + Variable Costs) / Billable Hours**, where fixed = machine payment, rent, insurance, software, operator salary; variable = electricity, cutting tools, coolant, compressed air, maintenance reserves [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- Published 2026-USD hourly-rate bands (operator labor + overhead + ~15-20% margin): manual mill/lathe ~$35-75, **3-axis CNC vertical ~$65-125 (typical $85)**, CNC turning center ~$60-110, **5-axis simultaneous ~$125-250 (typical $175)** [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/]. (UNVERIFIED: rate bands are regional/2026-dated; charlie should reconcile against JM Die's actual burden rates.)
- Billable-hour denominator must discount for utilization: at **0.65-0.85 OEE on 2,000 available annual hours, only ~1,300-1,700 hours are billable** — costing against the full 2,000 understates the rate [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].

## 3. Cycle-time / machining-time estimation

- The fundamental machining-time relationship is **machining time = length of cut ÷ feed rate**; total cycle time decomposes into cutting time + rapid moves + tool changes + handling + inspection + setup allocation [src: American Micro, "CNC Machining Cycle Time Calculation", https://www.americanmicroinc.com/resources/cnc-machining-cycle-time-calculation/].
- Spindle speed from cutting speed: **Vc = πDN/1000** (Vc m/min, D mm, N rpm); imperial milling **RPM = SFM/Diameter × 3.82**; milling table feed **Vf = N · z · f** (z = teeth, f = feed/tooth) [src: KEYENCE Machining Formula Collection, https://www.keyence.com/ss/products/measure-sys/machining/formula/milling.jsp].
- For turning under constant surface speed (CSS), RPM changes as the diameter changes, so **a new RPM and feed must be computed for every pass when the diameter varies** — a quoting engine cannot assume one fixed RPM across a turned profile [src: FIRGELLI machining-time reference, https://www.firgelliauto.com/blogs/engineering-calculators/machining-time-calculator-turning-and-milling].

## 4. CAM-estimate inflation (critical pitfall)

- **Raw CAM simulation time underestimates real production time**: CAM omits load/unload, deburring, inspection, and the efficiency factor — **real time is roughly 1.5-2× CAM time** [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- An early-stage alternative is a **complexity multiplier** (e.g., +20% / 1.2× for medium-complexity) applied to a base CAM/feature estimate, reported within ~10% of actual Haas CNC times in one case [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/]. (UNVERIFIED single-case claim — treat the multiplier as a tunable prior, not a constant.)

## 5. Material cost & scrap factor

- Raw stock must be larger than the finished part for clamping/facing; a common shop approximation is **raw material × ~1.05 (a ~5% kerf/scrap factor)** [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- Cost is driven by **total volume of material removed**, not just finished mass: a part going from a 10 kg aluminum block to a 1 kg finished part is expensive because the machine must turn 9 kg into chips — **near-net-shape stock reduces machining time** [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- Material removal rate has an indirect cost via tool wear: **harder materials wear tools faster, adding cost** beyond raw stock price [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/]. Protolabs notes 17-4 PH stainless is "difficult to cut" while brass is "soft and easy to mill," directly affecting machinability cost [src: Protolabs, "How to Reduce CNC Machining Costs", https://www.protolabs.com/resources/design-tips/how-to-reduce-cnc-machining-costs/].

## 6. Tooling cost-per-edge

- Tooling is charged per part as **insert cost ÷ parts-per-edge**: a $15 insert cutting 200 parts = **$0.075/part**, plus **$0.02-0.05/part holder amortization** [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- Cost-per-edge becomes material-dominant for hard alloys — **titanium and Inconel can consume ~$50 in inserts per 100 parts** — so a flat tooling line item misprices exotic-material jobs [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].

## 7. Setup / NRE amortization (the volume-sensitivity core)

- Setup + programming is a **one-time non-recurring engineering (NRE) cost amortized across the batch**: setup time ÷ batch quantity — a 30-min setup is **3 min/part on a 10-part run but ~1.8 sec/part on a 1,000-part run** [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- The same setup adds **~$85 to a 5-part run but is negligible on a 500-part run** — this is why small quantities carry a high per-part price and why **NRE must always be amortized across the actual order quantity** [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- NIST's design-stage cost work (FIPER, NIST ATP) reinforces that **as much as ~80% of a product's cost is locked in early in design** — a radius/blend choice can force a tool change, new setup, or even a different machine [src: NIST ATP hierarchical cost-estimation tool summary, https://www.sciencedirect.com/science/article/abs/pii/S0166361503000162]. (UNVERIFIED: ScienceDirect abstract is free; full PDF may be paywalled — cite the NIST ATP project, not the paywalled body.)

## 8. The two-tier / instant-quote vs traditional NRE model (Protolabs methodology)

- Protolabs derives price by **digitally manufacturing the part** — proprietary quoting software generates the CNC toolpaths to confirm manufacturability and machining time, rather than abstractly estimating cost [src: Protolabs, "Understanding CNC Manufacturing Costs", https://www.protolabs.com/en-gb/resources/blog/understanding-cnc-manufacturing-costs/].
- Their machining cost is built from **machining time (and associated tool wear) + fixture-making time + number of setups** (machining from multiple directions adds setups) [src: Protolabs, https://www.protolabs.com/en-gb/resources/blog/understanding-cnc-manufacturing-costs/].
- Protolabs charges **no separate setup fee / no upfront NRE** because automation is applied to the engineering overhead (auto-generated G-code, fixturing, inspection) — making **quantities as low as 1-200 parts cost-effective**, whereas traditional shops' NRE charges make tiny runs prohibitive [src: Protolabs, https://www.protolabs.com/en-gb/resources/blog/understanding-cnc-manufacturing-costs/].
- Quoting facility type matters: **automated/semi-automated sites suit high-mix low-quantity; higher-volume quantities route to the Protolabs Network for volume pricing** — a single galaxy quote engine should branch by quantity tier [src: Protolabs blog, "new quoting platform by service line: CNC Machining", https://www.protolabs.com/en-gb/resources/blog/protolabs-new-quoting-platform-by-service-line-cnc-machining/].

## 9. Tolerance & surface-finish cost drivers

- Tighter-than-needed surface finish adds **finishing passes with a special tool at slower feed rate**, adding real cycle time — **a finish smoother than functionally required is wasted cost** [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/].
- Protolabs lists a **standard machining tolerance of +/- 0.005 in**; features tighter than standard or text/logos require small end mills, ball end mills, and slower delicate passes that raise cost [src: Protolabs, "How to Reduce CNC Machining Costs", https://www.protolabs.com/resources/design-tips/how-to-reduce-cnc-machining-costs/].
- Deep pockets, corner pockets, thin walls, engraved text and sculptured surfaces are named explicit **machining cost drivers**; deep pockets also induce residual-stress problems as walls get taller [src: Protolabs, https://www.protolabs.com/resources/design-tips/how-to-reduce-cnc-machining-costs/].

## 10. Quoting accuracy & methodology maturity

- Disciplined bottom-up should-cost methods report estimation **errors as low as ~8-15%** when material (with scrap), validated cycle time, cost-per-edge, and amortized setup are all layered [src: CNC Optimization, https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/]. (UNVERIFIED accuracy band — depends on shop data quality; treat as an aspirational target, validate against JM Die actuals.)
- For industry-level benchmarking (not part-level), NIST publishes the free **Manufacturing Cost Guide (MCG)** — an input-output / public-data tool estimating value-added, labor, compensation, energy, and assets across the manufacturing supply chain; useful for sanity-checking overhead/burden assumptions, not for per-part quotes [src: NIST, "MCG for Supply Chain Statistics", https://www.nist.gov/services-resources/software/mcg-supply-chain-statistics; NIST, "The Manufacturing Cost Guide: A Primer Version 1.0", https://www.nist.gov/publications/manufacturing-cost-guide-primer-version-10].
- One machine-cost methodology NIST cites (Hopkinson & Dickens): **annual machine cost per part = (depreciation/yr [machine+ancillary ÷ 8-year life] + maintenance/yr) ÷ annual production volume**, yielding a per-part machine cost constant over time [src: NIST SP 1176, https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1176.pdf].

## Sources

1. NIST Special Publication 1176 — *Costs and Cost Effectiveness of Additive Manufacturing* (part-level labor/material/machine cost decomposition; Hopkinson-Dickens machine-cost method) — https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1176.pdf
2. NIST — *The Manufacturing Cost Guide: A Primer, Version 1.0* — https://www.nist.gov/publications/manufacturing-cost-guide-primer-version-10
3. NIST — *MCG for Supply Chain Statistics* (free software/tool) — https://www.nist.gov/services-resources/software/mcg-supply-chain-statistics
4. NIST ATP hierarchical cost-estimation tool (FIPER) — design-stage 80%-cost-locked-early principle (abstract only) — https://www.sciencedirect.com/science/article/abs/pii/S0166361503000162
5. Protolabs — *How to Reduce CNC Machining Costs* (cost drivers, +/-0.005 in standard tolerance, finish/feature drivers) — https://www.protolabs.com/resources/design-tips/how-to-reduce-cnc-machining-costs/
6. Protolabs — *Understanding CNC Manufacturing Costs* (machining-time + fixture + setups model, no-NRE methodology) — https://www.protolabs.com/en-gb/resources/blog/understanding-cnc-manufacturing-costs/
7. Protolabs — *New quoting platform by service line: CNC Machining* (automated vs Network volume-tier routing) — https://www.protolabs.com/en-gb/resources/blog/protolabs-new-quoting-platform-by-service-line-cnc-machining/
8. CNC Optimization — *CNC Machining Cost Estimation Guide: Shop Rate & Quoting* (shop-rate formula, OEE billable hours, rate bands, scrap factor, cost-per-edge, setup amortization, CAM inflation, accuracy band) — https://www.cncoptimization.com/resources/guides/cnc-cost-estimation/
9. American Micro Inc. — *CNC Machining Cycle Time Calculation* (cycle-time decomposition, time = length ÷ feed) — https://www.americanmicroinc.com/resources/cnc-machining-cycle-time-calculation/
10. KEYENCE — *Machining Formula Collection: Milling* (Vc = πDN/1000, RPM = SFM/D × 3.82, Vf = N·z·f) — https://www.keyence.com/ss/products/measure-sys/machining/formula/milling.jsp
11. FIRGELLI — *Machining Time Calculator: Turning and Milling* (CSS per-pass RPM recompute) — https://www.firgelliauto.com/blogs/engineering-calculators/machining-time-calculator-turning-and-milling
