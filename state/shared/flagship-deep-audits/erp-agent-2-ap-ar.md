# ERP Audit — Agent 2: AP / AR

## AR Engines Found

### InvoicingEngine ✓
- **Location**: `/src/engines/InvoicingEngine.ts`
- **Features**:
  - Invoice creation from line items or job cost breakdown
  - Payment tracking (check, wire, ACH, credit_card, cash)
  - Invoice status tracking: draft, sent, viewed, partial, paid, overdue, void
  - Aging report (current, 30, 60, 90, over-90 buckets)
  - Revenue by customer analytics
  - Markup-based pricing from job costs
  - Tax & discount calculations
  - Payment terms (default Net 30)

### CustomerManagementEngine ✓
- **Location**: `/src/engines/CustomerManagementEngine.ts`
- **Features**:
  - Customer records with credit limits
  - Payment terms & pricing tiers
  - Current balance tracking
  - Credit limit enforcement
  - Tax exemption & tax ID (1099 ready)
  - Communication logs (email, phone, meetings)
  - Sales opportunity pipeline
  - Win/loss tracking

### StripeBillingEngine (Partial AR)
- **Location**: `/src/engines/StripeBillingEngine.ts`
- **Features**:
  - Subscription billing (monthly/annual)
  - Post-processor purchase billing
  - Webhook event handling
  - Test mode with mock data

## AP Engines Found

### PurchaseOrderEngine ✓
- **Location**: `/src/engines/PurchaseOrderEngine.ts`
- **Features**:
  - PO lifecycle: draft → submitted → approved → received → paid
  - Line item tracking with quantity received
  - Three-way match (PO → Receipt → Invoice) **IMPLEMENTED** ✓
  - Receiving records with condition tracking (good/damaged/wrong_item)
  - AP aging summary by supplier (current, 30, 60, 90+ days)
  - Payment terms support (default Net 30)
  - Supplier tracking & linked jobs
  - Receive-hooks for event-driven restocking (ToolUsageEngine integration)

### AccountingHardeningEngine (AP Support)
- **Location**: `/src/engines/AccountingHardeningEngine.ts`
- **Features**:
  - Bank reconciliation (match bank txns to GL entries)
  - WIP valuation (absorption/variable/throughput methods per GAAP ASC 330)
  - Variance analysis (price, quantity, mix)
  - EAC/ETC forecasting
  - Period-over-period comparison
  - QuickBooks Online sync mapping
  - GAAP compliance (ASC 330, 606, 450)

### FinancialAnalysisEngine (Investment Analysis)
- **Location**: `/src/engines/FinancialAnalysisEngine.ts`
- **Features**:
  - NPV, IRR, payback period, ROI calculation
  - Machine investment evaluation
  - Depreciation methods (straight-line, accelerated)
  - Break-even analysis

## Three-way Match Status

**FULLY IMPLEMENTED** ✓

- **Route**: `POST /po-three-way-match` (src/routes/erp.ts)
- **Schema**: `po_three_way_match` (src/schemas/businessActionSchemas.ts)
- **Logic** in `PurchaseOrderEngine.ts`:
  - Compares PO total ↔ Receiving total ↔ Invoice total
  - Validates quantity_match and price_match
  - Flags discrepancies with field-level diff reporting
  - Returns overall_match boolean

## Payment Methods

**Supported** in InvoicingEngine.Payment interface:
- Check ✓
- Wire ✓
- ACH ✓
- Credit card ✓
- Cash ✓
- Other (custom) ✓

## Score: 72/100

### What's Strong
1. Core AR/AP engines functional: InvoicingEngine, CustomerManagementEngine, PurchaseOrderEngine
2. Three-way match fully implemented with discrepancy tracking
3. Aging reports for both AR (customer invoices) and AP (supplier payables)
4. Multiple payment methods supported
5. Customer credit limits enforced
6. Bank reconciliation & WIP valuation in place

### Gaps Identified
1. **Missing**: VendorEngine (supplier master data, terms, 1099 tracking)
2. **Missing**: PaymentEngine (orchestration, remittance processing)
3. **Missing**: ACHEngine (bank routing, file format generation per NACHA)
4. **Missing**: CheckPrintingEngine (MICR encoding, fraud detection)
5. **Missing**: CollectionEngine (dunning/late fees, escalation rules)
6. **Missing**: Cash discount logic (2/10 Net 30 not implemented)
7. **Missing**: Statement/past-due notice generation
8. **Missing**: 1099 generation (tax form automation)
9. **Limited**: Payment gateway integration (only Stripe for SaaS subscriptions, not B2B AP)
10. **No evidence**: Invoice-to-PO matching verification workflow

### Next Phase Recommendations
- Build VendorEngine for supplier master data & 1099 tracking
- Create CollectionEngine with dunning letter templates & escalation rules
- Implement CheckPrintingEngine for secure check generation
- Add cash discount calculator (Net 30 vs 2/10 Net 30)
- Build statement generation & email notification system
- Integrate ACH file generation (NACHA 94/101 format)
- Add payment gateway orchestration layer (support multiple processors)

