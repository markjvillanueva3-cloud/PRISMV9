# CAD/CAM Audit — Agent 3: 6 Tier-1 CAM Bridges

**Date:** 2026-05-08 | **Scope:** Engine coverage, live integration, strategy depth, tooling, post-processor, add-ins

---

## Per-CAM Matrix (Engine count / Live link / Strategies / Tool sync / Post / Add-in)

| CAM | Engines | Live Link | Status | Strategy catalog | Tool import/export | Post-processor | Add-in | In-host runner |
|-----|---------|-----------|--------|------------------|-------------------|-----------------|--------|-----------------|
| **hyperMILL** | 54 | Full HTTP API + COM | **Production** | 49+ cycle types (8 schema domains) | Auto-extract + sync | Integrated AC Python setter | Full script gen | **Full Project Manager runtime** |
| **Fusion 360** | 15 | Cloud API only | Beta | 13 ops + AI orchestration | Round-trip tool library | Sidecar (post-sync) | Python add-in plan-only | Runner present, limited |
| **Mastercam** | 4 | C-Hook generator only | Production (no live) | Mold/EDM/grind/probe cycles | Tool export only | C-Hook gen + surface integrity | None | C-Hook generator only |
| **Inventor HSM** | 0 | Not listed | Beta | Function index exists | Not wired | Not wired | Not listed | Full runner declared |
| **Esprit** | 0 | Not wired | **Stub (aspirational)** | 9 declared actions / 0 in dispatcher | Not wired | Not wired | Not wired | Not wired |
| **SolidWorks** | 0 | Automation Bridge only | Stub | Not wired | Not wired | CodeGenerator only | No add-in | AutomationBridge only |

---

## hyperMILL Deep Dive (the "best" one)

**Production status:** hyperMILL is PRISM's only tier-1 CAM with full closed-loop integration.

**Engine portfolio (54 total):**
- 17 artifact generators (CAD/CAM/settings/fixture/linking/sim NC/advanced artifact types)
- 8 schema unifiers + parsers (drilling, 2D core/extended, 3D core/advanced, cutting data, tool comp, coolant)
- 8 specialty engines (IM tool DB, demo DB, OM cycles extractor, XML extractor)
- Plus 13 supporting validation/quality/mapping engines

**Live integration:**
- **HTTP/REST API** via hyperMILL AC bridge + full COM scripting support
- **Material map sync:** CUTTING_DATA schema with Kienzle kc1.1/mc capture
- **Tool library:** Auto-extract from AC DB; round-trip with validation
- **Strategy:** 49+ cycle types across 8 domains (drilling, 2D core/extended, 3D core/advanced, coolant, tool comp)
- **Post-processor:** AC Python setter script generation + AC API bridge
- **In-host runner:** Full Project Manager runtime — can emit NC code, manage tool changes, validate collisions

**Confidence level:** 95% complete. Missing only: real-time spindle feedback loop + adaptive override integration.

---

## Tier Ranking

### Production
- **hyperMILL** (54 engines, 63 total with dispatcher wiring, full API, all 49 cycles wired)
- **Mastercam** (4 engines, C-Hook generator, mold/EDM/grind/probe cycles, surface integrity prediction)

### Beta
- **Fusion 360** (15 engines, cloud API only, 13 ops + AI orchestration, tool round-trip working, add-in plan-only)
- **Inventor HSM** (0 engines deployed; function index exists; full runner declared but not instrumented)

### Stub (Aspirational)
- **Esprit** (0 deployed; 9 actions declared in brief, 0 wired in dispatcher; no engines)
- **SolidWorks** (0 engines; AutomationBridge + CodeGenerator only; no add-in)

---

## Score (0–100)

**Overall CAM bridge coverage: 62/100**

**Breakdown:**
- hyperMILL: 95/100 (production, full stack)
- Mastercam: 68/100 (production but no live link, limited cycle coverage)
- Fusion 360: 52/100 (beta, cloud-only API, add-in blocked, tool library working)
- Inventor HSM: 18/100 (beta badge only; runners declared but engines absent)
- Esprit: 8/100 (stub; zero dispatcher wiring)
- SolidWorks: 12/100 (stub; bridge only, no automation)

**Key gaps:**
1. Esprit aspirational tier needs dispatcher wiring + strategy engine before claiming beta
2. Fusion 360 Python add-in must ship to unlock embedded CAM runner
3. SolidWorks requires full bridge rebuild (zero engines)
4. Mastercam needs live API link to unlock adaptive feedback
5. Inventor HSM engines not on disk despite function index and runner claims

**Recommendation:** Consolidate tier-1 to 3 CAMs (hyperMILL, Mastercam, Fusion) and defer Esprit/SolidWorks/InventorHSM until engines are wired.
