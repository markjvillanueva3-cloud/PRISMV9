# PRISM Autodesk Inventor Automation Bridge Roadmap

**Track ID**: INV
**Unified Roadmap Phase**: 23 (parallel to F360 Phase 22)
**Version**: 1.0.0
**Created**: 2026-04-15
**Owner**: Claude (backend) + optional Codex (panel UI)
**Total Units**: 8 | **Total Sessions**: 4 | **Est. LOC**: ~2,800

---

## Cross-Roadmap Links

| Related Roadmap | Purpose | Shared Components |
|-----------------|---------|-------------------|
| `docs/roadmaps/FUSION360-DEEP-INTEGRATION-ROADMAP.md` (F360) | Fusion 360 desktop control + HSM post automation | **HSM .cps post processor format** (Fusion HSM = Inventor HSM, same JavaScript engine). `FusionCPSParserEngine` reused as `InventorCPSParserEngine`. |
| `resources/HYPERMILL/HYPERMILL_SKILL_ROADMAP.md` (HM) | hyperMILL trochoidal / HPC / 5-axis skill library | **Strategy definitions** flow downstream — Inventor CAM exports feed HyperMILL post-config via `ProductionHyperMillPostConfigEngine`. |
| `resources/FUSION360/FUSION360_SKILL_ROADMAP.md` (F360-SKILL) | Fusion CAM skill library | **CAM operation taxonomy** shared via `CAMAddInFrameworkEngine`. |
| `MILL-AI-INTEGRATION-ROADMAP-v2.md` (MILL-INTEG) | Master mill AI harden roadmap | **MS4-ALT** in MILL-INTEG references this roadmap as its detailed expansion. |

**Shared engines across all four roadmaps**:
- `MultiCamKnowledgeEngine` — unified registry of all CAM/CAD systems (already built MS3)
- `CAMAddInFrameworkEngine` — add-in harness pattern
- `FusionCPSParserEngine` → will be generalized to `HSMCPSParserEngine` (handles both Fusion and Inventor)

---

## Brief

Build a **legally-compliant** automation bridge to a licensed Autodesk Inventor installation so PRISM can generate parametric CAD models (.ipt/.iam/.idw), drive iLogic rules, export STEP/IGES/STL/DWG/PDF, and feed results directly into PRISM's CAM pipelines.

**Legal scope**: Automation via Inventor's published COM API (the same API iLogic, Inventor Addins, and tools like DriveWorks use). Requires one valid named-user subscription per concurrent instance. No reverse engineering, no DLL repackaging, no shipping of Autodesk binaries.

**Revenue Impact**: Adds full parametric solid modeling to PRISM. Inventor has ~3M seats and strong footprint in sheet metal / weldments / mechanical design. No competitor ships a physics-backed CAD-to-CAM pipeline leveraging customer's own Inventor seat.

---

## Existing Leverage (DO NOT REBUILD)

| Component | Path | Purpose |
|-----------|------|---------|
| `MultiCamKnowledgeEngine` | `mcp-server/src/engines/MultiCamKnowledgeEngine.ts` | Already registers Inventor archive (.ipt/.iam), offline CFBF reader routing |
| `MillMasterOrchestratorFacadeEngine` | `mcp-server/src/engines/MillMasterOrchestratorFacadeEngine.ts` | Single-entry orchestrator — INV outputs plug in as new `req.type` |
| `FusionCPSParserEngine` | `mcp-server/src/engines/FusionCPSParserEngine.ts` | Inventor HSM uses same .cps — generalize, don't duplicate |
| `ShopConfigurationEngine` | `mcp-server/src/engines/ShopConfigurationEngine.ts` | JM Die profile has 5 Hurco + Okuma mills — target output format |
| `H:/PRISM/JM DIE/JM DIE COMPANY/EAGLESTONE PARTS/*.ipt` | 45 real Inventor files | Validation corpus for CFBF reader |
| `H:/PRISM/resources/` | Training/sample geometry | Regression test inputs |

