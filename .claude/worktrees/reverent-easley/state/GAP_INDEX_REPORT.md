# PRISM Gap Index Report
## Generated: 2026-02-23
## Phase 1 of Audit/Index/Reorganization

---

## 1. Root Loose Files (169 total)

| Type | Count | Action |
|------|-------|--------|
| .ps1 (PowerShell) | 139 | ARCHIVE → archives/root-scripts/ |
| .js (JavaScript) | 10 | ARCHIVE → archives/root-scripts/ |
| .py (Python) | 7 | ARCHIVE → archives/root-scripts/ |
| .md (Markdown) | 6 | EVALUATE individually |
| .txt (Text) | 3 | ARCHIVE (temp files) |
| .pdf | 1 | MOVE → CATALOGS/ (54MB CNC catalog) |
| .bat | 1 | ARCHIVE |
| .json | 1 | UPDATE (PATH_CONFIG.json stale) |
| .gitignore | 1 | KEEP |

### Root .md files (evaluate individually)
- `BOOTSTRAP.md` — KEEP at root (quick-start doc)
- `CONDENSED_PROTOCOL_v8.md` — ARCHIVE (superseded by GSD_QUICK.md v22)
- `DEVELOPMENT_PROMPT_v13.md` — ARCHIVE (superseded by v14)
- `DEVELOPMENT_PROMPT_v14.md` — ARCHIVE (operational protocol now in GSD_QUICK.md)
- `SKILLS_AUDIT_REPORT.md` — ARCHIVE (historical audit)
- `SKILLS_GAP_ANALYSIS_v2.md` — ARCHIVE (historical audit)

### Root files to KEEP
- `.gitignore`
- `BOOTSTRAP.md`
- `PATH_CONFIG.json` (update to v11)
- `CLAUDE_PROJECT_SETTINGS.txt`

---

## 2. constants.ts PATHS Validation (31 entries)

### OK (26 paths)
All primary paths resolve correctly:
- PRISM_ROOT, SKILLS, SKILLS_DIR, EXTRACTED_MODULES, EXTRACTED_DIR, SCRIPTS
- MATERIALS, MATERIALS_DB, MACHINES, MACHINES_DB, TOOLS, TOOLS_DB
- CONTROLLERS, WORKHOLDING, KNOWLEDGE_BASES
- MACHINES_BASIC/CORE/ENHANCED/LEVEL5
- STATE_FILE, STATE_DIR, SESSION_MEMORY
- DATA_DIR, COORDINATION, AGENT_REGISTRY, AGENTS, HOOKS
- MCP_SERVER

### MISSING (5 paths)
| Path | Status | Impact |
|------|--------|--------|
| `C:\PRISM\extracted\materials\core` | MISSING | Material layer hierarchy not created |
| `C:\PRISM\extracted\materials\enhanced` | MISSING | Material layer hierarchy not created |
| `C:\PRISM\extracted\materials\user` | MISSING | Material layer hierarchy not created |
| `C:\PRISM\extracted\materials\learned` | MISSING | Material layer hierarchy not created |
| `C:\PRISM\mcp-server\cache` | MISSING | Cache dir never created |

**Note:** The `extracted/materials/` dir exists but has ISO group folders (H_HARDENED, K_CAST_IRON, etc.), not the layer structure (core/enhanced/user/learned). These 4 missing dirs should be created during restructure.

---

## 3. Material Directories Audit

| Directory | Files | Size | Referenced by constants.ts | Action |
|-----------|-------|------|--------------------------|--------|
| `data/materials/` | 229 | 41MB | YES (PATHS.MATERIALS) | **KEEP — canonical** |
| `data/materials_complete/` | 82 | 53MB | NO | ARCHIVE |
| `data/materials_consolidated/` | 48 | 12MB | NO | ARCHIVE |
| `data/materials_enhanced/` | 83 | 38MB | NO | ARCHIVE |
| `data/materials_gen_v5_archived/` | 87 | 17MB | NO | ARCHIVE |
| `data/materials_mechanical_enhanced/` | 68 | 33MB | NO | ARCHIVE |
| `data/materials_unified/` | 95 | 31MB | NO | ARCHIVE |
| `data/materials_verified/` | 1 | 12KB | NO | ARCHIVE |
| `extracted/materials/` | ~50 | 9.9MB | YES (layer parent) | **KEEP** |

**Archivable: 7 dirs, ~184MB**

---

## 4. Skills Directories Audit

| Directory | Entries | Referenced by constants.ts | Action |
|-----------|---------|--------------------------|--------|
| `skills-consolidated/` | 231 dirs | YES (PATHS.SKILLS) | **KEEP — canonical** |
| `skills/` | 100 dirs | NO (stale PATH_CONFIG.json only) | ARCHIVE |
| `skills-archived/` | 39 entries | NO | KEEP (already archive) |
| `skills-generated-v2/` | 1200 entries | NO | ARCHIVE |
| `skills-for-upload/` | 1 entry | NO | ARCHIVE |
| `skills-claude-capabilities/` | 1 entry | NO | ARCHIVE |

---

## 5. State Directory Audit (8.4MB)

| Type | Count | Action |
|------|-------|--------|
| .js scripts | 115 | ARCHIVE (temp diagnostic scripts) |
| .json state files | 61 | EVALUATE — keep canonical, archive temp |
| .md docs | 34 | EVALUATE — keep AUDIT_REPORT, archive temp |
| .jsonl logs | 21 | KEEP (session journals, event logs) |
| .txt outputs | 169 | ARCHIVE (build outputs, error dumps) |
| .ps1 scripts | 7 | ARCHIVE |
| .py scripts | 17 | ARCHIVE |

**Canonical state files to KEEP:**
- CURRENT_STATE.json, SESSION_MEMORY.json, HANDOFF_PACKAGE.json, HANDOFF_SCHEMA.json
- CALIBRATION_STATE.json, LEARNING_STORE.json, lkg_history.json
- SESSION_JOURNAL.jsonl, session_events.jsonl
- AUDIT_REPORT.md, COMPREHENSIVE_WIRING_AUDIT.md, ACTIVE_CONTEXT.md
- memory/ directory (hot/warm/cold)

---

## 6. Stale Index Files

| File | Current | Actual | Delta |
|------|---------|--------|-------|
| MASTER_INDEX.md | 31 dispatchers, 368 actions | 32 dispatchers, 382+ actions | +1 dispatcher, +14 actions |
| CURRENT_STATE.json | v24.0.0, POST-R11-AUDIT | Should be v25, POST-R32 | Stale by 21 phases (R12-R32) |
| PATH_CONFIG.json | v10, skills→`C:\PRISM\skills` | Should be v11, skills→`skills-consolidated` | Stale path + counts |
| MCP_MASTER_MANIFEST.json | v16, pre-R12 | Should reflect R12-R32 engines | Missing 12+ engines |
| constants.ts SERVER_DESCRIPTION | "32 dispatchers, 382+ actions" | Will be "33 dispatchers, 390+ actions" | After chat dispatcher |

---

## 7. Summary

| Category | Count | Archivable Size |
|----------|-------|----------------|
| Root loose files | 169 → 165 archivable | ~500KB |
| Material variant dirs | 7 dirs | ~184MB |
| Skill variant dirs | 3 dirs | ~12MB |
| State temp files | ~300+ files | ~4MB |
| Large PDF at root | 1 file | 54MB (move to CATALOGS/) |
| **Total recoverable** | | **~255MB** |
| Missing PATHS dirs | 5 | Need creation |
| Stale indexes | 5 files | Need update |
