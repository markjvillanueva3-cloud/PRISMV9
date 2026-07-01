# PRISM Capability Conversion and Activation Roadmap — Design Specification

**Date**: 2026-03-25
**Track**: PCCA (PRISM Capability Conversion and Activation)
**Milestones**: PCCA-MS0A, PCCA-MS0 through PCCA-MS8
**Target**: Convert PRISM's latent courses, handbooks, guides, extracted modules, skills, scripts, hooks, and reference corpora into executable runtime capability that materially improves the four flagship product pillars and PRISM's self-building capability
**Approach**: Inventory -> Classify -> Compile -> Activate -> Validate -> Expose -> Learn -> Gate

---

## Problem Statement

The audit shows that PRISM already contains enough raw knowledge to materially improve every major pillar:

- transformed course assets and academy content
- deep handbook and reference-document stores
- a large but under-activated skills layer
- a script layer that is richer than its formal index
- a hook layer with strong primitives but incomplete orchestration
- extracted modules and algorithm kernels that are not yet promoted into first-class runtime surfaces

The core limitation is not a lack of source material.
It is a lack of **conversion discipline**:

- too many assets are still passive reference instead of executable tools
- too many capability claims are inferred from file existence rather than proven runtime wiring
- too much activation logic is split across sidecars, audits, and manuals instead of one authoritative path
- too little source material is traceably compiled into validators, benchmarks, hooks, and engines

This roadmap exists to close that gap.

---

## Why This Roadmap Must Exist Separately

Existing roadmap work covers adjacent problems, but not this exact layer:

- [2026-03-20-prism-max-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-20-prism-max-roadmap-design.md) expands product breadth and platform ambition
- [2026-03-25-engine-integrity-gap-closure-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-engine-integrity-gap-closure-roadmap-design.md) addresses stub, no-op, and truth-contract gaps
- [2026-03-25-mcp-max-utilization-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-mcp-max-utilization-roadmap-design.md) focuses on overall utilization and orchestration
- [2026-03-25-mcp-automation-control-plane-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-mcp-automation-control-plane-roadmap-design.md) focuses on automation and slash-command/hook control
- [2026-03-25-prism-app-surface-legitimacy-roadmap-design.md](/C:/PRISM/mcp-server/docs/superpowers/specs/2026-03-25-prism-app-surface-legitimacy-roadmap-design.md) focuses on live HTTP and app-surface truth

What is still missing is a roadmap that answers:

- which latent assets are worth converting first
- how those assets should become skills, scripts, hooks, tools, engines, algorithms, and benchmark corpora
- how to prove that a converted asset truly improves a PRISM pillar
- how to retire or downgrade passive content that should no longer masquerade as runtime value

This roadmap is that missing conversion layer.

---

## Product-Pillar Alignment

Every PCCA milestone must strengthen at least one of these pillars:

1. physics-based speed/feed optimization
2. ultimate post processor generation
3. print to CNC program
4. ERP, quoting, and business management
5. coding/build capability, token utilization, context retention, and persistent memory

No conversion milestone is complete unless it improves one of these surfaces in an executable, testable way.

---

## Required Design Rules

### 1. Executable-Over-Reference Rule

If an asset repeatedly informs product or build decisions, it should not remain reference-only.
It must be promoted into one of:

- script
- hook
- validator
- benchmark corpus
- engine
- algorithm
- capability registry entry

### 2. Provenance Rule

Every converted artifact must retain a source chain back to one or more of:

- handbook or guide
- course or academy lesson
- extracted module
- runtime engine
- algorithm source
- benchmark program or dataset

If provenance cannot be shown, the artifact is advisory, not authoritative.

### 3. Conversion-State Rule

Every important asset must be classified as one of:

- `reference_only`
- `candidate_for_conversion`
- `partially_compiled`
- `runtime_active`
- `benchmark_backed`
- `deprecated`
- `archival_only`

### 4. Benchmark-Before-Claim Rule

Any converted asset that affects customer-facing output must ship with at least one of:

- regression fixture
- golden benchmark
- route contract check
- validator hook
- end-to-end acceptance case

### 5. Compile-Instead-Of-Duplicate Rule

When the same knowledge appears in multiple places, PRISM should prefer:

1. one canonical source
2. one compiler or extractor
3. multiple generated outputs

It should not keep adding hand-maintained copies.

### 6. Activation Rule

A converted asset is not complete until its activation path is explicit:

- when it loads
- why it loads
- what task or product surface triggers it
- how it is validated
- how it is retired if replaced

### 7. Surface Truth Rule

No asset may be counted as product capability merely because it exists on disk.
It must be wired through the relevant path:

- route
- dispatcher
- hook chain
- MCP tool exposure
- UI consumption
- or internal build/control-plane usage

---

## Mandatory Document Lookup Order

### 1. Global inventory first

- [MASTER_INDEX.md](/C:/PRISM/mcp-server/data/docs/MASTER_INDEX.md)
- [MASTER_INDEX_COMPACT.md](/C:/PRISM/mcp-server/data/docs/MASTER_INDEX_COMPACT.md)
- [PATH_INDEX.md](/C:/PRISM/mcp-server/data/docs/PATH_INDEX.md)

### 2. Asset indexes second

- [SCRIPT_INDEX.json](/C:/PRISM/mcp-server/data/docs/SCRIPT_INDEX.json)
- [HOOK_DEFINITIONS_v20.md](/C:/PRISM/mcp-server/data/docs/HOOK_DEFINITIONS_v20.md)
- [SKILL_INDEX.json](/C:/PRISM/skills-consolidated/SKILL_INDEX.json)
- [TRIGGER_MAP.json](/C:/PRISM/skills-consolidated/TRIGGER_MAP.json)
- [AUTO_SKILL_HOOKS.json](/C:/PRISM/skills-consolidated/AUTO_SKILL_HOOKS.json)

### 3. Audit and truth docs third

- [SKILLS_AUDIT_2026-02-13.md](/C:/PRISM/skills-consolidated/SKILLS_AUDIT_2026-02-13.md)
- [TOKEN_OPTIMIZATION_AUDIT_2026-03-24.md](/C:/PRISM/mcp-server/data/docs/TOKEN_OPTIMIZATION_AUDIT_2026-03-24.md)
- [APP_PIPELINE_SCHEMA.md](/C:/PRISM/mcp-server/data/docs/APP_PIPELINE_SCHEMA.md)
- [PRISM_SOFTWARE_PRINCIPLES.md](/C:/PRISM/mcp-server/docs/PRISM_SOFTWARE_PRINCIPLES.md)

### 4. Course and academy layer fourth

- [CurriculumEngine.ts](/C:/PRISM/mcp-server/src/engines/CurriculumEngine.ts)
- [CourseBuilderEngine.ts](/C:/PRISM/mcp-server/src/engines/CourseBuilderEngine.ts)
- [src/data/academy](/C:/PRISM/mcp-server/src/data/academy)
- [extract-course-skills.ps1](/C:/PRISM/mcp-server/scripts/skills/extract-course-skills.ps1)

### 5. Extracted and transformed asset layer fifth

- [extracted/mit](/C:/PRISM/extracted/mit)
- [extracted/learning](/C:/PRISM/extracted/learning)
- [PRISM_220_COURSES_MASTER.js](/C:/PRISM/.claude/worktrees/funny-clarke/data/knowledge_bases/PRISM_220_COURSES_MASTER.js)
- [complete_extraction](/C:/PRISM/.claude/worktrees/funny-clarke/extracted_modules/complete_extraction)

### 6. Reference-document layer sixth