---

## Legal & Licensing Constraints

1. **Named-user subscription required** per concurrent Inventor instance — single-seat bridge on user's machine is permitted, multi-tenant SaaS is NOT.
2. **No COM hooking from Linux** — Inventor is Windows-only, bridge runs on Windows host.
3. **License activation** — first run requires internet; subsequent runs work offline for subscription duration.
4. **EULA forbids**: extracting DLLs, reverse-engineering binaries, running without a valid subscription, shipping Autodesk content inside PRISM distributions.
5. **EULA permits**: automation via published API, custom add-ins, iLogic rules, VBA/VB.NET/C#/Python clients, reading/writing Inventor files via the API.

---

## Dependency Graph

```
MILL-INTEG-MS3 (Multi-CAM) ─┐
                             ├─> INV-1 (Bridge Foundation) ─> INV-2 (iLogic + Export)
F360-1 (Fusion Foundation) ─┘                                         │
                                                                       v
                                            INV-3 (CAM Handoff) ─> INV-4 (Validation)
```

**Parallel start**: INV-1 can begin immediately (MS3 complete). INV-3 depends on F360-3 (CAM surface).

---

## Role Matrix

| Role | Name | Model | Scope |
|------|------|-------|-------|
| R1 | Systems Architect | Opus | COM bridge design, contract surface |
| R2 | Windows Implementer | Sonnet | winax/edge-js COM client, Windows process mgmt |
| R3 | TS Implementer | Sonnet | Engine code, orchestrator integration |
| R4 | Test Engineer | Sonnet | Mock tests (CI) + optional live test harness |
| R5 | Reviewer | Opus | Physics validation, license compliance review |

---

## MCP Full Utilization Protocol

Every session MUST use:
1. `prism_session:context_boot` — hydrate from prior session
2. `prism_session:dispatcher_map` — discover available actions
3. `prism_session:memory_recall` — load cross-session knowledge
4. `prism_session:action_search "inventor"` — route intent to optimal dispatcher
5. `prism_session:auto_checkpoint` — incremental state save
6. `prism_session:memory_save` — persist cross-session knowledge at session end
7. `prism_session:checkpoint_enhanced` — final artifact list per session

---

# Phase INV-1: Bridge Foundation

**Objective**: Stand up the Windows COM automation bridge with graceful fallback when Inventor is not installed.
**Sessions**: 1 | **Units**: 2 | **Primary Role**: R2

## SESSION INV-1-S1: COM Bridge + Process Management

### SMART CONFIG
```yaml
role: R2 (Windows Implementer) + R1 (Architect)
model: sonnet
effort: HIGH
context_budget: 60%
compact_after: 2 units
```

### KNOWLEDGE SOURCES
- **Engines**: `MultiCamKnowledgeEngine` (archive routing), `Fusion360LiveBridgeEngine` (COM pattern precedent)
- **External**: Autodesk Inventor API docs (`https://help.autodesk.com/view/INVNTOR/*/ENU/`)
- **NPM**: `winax` (preferred) or `edge-js` for COM bindings, `node-windows` for service mgmt
- **Samples**: Autodesk's "Inventor API Samples" shipped with install (`C:\Program Files\Autodesk\Inventor 20XX\SDK\UserTools\`)

### INTENT
After this session, a PRISM user on Windows with a licensed Inventor install can call `inventorAutomationBridgeEngine.isAvailable()` and get `true`, then launch a headless Inventor instance and receive its version + license-state handshake.

### SKILLS
- `/forge-triple` — generate hook + MCP action + skill for INV operations
- `/dedup` — check before creating (MultiCamKnowledgeEngine already exists)

### WORK

**U-INV01: InventorAutomationBridgeEngine — COM connection + health**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- FILES_CREATED:
  - `mcp-server/src/engines/InventorAutomationBridgeEngine.ts`
  - `mcp-server/src/__tests__/InventorAutomationBridgeEngine.test.ts`
