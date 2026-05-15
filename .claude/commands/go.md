---
name: go
description: Composite gate — fast-build + tsc + affected tests + hook coverage + lint. Run before committing a non-trivial change. Reports PASS/FAIL per stage and the first failing line in each failing stage. Fast path: 30-90 s on a warm cache. Backstop for /loop iter-gate (Boris pattern). No new engines; pure composition over existing dispatcher actions + npm scripts.
version: 1.0.0
tier: T2
trigger:
  autoSuggest:
    keywords: ["/go", "run go", "go gate", "ship gate", "pre-commit gate", "before I commit", "build test lint", "iter gate", "composite gate"]
consumes:
  - "package.json"
  - "src/**/*.ts"
  - "prism_dev:build_guard_typecheck"
  - "prism_dev:build_guard_affected_tests"
produces:
  - "stdout (PASS/FAIL per stage)"
  - "state/shared/.go-gate-last.json"
composes_with:
  - "/build-verify"
  - "/test-coverage"
pipeline_integrations:
  - { pipeline: "loop", phase: "iter-gate", ordering: "before" }
  - { pipeline: "close-out", phase: "preflight", ordering: "before" }
  - { pipeline: "forge", phase: "verify", ordering: "during" }
context: minimal
allowed-tools: ["Bash", "Read"]
---

# /go — Composite pre-commit gate

`/go` runs a fast 4-stage gate so the operator can ship with confidence in ≤90 seconds. Designed for the /loop iter-gate (Boris pattern) — every loop iteration should `/go` before ticking the next iter.

## Stages (parallel where independent, sequential where dependent)

| # | Stage | Command | Failure handling |
|---|---|---|---|
| 1 | **build** | `cd H:/prism/mcp-server && npm run build:fast` | Stop the gate — fix the build first |
| 2 | **tsc** | `cd H:/prism/mcp-server && ./node_modules/.bin/tsc --noEmit --incremental` (parallel with #3) | Type errors are surfaced but don't block #3-#4 (informational stage) |
| 3 | **affected-tests** | `prism_dev:build_guard_affected_tests` then run only those vitest files | Stop the gate on FAIL — fix the test or the regression |
| 4 | **hook coverage** | `prism_hook:coverage` (advisory) | Always informational; never blocks |

## Run it

```bash
# Stage 1 — fast build (must pass)
cd H:/prism/mcp-server && npm run build:fast 2>&1 | tail -20

# Stage 2 — tsc (parallel with stage 3)
cd H:/prism/mcp-server && ./node_modules/.bin/tsc --noEmit --incremental 2>&1 | tail -20 &
TSCPID=$!

# Stage 3 — affected tests (requires stage-1 build artifacts)
node H:/prism/.claude/helpers/affected-tests.mjs 2>/dev/null || true   # if helper missing, fall back
cd H:/prism/mcp-server && ./node_modules/.bin/vitest run --no-coverage 2>&1 | tail -20

# Wait for stage 2
wait $TSCPID

# Stage 4 — hook coverage advisory (silent unless gaps)
node H:/prism/.claude/hooks/hook-coverage-check.mjs 2>&1 | tail -5 || true
```

## Reading the result

`/go` writes a single-line summary to `state/shared/.go-gate-last.json` so the next /loop iter can read PASS/FAIL without re-running:

```json
{
  "ts": "2026-05-15T14:00:00Z",
  "session": "claude-6eac1b66",
  "slot": "alpha",
  "stages": {
    "build": {"ok": true, "ms": 4300},
    "tsc": {"ok": true, "ms": 18000, "errors": 0},
    "tests": {"ok": false, "ms": 12000, "failures": 2},
    "hook_coverage": {"ok": true, "ms": 200, "advisory": "..."}
  },
  "overall": "FAIL"
}
```

## When to use

- Before EVERY commit on a non-trivial change (Boris #1 verification loop)
- Between /loop iterations (replaces ad-hoc "did my tests pass?" checks)
- At the end of a /forge-audit-v2 / /run-continuous pass
- Before /handoff if the session shipped any code

## When NOT to use

- Pure-doc changes (CLAUDE.md / wiki / memory updates) — skip stage 1+2, just verify markdown lints
- Pure-config changes (settings.json / atomic-roadmap.json edits) — schema-validate instead

## Notes

- Stage 3's "affected tests" detection uses `prism_dev:build_guard_affected_tests`. When the helper isn't available, the gate falls back to running ALL tests (slow path, ~4 minutes for the full PRISM suite).
- Hook stage 4 is advisory only — it reports gaps in hook coverage but never blocks. Operators may surface its output in /handoff.
- Output of every stage is captured to `state/shared/.go-gate-last.json` so the next chat in the same slot (after /compact terminal-pin inherit) sees the prior gate verdict immediately.

## Related

- [[reference_session_continuity_stack_2026_05_15]] — terminal-pin makes the per-slot gate-result file load-bearing
- LOOP-MIGRATE-MS0/U-LOOP-ITER-GATE — Boris pattern this skill backstops
- [[feedback_parallel_scrutiny_per_file]] — per-file scrutiny gate (different layer; runs AFTER `/go` passes)
- [[feedback_scrutiny_3of3_readonly]] — end-of-task 3-of-3 scrutiny gate
