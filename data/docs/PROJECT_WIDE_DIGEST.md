# PRISM Project-Wide Digest

**Purpose**: Token-efficient reference for the ENTIRE C:/PRISM file system.
Load this file (~450 tokens effective) instead of running Glob/Grep to find things across the project.
For **mcp-server/ internals**, see `DIRECTORY_DIGEST.md` (215 dirs, 3691 files).

**Generated**: 2026-03-24 | **Top-Level Dirs**: 39 | **Root Files**: 43 | **Total Files**: ~91,000+

## Quick Lookup

| What you need | Where to look |
|--------------|---------------|
| Engine code | `mcp-server/src/engines/` |
| Dispatchers / action routing | `mcp-server/src/tools/dispatchers/` |
| Algorithms | `mcp-server/src/algorithms/` |
| Tests (engine/unit) | `mcp-server/src/__tests__/` |
| Frontend / dashboard / UI | `web/src/pages/`, `web/src/components/` |
| Dev tools / impact analysis | `mcp-dev-tools/src/tools/` |
| Python automation scripts | `scripts/` |
| Material database | `mcp-server/data/materials/`, `data/materials/` |
| Tool catalogs | `mcp-server/src/data/`, `MANUFACTURER_CATALOGS/`, `CATALOGS/` |
| Machine profiles | `mcp-server/src/data/machine-*-catalog*.ts`, `data/machines/` |
| Roadmap / milestones | Root `CAMX-*.md` files, `mcp-server/data/milestones/` |
| Registries / wiring | `registries/`, `mcp-server/src/registries/` |
| Hooks / enforcement | `.claude/hooks/`, `mcp-server/src/hooks/` |
| Skills / slash commands | `skills-consolidated/`, `.claude/skills/`, `deployment/` |
| Knowledge base | `knowledge/`, `mcp-server/data/docs/` |
| CAD / geometry / STEP | `cad-engine/`, `BOX/PART MODELS*/` |
| hyperMILL training | `resources/` |
| Session state / logs | `state/`, `logs/` |
| Archives / legacy | `archives/` |
| System documentation | `docs/`, `mcp-server/data/docs/` |
| Swarm / agent orchestration | `.claude-flow/`, `claude-dev/`, `.swarm/` |
| GitHub CI/CD | `.github/` |
| PDF manufacturer catalogs | `MANUFACTURER_CATALOGS/`, `CATALOGS/` |
| Whisper / speech models | `models/` |
| MIT manufacturing course | `tmp_mit_2008/` |
| Project config / state | Root `*.json` files, `config/` |

## Domain Routing

When a query mentions these topics, route here:

- **frontend/UI/dashboard/react** -> `web/src/`
- **training/hypermill/CAM tutorial** -> `resources/`
- **audit/report/health** -> `audits/`, `state/AUDIT/`, `mcp-server/audits/`
- **roadmap/milestone/session** -> root `CAMX-*.md` files, `state/`, `mcp-server/data/milestones/`
- **skill/command/slash** -> `skills-consolidated/`, `.claude/skills/`
- **hook/enforcement/guard** -> `.claude/hooks/`, `mcp-server/src/hooks/`
- **registry/wiring/architecture** -> `registries/`
- **material/alloy/composition** -> `data/materials/`, `mcp-server/data/materials/`, `scripts/`
- **tool/catalog/holder** -> `data/tools/`, `data/tool_holders/`, `MANUFACTURER_CATALOGS/`
- **machine/controller/CNC** -> `data/machines/`, `data/controllers/`
- **CAD/geometry/STEP/model** -> `cad-engine/`, `BOX/PART MODELS*/`
- **log/session/state** -> `logs/`, `state/`
- **script/automation/batch** -> `scripts/`
- **archive/legacy/backup** -> `archives/`
- **deployment/package/release** -> `deployment/`
- **knowledge/learning/course** -> `knowledge/`, `tmp_mit_2008/`
- **swarm/agent/orchestration** -> `.claude-flow/`, `claude-dev/`, `.swarm/`
- **dev-tools/checkpoint/impact** -> `mcp-dev-tools/`
- **cutting/machining/force/speed/feed** -> `mcp-server/src/engines/`, `mcp-server/src/algorithms/`
- **G-code/post-processor/CAM** -> `mcp-server/src/engines/*GCode*,*Cam*,*PostProcess*`
- **quoting/costing/economics** -> `mcp-server/src/engines/*Cost*,*Quote*,*Economic*`
- **quality/SPC/capability** -> `mcp-server/src/engines/*Quality*,*Statistical*`
- **safety/risk/OSHA** -> `mcp-server/src/engines/*Safety*`, `mcp-server/src/hooks/SafetyChain*`
- **welding/joining** -> `mcp-server/src/engines/*Weld*,*Solder*,*Braz*`
- **formulas/physics models** -> `mcp-server/src/registries/FormulaRegistry*`, `mcp-server/src/algorithms/`
- **playbook/tribal knowledge** -> `mcp-server/src/engines/MachiningPlaybookEngine.ts`, `mcp-server/src/registries/TribalKnowledge*`

