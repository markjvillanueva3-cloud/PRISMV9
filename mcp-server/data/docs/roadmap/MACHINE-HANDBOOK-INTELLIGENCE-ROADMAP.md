# Machine Handbook Intelligence Pipeline Roadmap
## HBK — Ingest, structure, and propagate machine-specific handbook knowledge across all PRISM pipelines

Generated: 2026-03-28
Mode: `/rgs` + `/forge-triple` shared planning overlay
Canonical parent: `C:/PRISM/CAMX-RESTRUCTURED-ROADMAP-v24.md`
Status: planned overlay, execute in dependency order without forking a second master roadmap

---

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

```
SESSION START:  prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "<goal>"
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) → action_search → tool_route_best → wip_capture
SESSION END:    prism_session:memory_save → system_snapshot → checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start → write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)
```

## Quick Reference

| Field | Value |
|-------|-------|
| Track ID | HBK |
| Track Name | Machine Handbook Intelligence |
| Milestones | 12 (HBK-MS0 through HBK-MS11) |
| Phases | 4 (Foundation, Extraction, Domain Intelligence, Integration) |
| Total Units | ~38 |
| Total Sessions | 18-24 |
| Dependencies In | TK (Tribal Knowledge), MachineRegistry, AlarmDiagnosticsEngine |
| Dependencies Out | SpeedFeedOrchestrator, PostProcessorPipeline, QuoteToShip, SVI |
| Milestone Dir | `data/milestones/HBK-MS{N}.json` |
| State Dir | `data/state/HBK-MS{N}/` |

---

## Context Bridge

### What came before
PRISM already has a rich tribal knowledge system (`TribalKnowledgeEngine`, `MachiningPlaybookEngine`, 3,700+ tips) and a `MachineRegistry` with 910 machines including basic kinematics. The Tribal Knowledge Propagation Roadmap established the spine for knowledge routing and consumer delivery.

### What this does
Machine handbooks (operator manuals, maintenance guides, parts books, controller programming manuals, alarm code references) contain the single most authoritative source of machine-specific truth. Every CNC machine ships with 500-2,000 pages of structured technical data that today lives in binders, PDFs, and tribal memory. This track ingests, structures, validates, and propagates that data into every PRISM pipeline that touches a machine.

### What comes after
Once handbook intelligence is live, every pipeline (speed/feed, post-processing, quoting, scheduling, safety, quality) can query authoritative machine limits instead of relying on conservative defaults or tribal approximations. This feeds directly into SVI improvement by closing machine-knowledge gaps, and enables the Physics Fusion pipeline to use actual spindle torque curves, axis acceleration limits, and thermal compensation data from the source of truth.

---

## Objectives

1. **O-1: Structured Handbook Data Model** — Define TypeScript interfaces and Zod schemas covering 10 handbook section types (specs, spindle, axes, tooling, coolant, alarms, maintenance, parts, controller, safety) with full validation.

2. **O-2: Automated Extraction Pipeline** — Build an extraction engine that parses PDF/text handbook pages into structured section records with confidence scoring, OCR table recognition, and unit normalization.

3. **O-3: Domain-Specific Intelligence Engines** — Create specialized engines for alarm intelligence (cross-reference alarm codes with remediation history), machine capability intelligence (spindle curves, axis limits, work envelope), parts/maintenance intelligence (interval tracking, BOM extraction), and controller programming intelligence (macro variables, custom G/M codes, option packages).

4. **O-4: Pipeline Integration** — Wire handbook data into SpeedFeedOrchestrator (actual spindle curves replace generic defaults), PostProcessorPipeline (controller-specific codes and options), QuoteToShipOrchestrator (maintenance cost factors, capability-based routing), and SafetyQualityHooks (alarm severity, machine envelope validation).

5. **O-5: Skills + Hooks + Scripts** — Expose handbook intelligence through MCP actions, slash-command skills, enforcement hooks (block programs that exceed handbook-documented limits), and maintenance scripts (handbook freshness checks, coverage audits).

6. **O-6: SVI Integration** — Register handbook coverage as an SVI dimension so that machines without ingested handbooks show as knowledge gaps, and track handbook-sourced improvement in physics accuracy across all consumers.

---

