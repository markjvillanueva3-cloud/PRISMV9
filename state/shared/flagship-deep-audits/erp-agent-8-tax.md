# ERP Audit — Agent 8: Tax Engines

**Audit Date:** 2026-05-08  
**Scope:** Sales tax, use tax, nexus, 1099 generation, SaaS subscription tax, and tax API integration across PRISM ERP stack

## Sales Tax Status
**Coverage:** 0/5 engines (0%)  
**Risk Level:** CRITICAL

PRISM has **no sales tax engine**. Quote/invoice system (QuoteEngine, WEDMInvoiceLineEngine, FinancialAnalysisEngine) calculates costs but does NOT:
- Apply state/county/city sales tax rates
- Handle tax-exempt customers
- Track nexus by fulfillment location
- Generate tax-jurisdictional line items

**Gap:** Tax is subsumed in margin during quoting (per Shop+HR Audit). No separate tax line item on invoices. Multi-tenant SaaS across 50 states triggers nexus obligations in all states where customers are located.

## Nexus Determination
**Coverage:** 0/1 engine (0%)

No NexusDeterminationEngine exists. PRISM cannot:
- Identify where business has tax obligation (economic nexus, physical presence)
- Track customer state/zip for sales tax jurisdiction
- Determine if SaaS subscription triggers digital services tax (CA 7.25%, WA 6.5%)
- Flag multi-state compliance requirements

**Risk:** Operating SaaS in 50 states without nexus determination violates Wayfair (2018) economic nexus rules.

## Tax Exemptions
**Coverage:** Partial (HRComplianceEngine only)

Only payroll tax exemptions tracked (FICA wage base cap). No:
- Sales tax exemption certificate management
- Tax-exempt customer registry
- Reseller permit tracking
- Exempt use certificate audit trail

## API Integration (Avalara/TaxJar)
**Coverage:** 0/1 integration (0%)

**Status:** NOT WIRED

No external tax API calls. PRISM does not integrate:
- **Avalara AvaTax** (address validation, rate lookup, exemption, filing)
- **TaxJar** (simplified nexus, compliance calendar)
- **Vertex** (enterprise-grade, multi-country VAT/GST)

Without API integration, PRISM cannot auto-calculate tax or file returns.

## 1099 Generation
**Coverage:** Mentioned in Payroll Audit (gap), 0% implemented

Payroll audit (shop-agent-3-payroll.md) flagged:
- **No W-2/1099 generation engine** (CRITICAL)
- **No 1099-NEC vs 1099-MISC logic** (contractor vs misc. income)
- **No 1099-K** (payment processor integration)
- **No quarterly 941-C** filing orchestration

Risk: Cannot file annual tax forms; vendors unpaid without 1099s.

## SaaS Subscription Tax
**Coverage:** 0/1 engine (0%)

Digital services tax rules vary by state:
- **WA:** 6.5% on SaaS (effective 2023)
- **CA:** 7.25% base on digital products
- **IL:** 6.25% on digital goods
- **EU:** VAT 17–27% on SaaS (requires reverse-charge for non-EU customers)

PRISM applies no SaaS-specific tax rules. Quote system treats subscriptions like physical goods.

## Use Tax & Sourcing
**Coverage:** 0/2 engines (0%)

No UseTagEngine or SourcingEngine. Cannot:
- Track out-of-state shop purchases (wire, tools, materials)
- Accrue use tax liability (self-assessed when vendor doesn't charge)
- Determine origin vs destination sourcing rules
- Flag multi-state use tax filing deadlines

## International (VAT/GST)
**Coverage:** 0% (not in scope for current PRISM US-only deployment)

No VAT/GST engine for EU expansion. Would require:
- VAT number validation (VIES API)
- Reverse-charge logic for B2B
- Country-specific exemptions
- EC Sales List (ESL) reporting

## Score: 12/100

**Breakdown:**
- Sales tax engines: 0/5 (0%)
- Nexus determination: 0/1 (0%)
- Tax exemption management: 0/1 (0%)
- API integration: 0/1 (0%)
- 1099 generation: 0/3 (0%)
- SaaS tax rules: 0/1 (0%)
- International VAT/GST: 0/1 (N/A)

**Compliance Risk:** CRITICAL
- Cannot charge tax → revenue shortfalls
- Cannot file returns → penalties + interest
- Cannot generate 1099s → IRS penalties
- No nexus tracking → multi-state liability exposure

**Verdict:** PRISM ERP is **not tax-compliant** and **not production-ready** for SaaS/multi-state shipping without:
1. SalesTaxCalculationEngine (Avalara integration)
2. NexusDeterminationEngine (customer geolocation)
3. TaxExemptionEngine (certificate management)
4. 1099GenerationEngine (W-2, 1099-NEC, 1099-K, 1099-MISC)
5. FilingOrchestrationEngine (quarterly, annual reconciliation)
6. InternationalTaxEngine (VAT/GST for EU expansion)

**Recommended Next:** Fork /forge-triple to build SalesTaxCalculationEngine with Avalara API, then NexusDeterminationEngine, TaxExemptionEngine, and 1099FormEngine.
