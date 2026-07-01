# QUOTING-SYNERGY-MS0/U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER (slot:charlie): fix the silent intake->quote adapter gap (OCR shape never reached the bridge)

**Commit:** `d447cee20254` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T21:26:33-05:00
**Tags:** quoting-synergy-ms0, u-qp-blueprint-ocr-bridge-adapter, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER (slot:charlie): fix the silent intake->quote adapter gap (OCR shape never reached the bridge)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER (slot:charlie): fix the silent intake->quote adapter gap (OCR shape never reached the bridge)

The blueprint->quote intake path was a SILENT BUG. Both call sites --
shopDispatcher.emp_blueprint_to_quote + businessDispatcher.blueprint_to_quote --
fed BlueprintOCREngine's BlueprintAnalysis straight into
BlueprintToQuoteBridgeEngine.bridge(), which consumes a STRUCTURALLY DIFFERENT
local BlueprintAnalysis. They collide by NAME only: OCR emits gdt_frames /
dim.nominal / dim.raw_text / gdt.datum_references / title.title; bridge reads
gdt / dim.value / dim.text / datum_refs / part_name. So bridge() read
analysis.gdt (undefined -> ALL GD&T silently dropped), mis-read dimensions, and
lost the part name -> under-spec'd quotes from real prints, with no error.
shopDispatcher failed tsc (TS2345 + TS2694); businessDispatcher hid the same
runtime bug behind z.record(any).

Fix = a typed normalizer + entrypoint on the bridge engine (single source of truth):
- fromOCRAnalysis(ocr): maps OCR shape -> bridge-local shape. Key remaps:
  gdt_frames->gdt (the GD&T-drop fix), nominal->value, raw_text->text,
  datum_references->datum_refs, applied_to->feature_type, title->part_name.
  tolerance {upper,lower} passed through (bridge owns |upper-lower| + the inch
  x25.4); tolerance_value NOT pre-scaled. bounding_box has NO OCR source ->
  omitted (bridge guards it); stock comes from overrides, never fabricated from
  unordered callouts (would mis-size stock).
- bridgeFromOCR(ocr, overrides) = bridge(fromOCRAnalysis(ocr), overrides).
- re-export QuoteEstimateInput (fixes the shopDispatcher TS2694).
- both dispatchers rewired to bridgeFromOCR (R15 wire-all; 0 orphan .bridge()
  blueprint caller remains).

Validated against REAL blueprintOCREngine.analyzeBlueprint() output: 6 new
fail-on-revert round-trip tests (GD&T survives the rename, inspection_level
leaves "standard", dims+tolerance survive, title->part_name+confidence, material
resolves, bbox non-corrupting) -- NOT a mock (a mock-the-SUT test is exactly what
hid this bug). 73 tests green (6 new + 67 existing incl the bridge's own).

tsc NET: -2 errors (shopDispatcher 1479/1481 resolved), 0 introduced (proven vs
the pre-edit baseline; the remaining shopDispatcher errors are pre-existing
param-cast/static baseline, out of charlie scope). 3-of-3 scrutiny PASS 0 P0/P1
(arm A independent subagent; arms B+C reviewed inline by the main agent --
the subagent pool was server-rate-limited).

Cross-galaxy: shopDispatcher case is hotel-authored (W3) -- call-site-only edit,
chat-bus note posted. OCR producer is xray (blueprint-vision); the adapter lives
on the charlie/quoting bridge engine (correct owner of the OCR->quote edge).

Files:
- engines/BlueprintToQuoteBridgeEngine.ts: +fromOCRAnalysis/bridgeFromOCR + QuoteEstimateInput re-export
- tools/dispatchers/shopDispatcher.ts: emp_blueprint_to_quote -> bridgeFromOCR
- tools/dispatchers/businessDispatcher.ts: blueprint_to_quote -> bridgeFromOCR
- __tests__/blueprint-ocr-bridge-adapter.test.ts: +6 real-OCR round-trip tests
```

## Files touched (5)
- mcp-server/src/__tests__/blueprint-ocr-bridge-adapter.test.ts | 109 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/BlueprintToQuoteBridgeEngine.ts        |  68 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/businessDispatcher.ts        |   5 ++++-
- mcp-server/src/tools/dispatchers/shopDispatcher.ts            |   5 ++++-
- 4 files changed, 185 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d447cee20254`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._