- [BENCHMARK_SUITE_DESIGN.md](/C:/PRISM/mcp-server/data/docs/BENCHMARK_SUITE_DESIGN.md)
- [EXTERNAL-REFERENCE-PROGRAMS-INDEX.md](/C:/PRISM/mcp-server/data/docs/EXTERNAL-REFERENCE-PROGRAMS-INDEX.md)
- [haas-mill-workbook-full.txt](/C:/PRISM/mcp-server/data/docs/haas-mill-workbook-full.txt)
- [haas-lathe-workbook-full.txt](/C:/PRISM/mcp-server/data/docs/haas-lathe-workbook-full.txt)
- [haas-shop-notes-full.txt](/C:/PRISM/mcp-server/data/docs/haas-shop-notes-full.txt)
- [walter-drilling-threading-extracted.txt](/C:/PRISM/mcp-server/data/docs/walter-drilling-threading-extracted.txt)
- [LEARNING_RESOURCES.md](/C:/PRISM/mcp-server/data/docs/LEARNING_RESOURCES.md)
- [RESOURCE_EXTRACTION_ROADMAP.md](/C:/PRISM/mcp-server/data/docs/RESOURCE_EXTRACTION_ROADMAP.md)
- [SYSTEM_INVENTORY.md](/C:/PRISM/mcp-server/data/docs/SYSTEM_INVENTORY.md)

### 7. Live runtime source last

- `src/engines`
- `src/algorithms`
- `src/hooks`
- `src/tools/dispatchers`
- `src/routes`

---

## Mandatory Execution Loop

Every milestone must follow this loop:

1. establish source truth
2. classify candidate assets by pillar and artifact type
3. decide compile vs wire vs retire
4. build the executable artifact
5. wire activation and exposure
6. add a validator, hook, or benchmark
7. prove product impact
8. update truth indexes and roadmap state

No milestone should skip steps 4 through 7.

---

## Scrutiny Loop Protocol

### Pass 1. Provenance scrutiny

- Is the source material canonical, transformed, or archival?
- Is the conversion traceable?
- Is the artifact using active-repo truth or stale worktree truth?

### Pass 2. Duplication scrutiny

- Does this knowledge already exist as a skill, script, engine, or hook?
- Should the build compile from one source instead of copying logic again?

### Pass 3. Activation scrutiny

- When does this load?
- What triggers it?
- Is the activation path deterministic?

### Pass 4. Product-value scrutiny

- Which PRISM pillar improves?
- Is the output visible at runtime, in the build flow, or in validation?
- Is the value real or just better documentation?

### Pass 5. Truth scrutiny

- Can this artifact be benchmarked?
- Can a route, dispatcher, hook, or tool prove it is live?
- Would the UI or another agent be able to discover it?

---

## Compaction and Session Control

### High-risk compaction points

- after inventory and classification
- after source-to-target mapping is finalized
- after benchmark corpora are selected
- before changing activation or hook wiring
- before merging outputs into the main roadmap

### Required continuity artifacts

- candidate ledger
- source-to-output map
- benchmark list
- activation map
- unresolved provenance questions
- merge instructions for the main roadmap

---

## Validation Stack

Every PCCA milestone should use the minimum relevant validation stack:

1. source census or registry sync
2. generated artifact diff review
3. route or dispatcher contract validation where applicable
4. hook activation validation where applicable
5. benchmark or golden fixture comparison where applicable
6. targeted Vitest or runtime proof
7. roadmap truth update

---

## Milestone Map

### PCCA-MS0A — Capability Conversion Contract Freeze

Freeze the design rules, source hierarchy, conversion states, and merge semantics before building.

### PCCA-MS0 — Unified Asset Census and Provenance Map

Create one authoritative ledger of candidate assets, source class, target pillar, target artifact type, and priority.

### PCCA-MS1 — Skill, Script, and Hook Activation Repair

Repair the activation and registry layer so high-value converted assets can actually load and be discovered.

### PCCA-MS2 — Course-to-Capability Compiler

Turn course and academy material into traceable executable outputs instead of leaving it as static learning content.

### PCCA-MS3 — Controller, Post, and Benchmark Conversion

Convert handbooks, controller references, and sample programs into validators, benchmark corpora, and post-truth tooling.

### PCCA-MS4 — Speed/Feed Knowledge Activation

