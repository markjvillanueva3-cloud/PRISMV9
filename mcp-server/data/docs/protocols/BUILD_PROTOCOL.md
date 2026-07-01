# PRISM Build Protocol v1.0

## Overview
This document defines the build verification protocol for PRISM MCP Server.
All code changes must pass build verification before deployment.

## Build Commands

| Command | Duration | Use Case |
|---------|----------|----------|
| `npm run build:fast` | ~3s | Rapid iteration (esbuild only) |
| `npm run build:incremental` | ~10s | Faster rebuild (tsc incremental + esbuild) |
| `npm run build:verify` | ~30s | Pre-commit validation (full tsc + esbuild) |
| `npm run build` | ~30s | Alias for build:verify |

## Build Verification Checklist

### Pre-Build
1. Ensure Node.js heap is adequate (16GB configured in package.json)
2. Check for uncommitted changes that may affect build
3. Verify dependencies are installed: `npm ci`

### Build Steps
1. **Type Check (tsc --noEmit)**
   - Validates TypeScript types without emitting
   - Must complete with 0 errors
   - Warnings logged but do not block

2. **Transpile (esbuild)**
   - Bundles to `dist/` directory
   - Target: node18, ESM output
   - Expected output size: ~62MB

3. **Post-Build Hooks**
   - `gsd_sync_v2.py` auto-fires on success
   - Updates `GSD_QUICK.md` with current counts
   - Triggers Phase Checklist verification

## Build Failure Protocol

### Common Failures
| Error | Cause | Resolution |
|-------|-------|------------|
| `HEAP out of memory` | tsc memory exhaustion | Use `build:fast` or increase heap |
| `Cannot find module` | Missing dependency | Run `npm ci` |
| `Type error` | TypeScript violation | Fix type error, never use `@ts-nocheck` |
| `Circular dependency` | Import cycle | Refactor to break cycle |

### Recovery Steps
1. If build fails, check `npm run build:fast` first (isolates tsc issues)
2. If tsc fails, run `npx tsc --noEmit 2>&1 | head -50` for diagnostics
3. If esbuild fails, check for syntax errors in recently modified files
4. Clear build cache if needed: `rm -rf dist/ && npm run build`

## CI Integration

### GitHub Actions
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:verify
      - run: npx vitest run
```

### Pre-Commit Hook
The build protocol integrates with pre-commit hooks:
- `build:verify` runs on all commits to protected branches
- `build:fast` runs on feature branch commits (faster feedback)

## Build Artifacts

| Artifact | Location | Size |
|----------|----------|------|
| Main bundle | `dist/index.js` | ~62MB |
| Source maps | `dist/index.js.map` | ~40MB |
| Type declarations | `dist/*.d.ts` | ~2MB |

## Anti-Regression Rules

1. **Never decrease action count** — Dispatcher action counts must be monotonically increasing
2. **Never skip type checking** — Use `build:fast` only for iteration, not release
3. **Never commit with build failures** — All commits must pass `build:verify`
4. **Never bypass hooks** — Do not use `--no-verify` without explicit approval

## Build Metrics

Track these metrics for build health:
- Build duration (target: <30s for full build)
- Bundle size (alert if >70MB)
- Type error count (must be 0)
- Warning count (track trend, target: decreasing)

## Changelog
- 2026-04-12: v1.0 — Initial protocol document