## Phase 1: Foundation (HBK-MS0)

**Goal**: Establish the data model, registry, and schema infrastructure that all subsequent milestones build on.

| Milestone | Title | Sessions | Dependencies |
|-----------|-------|----------|--------------|
| HBK-MS0 | Handbook Data Model + Registry Schema | 1-2 | None |

### Key Deliverables
- `MachineHandbook` TypeScript interface with 10 section types
- `MachineHandbookRegistry` with CRUD, search, persistence, and versioning
- `HandbookSectionSchema` Zod schemas for all 10 section types
- Sample handbook entry that validates against all schemas

---

## Phase 2: Extraction (HBK-MS1, HBK-MS2)

**Goal**: Build the extraction engine that converts raw handbook content (PDF, text, images) into structured registry entries, plus the acquisition pipeline for bulk ingestion.

| Milestone | Title | Sessions | Dependencies |
|-----------|-------|----------|--------------|
| HBK-MS1 | Handbook Extraction Engine | 2-3 | HBK-MS0 |
| HBK-MS2 | Handbook Acquisition Pipeline | 1-2 | HBK-MS1 |

### Key Deliverables
- `HandbookExtractionEngine` with section detection, table parsing, unit normalization, and confidence scoring
- `HandbookAcquisitionPipelineEngine` with batch ingestion, deduplication, and provenance tracking
- Extraction test suite validated against real Haas, Mazak, and DMG MORI handbook samples
- Bulk import workflow for shop-floor handbook digitization

---

## Phase 3: Domain Intelligence (HBK-MS3 through HBK-MS6)

**Goal**: Build four specialized intelligence engines that transform raw handbook data into actionable, queryable domain knowledge.

| Milestone | Title | Sessions | Dependencies |
|-----------|-------|----------|--------------|
| HBK-MS3 | Alarm Intelligence Engine Enhancement | 2-3 | HBK-MS1 |
| HBK-MS4 | Machine Capability Intelligence | 2-3 | HBK-MS1 |
| HBK-MS5 | Parts Book + Maintenance Intelligence | 2-3 | HBK-MS1 |
| HBK-MS6 | Controller Programming Intelligence | 2-3 | HBK-MS1 |

### Key Deliverables
- Enhanced `AlarmDiagnosticsEngine` with handbook-sourced alarm codes, severity, causes, and remediation steps mapped to tribal remediation history
- `MachineCapabilityIntelligenceEngine` with spindle torque curves, axis acceleration profiles, work envelope geometry, and thermal compensation parameters sourced from handbooks
- `HandbookMaintenanceIntelligenceEngine` with PM interval extraction, parts BOM cross-reference, consumable tracking, and maintenance cost modeling
- `ControllerProgrammingIntelligenceEngine` with custom G/M code extraction, macro variable maps, option package detection, and controller dialect enrichment

---

## Phase 4: Integration + Convergence (HBK-MS7 through HBK-MS11)

**Goal**: Wire handbook intelligence into all consuming pipelines, expose through skills/hooks/scripts, and register with SVI for coverage tracking.

| Milestone | Title | Sessions | Dependencies |
|-----------|-------|----------|--------------|
| HBK-MS7 | Physics Pipeline Handbook Integration | 2-3 | HBK-MS4 |
| HBK-MS8 | Business Pipeline Handbook Integration | 1-2 | HBK-MS5 |
| HBK-MS9 | Safety + Quality Pipeline Integration | 2-3 | HBK-MS4, HBK-MS3 |
| HBK-MS10 | Skills + Scripts + Hooks | 2-3 | HBK-MS3, HBK-MS4, HBK-MS5, HBK-MS6 |
| HBK-MS11 | Consumer Matrix + SVI Integration | 1-2 | HBK-MS7, HBK-MS8, HBK-MS9, HBK-MS10 |

### Key Deliverables
- SpeedFeedOrchestrator uses actual spindle torque curves from handbook data instead of generic defaults
- PostProcessorPipeline queries controller-specific codes and options from handbook intelligence
- QuoteToShipOrchestrator factors maintenance costs and machine capability into job routing and pricing
- SafetyQualityHooks validate programs against handbook-documented machine limits and alarm thresholds
- Full skill/hook/script surface: `/handbook-lookup`, `/handbook-ingest`, handbook limit enforcement hook, coverage audit script
- SVI handbook coverage dimension registered and tracked per machine

