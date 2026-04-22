# PRISM v9 Competitive Analysis vs. ProShop ERP, JobBOSS, Paperless Parts, MachiningCloud, HSMAdvisor

## Executive Summary

PRISM v9 is attempting something no competitor currently does: unify **manufacturing engineering intelligence** (speeds, feeds, toolpath strategy, physics-backed calculations) with a **full ERP/MES/Finance stack** in a single web application. Every competitor listed occupies only one side of this divide. That is PRISM's core opportunity -- and also its core risk.

---

## 1. FULL FEATURE INVENTORY (55+ nav items, 66 page files)

### Navigation Groups and Page Count

| Group | Nav Items | Implemented Pages | Notes |
|-------|-----------|-------------------|-------|
| Core | 3 | SFC Calculator, Post Processor, CAM Strategy | Engineering heart of PRISM |
| Shop | 6 | Shop Dashboard, Jobs, Scheduling, Capacity, Inventory, Batch Planning | MES layer |
| Quoting | 9 | Quote Builder, Blueprint Quote, Sheet Metal, Additive, Injection Mold, Quote Analytics, Secondary Ops, Material Pricing, Stock Optimizer | Multi-process quoting |
| Finance | 6 | Invoices, POs, General Ledger, Financial Analysis, Job Profitability, Tooling Cost | Full accounting |
| HR & Payroll | 5 | Employees, Shop Clock, Timecards, Payroll, HR Compliance | Workforce management |
| ERP | 9 | ERP Dashboard, Quoting, Job Planner, Schedule, Job Tracker, Analytics, Maintenance, Inventory, Reports | Duplicate/integrated ERP layer |
| Analysis | 6 | Job Planner AI, What-If, Machine Rates, Order Tracking, Customers, Purchasing | Decision-support tools |
| Viewer | 1 | 3D Viewer | CAD visualization |
| Data & Quality | 6 | Data, Safety, Quality, Quality Mgmt, Reports, Exports | QMS layer |
| Billing | 1 | Post Processors (store) | Marketplace |
| Admin | 3 | Costing, Learning, Settings | Configuration |

**Total: 55 nav items, 66 distinct page files.**

---

## 2. WHERE PRISM IS AHEAD OF EVERY COMPETITOR

### 2A. SFC Calculator -- Nothing Like It Exists in ERP Software

The SFC Calculator page (`SfcCalculatorPage.tsx`) is the single most differentiated feature in PRISM. It is a full machining parameter workstation:

- **13 machine modes**: Mill, Lathe, Drilling, Grinding, Threading, Honing, Boring, Broaching, Plasma, Wire EDM, Sinker EDM, Laser, Waterjet
- **55+ sub-operations** across those modes (face milling, slot milling, rough turning, creep feed grinding, taper EDM cut, etc.)
- **30 materials** across all 6 ISO 513 groups (P/M/K/N/S/H) with hardness, tensile strength, and machinability index
- **Physics-backed outputs**: cutting speed, feed per tooth, spindle speed, feed rate, plus safety scoring
- **Compatibility validation**: real-time coating-vs-material checking, RPM/power envelope checking against selected machine
- **Toolpath strategy awareness**: Adaptive clearing, trochoidal milling, plunge roughing, etc. each modify DOC/WOC/feed/speed multipliers
- **CAM software integration**: feed multiplier varies by CAM package (Fusion 360, Mastercam, etc.)
- **Cutting priority presets**: Runtime / Finish / Balanced / AI Enhanced
- **Tool holder, insert, and fixture selection** contextual to machine mode
- **Comparison view**: side-by-side up to 4 calculations
- **Calculation history** with reload and PDF export
- **Preset manager** for saving/loading parameter sets

**No competitor offers this.** HSMAdvisor comes closest but is a standalone desktop app with no ERP integration. MachiningCloud provides tool data but no calculation engine. ProShop and JobBOSS have zero machining parameter intelligence.

### 2B. Multi-Process Quoting Engine

PRISM has **five distinct quoting modules** in one platform:

1. **Quote Builder** -- Physics-backed estimation with material comparison across 5 materials simultaneously, cost breakdown (material, machining, setup, tooling, overhead, margin), price breaks, confidence scores
2. **Blueprint Quote** -- Extract operations from drawing data, auto-generate quote
3. **Sheet Metal Quote** -- Material + cutting + bending + finishing cost breakdown
4. **Additive Quote** -- Build time, material, machine, post-processing cost by technology
5. **Injection Mold Quote** -- Mold cost amortization, per-part cost, cycle time, DFM analysis

**Paperless Parts** handles CNC/sheet metal/additive quoting but does NOT do injection mold or physics-backed speeds/feeds. **ProShop** has quoting but it is manual estimation, not physics-driven. **JobBOSS** quoting is spreadsheet-grade.

