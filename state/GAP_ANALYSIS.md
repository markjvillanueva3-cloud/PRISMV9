# F-3: Gap Analysis — File Classification Report

> Generated: 2026-02-23 | Phase: F-3 of Track F (Foundation)
> Input: DEPENDENCY_MAP.json (F-2), GAP_INDEX_REPORT.md (F-1), UNREALIZED_FEATURES_AUDIT.md

## Classification Legend

| Tag | Meaning |
|-----|---------|
| **DELETE** | Dead code, empty dirs, stale backups — remove permanently |
| **ARCHIVE** | Working code no longer in the active import chain — move to archives/ |
| **KEEP** | Active in dependency graph, canonical data, or critical infrastructure |
| **WIRE** | Code exists but uses hardcoded paths instead of PATHS constant — fix wiring |
| **ASSIGN** | Planned feature from roadmap, not yet built — assign to future track |

---

## 1. MCP Server Source (mcp-server/src/)

### 1.1 KEEP — Active Source (165 files)

All files in the import chain from `index.ts`:

| Category | Count | Status |
|----------|-------|--------|
| Dispatchers (tools/dispatchers/*.ts) | 32 | ✅ All wired via index.ts |
| Engines (engines/*.ts) | 73 | ✅ All exported via engines/index.ts barrel |
| Registries (registries/*.ts) | 11 | ✅ All initialized via RegistryManager |
| Hooks (hooks/*.ts) | 15 | ✅ 130 hooks across 13 categories + bridge + registration |
| Infrastructure (tools/*.ts) | 3 | ✅ autoHookWrapper, cadenceExecutor, synergyIntegration |
| Config (config/*.ts) | 4 | ✅ api-config, apiWrapper, compaction, effortTiers |
| Services (services/*.ts) | 2 | ✅ dataLoader, index barrel |
| Utils (utils/*.ts) | 14 | ✅ Logger, Config, atomicWrite, etc. |
| Types (types/*.ts) | 12 | ✅ All imported by engines/dispatchers |
| Schemas (schemas/*.ts + schemas.ts) | 5 | ✅ Used by dispatchers |
| Data (data/*.ts) | 5 | ✅ Thread data + referenceValues |
| Shared (shared/*.ts) | 3 | ✅ progressive-response, response-level |
| Generators (generators/*.ts) | 3 | ✅ HookGenerator, ExtendedDomainTemplates |
| Validation (validation/*.ts) | 2 | ✅ crossFieldPhysics, materialSanity |
| Errors (errors/*.ts) | 1 | ✅ PrismError |
| Entry point | 1 | ✅ index.ts |
| Safety tool helpers | 5 | ✅ collisionTools, coolantValidation, spindle, toolBreakage, workholding |
| **TOTAL KEEP** | **191** | |

### 1.2 WIRE — Hardcoded Path Violations (33 files)

These files exist and are ACTIVE but bypass `constants.ts PATHS`, using hardcoded `"C:\\PRISM"` strings. They need rewiring, not removal.

**HIGH severity (immediate fix needed):**

| File | Hardcoded Refs | Issue |
|------|---------------|-------|
| tools/autoHookWrapper.ts | 30+ | Telemetry, state, hook logs — all hardcoded |
| tools/cadenceExecutor.ts | 20+ | Cadence state read/write |
| dispatchers/sessionDispatcher.ts | 8 | PRISM_ROOT, STATE_DIR, SCRIPTS_DIR, PYTHON path |
| dispatchers/guardDispatcher.ts | 6 | Same pattern as sessionDispatcher |
| orchestration/AutoPilot.ts | 4 | 3 separate paths: state, gsd, skills |
| engines/NLHookEngine.ts | 2 | Non-standard path prefix |
| registries/FormulaRegistry.ts | 3 | Should use PATHS.DATA_DIR |
| registries/ToolRegistry.ts | 3 | Should use PATHS.TOOLS |
| registries/MachineRegistry.ts | 3 | Should use PATHS.MACHINES |
| utils/Config.ts | 2 | Defines own defaults instead of PATHS |
| registries/ScriptRegistry.ts | 40+ | ~40 usage_examples with hardcoded paths |

**MEDIUM severity:**

| File | Hardcoded Refs |
|------|---------------|
| dispatchers/contextDispatcher.ts | 6 |
| dispatchers/spDispatcher.ts | 6 |
| dispatchers/devDispatcher.ts | 5 |
| dispatchers/gsdDispatcher.ts | 4 |
| dispatchers/manusDispatcher.ts | 4 |
| orchestration/HookEngine.ts | 4 |
| orchestration/AutoPilotV2.ts | 3 |
| engines/SkillBundleEngine.ts | 3 |
| engines/SkillAutoLoader.ts | 3 |
| utils/responseSlimmer.ts | 2 |
| config/api-config.ts | 2 |

**LOW severity:**

| File | Hardcoded Refs |
|------|---------------|
| dispatchers/documentDispatcher.ts | 3 |
| dispatchers/ralphDispatcher.ts | 3 |
| dispatchers/atcsDispatcher.ts | 3 |
| dispatchers/autonomousDispatcher.ts | 3 |
| engines/SessionLifecycleEngine.ts | 3 |
| engines/ComputationCache.ts | 2 |
| engines/BatchProcessor.ts | 2 |
| engines/DiffEngine.ts | 2 |
| registries/BaseRegistry.ts | 2 |

**Fix Strategy:** `import { PATHS } from '../../constants.js'` → use `PATHS.STATE_DIR`, `PATHS.SCRIPTS`, etc.

### 1.3 DELETE — Dead Files in Active Source (3 files)

| File | Reason |
|------|--------|
| `tools/autoHookWrapper.NEW.ts` | Leftover from refactoring — not imported by anything |
| `tools/autoHookWrapper.RECOVERED.ts` | Recovery backup — not imported, has 5 hardcoded paths |
| `data/referenceValues.ts` | Not imported by any engine, dispatcher, or utility |

### 1.4 ARCHIVE — _archived Directory (52 files)

All files in `_archived/` subdirectories are already excluded from the import chain:

| Directory | Files | Estimated Lines |
|-----------|-------|----------------|
| `tools/_archived/` | ~15 | ~8,000 |
| `registries/_archived/` | ~5 | ~2,000 |
| Other `_archived/` | ~32 | ~5,000 |
| **TOTAL** | **52** | **~15,000** |

**Action:** Move all `_archived/` dirs from `mcp-server/src/` to `archives/mcp-server-archived/`

### 1.5 KEEP — Test Files (9 files)

| File | Status |
|------|--------|
| `__tests__/health.test.ts` | KEEP — active test |
| `__tests__/memoryProfile.test.ts` | KEEP |
| `__tests__/safetyMatrix.test.ts` | KEEP |
| `__tests__/securityAudit.test.ts` | KEEP |
| `__tests__/stressTest.test.ts` | KEEP |
| `__tests__/unit/apiTimeout.test.ts` | KEEP |
| `__tests__/unit/atomicWrite.test.ts` | KEEP |
| `__tests__/unit/envParsing.test.ts` | KEEP |
| `__tests__/unit/getEffort.test.ts` | KEEP |
| `tests/smokeTests.ts` | KEEP (has hardcoded paths — acceptable for test) |

---

## 2. External Directories (outside mcp-server/)

### 2.1 KEEP — Canonical Data Directories

| Directory | Files | Purpose | Consumed By |
|-----------|-------|---------|-------------|
| `data/materials/` | ~229 | Material database | R01 MaterialRegistry |
| `data/coordination/` | 13 | Agent coordination | R06 AgentRegistry |
| `extracted/machines/` | 4 layers | Machine specs | R02 MachineRegistry |
| `extracted/tools/` | 2 | Tool database | R03 ToolRegistry |
| `extracted/controllers/` | 50 | Controller data | Engines |
| `extracted/workholding/` | 3 | Fixture data | WorkholdingEngine |
| `extracted/knowledge_bases/` | 12 | KB files | KnowledgeQueryEngine |
| `extracted/materials/` | 6 + 4 subdirs | Material layers | MaterialRegistry |
| `skills-consolidated/` | 231 dirs | Skill definitions | R08 SkillRegistry |
| `scripts/core/` | 75 files | Python automation | ScriptRegistry, dispatchers |
| `state/` | 124 files | Session state, logs | Multiple dispatchers |
| `knowledge/` | ~15 entries | Knowledge extraction | KnowledgeQueryEngine |

### 2.2 KEEP — Infrastructure

| Directory | Purpose |
|-----------|---------|
| `mcp-server/` | MCP server root |
| `mcp-server/cache/` | Cache dir (created, now exists) |
| `mcp-server/data/docs/` | GSD protocol, master index, roadmap |
| `archives/` | 16 archived directories from F-1 |

### 2.3 ARCHIVE — Superseded External Files

| Item | Files | Reason |
|------|-------|--------|
| `scripts/integration/` | 6 | Never used by MCP server — Excel/JSON/DuckDB/Obsidian sync scripts |
| `templates/` | 0 | Empty directory — never populated |

### 2.4 DELETE — Already Cleaned

These were addressed in F-1 (batches 1-6):
- ✅ 165 root loose files → `archives/`
- ✅ 7 material variant dirs → `archives/materials-variants/`
- ✅ 4 skill variant dirs → `archives/skills-*/`
- ✅ 300+ state temp files → `archives/sessions/`
- ✅ Legacy backups → `archives/backups-legacy/`

---

## 3. Circular Dependencies (from F-2)

| ID | Cycle | Severity | Fix |
|----|-------|----------|-----|
| CIRC-01 | HookEngine ↔ hookRegistration | MEDIUM | Extract hook registration interface, use DI |
| CIRC-02 | EventBus ↔ HookEngine | LOW | Acceptable — pub/sub pattern is loosely coupled |
| CIRC-03 | autoHookWrapper → TelemetryEngine → autoHookWrapper | LOW | Already handled — guard clause excludes telemetry from wrapping |

---

## 4. Missing Infrastructure (from F-1 + F-2)

| Item | Status | Action |
|------|--------|--------|
| `extracted/materials/core/` | ✅ Created (empty) | ASSIGN — populate from data/materials during extraction |
| `extracted/materials/enhanced/` | ✅ Created (empty) | ASSIGN — populate from data/materials during extraction |
| `extracted/materials/user/` | ✅ Created (empty) | ASSIGN — populate with user customizations |
| `extracted/materials/learned/` | ✅ Created (empty) | ASSIGN — populate from ML engine output |
| `mcp-server/cache/` | ✅ Created (empty) | KEEP — will be used by ComputationCache engine |
| MASTER_FILE_INDEX.json | Does not exist | ASSIGN — generate from this gap analysis |

---

## 5. ASSIGN — Unrealized Features (from UNREALIZED_FEATURES_AUDIT.md)

### Tier 1 (High Impact)

| Feature | Category | Status | Assign To |
|---------|----------|--------|-----------|
| Post Processor Framework | C - Monolith Extract | Engine exists but no data pipeline | Track P-MS0 |
| Cost Estimation Engine | B - Designed Never Built | Referenced but not implemented | Track P |
| Process Planning Engine | B - Designed Never Built | Referenced but not implemented | Track P |
| Intelligence Extraction Pipeline | C - Monolith Extract | 67 JS files in extracted/ need pipeline | Track P-MS0 |

### Tier 2 (Medium Impact)

| Feature | Category | Status |
|---------|----------|--------|
| Multi-Tenant data isolation | F5 engine exists | Needs external data partitioning |
| Protocol Bridge | F7 engine exists | Needs real API endpoints |
| ML Pipeline (Physics/Predictive) | A - Written Never Wired | Engines exist, no training data pipeline |

---

## 6. Summary Scoreboard

| Classification | Count | Action |
|---------------|-------|--------|
| **KEEP** | 191 source + 12 external dirs | No action needed |
| **WIRE** | 33 source files | Replace hardcoded paths with PATHS imports |
| **DELETE** | 3 source files | Remove from src/ |
| **ARCHIVE** | 52 _archived files + 2 external dirs | Move to archives/ |
| **ASSIGN** | 4 tier-1 features + 3 tier-2 | Roadmap tracks P, T, B |

### Immediate Actions (F-4 Scope)

1. **DELETE 3 orphan files** — autoHookWrapper.NEW.ts, autoHookWrapper.RECOVERED.ts, data/referenceValues.ts
2. **MOVE 52 _archived files** out of src/ to archives/mcp-server-archived/
3. **WIRE 33 files** — replace hardcoded "C:\PRISM" with PATHS constant imports
4. **ARCHIVE templates/** — empty, not used
5. **ARCHIVE scripts/integration/** — not consumed by MCP server

### Net Result After F-4

| Metric | Before | After |
|--------|--------|-------|
| Active .ts files in src/ | 217 | 162 |
| _archived files in src/ | 52 | 0 |
| Dead code files | 3 | 0 |
| Hardcoded path violations | 33 | 0 |
| Cross-boundary clarity | 24 PATHS + 33 bypasses | 24 PATHS only |