Promote handbook, manufacturer, holder, fixture, finish, thermal, and learning assets into the live speed/feed path.

### PCCA-MS5 — Print-to-Program and Geometry Kernel Promotion

Promote extracted MIT and cross-CAM/kernel assets into production-grade print/post/geometry improvements.

### PCCA-MS6 — ERP, Quote, and Operations Intelligence Activation

Convert static operations and business knowledge into executable OR, risk, and analytics tooling.

### PCCA-MS7 — Context, Token, Memory, and Build-Control Promotion

Turn the sidecar context/build substrate into one authoritative control plane.

### PCCA-MS8 — Capability Truth Gates and Main-Roadmap Merge

Add gates, expose promoted capability truth, and merge the work into the main roadmap without losing lineage.

---

## PCCA-MS0A: Capability Conversion Contract Freeze

**Mission**

Define the rules that prevent conversion work from becoming another pile of passive assets.

**Build**

- create the capability conversion schema
- define source hierarchy: active runtime > active docs > transformed extracts > worktree/archive references
- define artifact types: skill, script, hook, validator, benchmark, engine, algorithm, registry, route exposure
- define conversion states and promotion gates
- define retirement rules for stale or duplicate assets

**Exit**

- every future candidate can be placed in one schema row
- no converted asset can ship without source provenance and activation intent
- worktree and archival assets are marked as advisory unless promoted intentionally

---

## PCCA-MS0: Unified Asset Census and Provenance Map

**Mission**

Build the ledger that tells Claude and the team what is worth converting first.

**Build**

- census skills, scripts, hooks, course assets, extracted modules, and reference docs
- separate active-runtime assets from transformed-reference assets
- tag candidates by product pillar and leverage
- identify duplicates, orphans, phantoms, and stale paths
- emit one conversion ledger with exact source paths and proposed target artifact types

**Priority candidates that must appear in the ledger**

- course compiler inputs
- controller and benchmark corpora
- manufacturer data and catalog inputs
- context/token/session scripts
- extracted post, CAM, geometry, and ERP modules

**Exit**

- one authoritative candidate ledger exists
- the ledger distinguishes canonical runtime inputs from advisory/archive inputs
- top-priority conversion work is ranked by leverage and dependency

---

## PCCA-MS1: Skill, Script, and Hook Activation Repair

**Mission**

Fix activation before adding more converted artifacts.

**Build**

- `skill-reconcile` script to repair orphan, phantom, and polluted trigger mappings
- `script-census` and `script-registry-sync` scripts to align real script surface with the public index
- one bundle resolver for task-based loading
- one hook truth-sync pass to reconcile TypeScript hooks, shell hooks, and documented hooks
- one route/action contract gate for capability claims

**Primary source assets**

- [SKILLS_AUDIT_2026-02-13.md](/C:/PRISM/skills-consolidated/SKILLS_AUDIT_2026-02-13.md)
- [TRIGGER_MAP.json](/C:/PRISM/skills-consolidated/TRIGGER_MAP.json)
- [AUTO_SKILL_HOOKS.json](/C:/PRISM/skills-consolidated/AUTO_SKILL_HOOKS.json)
- [SCRIPT_INDEX.json](/C:/PRISM/mcp-server/data/docs/SCRIPT_INDEX.json)
- [HOOK_DEFINITIONS_v20.md](/C:/PRISM/mcp-server/data/docs/HOOK_DEFINITIONS_v20.md)

**Exit**

- high-value bundles auto-load deterministically
- script catalog truth matches the real script surface
- hook truth is reconciled across docs, runtime, and shell layers
- route contract drift can fail early

---

## PCCA-MS2: Course-to-Capability Compiler

**Mission**

Convert the course substrate into executable build and product assets.

**Build**

- adapt course extraction to transformed and academy-backed inputs
- compile course units into:
  - micro-skills
  - scripts
  - hooks
  - tests
  - engine tickets
  - algorithm tickets