### 2C. Integrated Finance + Manufacturing (GL through Shop Floor)

PRISM has a real general ledger, trial balance, income statement, balance sheet, bank reconciliation, AP aging -- plus job profitability that ties actual vs. estimated costs at the operation level. This is a full double-entry accounting system wired into the shop floor.

**ProShop** relies on QuickBooks integration for finance. **JobBOSS** has basic invoicing but no GL. Neither has the kind of job-level profitability variance analysis PRISM has (ActualVsEstimate, MarginAlert, CostForecast types).

### 2D. Quality Management System Built In

- SPC charts with Cp/Cpk/Ppk and Western Electric rules
- First Article Inspection (FAI) with characteristic-level pass/fail
- Non-Conformance Reports (NCR) with severity and cost impact
- Calibration tracking with compliance dashboard
- Material certification verification

**ProShop** is the only competitor that matches this depth. JobBOSS has minimal quality. Paperless Parts has none.

### 2E. What-If Analysis and AI-Enhanced Decision Making

The "What-If" page and "Job Planner AI" page are analytical tools that no traditional ERP provides. Combined with the cutting priority "AI Enhanced" mode in the SFC calculator, PRISM positions itself as a decision-intelligence platform, not just a record-keeping system.

---

## 3. WHERE PRISM IS BEHIND COMPETITORS

### 3A. vs. ProShop ERP

| Capability | ProShop | PRISM v9 | Gap |
|-----------|---------|----------|-----|
| **Document control / revision management** | Mature, ISO 9001/AS9100 focused | Not visible in nav or types | CRITICAL gap for aerospace/defense shops |
| **Automated work instructions** | Rich, with photos/videos per operation | Not implemented | Major gap |
| **Customer portal** | Customers view job status, approve quotes | No customer-facing portal evident | Important for mid-market |
| **Shipping / packing list management** | Full shipping module | No shipping page | Missing last-mile |
| **Approved supplier management** | Formal supplier qualification | SupplierResult exists but basic | Thin |
| **Audit trail / electronic signatures** | AS9100D compliant | Not visible | Dealbreaker for regulated shops |
| **Receiving inspection** | Integrated with POs | Not visible | Gap |
| **Machine monitoring / OEE** | Native integration | MachineLivePage exists but unclear depth | Needs verification |
| **Employee training matrix** | Built-in with expiration alerts | TrainingRecord type exists, ComplianceAlert too | Exists but unclear UI depth |
| **Ecosystem maturity** | 10+ years, hundreds of shops | New, unproven | Biggest real barrier to switching |

### 3B. vs. JobBOSS (now Shoplogix/ECI)

| Capability | JobBOSS | PRISM v9 | Gap |
|-----------|---------|----------|-----|
| **QuickBooks / Sage integration** | Mature bi-directional sync | ExportResult type suggests export-only | Shop owners want QB sync |
| **Bar code scanning for shop floor** | Native | No barcode/scan references | Expected feature |
| **Estimating templates** | Saved templates with routing | PresetManager exists for SFC; quote templates unclear | Partially covered |
| **RFQ tracking** | Full pipeline | QuoteConversion and SalesPipeline types exist | Appears covered |

### 3C. vs. Paperless Parts

| Capability | Paperless Parts | PRISM v9 | Gap |
|-----------|----------------|----------|-----|
| **Instant quoting from 3D model upload** | Core value prop -- upload STEP, get quote in seconds | Blueprint Quote exists but no evidence of STEP file auto-analysis | MAJOR gap in user experience |
| **Customer-facing quote portal** | Professional branded portal | Not visible | Important for quote delivery |
| **Supplier network / outsource matching** | Built-in network | PurchasingRecommendation exists but internal only | Different model |
| **ERP integrations (JobBOSS, ProShop, etc.)** | Dozens of integrations | Standalone system | Could be strength or weakness |

### 3D. vs. MachiningCloud

| Capability | MachiningCloud | PRISM v9 | Gap |
|-----------|---------------|----------|-----|
| **Manufacturer tool catalog (100K+ tools)** | Connected to Sandvik, Kennametal, Walter, etc. | ~30 materials, tools appear local/curated | Data breadth gap |
| **3D tool assembly models** | Downloadable assemblies for CAM | 3D Viewer exists but unclear if tool assemblies | Probably not matched |
| **Tool recommendation engine** | Based on material + operation | SmartToolSelector filters by materialGroup + operationId | Similar concept, different data depth |
| **CAM integration (direct import)** | Exports to Mastercam, Fusion, etc. | CAM software awareness in SFC, but export unclear | Gap |

### 3E. vs. HSMAdvisor

