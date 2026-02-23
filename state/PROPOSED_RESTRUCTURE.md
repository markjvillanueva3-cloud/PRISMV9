# F-4: Proposed Restructure Plan

> Generated: 2026-02-23 | Phase: F-4 of Track F (Foundation)
> Input: GAP_ANALYSIS.md (F-3), DEPENDENCY_MAP.json (F-2)
> **⚠️ REQUIRES MARK'S APPROVAL BEFORE EXECUTION (F-5)**

## Design Goal

Make the MCP server **self-contained** — all external references flow through one canonical `constants.ts PATHS` object, no hardcoded strings, no dead code in the active tree.

---

## Phase 1: DELETE Dead Code (3 files, ~500 lines)

Zero risk — these files are not imported by anything.

```
DELETE  mcp-server/src/tools/autoHookWrapper.NEW.ts
DELETE  mcp-server/src/tools/autoHookWrapper.RECOVERED.ts
DELETE  mcp-server/src/data/referenceValues.ts
```

**Verification:** `grep -r "autoHookWrapper.NEW\|autoHookWrapper.RECOVERED\|referenceValues" src/ --include="*.ts"` returns nothing.

---

## Phase 2: ARCHIVE _archived Directories (52 files, ~15,000 lines)

Move all `_archived/` subdirectories from src/ to project archives.

```
MOVE  mcp-server/src/tools/_archived/        → archives/mcp-server-archived/tools/
MOVE  mcp-server/src/registries/_archived/   → archives/mcp-server-archived/registries/
```

Also archive empty/superseded external dirs:

```
MOVE  templates/              → archives/templates/
MOVE  scripts/integration/    → archives/scripts-integration/
```

**Verification:** `find mcp-server/src -name "_archived" -type d` returns nothing.

---

## Phase 3: WIRE Hardcoded Paths (33 files)

Replace all hardcoded `"C:\\PRISM"` strings with imports from `constants.ts`.

### 3.1 The Pattern

**Before (BAD):**
```typescript
const PRISM_ROOT = "C:\\PRISM";
const STATE_DIR = path.join(PRISM_ROOT, "state");
const SCRIPTS_DIR = path.join(PRISM_ROOT, "scripts", "core");
```

**After (GOOD):**
```typescript
import { PATHS } from "../../constants.js";
// then use PATHS.STATE_DIR, PATHS.SCRIPTS, PATHS.PRISM_ROOT directly
```

### 3.2 Execution Order (by severity)

**Batch A — HIGH severity (6 files, ~80 hardcoded refs):**
1. `tools/autoHookWrapper.ts` — 30+ refs (most critical)
2. `tools/cadenceExecutor.ts` — 20+ refs
3. `dispatchers/sessionDispatcher.ts` — 8 refs
4. `dispatchers/guardDispatcher.ts` — 6 refs
5. `orchestration/AutoPilot.ts` — 4 refs
6. `utils/Config.ts` — 2 refs (defines own defaults)

**Batch B — MEDIUM severity (11 files, ~40 refs):**
7. `dispatchers/contextDispatcher.ts`
8. `dispatchers/spDispatcher.ts`
9. `dispatchers/devDispatcher.ts`
10. `dispatchers/gsdDispatcher.ts`
11. `dispatchers/manusDispatcher.ts`
12. `orchestration/HookEngine.ts`
13. `orchestration/AutoPilotV2.ts`
14. `engines/NLHookEngine.ts`
15. `registries/FormulaRegistry.ts`
16. `registries/ToolRegistry.ts`
17. `registries/MachineRegistry.ts`

**Batch C — LOW severity (14 files, ~35 refs):**
18-31. Remaining dispatchers + engines + registries (see GAP_ANALYSIS.md §1.2)

**Batch D — Documentation strings (1 file, ~40 refs):**
32. `registries/ScriptRegistry.ts` — usage_examples contain hardcoded paths (cosmetic)