- emit lineage metadata for every generated output
- prioritize the first course-derived conversions for:
  - speed/feed formulas
  - G-code safety
  - CAM-system knowledge packs
  - process optimization and OR concepts

**Primary source assets**

- [extract-course-skills.ps1](/C:/PRISM/mcp-server/scripts/skills/extract-course-skills.ps1)
- [CourseBuilderEngine.ts](/C:/PRISM/mcp-server/src/engines/CourseBuilderEngine.ts)
- [CurriculumEngine.ts](/C:/PRISM/mcp-server/src/engines/CurriculumEngine.ts)
- [src/data/academy](/C:/PRISM/mcp-server/src/data/academy)
- [PRISM_COURSE_GATEWAY_GENERATOR.js](/C:/PRISM/extracted/mit/PRISM_COURSE_GATEWAY_GENERATOR.js)

**Exit**

- course-derived artifacts are generated, not hand-copied
- lineage is visible from output back to source unit
- at least one generated artifact type is feeding each major pillar

---

## PCCA-MS3: Controller, Post, and Benchmark Conversion

**Mission**

Turn controller references and sample programs into executable post truth.

**Build**

- `controller-rule-catalog` registry
- `gcode-haas-lint` script and validator
- `ReferenceProgramBenchmarkEngine`
- controller-specific canned-cycle validators
- benchmark fixture packs for post and print-to-program outputs
- post-generation and print-generation hook gates

**Primary source assets**

- [haas-mill-workbook-full.txt](/C:/PRISM/mcp-server/data/docs/haas-mill-workbook-full.txt)
- [haas-lathe-workbook-full.txt](/C:/PRISM/mcp-server/data/docs/haas-lathe-workbook-full.txt)
- [haas-shop-notes-full.txt](/C:/PRISM/mcp-server/data/docs/haas-shop-notes-full.txt)
- [lathe-test-programs.md](/C:/PRISM/mcp-server/data/docs/lathe-test-programs.md)
- [BENCHMARK_SUITE_DESIGN.md](/C:/PRISM/mcp-server/data/docs/BENCHMARK_SUITE_DESIGN.md)
- [EXTERNAL-REFERENCE-PROGRAMS-INDEX.md](/C:/PRISM/mcp-server/data/docs/EXTERNAL-REFERENCE-PROGRAMS-INDEX.md)

**Exit**

- controller dialect knowledge is executable
- post outputs can be benchmarked against known-good corpora
- post and print-to-program claims are benchmark-backed, not prose-backed

---

## PCCA-MS4: Speed/Feed Knowledge Activation

**Mission**

Promote latent physics, manufacturer, setup, and finish knowledge into the live calculator path.

**Build**

- `ManufacturerCuttingDataRegistryEngine`
- `ThreadMethodSelectorEngine`
- `SpeedFeedEvidenceEngine`
- `HolderAwareSpeedFeedEngine`
- `FixtureConstraintGuardEngine`
- `FinishTargetAdvisorTool`
- thermal/coolant compensation and job-feedback calibration hooks

**Primary source assets**

- [walter-drilling-threading-extracted.txt](/C:/PRISM/mcp-server/data/docs/walter-drilling-threading-extracted.txt)
- [sandvik-gc-turning-sample.txt](/C:/PRISM/mcp-server/data/docs/sandvik-gc-turning-sample.txt)
- [LEARNING_RESOURCES.md](/C:/PRISM/mcp-server/data/docs/LEARNING_RESOURCES.md)
- [RESOURCE_EXTRACTION_ROADMAP.md](/C:/PRISM/mcp-server/data/docs/RESOURCE_EXTRACTION_ROADMAP.md)
- [UltimateSpeedFeedEngine.ts](/C:/PRISM/mcp-server/src/engines/UltimateSpeedFeedEngine.ts)
- [ToolholderDynamicsEngine.ts](/C:/PRISM/mcp-server/src/engines/ToolholderDynamicsEngine.ts)
- [FixtureAwareStrategyEngine.ts](/C:/PRISM/mcp-server/src/engines/FixtureAwareStrategyEngine.ts)
- [SurfaceFinishPredictorEngine.ts](/C:/PRISM/mcp-server/src/engines/SurfaceFinishPredictorEngine.ts)