## Directory Tree

```
C:/PRISM/
|-- Root files (43) — README, CLAUDE.md, package.json, docker-compose.yml, 11 CAMX-*.md roadmaps
|
|-- mcp-server/ (46,563 files) — Core MCP server [see DIRECTORY_DIGEST.md]
|   |-- src/engines/ (880) — 1,245 calculation engines
|   |-- src/__tests__/ (545) — Test suites
|   |-- src/data/ (75) — Tool/machine catalogs (95K+ tools, 910 machines)
|   |-- src/tools/dispatchers/ (67) — Action dispatchers
|   |-- src/schemas/ (72) — Zod action schemas
|   |-- src/algorithms/ (52) — Physics, ML, optimization
|   |-- src/routes/ (33) — Express API routes
|   |-- src/registries/ (23) — Material, tool, formula registries
|   |-- src/hooks/ (22) — Safety chains, enforcement hooks
|   |-- data/milestones/ (111) — Milestone envelope JSONs
|   |-- data/docs/ (33) — System documentation, digests
|   |-- web/src/ (96) — Embedded web frontend
|   |-- scripts/ (69) — Utility scripts
|   |-- state/ (1000+) — QA milestones, bridge certs, results
|
|-- web/ (27,674 files) — React 19 + Vite frontend
|   |-- src/components/ (29) — UI components, charts, viewers, learning
|   |-- src/pages/ (42) — Dashboard, ERP, calculators, viewers
|   |-- src/api/ (4) — API client modules
|   |-- src/hooks/ (5) — React hooks
|   |-- src/contexts/ (1) — React context providers
|
|-- mcp-dev-tools/ (4,202 files) — Dev tools for MCP
|   |-- src/tools/ — Checkpoints, context, impact analysis, semantic search
|
|-- archives/ (3,437 files) — Historical backups, 16 subdirs
|   |-- legacy roadmaps, old skills, sessions, script archives
|
|-- scripts/ (1,840 files) — Python automation
|   |-- 14 subdirs + 30+ root .py — batch processing, material gen, auditing, extraction
|
|-- resources/ (1,619 files) — hyperMILL training materials
|   |-- Basic Training Days 1-3, PDFs, .hmc/.stp/.3df files
|
|-- state/ (1,527 files) — Session state & logs
|   |-- 40+ subdirs — QA milestones, checkpoints, events, hooks, reports
|
|-- data/ (1,164 files) — System registries
|   |-- MASTER_INDEX.json, ENGINE_REGISTRY.json
|   |-- 33 subdirs — materials, tools, machines, formulas, controllers, tool_holders
|
|-- extracted_modules/ (1,070 files) — Consolidated module snapshots
|   |-- COMPLETE, FINAL, GIANT, MEGA, ULTRA builds
|   |-- physics/geometry/AI engine extracts
|
|-- extracted/ (716 files) — Extracted module database
|   |-- 22 subdirs — mirrors data/ structure
|
|-- cad-engine/ (640 files) — CAD/CAM geometry engine
|   |-- primitives, knowledge store, reference parts, schemas, tests
|
|-- tmp_mit_2008/ (283 files) — MIT 2.008 Manufacturing course
|   |-- content_map.json, pages/, resources/
|
|-- skills-consolidated/ (281 files) — Consolidated skill registry
|   |-- SKILL_INDEX.json (165KB), TRIGGER_MAP.json, 95+ prism-* skill dirs
|
|-- BOX/ (260 files) — External CNC data
|   |-- Fusion posts, Okuma macros, STEP models, training projects
|
|-- docs/ (147 files) — System documentation
|   |-- Protocol versions v7-v16, dev prompts, hook docs, 5 exec PDFs
|
|-- MANUFACTURER_CATALOGS/ (116 files) — CNC tool catalogs
|   |-- Sumitomo, Sandvik, ISCAR, Walter, Haimer, REGO-FIX PDFs
|
|-- deployment/ (95 files) — Skill package deployment
|   |-- skills_package_v4/ with 68 prism-* skills
|
|-- CATALOGS/ (68 files) — Tool reference catalogs (mirrors MANUFACTURER_CATALOGS)
|
|-- knowledge/ (58 files) — Knowledge base
|   |-- Skills/ (40), Sessions/ (5), decisions/, code-index/, data-index/
|
|-- registries/ (54 files) — System registries
|   |-- ENGINE/FORMULA/HOOK/SKILL/SCRIPT registries, WIRING maps, LAYER_TAXONOMY
|
|-- logs/ (50 files) — Operational logs
|   |-- api/ (14), sessions/ (25), server/hook/auto logs
|
|-- skills-archived/ (39 files) — Archived skills (_deleted/_original variants)
|
|-- claude-dev/ (24 files) — Claude dev utilities
|   |-- context managers, hooks, orchestration, swarm templates (8 types)
|
|-- audits/ (12 files) — Audit results
|   |-- combination engine, materials, anti-regression, dispatcher gap
|
|-- autonomous-tasks/ (9 files) — Task manifests
|   |-- materials-db-verified/, smoke-test-latest/
|
|-- src/ (9 files) — Core TS/JS source
|   |-- AtomicValue.types.ts, UncertaintyMath.ts, HookManager.ts
|
|-- devtools/ (5 files) — prism_devtools.py, duckdb_helper.py
|-- toolkit/ (4 files) — prism_dev_toolkit.py, quick_queries.py
|-- prompts/ (4 files) — Project instructions v1-v3
|-- project-knowledge/ (4 files) — PRISM_COMPLETE_SYSTEM v9/v10
|-- tests/ (2 files) — test_extraction_integrity.py
|-- models/ (2 files) — Whisper models (ggml-base.bin, ggml-large-v3.bin)
|-- schemas/ (1 file) — AtomicValue.schema.json
|-- config/ (1 file) — PEAK_RESOURCES.json
|-- checkpoints/ (1 file) — Session checkpoint tarball
|-- build/ (1 file) — MONOLITH_PATH.txt
|-- artifacts/ (1 file) — PRISM_MultiAgent_Orchestrator.jsx
|-- _PROJECT_FILES/ (1 file) — 00_COMPACT_RULES.md
|-- diagrams/ (0 files) — Empty
|
|-- .claude/ (~100 files) — Claude Code config
|   |-- settings.json, memory.db, agents/, commands/, skills/
|
|-- .claude-flow/ (69 files) — Claude Flow daemon
|   |-- agents, hive-mind, workflows, metrics
|
|-- .github/ (41 files) — GitHub Actions CI/CD, dependabot
|
|-- .serena/ (53 files) — Serena agent config
|   |-- project.yml, cache, memories
|
|-- .swarm/ (3,245 files) — Swarm vector DB
|   |-- hnsw.index (1.6MB), memory.db (1.3MB)
|
|-- .pytest_cache/ (43 files) — Pytest cache
```