| Capability | HSMAdvisor | PRISM v9 | Gap |
|-----------|-----------|----------|-----|
| **Chatter prediction / stability lobe** | Core feature | VibrationPage exists but separate from SFC | Not integrated into main calculator |
| **Radial chip thinning compensation** | Built-in | toolpathStrategy multipliers approximate this | Less precise |
| **Power/torque spindle load charts** | Visual real-time | PowerTorqueResult type exists, AdvancedCharts component | Likely comparable |
| **Multi-tool operation sequencing** | Full operation planning | Operation selection is per-calc, not sequenced | Different model |
| **Offline desktop operation** | Native Windows app | Web-only (OfflineBanner suggests PWA attempts) | Trade-off, not gap |

---

## 4. WHAT WOULD MAKE A SHOP SWITCH TO PRISM

### 4A. From ProShop

A shop would switch FROM ProShop TO PRISM if:
- They want **physics-backed quoting** instead of manual estimation. ProShop's quoting is experience-based; PRISM's is calculation-based with material comparison, price breaks, and confidence scores.
- They need **multi-process quoting** (CNC + sheet metal + additive + injection mold) in one system. ProShop is CNC-centric.
- They want integrated **speeds and feeds intelligence** that their machinists can use daily, inside the same system where jobs are tracked. Today shops run HSMAdvisor or MachiningCloud separately.
- They are tired of paying for QuickBooks alongside ProShop and want real financial management built in.

**But they will NOT switch unless PRISM adds:** document control, revision management, electronic signatures, audit trails, customer portal, and shipping management. These are table-stakes for ProShop's core market (AS9100/ISO 9001 shops).

### 4B. From JobBOSS

A shop would switch FROM JobBOSS TO PRISM if:
- They find JobBOSS's UI outdated and want a modern web interface (PRISM's React/TailwindCSS stack is vastly superior UX).
- They want **any** engineering intelligence. JobBOSS has zero machining knowledge.
- They want quality management (SPC, FAI, NCR) without buying a separate QMS.
- They want quoting that is smarter than a spreadsheet.

**But they will NOT switch unless PRISM adds:** QuickBooks integration, barcode scanning, and demonstrates 2+ years of stability. JobBOSS shops are risk-averse.

### 4C. From Paperless Parts

A shop would switch FROM Paperless Parts TO PRISM if:
- They want **one system** instead of Paperless Parts + ProShop/JobBOSS + HSMAdvisor + QuickBooks.
- They want quoting that includes **real machining physics** (Paperless Parts uses geometric estimation, not material-science-backed speeds/feeds).
- They need ERP/MES capabilities that Paperless Parts does not provide.

**But they will NOT switch unless PRISM matches:** the instant-quote-from-STEP-upload experience. That single UX is why shops buy Paperless Parts.

---

## 5. UNIQUE VALUE PROPOSITION -- WHAT TO HIGHLIGHT

### The Positioning Statement

**"PRISM is the first manufacturing platform that unifies engineering intelligence with business operations -- replacing 4-5 separate tools with one system that knows the physics of your shop."**

### The Five Pillars of Differentiation

**1. Physics-Backed Everything**
Every number in PRISM traces back to material science. Quotes are not guesses -- they are calculations using cutting speeds, feed rates, tool life models, and power requirements. The SFC Calculator alone replaces HSMAdvisor + MachiningCloud for daily machinist use.

**2. 13-Mode Manufacturing Intelligence**
No competitor covers milling, turning, drilling, grinding, threading, honing, boring, broaching, plasma, wire EDM, sinker EDM, laser, and waterjet in one platform. PRISM supports the full spectrum of manufacturing processes, not just CNC milling/turning.

**3. Multi-Process Quoting**
CNC, sheet metal, additive, and injection mold quoting in one platform, all backed by the same material database and physics engine. A shop that does multiple processes does not need multiple quoting tools.

**4. Full Business Stack**
GL, AR/AP, payroll, HR compliance, capacity planning, inventory (with EOQ and ABC analysis), quality management (SPC/FAI/NCR), and job profitability -- without QuickBooks or a separate QMS.

**5. Decision Intelligence**
What-If analysis, AI-enhanced cutting parameters, material comparison tables, and job planner AI turn PRISM from a record-keeping system into a decision-making system.

---

## 6. CRITICAL GAPS TO CLOSE BEFORE GO-TO-MARKET

Priority-ordered list of features that are **dealbreakers** for the target market:

| Priority | Feature | Why | Competitor Reference |
|----------|---------|-----|---------------------|
| P0 | **Document control + revision management** | Cannot sell to AS9100/ISO shops without it | ProShop |
| P0 | **STEP/3D file upload for auto-quoting** | The single most requested feature in modern quoting | Paperless Parts |
| P0 | **Audit trail + electronic signatures** | Regulatory requirement, not optional | ProShop |
| P1 | **Customer portal** (view quotes, job status) | Expected by mid-market shops | ProShop, Paperless Parts |
| P1 | **Shipping + packing list management** | Missing last-mile of job lifecycle | ProShop, JobBOSS |
| P1 | **QuickBooks / Xero integration** | Many shops will keep their accountant's preferred software | JobBOSS |
| P2 | **Barcode scanning** (shop floor, receiving, inventory) | Table stakes for MES | JobBOSS, ProShop |
| P2 | **Work instructions with media** (photos, videos per operation) | Reduces operator errors, required by many quality systems | ProShop |
| P2 | **Stability lobe / chatter prediction** in SFC Calculator | Would make the engineering tool truly best-in-class | HSMAdvisor |
| P3 | **Manufacturer tool catalog integration** | Expand from ~30 materials to thousands of tools with real Sandvik/Kennametal data | MachiningCloud |

---

## 7. NAVIGATION AND UX OBSERVATIONS

### Issues Identified

1. **ERP group duplicates Shop group** -- Jobs, Scheduling, Inventory, Quoting appear in both "Shop" and "ERP" sections. This will confuse users. Recommendation: merge or clearly differentiate (e.g., "ERP" becomes "Planning" or the ERP section becomes the single source of truth).

2. **55 nav items is too many** for a sidebar. ProShop solves this with role-based dashboards (machinist sees different nav than estimator or accountant). PRISM needs role-based navigation filtering.

3. **"Billing" section contains only "Post Processors"** -- a marketplace feature. This is misnamed and confusingly placed.

4. **No visible notification/alert system** in the shell. ProShop and JobBOSS both surface alerts (overdue jobs, calibration due, low inventory) in the main navigation area.

5. **No search bar** in the header. With 55+ pages, users need a command-palette or global search.

6. **Generated Quote Doc renders as raw JSON** (`QuoteBuilderPage.tsx` line 239). This needs a formatted template.

7. **Job Summary renders as raw JSON** (`JobsPage.tsx` line 195). Same issue.

---

## 8. COMPETITIVE POSITIONING MATRIX

| Capability | ProShop | JobBOSS | Paperless Parts | MachiningCloud | HSMAdvisor | **PRISM v9** |
|-----------|---------|---------|-----------------|---------------|------------|------------|
| Speeds & Feeds Calculator | -- | -- | -- | Lookup only | **Best** | **Strong** |
| Multi-mode (13 processes) | -- | -- | -- | Tool data | Mill/Turn/Drill | **Best** |
| Physics-backed Quoting | -- | -- | Geometric | -- | -- | **Best** |
| Multi-process Quoting | -- | -- | CNC+SM+Add | -- | -- | **Best** |
| STEP Auto-Quote | -- | -- | **Best** | -- | -- | Missing |
| Job Tracking/MES | **Best** | Good | -- | -- | -- | Good |
| Quality (SPC/FAI/NCR) | **Best** | Basic | -- | -- | -- | Good |
| Document Control | **Best** | Basic | -- | -- | -- | Missing |
| Full Accounting (GL/AR/AP) | Via QB | Via QB | -- | -- | -- | **Native** |
| HR/Payroll | Basic | Basic | -- | -- | -- | **Best** |
| Customer Portal | **Best** | Basic | Good | -- | -- | Missing |
| Modern Web UI | Good | Poor | **Best** | Good | Desktop | **Best** |
| Chatter Prediction | -- | -- | -- | -- | **Best** | Partial |
| Tool Catalog Depth | -- | -- | -- | **Best** | Good | Limited |
| Ecosystem Maturity | **Best** | Good | Good | Good | Good | New |

---

## Summary

PRISM v9's thesis is correct: shops are running 4-5 disconnected tools and would benefit from unification. The SFC Calculator is genuinely world-class in its breadth (13 machine modes, 55+ operations, toolpath-aware, CAM-software-aware, safety-validated). The multi-process quoting is unmatched. The full financial stack is ambitious and potentially eliminates QuickBooks dependency.

The primary barriers to adoption are: (1) missing document control / audit trail for regulated industries, (2) no STEP-file auto-quoting to match Paperless Parts' UX, (3) navigation complexity that needs role-based filtering, and (4) ecosystem maturity/trust that only comes with time and reference customers.

The sales pitch should lead with: *"Your machinists already use HSMAdvisor. Your estimators use Paperless Parts. Your shop manager uses ProShop. Your accountant uses QuickBooks. What if one platform did all of it -- and the quoting was backed by the same physics your machinists trust?"*