**Exit**

- speed/feed outputs expose evidence and uncertainty
- holder, fixture, finish, and thread-method effects are first-class
- manufacturer and feedback data influence recommendations in a traceable way

---

## PCCA-MS5: Print-to-Program and Geometry Kernel Promotion

**Mission**

Convert extracted geometry, CAM, and post kernels into production-grade engines and validators.

**Build**

- promote selected extracted modules into TypeScript-first engines or registries
- add geometry-kernel-backed helpers for feature recognition, surfacing, and planning
- add 5-axis planning/collision promotion tasks
- add controller normalization and comparison tooling where extraction assets already exist
- add benchmark-backed print-to-program validation for promoted modules

**Primary source assets**

- [PRISM_CAD_KERNEL_MIT.js](/C:/PRISM/extracted/mit/PRISM_CAD_KERNEL_MIT.js)
- [PRISM_CAM_KERNEL_MIT.js](/C:/PRISM/extracted/mit/PRISM_CAM_KERNEL_MIT.js)
- [PRISM_SURFACE_GEOMETRY_MIT.js](/C:/PRISM/extracted/mit/PRISM_SURFACE_GEOMETRY_MIT.js)
- [PRISM_UNIVERSAL_POST_GENERATOR_V2.js](/C:/PRISM/.claude/worktrees/funny-clarke/extracted_modules/complete_extraction/PRISM_UNIVERSAL_POST_GENERATOR_V2.js)
- [PRISM_POST_PROCESSOR_GENERATOR.js](/C:/PRISM/.claude/worktrees/funny-clarke/extracted_modules/complete_extraction/PRISM_POST_PROCESSOR_GENERATOR.js)
- [PRISM_TOOLPATH_GCODE_BRIDGE.js](/C:/PRISM/.claude/worktrees/funny-clarke/extracted_modules/complete_extraction/PRISM_TOOLPATH_GCODE_BRIDGE.js)

**Exit**

- at least one extracted kernel family is promoted into active runtime value
- print-to-program and post-generation improvements are benchmark-backed
- promoted geometry logic is no longer stranded in extracted JS

---

## PCCA-MS6: ERP, Quote, and Operations Intelligence Activation

**Mission**

Turn static operations and business knowledge into executable planning and risk intelligence.

**Build**

- `QuoteRiskBandEngine`
- `CapacityMonteCarloEngine`
- `InventoryServiceLevelEngine`
- route-truth validation for ERP and analytics surfaces
- quote/process digital-twin hooks that connect cost, risk, load, and schedule signals
- promotion of extracted costing and scheduling modules where they outperform current static logic

**Primary source assets**

- [course-6-to-12-advanced.ts](/C:/PRISM/mcp-server/src/data/academy/course-6-to-12-advanced.ts)
- [QuoteEngine.ts](/C:/PRISM/mcp-server/src/engines/QuoteEngine.ts)
- [QuoteEstimatorEngine.ts](/C:/PRISM/mcp-server/src/engines/QuoteEstimatorEngine.ts)
- [ERPIntegrationEngine.ts](/C:/PRISM/mcp-server/src/engines/ERPIntegrationEngine.ts)
- [PRISM_ACTIVITY_BASED_COSTING.js](/C:/PRISM/.claude/worktrees/funny-clarke/extracted_modules/complete_extraction/PRISM_ACTIVITY_BASED_COSTING.js)
- [PRISM_JOB_SHOP_SCHEDULING_ENGINE.js](/C:/PRISM/.claude/worktrees/funny-clarke/extracted_modules/complete_extraction/PRISM_JOB_SHOP_SCHEDULING_ENGINE.js)

**Exit**

- ERP and quoting gain executable risk and OR depth
- quote/business routes are governed by the same truth rules as CAM and speed/feed
- business intelligence moves from static knowledge to runtime decision support