## File Counts Summary

| Directory | Files | Primary Types | Purpose |
|-----------|------:|---------------|---------|
| mcp-server/ | 46,563 | .ts, .json, .md | Core server, engines, tests, data |
| web/ | 27,674 | .tsx, .ts, .css | React frontend |
| mcp-dev-tools/ | 4,202 | .ts, .json | Dev tools |
| archives/ | 3,437 | .md, .json, .ts | Historical backups |
| .swarm/ | 3,245 | .db, .index | Vector DB |
| scripts/ | 1,840 | .py | Python automation |
| resources/ | 1,619 | .pdf, .hmc, .stp | hyperMILL training |
| state/ | 1,527 | .json, .log | Session state |
| data/ | 1,164 | .json | Registries, materials, tools |
| extracted_modules/ | 1,070 | .ts | Module snapshots |
| extracted/ | 716 | .json, .ts | Extracted modules |
| cad-engine/ | 640 | .ts, .json | CAD/CAM geometry |
| tmp_mit_2008/ | 283 | .html, .json | MIT course |
| skills-consolidated/ | 281 | .md, .json | Skill registry |
| BOX/ | 260 | .cps, .stp | CNC data |
| docs/ | 147 | .md, .pdf | Documentation |
| MANUFACTURER_CATALOGS/ | 116 | .pdf | Tool catalogs |
| deployment/ | 95 | .md | Skill packages |
| .claude/ | ~100 | .json, .md | Claude config |
| .claude-flow/ | 69 | .yml, .json | Flow daemon |
| CATALOGS/ | 68 | .pdf | Tool catalogs |
| knowledge/ | 58 | .md, .json | Knowledge base |
| registries/ | 54 | .json, .ts | System registries |
| .serena/ | 53 | .yml, .json | Serena config |
| logs/ | 50 | .log, .json | Operational logs |
| .github/ | 41 | .yml | CI/CD |
| .pytest_cache/ | 43 | .json | Test cache |
| skills-archived/ | 39 | .md | Old skills |
| claude-dev/ | 24 | .ts, .md | Dev utilities |
| audits/ | 12 | .md, .json | Audit results |
| autonomous-tasks/ | 9 | .json | Task manifests |
| src/ | 9 | .ts | Core source |
| devtools/ | 5 | .py | Dev analysis |
| toolkit/ | 4 | .py | Quick queries |
| prompts/ | 4 | .md | Instructions |
| project-knowledge/ | 4 | .md | System snapshots |
| tests/ | 2 | .py | Root tests |
| models/ | 2 | .bin | Whisper models |
| Root files | 43 | .md, .json, .yml | Config, roadmaps |
| **TOTAL** | **~91,000+** | | |

