# Romeo wiring-queue disposition — 2026-06-18

> slot:romeo (wiring specialist). Fresh `audit-unwired-engines.mjs` run: **14 UNWIRED** of 3805 engines
> (115 WIRE-EXEMPT, 3594 wired-direct, +82 wired-via-engine/orch/route/hook/singleton). Every one of the
> 14 is triaged below with a disposition + owning galaxy. None are clean romeo dispatcher-wins: all are
> cross-domain CAD/external bridges (ctor-injected live connections), CI test harnesses, event-driven
> registration/emit bridges, a helper adapter, or one empty stub. Per the romeo soul (refuses
> cross-domain-wiring-without-justification + wiring-an-engine-that-throws-on-every-call), romeo TRIAGES +
> ROUTES these to their owners; the owning galaxy makes the wire-vs-exempt call.

| # | Engine | kb | Disposition | Owner |
|---|--------|----|-------------|-------|
| 1 | SemanticAssetIndexEngine | 7 | cross-domain; ctor-injected; expose via prism_ai when owner surfaces it | india/tango |
| 2 | CreoToolkitBridgeEngine | 7 | external Creo CAD-app bridge (ctor-injected live conn); wire when live-CAD harness exists | delta |
| 3 | CreoIntegrationTestSuiteEngine | 7 | **WIRE-EXEMPT** — headless CI test-fixture runner (injected ScenarioDriver), not a dispatcher action | delta |
| 4 | CATIACAAV5BridgeEngine | 9 | external CATIA CAA V5 bridge (ctor-injected); wire on live-CAD harness | delta |
| 5 | WEDMLoRADatasetBuilderEngine | 0 | **EMPTY FILE** — needs building (no exports); not wireable until it has an engine | mike/india |
| 6 | RhinoCommonBridgeEngine | 13 | external Rhino CAD bridge (ctor-injected); wire on live-CAD harness | delta |
| 7 | OnshapeAPIBridgeEngine | 13 | external Onshape REST-API bridge (ctor-injected creds); wire on live-API harness | delta |
| 8 | OnshapeLiveCollabAdapter | 13 | external Onshape live-collab adapter (ctor-injected); wire on live-API harness | delta |
| 9 | NXOpenAssemblyDrawingEngine | 38 | external Siemens NXOpen bridge (ctor-injected NX session); wire on live-CAD harness | delta |
| 10 | MastercamHeadlessIntegrationTestEngine | 23 | **WIRE-EXEMPT** — headless CI integration test suite (no-GUI automation), not a dispatcher action | kilo/echo |
| 11 | reactiveChainBootstrap | 23 | **CONSUMED** by `aiReasoningDispatcher.ts` (reactive-chain registration) — audit consumer-detection gap, NOT a true orphan | india |
| 12 | HyperMillACBridgeEngine | 17 | **WIRE-EXEMPT** — loopback HTTP companion server for OPEN MIND Automation Center (live external bridge), not a dispatcher action | echo/kilo |
| 13 | BlueprintOCRAdapter | 8 | helper fns (summarizeConfidence) — consume via an OCR engine (wired-via-engine), not dispatcher-exposed | xray |
| 14 | cycleSchedulingBridge | 16 | INTEG-MS3 scheduling event-emitter; tested but production-orphan; wire via schedulingDispatcher OR event-registry | scheduling/papa |

## Romeo's actionable queue: EMPTY (all 14 routed)
- **3 structural WIRE-EXEMPT** (#3, #10, #12): test harnesses + external HTTP server — the owning galaxy adds the `// WIRE-EXEMPT: <reason>` marker (romeo does not edit peer engine files; the reason is recorded here for them).
- **1 audit-gap** (#11): reactiveChainBootstrap is consumed by aiReasoningDispatcher — the unwired-audit's consumer scan should recognize the dispatcher import (follow-up for the audit owner; not a real orphan).
- **10 cross-domain hand-offs** (#1,2,4,5,6,7,8,9,13,14): chat-bussed to delta/india/xray/mike/scheduling — each owner decides wire-vs-exempt within their domain.

Romeo's wiring queue has **no in-lane wireable engine remaining**. Pivoting to backend tasks per the 2026-06-18 operator goal (complete romeo → backend → unblock the frontend team).
