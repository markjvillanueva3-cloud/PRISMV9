# R0-P0-U01: Build + Test Baseline

**Date:** 2026-02-24
**Status:** COMPLETE
**Auditor:** R6 Integrator (Opus)

---

## 1. Environment

| Property | Value |
|----------|-------|
| Node.js | v24.13.0 |
| TypeScript | 5.9.3 |
| Vitest | 4.0.18 |
| esbuild | 0.27.2 |
| OS | Windows 11 Home 10.0.26200 |
| Working Dir | `C:\PRISM\mcp-server\` |

---

## 2. Build Results

### 2.1 Full Build (`npm run build`) — FAILED

**Command:** `npm run build`
**Result:** FATAL ERROR — JavaScript heap out of memory

- Prebuild gate: PASSED (17 critical files verified)
- `tsc --noEmit` (8GB heap): OOM after ~365 seconds
- esbuild step: never reached (tsc crashed first)
- Exit code: 134

**Root cause:** TypeScript compiler cannot type-check 129,983 LOC within 8GB `--max-old-space-size`. The codebase has grown beyond what the configured heap limit supports.

### 2.2 Fast Build (`npm run build:fast`) — PASSED

**Command:** `npm run build:fast`
**Result:** SUCCESS

| Metric | Value |
|--------|-------|
| Bundle size | 5.1 MB |
| Build time | 1,947 ms |
| Errors | 0 |
| Warnings | 1 |

**Warning:** CommonJS `exports` variable in ESM context (`dist/tools/registryBootstrapper.js:12`). The file uses `exports.bootstrapRegistries` but `package.json` sets `"type": "module"`.

### 2.3 tsc with 16GB Heap — COMPLETED WITH ERRORS

**Command:** `node --max-old-space-size=16384 node_modules/typescript/bin/tsc --noEmit`
**Result:** Completed. **28 type errors across 11 files.** tsc does NOT pass clean.

**Error Summary:**

| File | Errors | Nature |
|------|--------|--------|
| skillScriptDispatcher.ts | 4 | Missing properties (cache, usage, top_used), type mismatch |
| spDispatcher.ts | 3 | Wrong arg count, missing .map property, missing crossQuery method |
| telemetryDispatcher.ts | 2 | Deep type instantiation, Zod schema overload mismatch |
| tenantDispatcher.ts | 2 | Deep type instantiation, Zod schema overload mismatch |
| threadDispatcher.ts | 1 | Missing shorthand property value |
| toolpathDispatcher.ts | 6 | Record<string,any> not assignable to typed params |
| validationDispatcher.ts | 1 | Wrong arg count |
| synergyIntegration.ts | 2 | Missing .certify and .recordExecution methods |
| formatters.ts | 1 | Spread types from non-object |
| smokeTest.ts | 4 | Missing module imports (SpeedFeedEngine, ThreadEngine, ToolpathEngine), missing .total property |
| validators.ts | 2 | number\|undefined not assignable to number |
| **Total** | **28** | |

**Implication:** esbuild silently ignores all type errors. The codebase has 28 known type safety issues that could cause runtime failures.

---

## 3. Test Results

### 3.1 Overall Summary

**Command:** `npx vitest run`
**Result:** ALL PASSED

| Metric | Value |
|--------|-------|
| Test files | 9 passed (9 total) |
| Tests | 74 passed (74 total) |
| Failed | 0 |
| Skipped | 0 |
| Duration | 786 ms |
| Transform time | 964 ms |
| Import time | 1.41 s |

### 3.2 Test File Breakdown

| Test File | Tests | Duration | Category |
|-----------|-------|----------|----------|
| securityAudit.test.ts | 16 | 19 ms | Security |
| safetyMatrix.test.ts | 17 | 10 ms | Safety |
| envParsing.test.ts | 14 | 11 ms | Config |
| getEffort.test.ts | 8 | 14 ms | Utility |
| health.test.ts | 5 | 10 ms | Health |
| atomicWrite.test.ts | 4 | 51 ms | I/O |
| apiTimeout.test.ts | 4 | 62 ms | API |
| memoryProfile.test.ts | 3 | 36 ms | Memory |
| stressTest.test.ts | 3 | 19 ms | Load |
| **Total** | **74** | **232 ms** | |

### 3.3 Notable Test Metrics (from stdout)

- **Memory:** Heap 9.9 MB / 3,500 MB limit, RSS 57.8 MB
- **Memory growth:** 0.65 MB over 100 iterations (acceptable)
- **V8 Heap:** 12.5 MB used / 4,288 MB limit (0.3% usage)
- **Stress test:** 200 requests, 0 failures, 22,222 req/s throughput
- **Stress P50/P95/P99:** 0 ms / 0 ms / 1 ms

---

## 4. Codebase Metrics

### 4.1 Source Statistics

| Metric | Value |
|--------|-------|
| Total .ts files | 217 |
| Non-test .ts files | 207 |
| Test files | 10 (9 in `__tests__/`, 1 in `tests/`) |
| Total LOC (all .ts) | 129,983 |
| src/ directory size | 5.5 MB |
| dist/index.js | 5.1 MB |

### 4.2 Source File Breakdown by Directory

| Directory | File Count |
|-----------|------------|
| src/engines/ | 74 |
| src/tools/ | 42 |
| src/registries/ | 18 |
| src/hooks/ | 16 |
| src/utils/ | 16 |
| src/types/ | 11 |
| src/__tests__/ | 9 |
| src/config/ | 4 |
| src/data/ | 4 |
| src/schemas/ | 4 |
| src/generators/ | 3 |
| src/orchestration/ | 3 |
| src/shared/ | 3 |
| src/services/ | 2 |
| src/validation/ | 2 |
| src/errors/ | 1 |
| src/tests/ | 1 |
| **src/index.ts** | 1 (entry) |
| **Total** | **217** |

### 4.3 Plan Count Verification

| Resource | Plan Says | Actual | Match |
|----------|-----------|--------|-------|
| Engine files | 74 | 74 | MATCH |
| Total .ts files | ~217 implied | 217 | MATCH |
| LOC (engines ~69,668) | ~69,668 | 129,983 (all src) | N/A — plan counted engine LOC only |
| Test count | 74 passing | 74 passing | MATCH |

---

## 5. Findings

### CRITICAL

| ID | Finding | Details |
|----|---------|---------|
| U01-C01 | `npm run build` OOMs at 8GB | tsc cannot type-check 129,983 LOC within the configured `--max-old-space-size=8192`. The `build` script is unusable without increasing heap to 16GB+. Only `build:fast` (esbuild) works reliably. |

### HIGH

| ID | Finding | Details |
|----|---------|---------|
| U01-H01 | CURRENT_STATE.json location | `state/CURRENT_STATE.json` is at repo root (`C:\PRISM\state\CURRENT_STATE.json`), NOT inside `mcp-server/`. Plan references it as `state/CURRENT_STATE.json` which is ambiguous. R0-P0-U07 should verify its contents match actual system counts. |
| U01-H02 | `npm run build` script should use 16GB+ heap | Current `--max-old-space-size=8192` is insufficient. Should increase to 16384 or switch the default `build` script to skip `tsc --noEmit` (rely on IDE type-checking and `build:fast` for CI). |

### MEDIUM

| ID | Finding | Details |
|----|---------|---------|
| U01-M01 | No type-checking in CI-compatible build path | Since `build:fast` (esbuild) is the only working build, there is NO type-checking step that runs reliably. Type errors are invisible until tsc can run. |

### LOW

| ID | Finding | Details |
|----|---------|---------|
| U01-L01 | CommonJS exports warning in esbuild output | `dist/tools/registryBootstrapper.js` uses `exports.bootstrapRegistries` in an ESM context. Functional but should be cleaned up. |

### INFO

| ID | Finding | Details |
|----|---------|---------|
| U01-I01 | Test suite is small relative to codebase | 74 tests for 129,983 LOC = ~0.057 tests/100 LOC. Coverage is limited to security, memory, stress, config, health, I/O, API, and safety matrix. No unit tests for engines, registries, dispatchers, hooks, or tools. |
| U01-I02 | Build performance is excellent | esbuild bundles 5.1MB in under 2 seconds. |
| U01-I03 | Stress test results are strong | 22,222 req/s with sub-millisecond P99 latency. |

---

## 6. Baseline Snapshot

```json
{
  "timestamp": "2026-02-24T13:09:00Z",
  "build": {
    "full_build": "FAILED_OOM",
    "fast_build": "PASSED",
    "bundle_size_mb": 5.1,
    "build_time_ms": 1947,
    "esbuild_warnings": 1,
    "esbuild_errors": 0,
    "prebuild_gate": "PASSED",
    "critical_files_verified": 17
  },
  "tests": {
    "framework": "vitest",
    "version": "4.0.18",
    "total_files": 9,
    "total_tests": 74,
    "passed": 74,
    "failed": 0,
    "skipped": 0,
    "duration_ms": 786
  },
  "codebase": {
    "total_ts_files": 217,
    "non_test_ts_files": 207,
    "test_files": 10,
    "total_loc": 129983,
    "src_size_mb": 5.5,
    "engine_files": 74,
    "tool_files": 42,
    "registry_files": 18,
    "hook_files": 16,
    "util_files": 16,
    "type_files": 11
  },
  "environment": {
    "node": "v24.13.0",
    "typescript": "5.9.3",
    "vitest": "4.0.18",
    "esbuild": "0.27.2",
    "os": "Windows 11 Home 10.0.26200"
  }
}
```

---

## 7. Recommendations

1. **Fix `npm run build` heap limit** — Increase `--max-old-space-size` to 16384 or 24576, OR make `build` script equivalent to `build:fast` and create a separate `build:typecheck` script for local dev.
2. **Verify CURRENT_STATE.json** — File exists at `C:\PRISM\state\CURRENT_STATE.json` (repo root). Validate its counts against actual system inventory during R0-P0-U07.
3. **Add incremental tsc** — Use `tsc --noEmit --incremental` with `tsconfig.tsbuildinfo` to make type-checking feasible even at large codebase size.
4. **Expand test coverage** — Priority areas: engine smoke tests, dispatcher response validation, registry data integrity checks.
