# MCAT-MS0 - Machine Catalog Convergence for Calculator + Shop Profiles

## Intent

Complete the machine-selection truth layer so the calculator can represent every supported machine with configuration-aware controller, spindle, coolant, and capability options, then reuse that same machine package across downstream PRISM flows and calculator-side PRISM mode recommendations.

## MCP FULL UTILIZATION PROTOCOL

SESSION START:

- `prism_dev:session_boot`
- `prism_dev:server_info`
- `prism_dev:svi_summary`
- shared roadmap/task/coordination refresh
- machine-catalog source audit before UI edits

DURING WORK:

- prefer `prism_dev:test_smoke`, targeted web tests, and live route checks before broad browser polish
- keep the machine source of truth visible while editing calculator selectors
- checkpoint after each brand or machine-family audit wave

SESSION END:

- sync shared roadmap posture
- update machine-catalog gap log
- record newly hardened brands, machine families, and downstream consumers

## ENFORCEMENT & KNOWLEDGE PROTOCOL

Knowledge surfaces to reuse first:

- `H:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json`
- `H:/PRISM/mcp-server/src/registries/MachineRegistry.ts`
- `H:/PRISM/mcp-server/src/engines/MachineProfileEngine.ts`
- `H:/PRISM/mcp-server/src/engines/ProgramReleaseCatalogEngine.ts`
- `H:/PRISM/mcp-server/web/src/api/calculatorData.ts`
- `H:/PRISM/mcp-server/web/src/pages/CalculatorPage.tsx`

Enforcement rules:

- do not invent controller or spindle options that are not published for the active machine package
- do not flatten duplicate machine rows into impossible controller/spindle combinations
- keep a provenance trail for machine features that are inferred rather than source-backed
- fail closed in the UI when a feature is unconfirmed; warn instead of pretending support

## Current Verified Position

- The active shared collaboration mode remains `finish-current-delivery-first`.
- The finish-first backend/frontend gate remains active, so this roadmap stays calculator-first and consumer-focused.
- The enriched corpus currently contains `920` machine entries.
- The current machine taxonomy is fragmented enough that direct grouping is unsafe.
- Largest brand families currently visible in the enriched corpus:
  - `Haas (132)`
  - `Mazak (107)`
  - `DMG MORI (94)`
  - `Okuma (60)`
  - `DN Solutions (56)`
  - `Brother (28)`
  - `Citizen (13)`
- The calculator machine-selection module is already partially converged:
  - duplicate backend row merges are now safer
  - published machine packages are now exposed
  - the Okuma `GENOS M460V-5AX` path has already been corrected toward real controller/spindle/coolant truth
- The Print to CNC / Program Release machine catalog is no longer limited to a 3-machine demo default:
  - it now projects spindle-capable CNC machines from the enriched machine corpus into release-safe profiles
  - a reusable machine-search surface now exists for downstream consumers to query that same projected catalog
  - the downstream search surface now returns manufacturer, controller, and kinematics facets so selectors can group against one normalized vocabulary
  - manufacturer normalization now preserves multi-word brands like `DMG MORI` in facet output
  - normalized machine family ids/labels now ride with projected machine summaries and search facets
  - a direct machine lookup surface now exists so downstream consumers can resolve a normalized machine summary by id
  - the frontend operating-system seam now exposes optional Program Release machine search and direct-lookup methods for downstream desk adoption
  - `ProgramReleasePage` now adopts the shared machine-search surface when available instead of relying only on the bulk catalog payload
  - route-driven machine selections in `ProgramReleasePage` can now recover through direct lookup when the active search slice does not include the selected machine
  - manufacturer and normalized family filters now drive actual shared search narrowing instead of existing only as passive facet labels
  - the live/fixture frontend seam now preserves structured facet ids and labels for manufacturer/family grouping too
  - `ProgramReleasePage` now accepts route-driven `machineManufacturer` and `machineFamilyId` context for prefiltered downstream machine selection
  - manufacturer grouping now rides on canonical id/label pairs too, not raw display text alone
  - full canonical machine-package plus user-overlay reuse is still pending
- Remaining gap: every machine still needs to be normalized into a dependable machine package model with strict allowed-option filtering and user-owned persistence.
- Existing building blocks already on disk but not yet fully converged in the calculator:
  - canonical user-machine-profile persistence
  - inventory-aware tool selection engines
  - ROI / budget-standard-premium recommendation engines
  - reusable purchase recommendation modal and commerce seams
- New convergence target:
  - the calculator should gain a `PRISM mode` that auto-selects the best legal category stack for the active machine package, prefers owned inventory first, and ranks missing-coverage purchases by compatibility, cutting-data confidence, availability, ROI, and payback.

## Truth Hierarchy

Use this hierarchy for every machine-aware consumer:

1. live merged registry package from `MachineRegistry`
2. canonical normalized calculator package generated from registry truth
3. user-owned shop machine profile overlay
4. static calculator fallback catalog
5. UI warning state for unresolved ambiguity

The calculator should never bypass this order.

## Phase Plan

### Phase P0 - Truth Hierarchy + Taxonomy

Goal:

- define the canonical machine-package contract before more UI expansion

Units:

- `P0-U01` inventory all machine sources and all machine-consuming surfaces
- `P0-U02` define canonical machine taxonomy for calculator modes and subfamilies
- `P0-U03` define the machine-package schema: machine, controller, spindle, coolant, capability packages, provenance, confidence
- `P0-U04` generate an initial gap matrix by brand and machine family

Deliverables:

- machine truth-hierarchy note
- machine taxonomy map
- machine-package schema
- brand/family gap report

Exit gate:

- every machine source is named
- every downstream consumer is named
- the team has one canonical machine-package schema to implement against

