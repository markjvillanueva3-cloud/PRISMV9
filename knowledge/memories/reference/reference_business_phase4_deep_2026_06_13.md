---
name: reference_business_phase4_deep_2026_06_13
description: "Business (hotel) Phase-4 deep anchor — direct-authored (Hermes-loop straggler; zulu, R12). Five deeper sub-domains past ASC 606/job-costing/QuickBooks: (1) Time-Driven Activity-Based Costing (Kaplan-Anderson) + capacity-cost-rate; (2) Throughput Accounting / Theory of Constraints (Goldratt) for shop scheduling vs absorption costing; (3) full standard-cost variance tree (price/quantity, rate/efficiency, spending/volume) + ASC 606 over-time input-method % completion for custom manufacturing; (4) cash conversion cycle + 13-week direct cash-flow + DSO/DPO/DIO off job WIP; (5) defense-manufacturing compliance stack (AS9100D, DFARS 252.204-7012, NIST 800-171, ITAR/EAR) + EDI 850/855/856/810/830. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.490Z
aliases: reference_business_phase4_deep_2026_06_13
---


## Context

Phase-4 anchor for the business galaxy (slot: hotel). Direct-authored by zulu (its workflow research
agent hung on a Hermes/Ollama call; Hermes was honored for the 12 that completed — for this non-cutting
straggler, direct authoring is the R6 adaptation). Deepens:
- [[reference_business_phase3_cost_to_cash_2026_06_13]] — Phase-3 (variance→JE, 13-week cash-flow, QB/EDI seed)
- the Phase-2 internal corpus (jm-die-database $4.91M procurement; QuickBooks-parity work)

The five sub-domains below are the next layer a world-leading manufacturing-business-systems expert masters.
R12: no fabricated figures; every standard/model is a real, named, citable source.

## The deeper increments

### 1. Time-Driven Activity-Based Costing (TDABC) — beyond plantwide overhead absorption
Phase-3 used job-order costing with overhead absorption. The deeper model: **Activity-Based Costing**
(Cooper & Kaplan 1988) and its successor **Time-Driven ABC** (Kaplan & Anderson, HBR 2004 + book 2007).
TDABC needs only two parameters per resource: the **capacity cost rate** (cost ÷ practical capacity, e.g.
$/machine-minute) and the **time equation** per activity (time = β₀ + β₁·x₁ + … driven by order
characteristics). This gives per-part, per-operation cost that reflects ACTUAL machine/labor minutes
(from shop-floor data) instead of a blanket overhead %. Directly upgrades the quote↔ERP cost basis: a
5-axis op on VMC-03 carries VMC-03's capacity-cost-rate × its cycle minutes, not an averaged shop rate.
Surfaces **unused-capacity cost** explicitly (practical vs theoretical capacity) — a number absorption
costing hides.

### 2. Throughput Accounting / Theory of Constraints — the scheduling-vs-costing tension
**Goldratt's Theory of Constraints** (*The Goal*, 1984) + **Throughput Accounting** (Corbett 1998):
for a job shop, the relevant decision metric is **Throughput = revenue − truly-variable cost**, maximized
**per constraint-minute** (the bottleneck machine), NOT per-unit absorbed cost. Two jobs with equal margin
but different bottleneck-time have different real value. This reframes quoting + scheduling: accept/price
work by throughput-per-bottleneck-minute (T/CU), subordinate everything to the constraint, elevate it.
Pairs with shop-floor (live machine status → identify the current constraint) + quoting (charlie). The
classic cost-accounting trap TOC warns against: local-efficiency optimization (keep every machine busy)
that builds WIP and starves the bottleneck.

### 3. Full standard-cost variance tree + ASC 606 over-time recognition for custom work
**Variance decomposition** (Horngren *Cost Accounting*): material **price** vs **quantity (usage)**
variance; labor **rate** vs **efficiency** variance; variable-overhead **spending** vs **efficiency**;
fixed-overhead **spending** vs **production-volume** variance. Each variance maps to a specific journal
entry + a root-cause owner (purchasing owns price, production owns usage/efficiency) — the matrix Phase-3
started, completed here. **ASC 606 for custom/contract manufacturing:** revenue is recognized **over time**
(not at ship) when ASC 606-10-25-27 criteria hold — esp. *no-alternative-use asset + enforceable right to
payment for work performed to date* (typical for bespoke dies/fixtures). Use an **input method**
(cost-to-cost % completion) to recognize revenue as the job progresses; handle **contract modifications**
(606-10-25-10) for change orders. This is the accounting backbone of a custom shop and is materially
different from off-the-shelf point-in-time recognition.