## Cross-References

- **Engine -> Dispatcher**: `mcp-server/src/tools/dispatchers/` wires actions to engines
- **Engine -> Test**: `mcp-server/src/__tests__/` has `*engine-name*.test.ts`
- **Engine -> Schema**: `mcp-server/src/schemas/` validates action parameters
- **Engine -> Registry**: `registries/ENGINE_REGISTRY.json` + `mcp-server/src/registries/`
- **Dispatcher -> Schema**: each dispatcher has matching schema in `mcp-server/src/schemas/`
- **Registry -> Data**: registries load from `mcp-server/src/data/` + `data/`
- **Route -> Dispatcher**: `mcp-server/src/routes/` calls dispatchers
- **Hook -> Engine**: `mcp-server/src/hooks/` + `.claude/hooks/` reference engines
- **Skill -> Command**: `skills-consolidated/` maps to `.claude/skills/` and `deployment/`
- **Frontend -> API -> Route**: `web/src/api/` calls `mcp-server/src/routes/`
- **State -> Milestone**: `state/` tracks `mcp-server/data/milestones/` progress
- **Script -> Data**: `scripts/` generates content for `data/` and `mcp-server/src/data/`
- **CAMX Roadmap -> Milestones**: root `CAMX-*.md` define targets, `mcp-server/data/milestones/` track them
- **Knowledge -> Engine**: `knowledge/` informs `mcp-server/src/engines/` implementations
- **Catalogs -> Registries**: `MANUFACTURER_CATALOGS/` PDFs -> extracted to `data/tools/` -> loaded by registries

## Key Root Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions for Claude Code |
| `README.md` | Project overview |
| `PROJECT_INDEX.json` | Master project structure index |
| `MASTER_INVENTORY.json` | Complete inventory of all engines/dispatchers/algorithms |
| `CURRENT_STATE.json` | Current session state |
| `SESSION_STATE.json` | Session persistence |
| `CLAUDE_MEMORY.json` | Claude memory persistence |
| `PATH_CONFIG.json` | Path resolution config |
| `ROADMAP_QUEUE.json` | Roadmap task queue |
| `package.json` | Root package config (npm) |
| `docker-compose.yml` | Docker service definitions |
| `START_SESSION.bat` | Session startup script |
| `END_SESSION.bat` | Session cleanup script |
| `BOOTSTRAP.md` | Bootstrap instructions |
| `CAMX-CONSOLIDATED-ROADMAP-v20.md` | Consolidated CAMX roadmap (1,953 lines, 1,022 units) |
| `CAMX-RESTRUCTURED-ROADMAP-v24.md` | Restructured roadmap (1,800+ lines, 42 sessions) |