---

## Session Management

| Session Block | Milestone(s) | Est. Duration | Focus |
|---------------|-------------|---------------|-------|
| HBK-S1 | HBK-MS0 | 1-2 sessions | Data model, registry, schemas |
| HBK-S2 | HBK-MS1 | 2-3 sessions | Extraction engine |
| HBK-S3 | HBK-MS2 | 1-2 sessions | Acquisition pipeline |
| HBK-S4 | HBK-MS3 | 2-3 sessions | Alarm intelligence |
| HBK-S5 | HBK-MS4 | 2-3 sessions | Machine capability |
| HBK-S6 | HBK-MS5 | 2-3 sessions | Parts + maintenance |
| HBK-S7 | HBK-MS6 | 2-3 sessions | Controller programming |
| HBK-S8 | HBK-MS7 | 2-3 sessions | Physics integration |
| HBK-S9 | HBK-MS8 | 1-2 sessions | Business integration |
| HBK-S10 | HBK-MS9 | 2-3 sessions | Safety + quality integration |
| HBK-S11 | HBK-MS10 | 2-3 sessions | Skills, hooks, scripts |
| HBK-S12 | HBK-MS11 | 1-2 sessions | Consumer matrix + SVI |

---

## Gate Requirements

### Per-Milestone Gate
- `npx tsc --noEmit` passes with 0 errors
- All affected tests pass (`npx vitest run`)
- `/prism-review` with domain-adaptive agents: 0 CRITICAL, 0 HIGH findings
- Wiring verified: import chain + dispatcher call + result flow
- Constants imported from `src/physics/constants.ts` (never inlined)
- Exit conditions from milestone JSON all satisfied

### Track Exit Gate (HBK-MS11 complete)
- All 10 handbook section types have working extraction + validation
- At least 3 real machine handbooks fully ingested and queryable
- SpeedFeedOrchestrator, PostProcessorPipeline, QuoteToShipOrchestrator, and SafetyQualityHooks all consume handbook data
- SVI handbook coverage dimension active and reporting per-machine gaps
- Handbook limit enforcement hook blocks programs exceeding documented limits
- Consumer matrix shows all handbook intelligence consumers with their data flows

---

## Companion Assets

### Skills (create during HBK-MS10)
- `/handbook-lookup` — Query handbook data for any registered machine
- `/handbook-ingest` — Ingest a new handbook PDF/document
- `/handbook-coverage` — Show handbook coverage gaps across the fleet
- `/handbook-compare` — Compare capabilities between machines using handbook data

### Hooks (create during HBK-MS10)
- `handbookLimitGuard` — Block G-code that exceeds handbook-documented spindle/axis/feed limits
- `handbookFreshnessCheck` — Warn when a machine's handbook data is older than its firmware version
- `handbookCoverageGate` — Warn on quote/program generation for machines without ingested handbooks

### Scripts (create during HBK-MS10)
- `handbook-coverage-audit.ts` — Report handbook ingestion status for all 910 machines
- `handbook-freshness-check.ts` — Flag stale handbook data needing re-ingestion
- `handbook-extraction-validate.ts` — Validate extraction quality against known-good handbook sections

---

## Dependency Graph

```
HBK-MS0 ──→ HBK-MS1 ──→ HBK-MS2
                │
                ├──→ HBK-MS3 (Alarm) ──────────────→ HBK-MS9  ──→ HBK-MS11
                │                                ↗       │
                ├──→ HBK-MS4 (Capability) ──┬──→ HBK-MS7 ─┘
                │                           │
                │                           └──→ HBK-MS9
                │
                ├──→ HBK-MS5 (Parts/Maint) ──→ HBK-MS8 ──→ HBK-MS11
                │
                └──→ HBK-MS6 (Controller) ──→ HBK-MS10 ──→ HBK-MS11

HBK-MS3 + HBK-MS4 + HBK-MS5 + HBK-MS6 ──→ HBK-MS10
HBK-MS7 + HBK-MS8 + HBK-MS9 + HBK-MS10 ──→ HBK-MS11
```
