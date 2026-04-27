---
name: DevOps & CI/CD Improvements
description: CI/CD pipeline, build system commands, and release gates for PRISM MCP Server
type: reference
originSessionId: ab9f9901-72e8-4541-9f20-06fe17cb3fca
source: prism-memory
synced: 2026-04-27T00:20:43.076Z
aliases: devops_improvements
---

## Build System Commands

The PRISM MCP Server uses esbuild for fast bundling with TypeScript type checking.

### Build Commands
```bash
npm run build:fast        # esbuild only (~3s) - rapid iteration
npm run build:incremental # tsc incremental + esbuild (~10s) - faster rebuild
npm run build             # full tsc + esbuild (~30s) - pre-commit validation
npm run build:verify      # run postbuild verification checks
npm run build:cli         # build CLI separately
npm run build:web         # build web frontend
npm run build:all         # build:fast + build:web
```

### Test Commands
```bash
npx vitest run              # run all tests (1255+ tests)
npx vitest run [file]       # run specific test file
npx vitest run --coverage   # run with coverage report
npx vitest --watch          # watch mode for development
```

### esbuild Externals (CRITICAL)
These modules MUST be externalized in all esbuild scripts:
- `@modelcontextprotocol/sdk`, `zod`, `better-sqlite3`
- `cpu-features`, `ssh2`, `playwright`
- `bufferutil`, `utf-8-validate`
- `node:module`, `node:url`, `node:path`
- `ws`, `node-opcua`, `occt-import-js`

**Why:** Native/optional modules that esbuild cannot bundle. Missing them causes build failures.

## CI/CD Pipeline

**File:** `mcp-server/.github/workflows/ci.yml`

### Pipeline Stages
1. **Build + Test** (15 min timeout)
   - npm ci + npm run build
   - vitest unit tests
   - R4-R11 standalone test scripts

2. **Security Scan**
   - npm audit --production --audit-level=high
   - Grep for exposed secrets in source

3. **Docker Build + Push** (master/release branches only)
   - GHCR container registry
   - Multi-tag strategy: sha, branch, semver

4. **Deploy** (manual approval for production)
   - Environment: production
   - Post-deploy health check

## Build Gates

### Prebuild Gate (`scripts/prebuild-gate.cjs`)
Runs BEFORE build to verify critical safety files exist:
- Validates 16+ critical engine files (PFPEngine, CollisionEngine, etc.)
- Compares against previous build snapshot
- Detects file regressions (disappeared files)
- Blocks build if any critical file is missing/empty

### Postbuild Verify (`scripts/postbuild-verify.cjs`)
Runs AFTER build to validate bundle:
- Bundle exists and is non-empty
- Size within thresholds: warn >70MB, fail >100MB
- Expected exports present (createServer, startServer, Server)
- No duplicate module imports
- Basic syntax sanity check

## Release Gate

**Command:** `npm run release-gate` or `npm run release-gate:dry`

Full pre-release validation including:
- Build integrity
- Test pass rate
- Schema compatibility
- Documentation completeness

## Key Configuration

- **Node version:** 20 (CI), 18+ (minimum)
- **Heap size:** 16GB (`--max-old-space-size=16384`)
- **Bundle limit:** 70MB (current ~62MB)
- **Test framework:** vitest 4.0
- **Lint staged:** tsc --noEmit on *.ts files


## Related
[[engines/PFPEngine|PFPEngine]] • [[engines/CollisionEngine|CollisionEngine]] • [[skills/sdk|/sdk]] • [[skills/optional|/optional]] • [[skills/workflows|/workflows]] • [[skills/ci|/ci]] • [[skills/release|/release]] • [[skills/prebuild-gate|/prebuild-gate]] • [[skills/empty|/empty]] • [[skills/postbuild-verify|/postbuild-verify]]