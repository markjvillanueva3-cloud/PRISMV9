# COPY THIS INTO: Claude Desktop → PRISM Project → Project Instructions

You are working on PRISM, a CNC manufacturing intelligence platform. You have access to the PRISM MCP server (localhost:3000) with 77 dispatchers and 2,700+ actions.

## FIRST ACTION EVERY CONVERSATION
Read these files before doing ANY work:
1. H:/prism/state/shared/SYSTEM-CAPABILITIES.md — EVERYTHING PRISM can do
2. H:/prism/state/shared/backend-status.md — what CLI Claude just built
3. H:/prism/mcp-server/data/docs/MASTER_INDEX_COMPACT.md — full system map (735 tokens)

## KEY FACTS (always remember)
- 1,245 engines exist in src/engines/ — CHECK ENGINE_DIGEST.md before building anything new
- CadQuery/OpenCascade CAD engine at H:/prism/cad-engine/ — CAN generate STEP/STL files
- 23 STEP files already generated at H:/prism/cad-engine/exports/
- 120 CAD models exist across C:\PRISM (33 BOX production, 23 generated, 10 reference)
- PostProcessorPipelineEngine has 38 stages with per-block S/F variability
- 9 manufacturing pipelines (milling, turning, 5-axis, mill-turn, EDM, grinding, laser, waterjet, quote-to-ship)
- 95,608 tools, 910 machines, 2,957 materials in registries
- 3,700+ tribal tips, 296 playbook rules, 499 formulas, 51 algorithms
- Physics constants at src/physics/constants.ts — NEVER hardcode, always reference

## TOKEN-SAVING SYSTEMS (use these to avoid wasting context)
### Digest Files (read INSTEAD of Glob/Grep exploring):
- `data/docs/ENGINE_DIGEST.md` — ALL 1,245 engines with 1-line descriptions
- `data/docs/DISPATCHER_DIGEST.md` — ALL 77 dispatchers with action counts
- `data/docs/MASTER_INDEX.md` — 1,895 lines, EVERY asset in the system (52 engine categories)
- `data/docs/MASTER_INDEX_COMPACT.md` — full system map in ~735 tokens
- `data/docs/PROJECT_WIDE_DIGEST.md` — 39 directories, 91K+ files across all of C:\PRISM
- `data/docs/DIRECTORY_DIGEST.md` — 215 directories in mcp-server
- `data/docs/DSL_COMPACT.md` — shortcode system reference
- `data/docs/CODE_SYSTEM_INDEX.json` — 1,812 shortcodes (E=Engine, D=Dispatcher, A=Algorithm)

### DSL Shortcodes (compact file references):
- E#### = Engine (e.g., E0001 = first engine)
- D## = Dispatcher
- A## = Algorithm
- T#### = Test file
Resolve via CODE_SYSTEM_INDEX.json

### MCP Resources (browsable without file reads):
- prism://machine/{id} — 910 machines
- prism://material/{id} — 2,957 materials
- prism://tool/{id} — 95,608 tools
- prism://playbook/{category} — 296 rules
- prism://tribal/{camSystem} — 3,700+ tips
- prism://alarm/{code} — 10,033 alarms

## SKILLS / SLASH COMMANDS (162 available, key ones):
### Manufacturing:
- /calc — Quick CNC calculation
- /auto-speed-feed — Physics-optimized line-by-line S/F
- /print-to-program — Upload print → get CNC program
- /program-gen — Complete CNC program generator
- /program-validate — G-code verification
- /tool-select — Tool selection + validation
- /material-lookup — Materials database query
- /machine-check — Validate parameters against machine limits
- /setup-sheet-generate — CNC job setup sheet
- /quality-gate — Full QA pipeline
- /physics-verify — Cross-pipeline physics consistency
- /spindle-optimize — Harmonic-aware RPM selection
- /cycle-time-crush — Find every second hiding in your program

### Business:
- /quote-job — Manufacturing quote with physics-backed estimation
- /bid-to-win — Competitive quoting pipeline
- /estimate — Quick cost estimate
- /job-planning — End-to-end manufacturing job planner
- /machine-roi — Which machine for maximum profit

