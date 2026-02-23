# PRISM Dependency Map & Gap Analysis
## Phase 2-3 Combined Report
## Generated: 2026-02-23

---

## DEPENDENCY MAP

### MCP Server Import Chain (index.ts)
```
index.ts
├── 32 dispatcher imports (registerXDispatcher)
│   ├── dataDispatcher → DataEngine, MaterialRegistry, MachineRegistry, etc.
│   ├── safetyDispatcher → SafetyEngine (29 actions)
│   ├── calcDispatcher → 20+ engines (CalcEngine, QualityEngine, TraceEngine, etc.)
│   ├── ... (28 more dispatchers)
│   └── intelligenceDispatcher → All R3-R11 engines
├── synergyIntegration → Cross-feature F1-F8 wiring
├── autoHookWrapper → Universal hook system
├── hookRegistration → 112 domain hooks
└── registryManager → 9 registries (formulas, engines, materials, machines, etc.)
```

### constants.ts PATHS Dependencies (26 valid, 5 missing)

| PATHS Entry | Used By | Runtime Critical |
|-------------|---------|-----------------|
| MATERIALS | dataDispatcher, MaterialRegistry | YES |
| MACHINES | dataDispatcher, MachineRegistry | YES |
| TOOLS | dataDispatcher | YES |
| CONTROLLERS | dataDispatcher | YES |
| SKILLS | cadenceExecutor, skillScriptDispatcher | YES |
| STATE_DIR | sessionDispatcher, contextDispatcher | YES |
| MATERIALS_CORE | MaterialLayerService | NO (path missing) |
| MATERIALS_ENHANCED | MaterialLayerService | NO (path missing) |
| MATERIALS_USER | MaterialLayerService | NO (path missing) |
| MATERIALS_LEARNED | MaterialLayerService | NO (path missing) |
| MCP_CACHE | Not referenced in code | NO (path missing) |

### Non-canonical References Found

| File | Reference | Status |
|------|-----------|--------|
| `cadenceExecutor.ts:889` | `data/materials_consolidated` | Informational only — used in data coverage scan |
| `cadenceExecutor.ts:1044` | `C:\PRISM\skills-consolidated` (hardcoded) | Matches PATHS.SKILLS — OK |
| `_archived/cadenceExecutor.BACKUP_*` | Various old paths | Archived file — no impact |
| `_archived/knowledgeV2.ts` | Old skills path | Archived file — no impact |

---

## GAP ANALYSIS

### Dead Files (Archival Candidates)

| Category | Count | Size | Reason |
|----------|-------|------|--------|
| Root .ps1 scripts | 139 | ~300KB | Historical phase scripts, zero runtime refs |
| Root .js scripts | 10 | ~50KB | One-off fix scripts |
| Root .py scripts | 7 | ~20KB | One-off audit scripts |
| Root .md docs | 5 | ~40KB | Superseded by GSD_QUICK.md v22 |
| Root .txt files | 3 | ~10KB | Temp outputs |
| Root .bat file | 1 | ~1KB | audit_folders.bat |
| Root PDF | 1 | 54MB | CNC catalog — move to CATALOGS/ |
| State .js scripts | 115 | ~2MB | Diagnostic scripts, not runtime |
| State .txt outputs | 169 | ~1MB | Build/error dumps |
| State .ps1 scripts | 7 | ~20KB | One-off scripts |
| State .py scripts | 17 | ~50KB | One-off scripts |

### Duplicate/Redundant Directories

| Directory | Size | Overlaps With | Action |
|-----------|------|---------------|--------|
| `data/materials_complete/` | 53MB | `data/materials/` | ARCHIVE |
| `data/materials_enhanced/` | 38MB | `data/materials/` | ARCHIVE |
| `data/materials_mechanical_enhanced/` | 33MB | `data/materials/` | ARCHIVE |
| `data/materials_unified/` | 31MB | `data/materials/` | ARCHIVE |
| `data/materials_gen_v5_archived/` | 17MB | Already archived by name | ARCHIVE |
| `data/materials_consolidated/` | 12MB | `data/materials/` + cadence ref | ARCHIVE (update cadenceExecutor) |
| `data/materials_verified/` | 12KB | `data/materials/` | ARCHIVE |
| `skills/` (old) | ~8MB | `skills-consolidated/` | ARCHIVE |
| `skills-generated-v2/` | ~12MB | `skills-consolidated/` | ARCHIVE |
| `skills-for-upload/` | ~4KB | N/A | ARCHIVE |
| `skills-claude-capabilities/` | ~1KB | N/A | ARCHIVE |

### Stale Indexes (5 files need update)

1. **MASTER_INDEX.md** — 31→32 dispatchers, 368→382+ actions
2. **CURRENT_STATE.json** — v24→v25, POST-R11→POST-R32
3. **PATH_CONFIG.json** — v10→v11, fix skills path
4. **MCP_MASTER_MANIFEST.json** — v16→v17, add R12-R32 engines
5. **constants.ts** — SERVER_DESCRIPTION update after chat dispatcher

### Missing Infrastructure

| Item | Path | Action |
|------|------|--------|
| Material layer dirs | `extracted/materials/{core,enhanced,user,learned}` | CREATE |
| MCP cache dir | `mcp-server/cache` | CREATE |
| Chat archive dispatcher | `mcp-server/src/tools/dispatchers/chatArchiveDispatcher.ts` | BUILD (Phase 4) |
| Chat archive engine | `mcp-server/src/engines/ChatArchiveEngine.ts` | BUILD (Phase 4) |

### Code Reference to Fix

**`cadenceExecutor.ts:889`** — Update after archiving `materials_consolidated`:
```typescript
// Before:
path.join(dataRoot, "materials_consolidated"),
// After: REMOVE this line (or point to canonical materials/)
```

---

## RISK ASSESSMENT

| Move | Risk | Mitigation |
|------|------|-----------|
| Archive root scripts | LOW | MCP server has zero imports from root |
| Archive state temp files | LOW | Only canonical state/*.json files are runtime |
| Archive material variants | LOW-MED | Only `data/materials/` used by PATHS; cadenceExecutor line 889 needs update |
| Archive skill variants | LOW | PATHS.SKILLS points to `skills-consolidated/` |
| Add chat dispatcher | MED | Standard dispatcher pattern, build+test gate |
| Update state files | LOW | JSON updates, no runtime impact |

---

## TOTAL SAVINGS ESTIMATE

| Category | Size |
|----------|------|
| Material variants (7 dirs) | ~184MB |
| Root PDF move | 54MB (moved, not deleted) |
| Skill variants | ~20MB |
| State temp files | ~3MB |
| Root scripts | ~500KB |
| **Total archivable** | **~262MB** |
