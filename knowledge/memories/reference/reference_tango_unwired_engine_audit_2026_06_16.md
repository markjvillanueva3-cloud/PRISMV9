---
name: reference_tango_unwired_engine_audit_2026_06_16
description: tango ran audit-unwired-engines.mjs (saturation-fallback) — current engine-wiring backlog is 21 UNWIRED (not the stale "674"), routed to owners by domain. slot tango 2026-06-16.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.221Z
aliases: reference_tango_unwired_engine_audit_2026_06_16
---


**TANGO UNWIRED-ENGINE-AUDIT (slot tango, 2026-06-16, /loop iter 6, saturation-fallback)** — the in-lane BUILD space was saturated this session (5 standing coverage tools shipped: test-quality, inline-const, forge-dedup, hub-blast-radius, algorithm-coverage, dispatcher-registration), so per the work order I ran a standing coverage audit + surfaced deltas instead of manufacturing another tool. Token zone YELLOW -- light iteration by design.

**AUDIT:** `node scripts/audit-unwired-engines.mjs` -> `state/shared/UNWIRED-ENGINE-AUDIT-2026-06-16.json`. **3802 engine files: 3585 WIRED-DIRECT + 82 wired-via-{engine/hook/orch/route/singleton} + 114 WIRE-EXEMPT = 3781 accounted; 21 UNWIRED.** The current backlog is **21**, NOT the "674 unwired engines" figure cited in stale prior-audit memories (the fleet has wired the vast majority since). R12: cite 21, not 674.

**THE 21 UNWIRED -- routed to owners by domain (surface, don't wire -- wiring = romeo + domain owners):**
- **CAD/CAM vendor bridges -> delta / kilo:** CreoToolkitBridgeEngine, CreoIntegrationTestSuiteEngine, CATIACAAV5BridgeEngine, RhinoCommonBridgeEngine, OnshapeAPIBridgeEngine, OnshapeLiveCollabAdapter, NXOpenAssemblyDrawingEngine, MastercamHeadlessIntegrationTestEngine, HyperMillACBridgeEngine, BlueprintOCRAdapter.
- **AI clients -> india:** DeepSeekClientEngine, GrokCLIClientEngine, XProcNeuralAutoFireEngine, EmbeddingGuardEngine, BayesianAcquisitionRefiner.
- **WEDM -> mike:** WEDMLoRADatasetBuilderEngine.
- **Likely WIRE-EXEMPT (integration-test / bootstrap / automation harness -- verify before wiring):** PlaywrightAutomationEngine, MastercamHeadlessIntegrationTestEngine + CreoIntegrationTestSuiteEngine (test suites), reactiveChainBootstrap, cycleSchedulingBridge.
- **Misc -> romeo:** SemanticAssetIndexEngine, BarRemnantManagementEngine.

**NOTE:** several "*IntegrationTestEngine" / "*BridgeEngine" entries are likely intentionally direct-use or test-only (would be WIRE-EXEMPT on inspection) -- the wiring owner must verify each before wiring (don't blind-wire a test harness into a production dispatcher). The 4 legacy-only orphans are a separate, lower-priority class. Sister: [[reference_tango_dispatcher_registration_coverage_2026_06_15]], [[reference_tango_algorithm_coverage_diff_2026_06_15]] -- the three coverage layers (engine / dispatcher-registration / algorithm) now all have standing audits.
