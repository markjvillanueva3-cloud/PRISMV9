# KILO-CAM-PICKUP — compiled CAM-relevant units, 2026-05-25

> /goal directive: "compile all cam related units and tasks left in rgs and other chat slot queues to kilo. build, wire and synergize into pipelines and systems."
> Source: `node H:/prism/.claude/helpers/priority-queue.mjs --pick --top 50` snapshot at iter 5.
> CAM-relevant slice = matches `cam | mastercam | fusion | hyper | esprit | inventor | solidcam | sfc | toolpath | post`.

## Bridge layer (P1) — direct CAM wiring

| Unit | Scope | Engines | Kilo plan |
|---|---|---|---|
| `U-BRIDGE-CAD-CAM-HANDOFF` | CAD AI → CAM AI autonomous handoff | echo's `CamBridgeKitEngine.cadCamHandoff` (uncommitted shared tree) | Already covered by echo iter — kilo iter1 SFC bridges + iter4 hyperCAD PFC tagger are the upstream piece. **No kilo work needed** beyond schema dedupe at echo's merge. |
| `U-BRIDGE-SFC-MASTERCAM` | SFC → Mastercam toolpath | `kiloCamSfcBridgesEngine.sfcMastercamBridge` (slot:kilo iter1) | **DONE in slot/kilo iter1** — needs dispatcher wire pickup per U-KILO-CAM-SFC-WIRE spec. |
| `U-BRIDGE-SFC-SOLIDWORKS` | SFC → SolidWorks CAM | gap (no engine) | **Kilo iter 6 candidate** — mirror sfcMastercamBridge pattern (SolidCAM iMachining cycle params). |
| `U-BRIDGE-WIRE-FUSION` | wire 6 unwired Fusion engines | per engine inventory | Defer to peer slot (delta/echo); kilo's bridge layer is the input contract, not the wire-up. |
| `U-BRIDGE-WIRE-HYPER` | wire 8 unwired Hyper engines | per engine inventory | Defer to peer slot (echo). |
| `U-BRIDGE-WIRE-CREO` | wire 3 unwired Creo engines | per engine inventory | OUT of kilo's priority-4 (hyperMILL > Fusion > Mastercam > Esprit) — leave for peer. |
| `U-BRIDGE-WIRE-FIVE` | wire 4 unwired Five-axis engines | per inventory | RELEVANT — 5-axis is in the every-toolpath demo. Defer engine-wire to peer; kilo consumes them via the coverage harness once wired. |
| `U-BRIDGE-WIRE-MULTI` / `U-BRIDGE-WIRE-LATHE` / `U-BRIDGE-WIRE-MACHINE` / `U-BRIDGE-WIRE-OTHER` (123) / `U-BRIDGE-WIRE-LONGTAIL` (294) | massive wire-ups | per inventory | OUT of CAM-specialist scope — kilo refuses scope-creep per refuse-list (silent-fallback-on-ambiguous). Defer to wire-specialist peer. |

## Training layer (P2) — per-CAM AI/NN

| Unit | Engine | Kilo plan |
|---|---|---|
| `U-AITRAIN-CAM-CAM-DEEP-LEARNING` | `CAMDeepLearningEngine` | Substrate ready (KiloCamDatasetBuilderEngine iter3 emits the training tuples). Per-system fine-tune scaffold = **kilo iter 6 unit**. |
| `U-AITRAIN-CAM-CAM-DEEP-LEARNING-ORCHESTRATOR` | `CAMDeepLearningOrchestratorEngine` | Same — orchestrator routes per-system to its trained adapter. |
| `U-AITRAIN-CAM-FUSION-DEEP-LEARNING` | `FusionDeepLearningEngine` | Priority #2 per user revised order. Train dataset = catalog rows where `system="fusion360"` (47 rows). |
| `U-AITRAIN-CAM-HYPER-MILL-DEEP-LEARNING` | `HyperMillDeepLearningEngine` | **Priority #1** per user revised order. Train dataset = catalog rows where `system="hypermill"` (54 rows). |
| `U-AITRAIN-CAM-MASTERCAM-DEEP-LEARNING` | `MastercamDeepLearningEngine` | Priority #3. Train dataset = 52 rows. |
| _(Esprit DL engine missing — see Gap below)_ | — | **Kilo iter 7 candidate** — `EspritDeepLearningEngine` scaffold (mirror MastercamDeepLearningEngine). |

## Coverage / utilization layer

| Unit | Plan |
|---|---|
| `cam_catalog_priority5_coverage` (existing) | Reuse — already loads per-system CAM catalogs. Kilo's `cam-toolpath-coverage-catalog.json` (iter2) is a sibling artifact — toolpath inventory, not catalog loader. |
| `cam-scenario-generate-all` (existing) | Reuse — scenario generator for hyperMILL in-host plan; tie KiloCamCoverageHarnessEngine output to it via Phase-5 spec. |
| `mastercam_function_index_get_toolpaths_by_category` (existing) | Already wired — KiloCamCoverageHarnessEngine can call this to validate toolpath_ids match Mastercam's function-index. |

## Gap surface (units that don't exist but the campaign needs)

| Gap | Owner | Iter slot |
|---|---|---|
| `EspritDeepLearningEngine` (parallel to `MastercamDeepLearningEngine`) | kilo | iter 7 |
| `U-BRIDGE-SFC-SOLIDWORKS` (SolidCAM iMachining cycle params) | kilo | iter 6 |
| `KiloE2ECoverageDemoEngine` (orchestrator: print → CAD → assembly → coverage demo → simulator → collision check) | kilo | iter 8 (close-out spec + scaffold) |
| Schema dedupe with echo's `CamBridgeKitEngine` (when it lands on main) | kilo OR echo at merge | follow-up U-KILO-CAM-SFC-SCHEMA-DEDUPE |

## Compiled pickup queue (kilo's remaining /loop iters)

- **iter 5 (this iter)**: this compile-doc — DONE
- **iter 6**: `KiloSfcSolidWorksBridgeEngine` (mirror Mastercam pattern, SolidCAM iMachining defaults)
- **iter 7**: `EspritDeepLearningEngine` scaffold (mirror Mastercam DL shape, Esprit ProfitMilling vocab)
- **iter 8**: campaign close-out — handoff, PSN-synergy memo, end loop

After iter 8, the CAM-mastery campaign hands off to:
- **echo** — for the dispatcher wires (per U-KILO-CAM-SFC-WIRE spec)
- **peer wire-specialist slot** — for U-BRIDGE-WIRE-FUSION (6 engines), U-BRIDGE-WIRE-HYPER (8 engines), U-BRIDGE-WIRE-FIVE (4 engines)
- **lima (academy)** — for actually running the LoRA training runs (kilo emits dataset substrate; lima orchestrates train + validate)
- **india (post-processor)** — for the Phase-5 demo's post-process step

Each handoff is a slot-claim filed at the unit owner's `pickup → /loop` queue.

## PSN-leg activation by this pickup

- **#2 PRISM OS** — populates the canonical CAM-build pickup queue
- **#4 Memories** — this compile doc IS the substrate
- **#7 Engines** — names every CAM engine the campaign touches (built, gap, wired-by-peer)
- **#11 PRISM AI** — names the per-system DeepLearning targets

Kilo refuse-list audit:
- ✅ no-silent-fallback: every "gap" is explicitly named, not heuristic-filled
- ✅ tolerance-stack: not applicable (no translation in this doc)
- ✅ pmi-validation: not applicable (no program emission in this doc)
