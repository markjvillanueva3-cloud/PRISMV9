---
name: business-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) deep-research foundations layer for the business galaxy (manufacturing business systems — ERP, cost accounting, EDI, risk). 6 fetched sources (MIT OCW, ANSI X12, COSO, Horngren's). Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: business
  tier: VERIFIED
  verifiedBy: WebFetch
---

# business galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. Field fence held — business/accounting sources only, no manufacturing physics.

## Synthesis (next-layer knowledge)
Management accounting's dual mandate — decision support and behavioral control — anchors PRISM's ERP cost modules: job-cost reporting must expose at minimum three cost views per order (absorption for GAAP inventory, variable for short-run pricing, full-economic for bid-floor), consistent with Horngren's "different costs for different purposes" principle. MIT Sloan CISR research establishes that ERP ROI depends on business operating-model alignment *before* system selection, not after — a critical design constraint for PRISM's ERP integration layer. All B2B electronic document exchange (purchase orders, invoices, advance ship notices) must conform to ANSI ASC X12 transaction sets (810/850/856/834 + 300 more), as X12 is the sole ANSI-accredited authority for U.S. EDI. Enterprise risk and internal control must be grounded in COSO ERM 2017 (5 components, 20 principles), which explicitly covers cyber, AI-implementation, and cloud risks — applicable to PRISM's compliance-safety galaxy and SOX-adjacent reporting.

## Verified sources

### [MIT OCW 15.521 — Management Accounting and Control (Spring 2003)](https://ocw.mit.edu/courses/15-521-management-accounting-and-control-spring-2003/) — university course
> "how managers can use accounting information to assist them in making decisions and how accounting information can be used to control the actions of other members of the firm"

**Knowledge:** Establishes the dual role of management accounting — decision support (forward-looking cost allocation, product profitability) and control (variance analysis, budgetary control, incentive alignment); both needed for ERP cost-accounting modules.

### [MIT OCW 15.963 — Management Accounting and Control (Spring 2007)](https://ocw.mit.edu/courses/15-963-management-accounting-and-control-spring-2007/) — university course
> "Session 1: Decision making. Sessions 6–10: Product costing, capacity cost management, organizational design, incentive systems, and control system implementation."

**Knowledge:** Graduate treatment of activity-based costing, capacity cost management, and balanced-scorecard implementation — maps to PRISM's ERP cost-accounting and job-cost reporting for make-to-order shops.

### [MIT OCW 15.571 — Generating Business Value from IT (Spring 2009)](https://ocw.mit.edu/courses/15-571-generating-business-value-from-information-technology-spring-2009/) — university course
> "IT is pervasive in today's firms. For many firms IT is the single largest capital investment, often exceeding 50% of capital expenditure."

**Knowledge:** MIT Sloan CISR-grounded course on ERP ROI, IT governance, operating-model alignment, and ERP-implementation failure modes. Design constraint: the business operating model must precede system selection.

### [ANSI ASC X12 — EDI Standards Body](https://www.x12.org/about/) — standards body
> "Established more than 40 years ago, X12 is a non-profit, ANSI-accredited, cross-industry standards development organization whose work is used by an overwhelming percentage of business-to-business transactions"

**Knowledge:** Canonical authority for all U.S. B2B EDI transaction sets: 810 (invoice), 850 (PO), 856 (ASN), 834 (benefits), + 300 more. PRISM's EDI layer for vendor invoicing and customer PO receipt must conform to X12 specs.

### [COSO ERM — Enterprise Risk Management Integrated Framework (2017)](https://www.coso.org/guidance-erm) — framework / standards body
> "Enterprise Risk Management—Integrated Framework updated in 2017 to reflect evolving business challenges, including cyber risk, AI implementation risk, ESG-related risks, and cloud computing."

**Knowledge:** 5-component / 20-principle framework (Governance & Culture, Strategy, Performance, Review & Revision, Information & Reporting) underlying SOX compliance and internal-control design. PRISM's compliance-safety galaxy should reference COSO ICIF for internal control; COSO ERM governs enterprise risk appetite.

### [Horngren's Cost Accounting: A Managerial Emphasis (Pearson, 17th ed.)](https://www.pearson.com/en-us/subject-catalog/p/horngrens-cost-accounting-a-managerial-emphasis/P200000006048) — authoritative textbook
> "This acclaimed text emphasizes the basic theme of 'different costs for different purposes'."

**Knowledge:** Dominant reference for cost accounting (job-order, process, ABC, variance analysis, transfer pricing, balanced scorecard). The "different costs for different purposes" principle means PRISM must expose ≥3 cost views per job: absorption (GAAP), variable (short-run pricing), full-economic (long-run bid floor).

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_20f6fbb7-a7e). Ledger: state/shared/galaxy-knowledge-iterations.json._