- FILES_MODIFIED:
  - `mcp-server/src/engines/index.ts` (export)
- METHODS:
  - `isAvailable(): Promise<boolean>` — detect install + license state without launching
  - `launchHeadless(): Promise<InventorSession>` — start Inventor.Application invisible
  - `getVersion(): Promise<string>` — COM query
  - `getLicenseState(): "named_user" | "trial" | "expired" | "unavailable"`
  - `shutdown(): Promise<void>` — clean release of COM refs
- ABORT_CRITERIA:
  - Engine must gracefully return `isAvailable=false` when Inventor not installed (CI-safe)
  - No crashes if COM throws — wrap every call in try/catch with structured error
  - No license-violation vectors (no probing multiple installs, no credential scraping)
- ROLLBACK: `git checkout mcp-server/src/engines/InventorAutomationBridgeEngine.ts mcp-server/src/engines/index.ts && rm mcp-server/src/__tests__/InventorAutomationBridgeEngine.test.ts`

**U-INV02: InventorSessionPool — license-aware job queue**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- FILES_CREATED:
  - `mcp-server/src/engines/InventorSessionPool.ts`
  - `mcp-server/src/__tests__/InventorSessionPool.test.ts`
- METHODS:
  - `acquire(): Promise<InventorSession>` — FIFO queue bounded by license seat count
  - `release(session)` — return to pool
  - `withSession(fn)` — automatic release wrapper
  - `getStats()` — active/queued/max
- ABORT_CRITERIA:
  - Enforces max-1-session default (safe for single named-user license)
  - Queue timeout after 5 min (configurable)
  - Never leaks a session if fn throws
- ROLLBACK: `rm` new files, git checkout index.ts

### FORGE-TRIPLE
- **Hook**: `pre-inventor-automation` — verifies license-state=named_user before any operation
- **MCP Action**: `prism_cad:inventor_bridge_status` → returns { available, version, license_state, pool_stats }
- **Skill**: `/inventor-status` — quick CLI check

### EXIT GATE
- ✓ Bridge engine exists with isAvailable/launch/shutdown
- ✓ Pool engine enforces license seat limits
- ✓ ≥12 tests pass (mocked COM)
- ✓ **Test coverage floor**: isAvailable/launchHeadless/getVersion/getLicenseState/shutdown each ≥2 cases (positive + negative). Pool acquire/release/withSession/getStats each ≥2 cases.
- ✓ tsc: 0 errors in new files
- ✓ omega_floor ≥ 0.85
- ✓ SVI delta: +0.3%

### FEATURE CASCADE
- NEW_HOOKS: `pre-inventor-automation` → blocks operations if no license
- NEW_ACTIONS: `prism_cad:inventor_bridge_status`
- NEW_SKILLS: `/inventor-status`
- AVAILABLE_TO: INV-2 (iLogic), INV-3 (CAM handoff), downstream MILL-INTEG sessions

### /compact checkpoint

---

# Phase INV-2: iLogic Parametric Generation + Export

**Objective**: Drive Inventor to generate .ipt/.iam files via iLogic templates, then export STEP/IGES/STL/DWG/PDF.
**Sessions**: 1 | **Units**: 2 | **Primary Role**: R3 + R2

## SESSION INV-2-S1: iLogic Template Engine + Export Pipeline

### SMART CONFIG
```yaml
role: R3 (TS Implementer) + R2 (Windows Implementer)
model: sonnet
effort: HIGH
context_budget: 70%
compact_after: 2 units
```