---

## PCCA-MS7: Context, Token, Memory, and Build-Control Promotion

**Mission**

Promote the sidecar build/context substrate into one authoritative control plane.

**Build**

- `prism_context_control` bundle
- enforced session handoff -> resume validation -> memory promotion chain
- semantic code index promotion for build and audit routing
- durable storage for cognitive, automation, and observability state
- one authoritative token/context governance layer
- one build-mode bundle resolver for coding, review, roadmap, and product work

**Primary source assets**

- [context_monitor.py](/C:/PRISM/scripts/core/context_monitor.py)
- [context_compressor.py](/C:/PRISM/scripts/core/context_compressor.py)
- [next_session_prep.py](/C:/PRISM/scripts/core/next_session_prep.py)
- [resume_validator.py](/C:/PRISM/scripts/core/resume_validator.py)
- [prism_enhanced_wiring.py](/C:/PRISM/scripts/core/prism_enhanced_wiring.py)
- [semantic_code_index.py](/C:/PRISM/scripts/core/semantic_code_index.py)
- [TOKEN_OPTIMIZATION_AUDIT_2026-03-24.md](/C:/PRISM/mcp-server/data/docs/TOKEN_OPTIMIZATION_AUDIT_2026-03-24.md)

**Exit**

- context, token, memory, and build orchestration are no longer split across passive docs and sidecars
- activation is mode-aware and deterministic
- persistent memory promotion is intentional and benchmarkable

---

## PCCA-MS8: Capability Truth Gates and Main-Roadmap Merge

**Mission**

Make the converted capability sustainable and mergeable.

**Build**

- `CapabilitySurfaceLegitimacyEngine` or equivalent governance layer
- conversion ledger closure checks
- benchmark/gate enforcement for promoted artifacts
- main-roadmap merge map that places PCCA deliverables into the canonical roadmap tracks
- milestone envelope generation for any PCCA work that becomes execution-ready

**Merge targets into the main roadmap**

- knowledge-leverage track
- technical-depth track
- production-readiness and quality/hardening tracks
- academy and training-marketplace tracks
- utilization and automation companion roadmaps

**Exit**

- every promoted asset has a source, activation path, validator, and owner lane
- the main roadmap can absorb PCCA without losing provenance or truth gates
- no converted capability remains invisible or ungoverned

---

## How To Merge PCCA Into the Main Roadmap

Merge this roadmap as a companion layer, not as a replacement.

### Merge PCCA-MS1 and PCCA-MS7 into:

- utilization
- automation control plane
- production-readiness quality gates

### Merge PCCA-MS2 into:

- academy
- knowledge leverage
- self-building / developer productivity layers

### Merge PCCA-MS3 and PCCA-MS5 into:

- ultimate post
- print-to-program
- app-surface legitimacy
- engine integrity hardening

### Merge PCCA-MS4 into:

- speed/feed
- physics hardening
- field calibration

### Merge PCCA-MS6 into:

- ERP / quoting / business management
- golden-path orchestration

### Merge PCCA-MS8 into:

- roadmap governance
- truth gates
- release criteria

---

## Success Criteria

This roadmap succeeds only if PRISM can show all of the following:

1. high-value reference assets were converted into executable artifacts instead of merely reorganized
2. promoted capability is benchmark-backed, route-backed, hook-backed, or runtime-backed
3. source provenance is visible for every major converted artifact
4. skill/script/hook truth is more accurate after the pass than before it
5. the four flagship pillars each gained real capability from existing assets
6. the coding/build/context/memory stack became more authoritative, not more fragmented

---

## Notes

- This roadmap is intentionally additive. It does not overwrite the existing main roadmap or the companion add-on roadmaps.
- Worktree and archival assets can be mined for ideas and transformed modules, but they must not be treated as canonical runtime truth until promoted deliberately.
- The highest-value pattern from the audit is consistent across all pillars: `compile`, `wire`, `validate`, and `promote` beat collecting more passive content.
