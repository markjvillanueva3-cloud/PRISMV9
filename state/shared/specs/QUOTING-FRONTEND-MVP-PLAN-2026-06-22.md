# Customer-Facing Quoting Web MVP — Build Plan (2026-06-22, slot:charlie)

> Turns the greenlit verdict (`QUOTING-FRONTEND-READINESS-DETERMINATION-2026-06-22.md`) into a
> build-ready plan. Scope = the **minimum SELLABLE customer-facing quote flow**: upload -> instant
> quote -> configure -> quote packet -> history. Maps each screen to the EXISTING backend (88
> `prism_quoting` actions, API bridge `POST /api/mcp/quoting` -> `quotingDispatcher`) so the frontend
> is mostly a consumer, not net-new backend. Owners: **quebec** (frontend primary) + **charlie**
> (backend contract gaps). Cross-galaxy via chat bus.

## Why an MVP (not the full 26-item checklist)
The determination scored backend ~85% and customer-facing frontend ~0%. The 9 existing web pages are
INTERNAL workbench tools (`QuoteBuilderPage`, `QuotingWorkbenchPage`, `QuoteAnalyticsPage`,
`QuotingCalibrationHealthPage`, `QuoteFollowUpPage`). The MVP reuses their logic behind a
customer-facing skin + fills 4 backend contract gaps. Defer the deep moat features (3D viewer,
RFQ-email AI, native mobile) to post-MVP.

## MVP screens -> backend mapping
| # | Screen | Customer action | Backend actions (EXISTING) | Gap to fill |
|---|--------|-----------------|----------------------------|-------------|
|S1|**Upload / Intake**|drag-drop CAD/print (STEP/STL/PDF)|`camera_intake_route` (classify)|public upload route -> `BlueprintToQuoteBridgeEngine`; today upload is internal-only|
|S2|**Instant Quote**|see price + lead-time tiers instantly|`fair_market_value`,`gcode_cycle_time`,`quoting_lead_time_tiers`|customer-facing render (logic exists in QuoteBuilderPage)|
|S3|**Configurator**|material/finish/qty/tolerance -> live price + qty-break table|`quoting_secondary_ops_price`,`quoting_tolerance_pricing`,`quoting_freight_quote`,`quoteQtyBreaks`|live-update "design ladder" UX (QuoteBuilderPage has static compare)|
|S4|**Quote Packet**|download PDF / email quote|`quotingGenerate`,`inflation_adjust`|**PDF + email packet generator (NEW backend, charlie)**|
|S5|**Quote History**|self-serve list, re-quote, status|`quoteHistory`,`customerFollowUps`,`quoteShareToken`|customer portal (QuoteFollowUpPage is internal)|

## Backend contract gaps charlie must close (the only net-new backend)
1. **Public quote endpoint** — a customer-safe wrapper over `BlueprintToQuoteBridgeEngine` +
   `fair_market_value` that NEVER leaks internal calibration/cost-basis internals (margin floor
   applied, no raw $/in3). New thin dispatcher action `quoting_public_quote` (charlie).
2. **Quote-packet generator** — `quotingGenerate` -> formatted PDF (+ optional email). New engine
   `QuotePacketEngine` or extend `quotingGenerate`. Charlie backend; quebec triggers it.
3. **Customer-scoped quote store + share token** — `quoteShareToken` exists; add a customer-scoped
   read so S5 lists only that customer's quotes (no cross-customer leak — charlie soul: conservative).
4. **Margin-floor + DFM gate ON the public path** — reuse `outbound_promote_check` margin floor;
   B12 DFM hard-gate is built HERE (with the checkout flow) not before — a DFM "failure" verdict
   blocks `quoting_public_quote` emission until revision (matches Fictiv/Protolabs research).

## Build sequence (dependency order — R13 logical order)
1. **Public API surface + customer session** (quebec) — auth-lite, customer id scoping.
2. **S1 upload -> quote route** (charlie: `quoting_public_quote` + BlueprintToQuoteBridge wire; quebec: upload UI).
3. **S2 + S3 instant-quote + configurator** (quebec — reuse QuoteBuilderPage logic, customer skin; charlie: confirm actions customer-safe).
4. **S4 quote-packet PDF/email** (charlie: packet generator; quebec: download/email UI).
5. **S5 quote history portal** (quebec; charlie: customer-scoped read + share token).
6. **B12 DFM hard-gate** — built WITH the checkout flow (step 2-4), not standalone (avoids orphan gate).
7. **Electron wrapper** — reuse the React bundle (cheap once web MVP lands).

## Explicitly DEFERRED (post-MVP / not now)
- **Native iOS/Android** — market is web-first + CAD-plugin; revisit as a CAD add-in.
- **Interactive 3D viewer + inline DFM highlight** — high value but post-MVP (needs xray/delta geometry).
- **RFQ-email-inbox AI (D22)** — Paperless Wingman-class; large, post-MVP.
- **Live quote accuracy at scale** — gated by xray-OCR data blocker (parallel thread, not MVP-blocking;
  MVP can ship on the current physics+baseline pricing with margin floor + confidence shown).

## Eval gates for the MVP build (R15 WIRE->TEST->VALIDATE)
- Each new backend action: real reference-value tests + round-trip through `quotingDispatcher` + a
  customer-safe assertion (no internal cost-basis/calibration leak).
- Each screen: renders on a real quote from a real JM part; price within margin-floor; lead-time tiers shown.
- E2E: upload a JM print -> instant quote -> configure qty -> download packet, on live data.

## Status
Plan only — no code shipped in this artifact. Hands the MVP to a quebec+charlie cross-galaxy build.
Backend is verified green at 2 layers this session (pipeline 436/436 + engines 137/137 = 573 tests)
so the consumer surface is building on a proven foundation (R13).
