# Quoting System — Frontend-Readiness Determination (2026-06-22, slot:charlie)

> **Operator question:** "is our [quoting] system built enough and properly to start focusing on
> front end build, web app ui, electron app version and ios/android version?"
>
> **Method:** benchmarked PRISM's LIVE quoting build against a 26-item production-quoting-SaaS
> feature checklist synthesized from a deep-research pass over Xometry, Paperless Parts, Protolabs,
> DigiFabster, Fictiv, MakerVerse (June 2026). Evidence = live `quoting-pipeline-verify` (436/436),
> the `prism_quoting` dispatcher (88 actions), and a read-only inventory of `mcp-server/web/`.
> Research detail: `knowledge/wiki/quoting/_staging/deep-domain-research-2026-06-09.md` + the
> 2026-06-22 research synthesis (this session).

## TL;DR VERDICT

**YES — pivot to the customer-facing frontend is justified and is now the single highest-ROI
surface.** The backend pricing+closed-loop engine is production-grade (and has the quote-vs-actual
reconciliation that even market leaders LACK). The two things still holding back *quote accuracy at
scale* are **DATA** (real (predicted,actual) price pairs — needs xray OCR) and **CREDS** (live ERP —
operator action). NEITHER is a frontend-vs-backend question, so they should run as parallel backend
threads, not as a blocker to the frontend build.

**Caveat on scope:** native **iOS/Android** quoting apps should be **DEFERRED**. Deep research is
unambiguous: best-in-class quoting (Xometry, Paperless, Protolabs) is **web-first**; "apps" are
CAD-embedded add-ins (Fusion/SOLIDWORKS/Onshape), and standalone native phone quoting apps are
essentially absent in the market. Table-stakes "mobile" = **responsive web + a CAD-plugin quote
add-in**. Electron is cheap once the web app exists (same React bundle). Build order: **web → electron
→ (CAD plugin) → defer native mobile.**

## Scorecard — 26-item production-quoting checklist vs PRISM live build

Legend: ✅ built+wired+tested · 🟡 built, gap (data/ui/creds) · ❌ not built · (xg)=cross-galaxy dep

### (A) Backend / pricing engine — **STRONG (~85%)**
| # | Capability | PRISM status | Evidence |
|---|---|---|---|
|A1|Dual costing (time-based + cost-based)|✅|`JobCostingEngine`,`CycleTimeEstimatorEngine`,`GCodeTimeEstimatorEngine`,`CostEstimationEngine`|
|A2|ML cycle-time accounting for kinematics (not naive MRR)|✅|`gcode_cycle_time` (S-curve + canned cycles + kinematics)|
|A3|Closed-loop learning (outcomes refine pricing)|🟡 data-ceiling|`QuotingClosedLoopEngine` OODA + provenance gate + outcome ledger; functionally complete, only ~10 real pairs|
|A4|Per-shop configurable pricing logic|✅|`jm-die-profile.ts` rates · `quoting_dynamic_shop_rate`|
|A5|Lead-time as priced/predicted output (economy/std/expedite)|✅|`quoting_lead_time_tiers`|
|A6|Personalized / customer-history pricing|✅|per-customer calibration factors (`quoting_active_factor_*`)|
|A7|Bootstrap-from-examples|🟡|`quoting-baseline-from-corpus` (473 real customers); not a 10-part quick-start UX|
|A8|Margin visibility + auto-no-quote|✅|margin-floor gate · `outbound_promote_check` · `CostAlarmEngine`|

### (B) CAD / geometry — **PARTIAL (~45%), the accuracy bottleneck (xg: xray/delta)**
| # | Capability | PRISM status | Evidence |
|---|---|---|---|
|B9|Multi-format ingest (STEP/STL/IGES/DXF/2D PDF)|🟡 (xg)|delta CAD readers + `BlueprintToQuoteBridgeEngine`|
|B10|Automatic Feature Recognition → operations|🟡 (xg)|cad feature-recognition; quote-side consumption partial|
|B11|Setup-count + volume-removal + complexity|🟡 (xg)|per-part VOLUME is the documented FMV-consumption blocker|
|B12|Automated DFM with hard gate|🟡|`dfmAnalyze`,`dfmCostImpact` exist; warning-vs-failure gate not enforced|
|B13|GD&T / PMI / tolerance extraction|🟡 (xg)|**xray OCR** — the data-ceiling blocker for real actuals|
|B14|Mesh repair + BOM/assembly decomposition|❌|not in quoting path|
|B15|Sheet-metal flat-pattern unfold|🟡|`SheetMetalQuoteEngine` exists; unfold depth unverified|