Compact point:

- compact after `P0-U04`

### Phase P1 - Registry Convergence + Configuration Matrices

Goal:

- convert raw registry rows into dependable machine packages

Units:

- `P1-U01` merge duplicate rows into configuration-aware machine packages instead of flat model records
- `P1-U02` normalize manufacturer, model, controller, spindle, coolant, and capability vocabularies
- `P1-U03` build per-machine allowed-option matrices so only legal combinations survive
- `P1-U04` add provenance, confidence, and unresolved-ambiguity queues for incomplete machine data

Deliverables:

- merged machine-package generator
- vocabulary normalization map
- allowed-option matrix per machine package
- ambiguity backlog with severity

Exit gate:

- impossible controller/spindle/coolant combinations are no longer producible from merged registry data
- unresolved ambiguities are explicit instead of silently guessed

Compact point:

- compact after `P1-U04`

### Phase P2 - Calculator Machine-Selection Convergence

Goal:

- make the calculator read directly from the machine-package truth model

Units:

- `P2-U01` replace residual heuristic-only filtering with package-driven filtering in the machine-selection module
- `P2-U02` surface controller capabilities, spindle packages, and coolant strategies from machine-package truth
- `P2-U03` persist user-owned shop machine profiles and calculator machine presets as overlays on canonical packages
- `P2-U04` add contract tests so unsupported options never render for the active machine package

Deliverables:

- calculator selector contract update
- package-driven machine module UI
- saved shop-machine overlay model
- regression suite for impossible-option suppression

Exit gate:

- every dropdown in the machine-selection module is package-aware
- saved machine presets preserve legal options only
- unsupported features show warnings instead of active toggles

Compact point:

- compact after `P2-U04`

### Phase P3 - Downstream Machine-Profile Reuse + Calculator PRISM Mode

Goal:

- make calculator machine selections reusable across PRISM

Units:

- `P3-U01` bind Program Release / Print to CNC to the same canonical machine package plus user overlay
- `P3-U02` expose machine-package read/write APIs and resource surfaces for other machine-aware products
- `P3-U03` propagate machine-profile reuse into quoting, what-if analysis, scheduling, and feasibility consumers
- `P3-U04` add calculator `PRISM mode` orchestration that derives best-fit tooling, holder, coolant, software, and toolpath categories from the active machine package, saved shop profile, and user inventory
- `P3-U05` add ranked budget / standard / premium acquisition recommendations with purchase-popup reuse, cutting-data confidence, compatibility, ROI, payback, and distributor evidence

Deliverables:

- shared machine-package contract for downstream desks
- user-machine profile persistence and retrieval path
- consumer integration matrix
- calculator `PRISM mode` recommendation orchestrator
- ranked purchase recommendation flow reusable by calculator and downstream desks

Exit gate:

- machine choices made in the calculator can be reused by at least Program Release / Print to CNC without manual re-entry
- downstream consumers no longer maintain incompatible parallel machine models
- the calculator can auto-select machine-legal setup categories using the saved machine profile and user inventory
- missing setup coverage can be purchased through ranked budget / standard / premium recommendations without inventing unsupported combinations

Compact point:

- compact after `P3-U05`

### Phase P4 - Validation, Audit, and Operational Hardening

Goal:

- prove the machine catalog is accurate enough to trust

Units:

- `P4-U01` execute brand audit waves with priority order: Okuma, Haas, Mazak, Brother, Citizen, DN Solutions, DMG MORI
- `P4-U02` run calculator and downstream browser/system QA for machine-package selection and reuse
- `P4-U03` add admin import/export and remediation flows for shop machine profiles
- `P4-U04` publish coverage dashboards and the remaining ambiguity backlog

Deliverables:

- brand audit logs
- machine-package QA matrix
- admin remediation flow
- coverage and ambiguity dashboard

Exit gate:

- every major manufacturer family in active use has a named audit result
- the calculator and Print to CNC both prove machine-package reuse
- remaining data gaps are visible, ranked, and repairable

## Downstream Consumer Contract

The machine-selection module should become the shared machine identity source for:

- Calculator
- Print to CNC / Program Release
- quoting and feasibility
- what-if and process planning
- scheduling and machine-suitability filters
- future user-owned machine storage and shop setup features

Minimum shared fields:

- canonical machine id
- manufacturer
- model
- normalized machine family and axis posture
- controller package
- spindle package
- coolant strategies
- capability packages
- provenance and confidence
- user overlay and shop-specific notes
- recommendation evidence: inventory fit, cutting-data confidence, ROI/payback, and purchase-tier ranking

## Risks

- source files contain contradictory controller/spindle/coolant combinations for the same model
- brand naming and type naming are inconsistent enough to break naive grouping
- downstream desks may already carry partial machine abstractions that conflict with calculator truth
- user overlays can become unsafe if they bypass source-backed availability rules
- recommendation ranking can become misleading if inventory freshness or cutting-data confidence is hidden from the user

## Immediate Execution Order

1. `P0-U01` source + consumer inventory
2. `P0-U02` taxonomy definition
3. `P0-U03` machine-package schema
4. `P1-U01` duplicate-row convergence
5. `P2-U01` calculator selector adoption
6. `P3-U04` calculator PRISM mode orchestration once canonical machine-package plus overlay reuse is stable
7. `P3-U05` ranked purchase recommendations and popup reuse immediately after the orchestration layer

## Success Condition

PRISM should end this milestone with one shared machine-package model that powers the calculator correctly, stores shop-specific machine truth, feeds Print to CNC and the rest of the machine-aware product surfaces without drift, and supports calculator `PRISM mode` recommendations plus ranked acquisition paths grounded in machine compatibility and evidence.