### 4. Cash conversion cycle + 13-week direct cash flow off job WIP
**Cash Conversion Cycle = DIO + DSO − DPO** (Days Inventory Outstanding + Days Sales Outstanding − Days
Payable Outstanding) — the canonical working-capital metric; a job shop with long WIP + slow-paying primes
can be profitable yet cash-starved. The **13-week direct cash-flow forecast** (treasury standard) projects
weekly receipts (from AR aging + scheduled job completions) minus disbursements (AP, payroll, material POs)
— the model that actually predicts a liquidity crunch. Built off job-order WIP + AR/AP aging. Pairs with
hotel's ERP actuals feeding charlie's quote calibration (a quote that wins but blows the cash cycle is a
bad quote).

### 5. Defense/aerospace-manufacturing compliance + EDI integration
JM-class shops serving aerospace/defense primes (ITW, Alcoa, etc.) operate under a compliance stack a
world-leading business system encodes: **AS9100D** (aerospace QMS — adds config mgmt, risk, counterfeit-
parts, first-article AS9102 to ISO 9001); **DFARS 252.204-7012** (safeguarding Covered Defense Info +
72-hour incident reporting); **NIST SP 800-171** (the 110 controls for CUI; rev3 2024); **ITAR/EAR**
export control (technical-data access restrictions — a print is controlled data). **EDI** transaction sets
the ERP must speak: **850** (PO), **855** (PO ack), **856** (ASN/advance ship notice), **810** (invoice),
**830** (planning/forecast schedule), **862** (shipping schedule) — ANSI ASC X12; plus cXML for some
portals. These are hard requirements to transact with primes, not nice-to-haves.

## Wiring / consumers (R15)
- GALAXY: `mcp-server/src/engines/business/` (slot: hotel). CONSUMERS: quoting (charlie — TDABC capacity
  rates + throughput metric feed should-cost + win/price decisions); shop-floor (live constraint
  identification for TOC + actual machine-minutes for TDABC); quality (AS9100/first-article); the ERP/GL
  engines (variance→JE, ASC 606 schedule, 13-week cash). DOMAIN: business/ERP — consumed fleet-wide for any
  cost/cash/compliance decision.
- **NO inline financial constants** — tax/rate/threshold tables live in versioned data, not code. **PII/CUI
  gate** on untrusted intake (customer/vendor/employee records) — the aidefence PII scanner belongs on
  intake. Financial-invariant tests (debits=credits, revenue ≤ contract value, cash never negative without
  flag).

## Next (Phase-5, honestly scoped)
1. Build the **capacity-cost-rate table** per machine (from shop-floor minutes) + TDABC time-equations →
   feed charlie's cost basis (replaces blanket shop rate).
2. **Throughput-per-bottleneck-minute** metric in the quote engine + a constraint identifier off shop-floor.
3. Complete the **variance→journal-entry matrix** + **ASC 606 over-time % completion** schedule engine.
4. **13-week direct cash-flow** engine off WIP + AR/AP aging; CCC dashboard.
5. **Seed JM customers** (the standing open thread) + the **EDI 850/855/856/810/830** + **NIST 800-171**
   control mapping. Validate against JM's real procurement ($4.91M) + AR/AP actuals.

## Sources
- Cooper, R. & Kaplan, R.S., "Measure Costs Right: Make the Right Decisions", HBR, 1988 (ABC).
- Kaplan, R.S. & Anderson, S.R., "Time-Driven Activity-Based Costing", HBR, Nov 2004; + *Time-Driven
  Activity-Based Costing*, Harvard Business School Press, 2007.
- Goldratt, E.M., *The Goal*, North River Press, 1984; Corbett, T., *Throughput Accounting*, 1998.
- Horngren, C.T., Datar, S., Rajan, M., *Cost Accounting: A Managerial Emphasis* (variance analysis).
- FASB ASC 606-10-25 (over-time recognition criteria; input method; contract modifications); ASC 330 (inventory).
- SAE AS9100D:2016; AS9102 (first article); DFARS 252.204-7012; NIST SP 800-171 rev2/rev3; ITAR (22 CFR 120-130)/EAR (15 CFR 730-774).
- ANSI ASC X12 EDI (850/855/856/810/830/862); cXML.
- Direct-authored by zulu (orchestrator) per R6 — the workflow's Hermes-planned research agent for this
  galaxy hung; the 12 completed galaxies went through the full Hermes→sonnet→opus-verify pipeline.