### (C) Customer-facing frontend / UX — **WEAK (~60% internal, ~0% customer-facing) ← THE GAP**
| # | Capability | PRISM status | Evidence |
|---|---|---|---|
|C16|Drag-drop multi-file upload → instant price|❌ customer / 🟡 internal|`QuoteBuilderPage` (internal); no public upload|
|C17|Interactive 3D viewer + inline DFM highlight|❌|no 3D viewer in web app|
|C18|Live configurator (material/finish/qty/tol → live price + qty-break table)|🟡|`QuotingWorkbenchPage` close; no live-update "design ladder"|
|C19|Lead-time/price-tier selector w/ ship-date|🟡|tiers in backend (`quoting_lead_time_tiers`); thin UI|
|C20|Per-line certs (ITAR/CoC) + param search|❌|not built|
|C21|Checkout / quote history / reorder / share|❌ customer|`QuoteFollowUpPage` internal-only; no self-serve portal|

### (D) Business / ERP / reconciliation — **STRONG backend (creds-blocked live)**
| # | Capability | PRISM status | Evidence |
|---|---|---|---|
|D22|RFQ-inbox AI (email ingest, OCR, spec/ITAR flag)|🟡|`camera_intake_route`/`quoting_phone_ocr` (image); email-RFQ ingest not built|
|D23|One-click quote→order/ERP conversion|✅|`QuoteToOrderBridgeEngine` · `ERPCostFeedbackEngine`|
|D24|**Quote-vs-actual reconciliation**|✅ (PRISM moat)|closed-loop OODA — the capability leaders LACK (Paperless needs Datanomix); data-ceiling-bound|
|D25|Compliance/security (ITAR/AES)|🟡|partial; not audited here|

### (E) Mobile — **DEFER native; web-first is correct**
| # | Capability | PRISM status | Evidence |
|---|---|---|---|
|E26|Responsive web + CAD-plugin (NOT native app)|🟡|`MobileCameraQuotePage` (responsive web OCR); native iOS/Android = defer per market reality|

## Where PRISM LEADS vs the market
- **Quote-vs-actual closed loop (D24)** — the most commonly *missing* capability among leaders
  (Paperless explicitly punts it to Datanomix). PRISM has it native. This is the moat — protect it.
- **Physics-grounded cycle-time** (real Kienzle/Taylor/S-curve kinematics, not regression-only).

## The two REAL backend blockers (parallel threads, NOT frontend blockers)
1. **DATA SCALE** — real (predicted,actual) price pairs are capped at ~10 curated rows. Unblock via
   **xray OCR** of the JMD Orders-Closed corpus (~12,761 POs; $355M settled). Owner: xray (+charlie
   wiring). This raises closed-loop coverage past 40% and makes A3/D24 trustworthy at scale.
2. **LIVE ERP CREDS** — `AccountingHardeningEngine`/`E2ShopConnectorEngine` need QuickBooks/E2
   credentials (U-QP-ACCOUNTING-WIRE). **Operator action**; code shell is shipped.

## Recommended sequencing (operator decision)
1. **Customer-facing web quoting MVP** (biggest unbuilt surface, makes the product sellable):
   public upload → instant quote → live configurator (C18) → quote packet PDF/email (C21) →
   quote history portal. Owners: **quebec (frontend) + charlie (backend contracts)**.
2. **3D viewer + DFM hard-gate (C17/B12)** — table-stakes for a credible quoting UX.
3. **Electron wrapper** — cheap reuse of the web React bundle once (1) lands.
4. **Parallel backend:** xray-OCR data-scale pipeline (blocker #1) + ERP creds (blocker #2).
5. **DEFER native iOS/Android** — below even market-leader behavior; revisit as a CAD-plugin instead.

## Honest limits of this determination (R12)
- Backend "built" = wired+tested at the dispatcher/script level (436/436 quoting-pipeline + 88
  actions). It is NOT a claim of customer-validated accuracy — that is data-ceiling-bound (blocker #1).
- The CAD/geometry (B) and OCR (B13) rows are cross-galaxy (delta/xray); status reflects the quoting
  consumption seam, not those galaxies' full internal build.
- The frontend inventory is a code/route read, not a live UX walkthrough; "~0% customer-facing"
  means no public portal/RFQ-intake/quote-packet route was found, not that pages are broken.