**Batch E — Test file (1 file, acceptable):**
33. `tests/smokeTests.ts` — hardcoded paths acceptable in tests

### 3.3 PYTHON Path Issue

Several dispatchers also hardcode:
```typescript
const PYTHON = "C:\\Users\\Admin.DIGITALSTORM-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe";
```

**Proposed fix:** Add `PYTHON_PATH` to `constants.ts PATHS` object:
```typescript
PYTHON: "C:\\Users\\Admin.DIGITALSTORM-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
```

This centralizes the Python path and makes it easy to update if the Python installation changes.

### 3.4 Build Verification

After each batch:
```bash
cd mcp-server && npm run build   # esbuild — NEVER tsc standalone
```

If build succeeds, commit the batch. If it fails, fix immediately before proceeding.

---

## Phase 4: CIRCULAR-01 Fix (Optional)

CIRC-01 (HookEngine ↔ hookRegistration) is MEDIUM severity.

**Current:**
- `hookRegistration.ts` imports `HookEngine` to call `.register()`
- `HookEngine.ts` references hook types defined alongside registration

**Proposed fix:**
1. Extract `IHookRegistry` interface to `types/hook-registry-types.ts`
2. `HookEngine` implements `IHookRegistry`
3. `hookRegistration` depends only on `IHookRegistry`, not `HookEngine` directly
4. Break the bidirectional coupling

**Risk:** LOW — interface extraction doesn't change runtime behavior.

CIRC-02 and CIRC-03 are acceptable as-is (pub/sub pattern / guard clause).

---

## Phase 5: Verify Clean State

### Final checks:
```bash
# 1. No hardcoded paths remain (except constants.ts and tests)
grep -r "C:\\\\PRISM" mcp-server/src/ --include="*.ts" | grep -v constants.ts | grep -v __tests__ | grep -v tests/

# 2. No _archived dirs in src/
find mcp-server/src -name "_archived" -type d

# 3. No orphan .NEW/.RECOVERED/.BACKUP files
find mcp-server/src -name "*.NEW.*" -o -name "*.RECOVERED.*" -o -name "*.BACKUP*" | grep -v _archived

# 4. Build succeeds
cd mcp-server && npm run build

# 5. Smoke tests pass
node dist/tests/smokeTests.js
```

---

## Summary: Before → After

| Metric | Before F-5 | After F-5 |
|--------|-----------|-----------|
| Active .ts files | 217 | 162 |
| _archived in src/ | 52 files | 0 |
| Dead code files | 3 | 0 |
| Hardcoded "C:\PRISM" files | 33 | 1 (constants.ts — canonical) |
| Cross-boundary clarity | PATHS + 33 bypasses | PATHS only |
| Circular dependencies | 3 (1 medium) | 2 (both low) |
| Lines removed from active tree | 0 | ~15,500 |

---

## Execution Commits (F-5)

If approved, execute as 5 atomic commits:

1. `F-5.1: delete 3 orphan files (autoHookWrapper.NEW/RECOVERED, referenceValues)`
2. `F-5.2: archive 52 _archived files + templates/ + scripts/integration/`
3. `F-5.3: wire batch A — 6 HIGH severity hardcoded path fixes`
4. `F-5.4: wire batch B+C — 25 MEDIUM+LOW severity hardcoded path fixes`
5. `F-5.5: build verify + smoke test pass`

Each commit includes build verification. If any batch breaks the build, it gets fixed before the next batch.

---

## ⚠️ STOP POINT

**This plan requires Mark's approval before F-5 execution begins.**

Key decisions for Mark:
1. ✅ or ❌ Delete 3 orphan files?
2. ✅ or ❌ Move _archived out of src/?
3. ✅ or ❌ Replace hardcoded paths with PATHS imports?
4. ✅ or ❌ Add PYTHON_PATH to constants.ts?
5. ✅ or ❌ Fix CIRC-01 (HookEngine ↔ hookRegistration)?
6. ✅ or ❌ Archive empty templates/ and unused scripts/integration/?
