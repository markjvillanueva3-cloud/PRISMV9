# Quote Deep Audit — Agent 3: Frontend

## Pages (table)

| Page | File | Purpose | Status |
|------|------|---------|--------|
| Quote Builder | QuoteBuilderPage.tsx | Main internal quote UI: material/operation/qty picker, complexity/tolerance, finish profile, inspection, certification, delivery mode, customer intent | Complete (2400+ LOC) |
| Quote Analytics | QuoteAnalyticsPage.tsx | Accuracy tracking, win/loss conversion, calibration guidance via chart dashboards | Complete (charting) |
| Quote Follow-Up | QuoteFollowUpPage.tsx | Sales CRM: follow-ups, communication log (email/phone/meeting), opportunity stages, win/loss reasons | Complete |
| Blueprint to Quote | BlueprintQuotePage.tsx | Drawing intent → structured quote: feature extraction, part envelope, operation cost | Complete |
| Sheet Metal Quote | SheetMetalQuotePage.tsx | Specialized: thickness, bends, holes, finish (powder coat, etc.) | Complete |
| Additive Quote | AdditiveQuotePage.tsx | Specialized: technology (SLS/etc), material, support volume, post-processing | Complete |
| RFQ Inbox | RFQInboxPage.tsx | Sales intake: parse incoming RFQs, assign to estimators, track deadlines, status workflow | Complete |
| Customer Portal | CustomerPortalPage.tsx | Customer-facing: quote view/respond, order status, milestone timeline, quality docs, service cases | Complete |
| Job Profitability | JobProfitabilityPage.tsx | Post-quote: margin tracking, actual cost vs quoted, margin alerts, forecast by period | Complete |
| Financial Analysis | FinancialAnalysisPage.tsx | Capital decisioning: NPV, IRR, machine ROI, breakeven analysis | Complete |

## Customer-facing vs Internal

**Internal (Quote Desk):**
- QuoteBuilderPage: Full parameter control, DFM warnings, material comparison, quantity breaks, lead-time options
- QuoteAnalyticsPage: Variance/accuracy calibration for estimators
- RFQInboxPage: Incoming RFQ management
- QuoteFollowUpPage: Sales CRM and win/loss tracking

**Customer-facing:**
- CustomerPortalPage: Token-gated quote view/response, order tracking, milestone visibility, quality document upload, service case creation
- Shareable quotes: Share tokens for quote access (via quoteShareToken API)
- Quote response: Accept/reject/request_changes workflow

## PDF / Email Export

- **ExportButton.tsx:** Generic CSV/JSON export for data tables (timestamps included)
- **Quote sharing:** Share tokens provide time-limited, rate-limited portal access vs direct PDF
- **PDF export gap:** No native PDF quote generation detected; portal shows quote view but format/email delivery unclear
- **RFQ PDF:** RFQ inbox accepts PDF parsing but no outbound PDF quote export to customer

## Strengths / Gaps

**Strengths:**
- 6 specialized quote pages (sheet metal, additive, blueprint) show process-specific UI
- Full quote builder with DFM analysis, material comparison, quantity breaks
- Customer portal with token-based access control + service case/quality doc integration
- Post-quote profitability tracking (margin alerts, actual cost vs quoted)
- Sales CRM follow-up workflow (communication log, opportunity stages, win/loss)
- Quote analytics with variance calibration for estimators

**Gaps:**
- No visible quote-to-job conversion UI (quote approval queue missing)
- PDF/email export limited to CSV; no branded quote PDF generation
- No quote history pagination or search UI (history exists in API but not surfaced)
- Bid win/loss analytics basic (follow-up page has reasons but no trend dashboards)
- No variance dashboard visualizing quoted vs actual across job portfolio
- Customer portal UI incomplete (shareable URL / token management needs clarity)
- No approval workflow visible (internal quote sign-off before customer sees)

## Score (0-100)

**72/100**

**Reasoning:**
- Core quote builder (20/20): Mature, multi-parameter, DFM-aware
- Specialized pages (15/20): Sheet metal, additive, blueprint exist but coverage limited (no wire EDM, injection mold quote UIs)
- Customer portal (12/20): Token-gated access exists but PDF/email export weak
- Analytics (10/15): Variance tracking present but win/loss dashboard missing
- Quote-to-job (5/15): No visible conversion/approval workflow
- Post-quote tracking (10/15): Profitability page exists but not integrated with quote builder handoff

**Action items:** Implement quote-to-job flow UI, add PDF export, build win/loss dashboard, integrate quote approval queue.
