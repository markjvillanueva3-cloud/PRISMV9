# Quoting App Assessment — Shared Brief (ground truth for assessment workflow)

> Read-only assessment brief. Verified LIVE (preview server port 28968, branch cad-fusion-live-ms0)
> + grep over mcp-server/web/src + mcp-server/src. Agents: treat as established; verify any engine/
> action/file you cite by reading it (R12 — no fabricated symbols).

## HARD RULES (every agent)
- R12 fail-loud: NEVER fabricate an engine/action/file/signature. Cite only what you read/grepped. Unconfirmed → label UNVERIFIED.
- Distinguish BUILT (engine+action exist) vs WIRED-TO-WEB (/api route + FE page consume it) vs UI-PRESENT (rendered affordance).
- Cite file:line or dispatcher:action for every claim. Read-only — edit NOTHING. Use rtk-prefixed grep/git.

## QUOTING WEB APP — current live state
- Routes (App.tsx): /quote-builder, /quoting-workbench, /quote-analytics, /blueprint-quote, /sheet-metal, /additive, /mobile-capture-quote, /quote-follow-up (renders 0 chars live — BROKEN/empty), /quoting-calibration-health.
- Page LOC: QuoteBuilderPage 2459, QuoteFollowUpPage 1052, QuotingCalibrationHealthPage 679, QuoteAnalyticsPage 562, QuotingWorkbenchPage 455, AdditiveQuotePage 341, SheetMetalQuotePage 226, BlueprintQuotePage 217, MobileCameraQuotePage 160.
- CAD/print DROP BOX: ABSENT from every quoting route (live fileInputs=0 + dropHints=0 on all; only /quoting-workbench has 1 generic file input). Blueprint Quote (print→quote page) has ZERO upload.
- AUTO-REDACTION: ABSENT from quoting UI (redactHints=false on all routes; no redaction component in web/src).
- Reusable upload UI ALREADY BUILT elsewhere (grep, NOT wired to quoting): LatheUploadPage, MillingUploadPage, PartsLibraryPage, DocumentInboxPage, KnowledgeIngestionPage, CaptureOpsPage, DocumentLearningPage have type=file/dropzone/onDrop/FileReader.
- Live pages render thin because backend /api registries returned 0 + WebSocket "Reconnecting"; page SOURCE is substantial.

## QUOTING API SEAM (audited this session, resolving)
- /api/v1/quote/* → routes/quote.ts → prism_business: quoting_generate, quoting_price_breaks, quote_estimate, quote_compare_materials, quote_what_if, analytics_*(6), blueprint_to_quote, blueprint_resolve_material, sec_ops_*(5), sheet_metal_quote, additive_*(3), injection_mold_*, stock_size_*, material_price_*
- /api/v1/quotes/* → routes/quotes.ts → prism_business: instant_quote, instant_quote_qty_breaks, instant_quote_lead_time, quote_get_history, quote_status_change, quote_generate_share_token, quote_revise
- /api/v1/dfm/* → routes/dfm.ts → prism_cad: dfm_analyze/quick/tolerance_check/cost_impact/get_rules
- /api/mcp/quoting + /api/v1/quoting/* → routes/quoting.ts → prism_quoting: camera_intake_route, insert_box_lookup, machine_tag_extract, machine_parts_bom_resolve, vendor_realtime_price, live_chat_session_open/turn/close
- prism_quoting dispatcher (src/tools/dispatchers/quotingDispatcher.ts) has a LARGE enum BEYOND the 8 typed routes: quote_packet_generate, quote_xometry_style, scenario_generate, outsource_recommend, closed_loop_provenance_check, cost_savings, quoting_public_quote, quoting_public_instant_quote, jm_die_* family, quoting_calibration_* family, accuracy_* family, neural_route_quoting_task, deep_reasoning_* family, blueprint vision OCR bridges, freight/tax/secondary-ops/tolerance-pricing, mcmaster, docustrata_ingest, gcode_time_estimate — many NOT surfaced in any web route.
- charlie's 4 backend quoting MVP gaps CLOSED (QuotePacketEngine + quote_packet_generate, commit 7ba298c894).
