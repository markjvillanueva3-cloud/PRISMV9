# PRISM Compact Index

Live-edited overview of the primary MCP execution surfaces. For the full
machine-readable catalog see `MASTER_INDEX.md` / `MASTER_INDEX.json`.

## Dispatcher Surfaces

Every manufacturing capability is an MCP dispatcher action. Call these
rather than reaching directly into engines.

| Dispatcher | Actions | Entry | Notes |
|------------|:-------:|-------|-------|
| `prism_calc` | 1130+ | calcDispatcher | Physics + speed/feed + cycle-time |
| `prism_cam` | ~900 | camDispatcher | CAM strategy + post + CAM-AGI routing |
| `prism_cad` | — | cadDispatcher | CAD feature recognition + tolerance |
| `prism_turning` | 90+ | turningDispatcher | Turning/lathe/mill-turn/swiss |
| `prism_5axis` | 5 | fiveAxisDispatcher | RTCP + singularity + IK |
| **`prism_mill`** | **46** | **millDispatcher** | **MILL-MASTER P1-U01 cohesion core** |
| `prism_ai` | 280+ | aiReasoningDispatcher | AI reasoning + 6 mill facade-routed (P1-U05) |
| `prism_safety` | — | safetyDispatcher | S(x) scoring, hard block |
| `prism_omega` | — | omegaDispatcher | Omega = 1.0 gate |
| `prism_session` · `prism_context` · `prism_dev` | — | — | Session + build tooling |

## MILL-MASTER P1 Facade Chain (live)

```
MCP Client
  │
  ├─[prism_mill]──────────────┐   (46 actions — P1-U01)
  │                           │
  ├─[prism_ai + 6 mill]───────┤   (facade-routed — P1-U05)
  │                           │
  └─[prism_cam + 3 CAM-AGI]───┤   (P1-U06)
                              ▼
               MillMasterOrchestratorFacadeEngine ◄── PRISMSelfAwarenessEngine
                              │                          ↕ (P1-U04)
                              │                      MillAISelfAwarenessIntegrationEngine
                              │                          (refreshRegistry drift scanner)
                              ▼
             ┌────────────────┼──────────────────────┐
             │                │                      │
MillingAGIMasterEngine  MillingAGIOrch      MillingUnifiedScience
    │                        Engine              OrchestrationEngine
    │ ↕                                          │
    │ (bidirectional bind — P1-U03 + P1-U06)     ▼
    ▼                                   MillingEndToEndOrchestrationEngine
CAMAGIMasterOrchestratorEngine                       │
    │ (5-vendor scoring —                            │
    │  P1-U06)                                       ▼
    └─→ Mastercam / hyperMILL / Fusion360 /   Sub-engines:
        InventorCAM / SolidCAM                 Kienzle / Taylor /
                                               Johnson-Cook / SLD /
                                               7-domain science
```

### Key contracts

| Contract | Owner | Consumer |
|----------|-------|----------|
| `MillOrchRequestType` | facade | all mill dispatchers |
| `CAMAGIBinding.pickVendor(ctx)` | MillingAGIMaster | CAMAGIMaster (implements) |
| `MillReasoningInboundRequest` | MillingAGIMaster | CAMAGIMaster (calls in) |
| `refreshRegistry()` drift report | MillAISelfAwareness | any caller |
| `recommendMillFeatures(task)` | PRISMSelfAwareness | any caller |

### MILL-MASTER P1 units — status

| Unit | Commit | Description |
|------|--------|-------------|
| P1-U01-MILL-DISP | `1304303e2` | millDispatcher created, 46 actions, 31 tests |
| P1-U02-FACADE-WIRE | `88e8dc6d8` | Facade wiring contract test, 32 cases |
| P1-U03-AGI-BIND | `8f299ae45` | CAMAGIBinding DI interface on MillingAGIMaster |
| P1-U04-SA-INTEG | `ab22cc264` | PRISMSelfAware ↔ MillAISelfAware + disk-scan drift |
| P1-U05-PRISM-AI-ROUTE | `b8ed611f0` | 6 facade-routed mill actions on prism_ai |
| P1-U06-CAM-AGI-WIRE | `239aafe0f` | CAMAGIMasterOrchestratorEngine + 3 cam actions + binding closure |
| P1-U07-MCP-INDEX | _this commit_ | Doc refresh (this file + ENGINE_DIGEST) |

## Entry Points

- **Full dispatcher map:** `data/docs/DISPATCHER_DIGEST.md`
- **All engines 1-liner:** `data/docs/ENGINE_DIGEST.md`
- **Directory purposes:** `data/docs/DIRECTORY_DIGEST.md`
- **Live inventory:** `H:/PRISM/PRISM-INVENTORY-LATEST.md`
- **Roadmap state:** `data/milestones/MILL-MASTER.json` v13.2.0

## Anti-bypass discipline

Every mill-facing call should end up at `MillMasterOrchestratorFacadeEngine`.
Direct sub-engine calls from dispatchers are a regression; the wiring test
(`MillMasterOrchestratorFacadeEngine.wiring.test.ts`) uses `vi.spyOn` to
verify actual invocation, not just response shape.
