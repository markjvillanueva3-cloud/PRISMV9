---
name: reference_xray_extract_router_gap_close_2026_06_24
description: "blueprintExtractionRouter GAP-MATRIX closed -- 4 last consumers (smart_tool_select/stock_allowance/lathe_workholding/setup_sheet) wired 16->20; consumer-application-map section-1 was under-counted (doc had 11, router already had 16) -- doc-corrected"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.273Z
aliases: reference_xray_extract_router_gap_close_2026_06_24
---


**blueprintExtractionRouter GAP-MATRIX closed (2026-06-24, slot xray, U-XRAY-EXTRACT-ROUTER-GAP-CLOSE).**

Continuation of the "apply blueprint extraction to ALL prism features" arc ([[reference_xray_extract_consumer_router_2026_06_24]] + the app-integration plan). Wired the 4 last verified-on-disk consumers from `blueprint-extraction-consumer-application-map-2026-06-24` section-2 GAP matrix into `mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts` CONSUMERS table (16 -> 20):
- `smart_tool_select` -> prism_cam:smart_tool_select (camDispatcher.ts enum 1297 / case 7280) -- CAM-orchestrated sibling of `tool_select` (prism_calc:tool_select_recommend).
- `stock_allowance` -> prism_calc:stock_allowance (calcDispatcher.ts enum 824 / case 5428) -- per-surface stock-removal envelope, distinct from `stock_optimize` (= raw-blank sizing).
- `lathe_workholding` -> prism_turning:lathe_workholding_select_jaw (turningDispatcher.ts enum 240 / case 2783 -> latheWorkholdingEngine.selectJaw) -- turning sibling of `fixture_design`.
- `setup_sheet` -> prism_cam:setup_sheet_generate (camDispatcher.ts enum 1261 / case 6441).
All `advisory`, eligible uniformly on `dims>0`, `blocking:0` -- they can NEVER confirm-gate (the gate is structurally bound to `kind==="commitment"`).

**R8/R12 finding (read the live code, not the stale map):** the consumer-application-map section-1 claimed "11 consumers" but the LIVE router already had 16 -- fai_run/spc_calculate/cmm_plan_path/material_price_lookup/job_create were wired yet UNDOCUMENTED in section 1 (they sat in section-2's "NOT yet wired" GAP matrix while already in the router). Doc-corrected the map: section 1 now lists all 20, section 2 marked CLOSED. Lesson: a consumer-map doc rots fast against the live `CONSUMERS` table -- verify the code is the source of truth before trusting the doc's count, and reconcile the doc when you find the drift.

**Validation:** 26 tests green (19 router unit incl. a new 4-test gap-close describe block that fails if a consumer is flipped to commitment / its action string changes / its eligibility field changes; + 7 prism_cad round-trip); tsc-clean; per-file 2-arm scrutiny (code-analyzer + reviewer) BOTH PASS -- each independently disk-verified all 4 dispatcher:action pairs, hand-derived every changed count, and confirmed no silent breakage (documentExtractionRouter is an isolated separate router, TOTAL_CONSUMERS=3). The blueprint extraction contract now fans out to every verified prism feature that can consume it -- the section-2 gap is fully closed.
