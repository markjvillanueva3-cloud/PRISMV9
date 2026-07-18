# ERP Audit — Agent 5: CRM / Customer Management

## Engines Found

**Core CRM (5 engines):**
- **CustomerManagementEngine** — Full CRM: customer records (credit limits, pricing tiers: standard/preferred/contract/wholesale), 4-status lifecycle (active/inactive/on_hold/prospect), discount tracking
- **CustomerPortalEngine** — Token-based external customer portal; 32-byte crypto tokens, time-limited (default 30 days), scoped access (view/respond/documents/messages), rate-limited (10 req/min)
- **CustomerKnowledgeEngine** — Tribal knowledge profiles per customer; learned modifiers (speed/feed/DOC factors), job outcome tracking, shop-specific confidence boosting
- **CustomerPortfolioMinerEngine** — Mines 118 JM Die customer folders + 15,599 lathe programs; extracts tool preferences, operation patterns, feed/speed/CSS statistics, G85/G87 cycle usage
- **WetRunCustomerCommunicationLogEngine** — Append-only communication log with SLA enforcement (24h–14d windows per topic); 7 topic types (kickoff, parameter_change, schedule_slip, quality_issue, sev1_incident, pilot_exit, general)

**Sales Pipeline & Analytics (6 engines):**
- **QuoteAnalyticsEngine** — Quote accuracy tracking: quoted vs actual costs, margin erosion, cycle-time variance, loss reasons (price/lead-time/competitor/spec-mismatch). Win/loss feedback loop.
- **LatheJobProfitabilityAnalyticsEngine** — Per-job waterfall (revenue − material − labor − tool wear − overhead = gross margin); portfolio Pareto (80/20) by customer/part; ABC costing
- **JobProfitabilityWaterfallEngine** — Multi-job comparison, sensitivity analysis, what-if decomposition across 9 cost buckets (material/tool/labor/machine/setup/scrap/rework/overhead/secondary)
- **LatheCustomerOrderLifecycleEngine** — 14-state order machine (draft→quoted→accepted→scheduled→in_production→shipped→invoiced→closed); audit trail on every transition; rejection/on_hold/returned/disputed branches
- **CrossCustomerPolicyTransferEngine** — Policy reuse across customers; transfers speeds/feeds between customers sharing material_class + operation + machine_class; weighted ensemble from multiple sources
- **LatheAutoQuoteFromPrintEngine** — Auto-quote generation from prints (not explicitly found but referenced in pipeline)

## Customer Portal Status

**Active** — CustomerPortalEngine fully implemented:
- Cryptographic token auth (no PRISM account required)
- Scopes: view, respond, documents, messages
- Token revocation + access counting
- Quality documents (FAI, material cert, COC, inspection, NDT)
- Quote view (revision, pricing, DFM issues, lead-time tiers)
- Order status (milestones, delivery)
- Messaging (email-like inbound/outbound)
- Rate limiting + expiration enforcement

## Sales Pipeline

**Complete quote-to-order lifecycle:**
1. RFQ intake (BusinessDocumentExtractorEngine parses POs/RFQs via OCR)
2. Quote generation (InstantQuoteEngine, AdditiveQuoteEngine, SheetMetalQuoteEngine, etc. per process)
3. Quote revision + customer response (QuoteRevisionEngine + CustomerPortalEngine)
4. Order acceptance → Order lifecycle state machine (14 states, audit trail)
5. Opportunity tracking (SalesOpportunity: prospect→rfq_received→quoted→negotiating→won/lost)
6. Win/loss analytics (QuoteAnalyticsEngine: loss reasons, margin accuracy)

## Profitability Rollup

**Hierarchical analytics:**
- Per-job: waterfall (9 cost buckets), margin %, on-time % via JobProfitabilityWaterfallEngine
- Per-customer: total revenue, avg job value, avg margin, quote win rate, lifetime months via CustomerAnalytics (CustomerManagementEngine)
- Portfolio: Pareto concentration, top/bottom N by customer/part, cumulative analysis via LatheJobProfitabilityAnalyticsEngine
- Cross-job comparison + sensitivity analysis (what-if cost/margin scenarios)

**Gaps identified:**
- No explicit Dun & Bradstreet integration (credit check not found)
- NPS/satisfaction survey engine not found
- Contract pricing management not explicit (only 4 tiers)
- Customer-specific pricing rules not fully wired

## Score: 74/100

**Strengths:**
- CustomerManagementEngine: solid CRM foundation (credit, tiers, status, comms log)
- Portal: production-grade token auth + scoped access
- Quote-to-order: end-to-end lifecycle with audit trail
- Analytics: waterfall + portfolio + Pareto (sophisticated)
- Win/loss tracking: 7-category loss reasons + accuracy feedback loop
- Tribal knowledge: customer learning engine with modifier tracking

**Weaknesses:**
- No external credit bureau integration (Dun & Bradstreet, Equifax)
- NPS / satisfaction survey absent
- Contract pricing underspecified (4 fixed tiers only)
- Customer-specific pricing rules not wired to quote engine
- Lead scoring / opportunity probability not AI-driven
- No churn prediction or customer health scoring
- Communication SLA only in wet-run pilot, not production

**Production-ready:** CustomerManagementEngine, CustomerPortalEngine, QuoteAnalyticsEngine, OrderLifecycle
**Beta/Pilot:** CrossCustomerPolicyTransferEngine, CustomerPortfolioMiner (depends on JM Die folder structure)
