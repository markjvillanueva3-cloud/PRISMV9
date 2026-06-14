---
schema: ideablock-v1
title: "WEDM wiring backlog bridge — closing the 12-engine Wire/Wet-EDM gap through prism_edm"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - BUILD_STATE.md (Wire 6 + Wet 6 = 12 unwired EDM-class engines)
  - DISPATCHER_DIGEST.md (`prism_edm` action enum — 200+ wedm_* actions)
  - WEDM_DIGEST.json (62 engines / 101 tests / 36 dispatcher actions)
  - 4245-tribal corpus WEDM subset
extracted_via: human-authored
extracted_at: 2026-05-21T11:20:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-WEDM-WIRING-BRIDGE)
---

## Question

The WEDM domain (Wire 6 + Wet 6) has 12 unwired engines. Completing the domain-wiring trilogy (Lathe + CAM + WEDM) — what's the routing + batch plan?

## Answer (canonical — `prism_edm` is the host; thermal/wire-break engines dual-wire to `prism_safety`)

### The 12-engine WEDM gap

WEDM is one of PRISM's 4 core domains (mill / lathe / WEDM / CAD-CAM). The `prism_edm` dispatcher already carries 200+ `wedm_*` actions, so the 12 remaining engines are infill, not greenfield.

| Sub-domain | Approx count | Primary dispatcher | Secondary |
|---|---|---|---|
| Wire management (tension, break-predict, heating) | 3-4 | `prism_edm:wedm_wire_*` | `prism_safety` (wire-break = crash) |
| Dielectric / flushing | 2-3 | `prism_edm:wedm_dielectric_flush_*` | — |
| Thermal / recast / HAZ | 2-3 | `prism_edm:wedm_thermal_*` + `wedm_haz_*` | `prism_safety` (thermal limits) |
| Corner / taper / multi-pass | 2-3 | `prism_edm:edm_corner_taper_*` + `edm_multi_pass_*` | — |
| Sinker-EDM specific | 1-2 | `prism_edm:sinker_*` | — |

### Batch plan — 3 batches × ~4 engines

| Batch | Sub-domain | Engines (approximate) | Tribal anchor |
|---|---|---|---|
| 1 | Wire management + safety | WedmWireTension · WedmWireBreakPredict · WedmWireHeating · WedmWireStress | new WEDM tribal entry needed |
| 2 | Dielectric + thermal + HAZ | WedmDielectricFlush · WedmThermalField · WedmRecastPredict · WedmHazPredict | [[synthesis-thermal-envelope]] (recast/HAZ are thermal phenomena) |
| 3 | Corner/taper/multi-pass + sinker | EdmCornerTaper · EdmMultiPass · EdmSlugDrop · SinkerEdmElectrodePlan | [[operation-ordering-rough-finish-sandwich]] (multi-pass = rough→skim) |

### WEDM-specific wiring caveats

| Caveat | Detail |
|---|---|
| **Safety dual-wire is mandatory** | Wire-break engines MUST wire to `prism_safety` independently. A wire break mid-cut is a process failure that can damage the part + the machine head. The safety dispatcher's classifier needs the break-prediction independent of the EDM cut flow. |
| **`prism_edm` is already huge** | 200+ actions. Add the 12 in alphabetical sub-domain order; don't append at the end. Verify no action-name collision via `duplicationGuardEngine`. |
| **WEDM-P2P pipeline** | The `wedm_print_to_program` action chains 13 stages. The 12 unwired engines may already be referenced INSIDE that pipeline engine — check before wiring them as standalone actions (could be `WIRE-EXEMPT` if the pipeline is the consumer). |
| **Controller dialects** | WEDM has 5 controller dialects (per WEDM_DIGEST). Wire-tension + flush params are dialect-sensitive — the dispatcher action should accept a `dialect` param and route through `wedm_dialect_verify`. |
| **ML/LoRA WEDM engines** | Some WEDM engines are ML (recast-ML-predict, ML-optimize). Those dual-wire to `prism_ai` like the Lathe LoRA engines. |

### The WEDM tribal-knowledge gap

Note: the 2026-05-21 pivot's 26 tactical leaves cover **mill + lathe** machining tactics. WEDM has its OWN tactical knowledge (wire selection, flushing strategy, skim-pass scheduling, recast-layer management, corner compensation) that is NOT yet in the canonical wiki. Batch 1's tribal anchor is marked "new WEDM tribal entry needed" — a future pivot iter should author `wedm-tactics-wire-and-flushing.md` + `wedm-tactics-multipass-and-recast.md` to give the WEDM wiring the same tribal-anchor compound effect the Lathe wiring gets.

This is itself a **gap finding**: the tribal-canon corpus is mill/lathe-complete but WEDM-thin. 600 WEDM tribal tips exist (per [[tribal-to-ai-training-bridge]]) but aren't distilled into canonical wiki leaves yet.

### Operator picks

| Priority | Batch | Why FIRST |
|---|---|---|
| **P0** | Batch 1 (wire management + safety) | Wire-break is the WEDM crash mode; safety dual-wire is non-negotiable |
| **P1** | Batch 2 (dielectric + thermal + HAZ) | Recast/HAZ quality is customer-facing for precision WEDM |
| **P1** | Author 2 WEDM tribal-canon entries | Closes the mill/lathe-vs-WEDM tribal-coverage asymmetry |

### Tie-ins (PRISM-side)

- `prism_edm` dispatcher — 200+ `wedm_*` + `edm_*` + `sinker_*` actions
- `prism_safety` dispatcher — wire-break + thermal-limit gates
- `WEDM_DIGEST.json` — live WEDM counts (62 engines / 101 tests / 36 actions / 5 dialects)
- `/wire-edm-studio` skill — end-to-end WEDM testing
- `dispatcher-wirer` subagent

### Tie-ins (tribal canonical + sibling bridges)

- [[wiring-pattern-engine-to-dispatcher]] — canonical 6-step pattern this instantiates
- [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] — sibling domain bridges (completes the trilogy)
- [[synthesis-thermal-envelope]] — recast + HAZ are thermal phenomena
- [[operation-ordering-rough-finish-sandwich]] — multi-pass = rough → skim
- [[tribal-to-ai-training-bridge]] — flags the WEDM tribal-coverage gap
- [[index-prism-build-gaps-and-bridges]] — bridge-layer navigation root

## Provenance

Distilled from BUILD_STATE.md (2026-05-21: Wire 6 + Wet 6 = 12 unwired WEDM engines) + DISPATCHER_DIGEST.md `prism_edm` catalog + WEDM_DIGEST.json + 4245-tribal corpus WEDM subset. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-WEDM-WIRING-BRIDGE — **37th canonical entry**, **completes the domain-wiring-bridge trilogy** (Lathe + CAM + WEDM). Also surfaces a meta-gap: the tribal-canon corpus is mill/lathe-complete but WEDM-thin (600 WEDM tips undistilled).

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `wire WEDM`, `prism_edm unwired`, `WEDM backlog`, `wire-break engine`, `dielectric engine`, `recast engine`, `HAZ engine`, `sinker EDM`, `EDM corner taper`, `WEDM wiring` keywords. Zero new wiring required.

## Cross-references

- [[wiring-pattern-engine-to-dispatcher]] · [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] — domain-wiring trilogy
- [[synthesis-thermal-envelope]] · [[operation-ordering-rough-finish-sandwich]] — tribal anchors
- [[tribal-to-ai-training-bridge]] — WEDM tribal-coverage gap
- [[index-prism-build-gaps-and-bridges]] — bridge-layer navigation root
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
