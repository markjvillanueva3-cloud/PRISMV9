---
name: reference_sfc_frontend_backend_wiring_audit_2026_06_25
description: "Live audit of all 7 SFC frontend->backend endpoints (/api/v1/sfc/*) on :3100 (slot:oscar 2026-06-25). SYSTEMIC finding: the web api-client (web/src/api/sfc.ts) request field names DRIFT from the backend Zod schemas, breaking calls end-to-end. deflection FIXED (stickout->overhang_length); cycle-time + power-torque + tool-life still broken (need decisions, not blind renames)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.186Z
aliases: reference_sfc_frontend_backend_wiring_audit_2026_06_25
---


**Context:** operator directive "start wiring backend to front end." Audited every SFC endpoint the web client calls, with EXACT frontend-contract payloads against the live :3100 bridge (R16 gap-closing). The new Claude-design redesign is NOT in the repo (external Figma artifact -- see prior turn); these are the EXISTING web client (`mcp-server/web/src/api/sfc.ts`) vs backend contract.

**Per-endpoint verdict (frontend request type vs backend schema/gate):**
| endpoint | frontend sends | backend wants | status |
|---|---|---|---|
| /calculate | machine_max_rpm/_power_kw (flat) | nested machine.spindle.* | FIXED earlier (U-OSC-SFC-PRODUCT-BRIDGE, applySfcMachineBridge in productDispatcher) |
| /engagement | tool_diameter, radial_depth | radial_depth | OK (match) |
| /surface-finish | feed, nose_radius | feed, nose_radius | OK (match) |
| /deflection | **stickout** | **overhang_length** | **FIXED this turn (U-OSC-SFC-DEFLECTION-WIRE, bridgeDeflectionParams at the route)** |
| /cycle-time | feed_rate, cut_length, num_passes, approach_distance, overtravel | cutting_feedrate, cutting_distance (+rapid_distance, rapid_rate) | **FIXED (U-OSC-SFC-CYCLETIME-WIRE, bridgeCycleTimeParams at the route).** Engineering-standard decomposition: cutting_feedrate<-feed_rate, cutting_distance<-cut_length*(num_passes||1), rapid_distance<-approach+overtravel. Assumptions (passes multiply cut; approach/overtravel=rapid) documented in the helper. 7 reference-value tests. |
| /power-torque | cutting_speed, feed_rate, depth, width (NO machine) | (passes Zod) then BLOCKED by pre-machine-completeness-gate | **BLOCKED -- gate-scope question.** Frontend sends no machine; the gate requires nested machine.spindle. power_torque computes a power DEMAND -- arguably shouldn't be machine-gated. Safety-gate-scope decision (defer: oscar soul refuses softening safety thresholds; physics-reviewer/operator territory). |
| /tool-life | cutting_speed, feed, depth (NO machine) | (passes Zod) then BLOCKED by pre-machine-completeness-gate | **BLOCKED -- same gate-scope question.** tool_life is pure Taylor T=(C/Vc)^(1/n) -- needs NO machine envelope. The completeness gate firing here is almost certainly OVER-BROAD; only full sfc_calculate (speed/feed -> real machine) needs it. Narrowing the gate's action-scope is a safety-design call. |

**SYSTEMIC INSIGHT (the real wiring lever):** the SFC web api-client field names were written against a contract that drifted from the backend Zod schemas. Two classes: (A) field-name synonyms (stickout/overhang_length, feed_rate/cutting_feedrate, cut_length/cutting_distance) -- bridge at the route boundary (deflection-pattern, route-SCOPED so global aliases don't break sibling calc actions); (B) the machine-completeness gate applies to component calcs (power_torque, tool_life) the frontend doesn't feed machine data to -- needs a gate-scope review (which calc actions truly require machine completeness?). The REDESIGN wiring should adopt a reconciled api-client whose field names match the backend schemas (or rely on route bridges). Bridges carry forward (HTTP path, stable).

**Next (for whoever continues SFC frontend wiring):** (1) cycle-time -- decide the pass->distance composition + bridge or align; (2) power_torque/tool_life -- review the pre-machine-completeness-gate action-scope with physics-reviewer (likely: don't gate component calcs); (3) re-probe all 7 after a :3100 rebuild+restart (the deflection fix is in source, not yet on the running dist). Pairs with [[reference_oscar_sfc_product_bridge_2026_06_25]] (the /calculate machine-bridge, same drift class).