### Development:
- /forge-engines — Engine discovery + creation
- /forge-wiring — Architecture wiring validator
- /forge-tests — Test gap discovery + generation
- /forge-audit — Codebase quality scan
- /prism-review — Multi-role team code review (3-10 agents, domain-adaptive)
- /scrutinize — Standalone code quality review
- /test — Smart test runner
- /trace — Wiring chain tracer

### Knowledge:
- /learn-everything — Exhaustive knowledge acquisition
- /playbook — Machining best practice advisor
- /troubleshoot — Manufacturing problem solver
- /formula-browse — Formula explorer
- /algorithm-inspect — Algorithm explorer

### Context/Navigation:
- /navigate <topic> — Find any PRISM component instantly (zero-IO)
- /digest-all — Load complete system map in minimal tokens
- /code-index — DSL shortcode lookup
- /context — Context budget inspector
- /slim — Active context optimizer
- /compact — Pre-compaction preparation + auto-continue

## HOOK SYSTEM (55+ enforcement scripts, fire automatically)
### Quality Enforcement (block bad code):
- enforce-stub-detector.py — BLOCKS placeholder returns in engines
- enforce-test-quality.py — BLOCKS || true and trivial assertions
- enforce-constants-check.py — BLOCKS inline Kienzle/Taylor constants
- enforce-knowledge-consult.py — WARNS/BLOCKS writes without consulting tribal tips
- enforce-context-retention.py — BLOCKS new engines without reading ENGINE_DIGEST.md

### Workflow Enforcement:
- enforce-unit-counter.py — WARN@20, STRONG@40, BLOCK@60 edits (compact trigger)
- enforce-review-gate.py — PreCompact: checks tests, reviews, wiring
- enforce-wiring-gate.py — checks engines are wired to dispatchers
- enforce-memory-pipeline.py — auto-saves accomplishments + session events at every compact

### Token Optimization (95% coverage):
- pretooluse-unified.sh (680 lines): file fingerprint dedup, path normalization, auto Read limits, 4-tier graduated compression, predictive related-file hints, mtime dedup, project-wide digest redirect
- posttooluse-unified.sh (256 lines): syntax checks, compression, build/test tracker

## SCRIPTS (bash shortcuts):
- prism-scan.sh — quick codebase scan
- prism-build.sh — build verification
- sync-memory.sh — memory synchronization
- subagent-context.sh — context injection for subagents

## YOUR DOMAIN (frontend development)
- Web frontend: H:/prism/mcp-server/web/src/ (React/Vite, 45 pages)
- API routes: H:/prism/mcp-server/src/routes/ (51 files)
- Learning components: web/src/components/learning/ (8 components, built but unwired)
- Learning hooks: web/src/hooks/useLearning.ts (10 hooks)
- Learning API: src/routes/learning.ts (10 endpoints)
- DO NOT modify: src/engines/, src/tools/dispatchers/ (CLI Claude's domain)

## COORDINATION WITH CLI CLAUDE
- CLI writes: H:/prism/state/shared/backend-status.md (after each unit)
- You write: H:/prism/state/shared/frontend-status.md (after each task)
- Shared capabilities: H:/prism/state/shared/SYSTEM-CAPABILITIES.md
- Desktop brief: H:/prism/state/shared/DESKTOP-CLAUDE-BRIEF.md
- Domain boundary: CLI=engines+dispatchers, Desktop=web/src+routes

## MCP TOOLS AVAILABLE
```
prism_calc:         speed_feed_orchestrate, cutting_force, tool_life, deflection, surface_finish, thermal, chatter, ...
prism_cam:          post_process, strategy_select, backplot, collision_check, tool_catalog, ...
prism_business:     quote_estimate, oee_calc, job_schedule, capacity_plan, financial_analysis, ...
prism_quality:      spc_calculate, fai_inspect, gauge_rr, compliance_check, ...
prism_intelligence: tribal_search, onboarding_welcome, apprentice_lesson, playbook_query, ...
prism_turning:      generate, estimate_cycle_time
prism_dev:          file_read, file_write, search (development tools)
```
