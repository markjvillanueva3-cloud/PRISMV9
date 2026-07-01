---
name: reference_xray_extract_dispatcher_repair_2026_06_24
description: "resourceExtractionDispatcher had 8 actions calling drifted/removed engine methods (R12 silent breakage); weak tests passed on the {action,error} catch object (R9 hole)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.273Z
aliases: reference_xray_extract_dispatcher_repair_2026_06_24
---


**xray resourceExtractionDispatcher API-drift repair (2026-06-24, slot xray)** -- commit `8ef38b0be3`.

`mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts` (xray's primary OCR/document/drawing extraction surface) had drifted from its engines: **8 actions called engine methods that were renamed/removed** in static-method refactors, so they THREW `"is not a function"` or returned wrong-shaped objects **in production**. The companion tests passed FALSELY because the dispatcher catch returns `{action, error}` (`:361`) and the tests only did `toBeDefined()` / asserted `result.action` -- both true on the error object (the R9 hole that let the drift go unnoticed).

The 8 fixes (dispatcher -> the engine's REAL current API):
- `ocr_process`: `processImage(path, optionsObj)` -> positional `processImage(path, text:string, conf:number)` (the object arg made `simulatedText.split()` throw); dpi now honored via `registerImage`.
- `ocr_stats`: `getStatistics()` (absent) -> `getQueueStats()` -> `{queued,processed,pending,byFormat}`.
- `drawing_extract`: `simulated*` option keys (silently dropped) -> real `{dimensions,annotations,entities,layers}`; result path is `metadata.path` (no top-level `filePath`).
- `drawing_summary`: `getSummary()` (absent) -> `getResult(path)`.
- `office_process`: `processDocument()` (absent) -> `extractDocument(path,{sections,tables,metadata})`; raw `text` wrapped as a paragraph section so `extractedData` populates.
- `office_search`: `searchByKeyword`/`searchByPartNumber` (absent) -> NEW `findByPartNumber`+`searchByKeyword`; wrapped in `{count, matches}` so `slimResponse` (strips empty arrays) cannot erase a 0-match result.
- `log_alarms`: `getAllAlarms`/`getAlarmsBySeverity` (absent) -> NEW `getAllAlarms`; the harvester has NO severity field, so severity returns all + `severityFilterApplied:false` + a note (R12 -- never fabricate).
- `log_harvest`: `harvestLog()` (absent) -> `harvestFile(path,content)`; enriched with the caller's machineId/machineType the engine doesn't track.

3 additive engine methods (mirror existing `findBy*`, no shadowing): `OfficeDocumentPipelineEngine.{findByPartNumber,searchByKeyword}`, `MachineLogHarvesterEngine.getAllAlarms`. 7 tests strengthened to key on success-only fields (scrutiny arm empirically monkeypatched the engine to prove each FAILS on a re-break). 33/33 green, tsc-clean, per-file 2-arm scrutiny PASS.

**Lesson:** a dispatcher case that calls `engine.someMethod()` is only as correct as the engine's CURRENT API -- a static-method refactor that renames/removes a method leaves the dispatcher throwing in production while a `toBeDefined()`/`result.action` test stays green (the catch object satisfies it). When auditing a dispatcher, watch the runtime STDERR for `"is not a function"` even when the suite is green, and assert on a field ONLY the success result carries. Sibling of [[feedback_verify_actual_contract_not_proxy]] -- the test must verify the real success shape, not a proxy the error path also satisfies. The same drift class likely affects other dispatchers whose engines were refactored to static methods.
