---
name: reference_business_gaap_costaccounting_erp_2026_06_13
description: "Business (hotel) Phase-2 deep-research anchor — US GAAP ASC 606 5-step revenue recognition (job-shop: point-in-time on delivery vs over-time %-complete for custom) + ASC 330 inventory/WIP; job-order cost accounting + overhead absorption + standard-vs-actual variance analysis; QuickBooks API/IIF + AR/AP/GL + EDI X12 (850 PO/810 invoice/856 ASN); FLSA labor; AS9100D/ISO9001/NIST800-171 QMS. Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.489Z
aliases: reference_business_gaap_costaccounting_erp_2026_06_13
---


**Context:** Phase-2 anchor for the business galaxy (hotel — ERP/HR/accounting), per the 2026-06-13 knowledge-max
`/goal`. Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §hotel.

## Revenue recognition — US GAAP ASC 606
- **5-step model:** (1) identify the contract; (2) identify performance obligations; (3) determine transaction
  price; (4) allocate price to obligations; (5) recognize revenue as each obligation is satisfied.
- **Job-shop application:** standard parts → recognize **point-in-time** on delivery/transfer of control. Custom
  long-run / no-alternative-use parts with enforceable right to payment → may recognize **over-time** (% complete
  by cost-to-cost or units). The choice changes when revenue (and margin) books — material for cash-flow + tax.
- **ASC 330 inventory:** lower of cost or net-realizable-value; WIP valuation (material + labor + applied
  overhead); raw/WIP/finished-goods stages.

## Cost accounting (the quoting↔actuals bridge)
- **Job-order costing** (each job a cost object — correct for a job shop) vs process costing. Trace direct
  material + direct labor; **apply overhead** via a predetermined rate (machine-hr or labor-hr basis) → **over/
  under-applied overhead** trued up at period end.
- **Standard vs actual + variance analysis:** material price/usage variance, labor rate/efficiency variance,
  overhead spending/volume variance. This IS the quote-vs-actual reconciliation engine on the accounting side
  (pairs with charlie quoting + shop-floor actuals).

## ERP / systems
- **QuickBooks** (Online API / desktop IIF) — AR/AP, GL, customers/vendors, invoices, POs. JM procurement corpus
  ($4.91M) + customer records live in jm-die-database (juliett-owned).
- **EDI X12** for customer integration: **850** (purchase order), **810** (invoice), **856** (ASN/ship notice),
  **855** (PO ack). Aerospace/defense customers often mandate EDI + portals.

## HR / labor / compliance
- **FLSA** — exempt vs non-exempt classification, overtime (1.5× >40 hr), recordkeeping; + state wage law.
  Shop-floor majority Polish/Spanish-primary (operator fact) → bilingual HR/training.
- **QMS:** **AS9100D** (aerospace, builds on ISO 9001:2015) + **ISO 9001:2015** clauses (context, leadership,
  planning, support, operation, performance eval, improvement); **NIST 800-171** (CUI for defense suppliers);
  ITAR/EAR export control (→ compliance-safety galaxy).

## Integration (hotel)
- Consumes charlie (quotes→orders), shop-floor (labor/cycle actuals), juliett (data stores). Produces the
  financial truth quoting reconciles against. Next deep-research (roadmap §hotel): ingest ASC 606 application
  guidance for custom-manufacturing + the job-order-costing + variance model; seed JM customers (open thread).

Sources (canonical): FASB ASC 606 (Revenue from Contracts with Customers) + ASC 330 (Inventory); cost-accounting
texts (Horngren, job-order costing + variance analysis); ANSI X12 EDI standards; US DOL FLSA; SAE AS9100D /
ISO 9001:2015 / NIST SP 800-171. Expertise-authored anchor; ASC 606 manufacturing application specifics flagged
for re-verification.