### KNOWLEDGE SOURCES
- **Engines**: `InventorAutomationBridgeEngine` (INV-1), `GeometrySpecEngine` (if exists — else build minimal spec type)
- **External**: iLogic API (`iLogicAuto`, `iLogicVb.RunExternalRule`), Inventor Translator API for export
- **Samples**: `C:\Program Files\Autodesk\Inventor 20XX\Samples\iLogic\` + Autodesk API docs for `TranslatorAddIn`

### INTENT
Given a PRISM geometry spec (dimensions, features), the engine regenerates an Inventor template, populates iLogic parameters, and exports STEP + PDF drawing — producing a complete engineering deliverable from a JSON spec.

### WORK

**U-INV03: InventoriLogicTemplateEngine**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- FILES_CREATED:
  - `mcp-server/src/engines/InventoriLogicTemplateEngine.ts`
  - `mcp-server/src/__tests__/InventoriLogicTemplateEngine.test.ts`
- METHODS:
  - `registerTemplate(name, ipt_path, params_schema)` — register parametric template
  - `generateFromSpec(templateName, params): Promise<string>` — returns .ipt output path
  - `listTemplates(): TemplateMeta[]`
  - `validateParams(templateName, params): ValidationResult`
- SEED TEMPLATES:
  - `bored_cylinder` (OD, length, bore_id, bore_depth, material)
  - `stepped_shaft` (lengths[], diameters[], chamfers, material)
  - `rectangular_plate` (L, W, T, hole_pattern, material)
- ABORT_CRITERIA:
  - Zod validation on params (never pass raw objects to COM)
  - Generated file SHA-256 verified before returning
- ROLLBACK: `rm` new files, git checkout index.ts

**U-INV04: InventorExportEngine**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- FILES_CREATED:
  - `mcp-server/src/engines/InventorExportEngine.ts`
  - `mcp-server/src/__tests__/InventorExportEngine.test.ts`
- METHODS:
  - `exportSTEP(ipt_path, out_path): Promise<void>` — AP214 default
  - `exportIGES(ipt_path, out_path)`
  - `exportSTL(ipt_path, out_path, resolution)`
  - `exportDWG(idw_path, out_path)` — drawings only
  - `exportPDF(idw_path, out_path)` — rendered drawing PDF
  - `exportBOM(iam_path, out_path, format: "csv" | "xlsx")`
- ABORT_CRITERIA:
  - Uses official `TranslatorAddIn` — never custom file writers
  - Verifies output file size > 0 and has correct magic bytes
- ROLLBACK: `rm` new files, git checkout index.ts

### FORGE-TRIPLE
- **Hook**: `post-inventor-export` — SHA-256 + size validation on every export
- **MCP Action**: `prism_cad:inventor_generate_from_spec`, `prism_cad:inventor_export`
- **Skill**: `/inventor-generate <template> <spec.json>`

### EXIT GATE
- ✓ 3 seed templates registered
- ✓ 5 export formats functional (mocked in CI)
- ✓ ≥20 tests pass across both engines
- ✓ tsc: 0 errors
- ✓ omega_floor ≥ 0.85
- ✓ SVI delta: +0.4%

### FEATURE CASCADE
- NEW_HOOKS: `post-inventor-export`
- NEW_ACTIONS: `prism_cad:inventor_generate_from_spec`, `prism_cad:inventor_export`, `prism_cad:inventor_list_templates`
- NEW_SKILLS: `/inventor-generate`
- AVAILABLE_TO: INV-3, all downstream CAM pipelines

### /compact checkpoint

---

# Phase INV-3: CAM Handoff to Fusion/HyperMill/Mastercam

**Objective**: Route Inventor-generated geometry into existing CAM pipelines via the MillMasterOrchestratorFacade.
**Sessions**: 1 | **Units**: 2 | **Primary Role**: R3 + R6

## SESSION INV-3-S1: Handoff Bridge + Orchestrator Integration

### SMART CONFIG
```yaml
role: R3 (TS Implementer) + R6 (Integrator)
model: sonnet
effort: HIGH
context_budget: 65%
compact_after: 2 units
```

### KNOWLEDGE SOURCES
- **Engines**: `MillMasterOrchestratorFacadeEngine` (MS1), `FusionCPSParserEngine`, `MultiCamKnowledgeEngine`, HyperMILL post config engine
- **Roadmap cross-refs**: F360-3 (CAM surface), HM-2.x (hyperMILL strategies), MILL-INTEG-MS5 (dynamic registry)

### INTENT
An Inventor STEP export can be automatically handed to Fusion 360 (via F360 bridge), HyperMILL (via post config engine), or Mastercam (via file drop) — routed by MultiCamKnowledgeEngine based on part type + preferred CAM.

### WORK

**U-INV05: InventorToCamHandoffEngine**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- FILES_CREATED:
  - `mcp-server/src/engines/InventorToCamHandoffEngine.ts`
  - `mcp-server/src/__tests__/InventorToCamHandoffEngine.test.ts`
- METHODS:
  - `handoff(step_path, target: CamSystem): HandoffResult`
  - `recommendTarget(part_meta): CamSystem[]` — uses MultiCamKnowledgeEngine
  - `routeToFusion(step_path)` → Fusion360LiveBridgeEngine
  - `routeToHyperMill(step_path)` → ProductionHyperMillPostConfigEngine
  - `routeToMastercam(step_path)` → drop into watched folder
- ABORT_CRITERIA:
  - Never overwrites without confirmation token
  - Validates target CAM is available before attempting handoff
  - **Safety gate**: Handoff MUST route the part through `millMasterOrchestratorFacadeEngine.orchestrate({ type: "validate", ... })` before reaching the target CAM. If validation returns S(x) < 0.70, handoff is BLOCKED and a structured warning is surfaced to the operator.
- ROLLBACK: `rm` new files

**U-INV06: MillMasterOrchestratorFacade — Inventor route type**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- FILES_MODIFIED:
  - `mcp-server/src/engines/MillMasterOrchestratorFacadeEngine.ts` — add `type: "inventor_generate"` and `type: "inventor_handoff"`
  - `mcp-server/src/__tests__/MillMasterOrchestratorFacadeEngine.test.ts` — new route tests
- ABORT_CRITERIA:
  - Existing 22 facade tests still pass
  - New routes return proper provenance with engines_invoked including Inventor engines
- ROLLBACK: `git checkout mcp-server/src/engines/MillMasterOrchestratorFacadeEngine.ts mcp-server/src/__tests__/MillMasterOrchestratorFacadeEngine.test.ts`

### FORGE-TRIPLE
- **Hook**: `pre-cam-handoff` — verifies target CAM is registered in MultiCamKnowledgeEngine
- **MCP Action**: `prism_cad:inventor_handoff_cam`
- **Skill**: `/inventor-to-cam <step> <target>`

### EXIT GATE
- ✓ Handoff to 3 CAM targets functional (mocked)
- ✓ Facade has 8 route types (was 6, +2 inventor routes)
- ✓ All 22+ facade tests still pass
- ✓ ≥15 handoff engine tests pass
- ✓ omega_floor ≥ 0.85
- ✓ SVI delta: +0.3%

### FEATURE CASCADE
- NEW_HOOKS: `pre-cam-handoff`
- NEW_ACTIONS: `prism_cad:inventor_handoff_cam`, `prism_cad:inventor_recommend_cam`
- NEW_SKILLS: `/inventor-to-cam`
- AVAILABLE_TO: Full PRISM CAM pipeline

### /compact checkpoint

---

# Phase INV-4: Validation & Live Testing

**Objective**: Validate bridge against real Inventor install (user's machine), harden error handling, document setup.
**Sessions**: 1 | **Units**: 2 | **Primary Role**: R4 + R5

## SESSION INV-4-S1: Live Validation + Documentation

### SMART CONFIG
```yaml
role: R4 (Test Engineer) + R5 (Reviewer)
model: opus
effort: MAX
context_budget: 50%
compact_after: 2 units
```

### KNOWLEDGE SOURCES
- **Corpus**: 45 real .ipt files in `H:/PRISM/JM DIE/JM DIE COMPANY/EAGLESTONE PARTS/`
- **External**: Autodesk API error codes reference
- **Prior art**: Fusion360 Security Audit 2026-03-31 (`H:/PRISM/SECURITY_AUDIT_FUSION360_2026-03-31.md`) — mirror for Inventor

### INTENT
User runs `/inventor-validate` on their machine and gets a comprehensive report: bridge connects, 3 templates regenerate, STEP export produces valid AP214, CAM handoff reaches Fusion — or a precise diagnostic of what's broken.

### WORK

**U-INV07: Live validation harness + security audit**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- FILES_CREATED:
  - `mcp-server/scripts/inventor-live-validate.mjs`
  - `H:/PRISM/SECURITY_AUDIT_INVENTOR_2026-04-15.md`
- CHECKS:
  - License state, version, API surface
  - Round-trip .ipt create → STEP export → re-read
  - EAGLESTONE corpus — can we read metadata from all 45?
  - No credential leakage, no DLL inspection, no EULA-violating probes
- ABORT_CRITERIA:
  - Audit finds zero CRITICAL issues
  - All 45 EAGLESTONE files readable (metadata only, no decompilation)

**U-INV08: Full roadmap scrutiny — 10-agent post-generation review**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- DELIVERABLES:
  - Scrutiny report in `docs/roadmaps/INVENTOR-AUTOMATION-SCRUTINY-2026-04-15.md`
  - Fixes applied to this roadmap if any dimension < 70
- DIMENSIONS REVIEWED (per /rgs skill):
  - Protocol Structure, Unit Naming, SMART CONFIG, Exit Gate Rigor, Forge-Triple, Physics Rigor, Feature Cascade, Dependency Graph, MCP Utilization, Cross-Roadmap Coherence

### EXIT GATE
- ✓ Security audit PASS
- ✓ Live validation on user machine (when Inventor available)
- ✓ Scrutiny average ≥ 70/100
- ✓ All cross-roadmap links bidirectional
- ✓ omega_floor ≥ 0.90

### FEATURE CASCADE
- NEW_HOOKS: none (validation uses existing)
- NEW_ACTIONS: `prism_cad:inventor_validate_live`
- NEW_SKILLS: `/inventor-validate`

---

## Forge-Triple Summary

| Phase | Hook | MCP Action | Skill |
|-------|------|------------|-------|
| INV-1 | `pre-inventor-automation` | `prism_cad:inventor_bridge_status` | `/inventor-status` |
| INV-2 | `post-inventor-export` | `prism_cad:inventor_generate_from_spec`, `prism_cad:inventor_export` | `/inventor-generate` |
| INV-3 | `pre-cam-handoff` | `prism_cad:inventor_handoff_cam` | `/inventor-to-cam` |
| INV-4 | — | `prism_cad:inventor_validate_live` | `/inventor-validate` |

---

## Enforcement Hooks Active During Execution

- **PRE-LEVEL**: knowledge-consult, duplication-guard (MultiCamKnowledgeEngine must be consulted)
- **POST-LEVEL**: stub detector, test quality gate, constants checker, wiring-review-agent
- **COMPACT-LEVEL**: review gate, forge-triple gate, session audit
- **POST-COMPACT**: Feature Cascade (SESSION_ARTIFACTS.json)
- **INVENTOR-SPECIFIC**: `pre-inventor-automation` blocks operations without verified named-user license

---

## Exit Criteria (Whole Roadmap)

- [ ] 4 new engines: Bridge, Pool, iLogicTemplate, Export
- [ ] 1 handoff engine + facade extension
- [ ] 8 new MCP actions in `prism_cad` dispatcher
- [ ] 4 new skills
- [ ] 4 new enforcement hooks
- [ ] Security audit clean
- [ ] ≥70 total new tests, all passing
- [ ] 0 EULA-violating code paths (verified by manual + automated audit)
- [ ] Cross-roadmap links reciprocated in F360 + HyperMILL roadmaps
- [ ] Scrutiny average ≥ 70/100

---

## Scrutiny Record (Post-Generation)

See `docs/roadmaps/INVENTOR-AUTOMATION-SCRUTINY-2026-04-15.md` after U-INV08 completes.
