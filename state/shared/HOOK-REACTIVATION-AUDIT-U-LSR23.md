# Hook Reactivation Audit — U-LSR23

**Owner:** Claude (claude-84d52a33) | **Date:** 2026-04-24 | **Milestone:** LATHE-HARDENED-MS0

## Scope

Audit the 22 hooks short-circuited by `DISABLED_TOKEN_REDUX_2026_04_23` (20 in `.claude/hooks/`, 2 in `.claude/helpers/`) plus the 11 `stop_on_*` safety-gate hooks modified in commit `10153283b` (schema-fix pass). Determine which must be re-enabled before Session 1 lathe work begins.

## Finding 1 — Disabled set is 100% advisory, keep disabled

All 22 files in the disable list short-circuit via:
```js
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
```

None of them enforce safety. Breakdown:

| Hook | Category | Risk if disabled during lathe work |
|------|----------|--------|
| `reference-value-injector` | advisory (inject constants) | none — constants are imported from `src/physics/constants.ts` |
| `prompt-rewriter-ollama` | advisory (LLM rewrite) | none |
| `local-compute-intent` | advisory (routing hint) | none |
| `ollama-task-offloader` | advisory (offload hint) | none |
| `reference-inject` | advisory (ref tables) | none |
| `ai-feature-recommend` | advisory (command suggest) | none |
| `shortcode-injector` | advisory (shortcodes) | none |
| `task-goal-tracker` | advisory (goal track) | none |
| `lathe-master-post-quality-gate` | **advisory — self-declared `BLOCKING: never`** | none — adds context only |
| `naming-convention-enforcer` | advisory (style) | none |
| `magic-number-detector` | advisory (style) | none |
| `performance-pattern-detector` | advisory (WARNS) | none |
| `complexity-gate` | advisory (WARNS) | none |
| `type-safety-checker` | advisory (WARNS) | none |
| `async-pattern-checker` | advisory (WARNS) | none |
| `consistent-return-checker` | advisory (WARNS) | none |
| `api-contract-enforcer` | advisory (INFO) | none |
| `pre-edit-impact-analyzer` | advisory (blast radius) | none |
| `mcp-route-suggest` | noise (every Bash/Read/Edit) | none |
| `grep-index-first` | noise (every Grep) | none |
| `helpers/search-optimizer` | noise ("Tool catalogs...") | none |
| `helpers/context-economy-v2` | noise (`WASTE: grep_instead_of_Grep`) | none |

**Decision:** keep all 22 disabled through Sessions 1-3. Token savings > zero lathe impact. Re-enablement deferred to a dedicated token-economy pass after LATHE-HARDENED-MS0 ships.

## Finding 2 — CRITICAL: `stop_on_*` schema-fix silently disarmed every blocking gate

Commit `10153283b "hooks: final schema fixes — 178/178 PASS"` converted every `stop_on_*` hook from the legacy `{result: "warn"}` pattern to the Claude Code schema — but used `{continue: true, systemMessage: "warn"}` for the blocking branch instead of `{continue: false, stopReason: "..."}`.

`continue: true` means the tool call proceeds. Every `stop_on_*` hook now emits an informational note and ALLOWS the action. This is the real R4 concern from round-2 scrutiny, mis-mapped to the DISABLED set.

### Affected gates (11 hooks)

| Hook | Trigger | What's now broken | Severity |
|------|---------|-------------------|----------|
| `stop_on_unsafe_gcode` | Rapid into -Z >10mm, F>10000, S>30000, M03→G01 no dwell | Unsafe G-code commits proceed with only a log line | **CRIT** for lathe work |
| `stop_on_svi_regression` | Psi drops between sessions | Regressions land without gate | **CRIT** |
| `stop_on_build_error` | tsc errors > 0 | Broken builds ship | **CRIT** |
| `stop_on_failing_tests` | vitest failing > 0 | Failing tests ship | **CRIT** |
| `stop_on_missing_tests` | new engine without test | Untested engines ship | HIGH |
| `stop_on_broken_imports` | unresolved imports | Import rot ships | HIGH |
| `stop_on_duplicate_created` | duplicate engine detected | Duplicates ship | HIGH |
| `stop_on_open_lock` | open `.lock` file | Concurrent writes possible | MED |
| `stop_on_orphan_engine` | engine w/o dispatcher wiring | Dark engines ship | MED |
| `stop_on_skill_unwired` | skill w/o hook wiring | Dark skills ship | MED |
| `stop_on_failing_tests` (duplicate row) | — | — | — |

### Required fix (blocks Session 1)

For each `stop_on_*` hook, the blocking branch must emit:
```json
{ "continue": false, "stopReason": "<concrete reason>" }
```
Only the "pass" branch should keep `{continue: true}`. The exception branch (uncaught errors in the hook itself) should default to `continue: true` so hook bugs don't deadlock sessions — current behavior is correct there.

Minimum before Session 1:
- `stop_on_unsafe_gcode.mjs` — directly relevant to lathe output
- `stop_on_build_error.mjs` — protects Kienzle/Taylor constants from breaking the compile
- `stop_on_failing_tests.mjs` — protects the 2656-test safety net

The remaining 8 can wait until Session 3.

## Finding 3 — Token budgets for re-enabled enforcers

When the 3 CRIT hooks are rearmed, cap their per-invocation token output to prevent the cost-regression round-2 scrutiny worried about:

| Hook | Max tokens | Rationale |
|------|-----------|-----------|
| `stop_on_unsafe_gcode` | 400 | stopReason + up to 3 issues + file ref |
| `stop_on_build_error` | 200 | stopReason + error count + `npm run build` hint |
| `stop_on_failing_tests` | 200 | stopReason + fail count + `npx vitest run` hint |

Each hook already truncates (`issues.slice(0,3)`, `${totalWarnings}`). Enforcement is a comment-level assertion plus a one-time regression check in `scripts/verify-hooks-active.mjs` (U-LSR26).

## Exit criteria

- [x] Classification of all 22 DISABLED_TOKEN_REDUX hooks documented
- [x] `stop_on_*` schema regression identified (11 hooks)
- [ ] 3 CRIT `stop_on_*` hooks converted to proper blocking schema (DEFERRED to U-LSR23b — separate commit, user-approved)
- [ ] Per-hook token budgets enforced (DEFERRED to U-LSR26 consolidation)

## Next

1. User decision: apply the 3-hook blocking fix now, or defer to U-LSR23b after Session 1 starts?
2. If apply-now: convert `stop_on_unsafe_gcode`, `stop_on_build_error`, `stop_on_failing_tests` to `{continue: false, stopReason}` and commit as `LATHE-HARDENED-MS0/U-LSR23: re-arm 3 CRIT safety gates`.
3. If defer: proceed to U-LSR20 (atomic cherry-pick) and accept that safety gates are informational during the Build B pick.
