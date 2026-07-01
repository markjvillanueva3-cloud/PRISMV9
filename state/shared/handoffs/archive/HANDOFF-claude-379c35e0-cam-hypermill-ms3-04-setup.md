# HANDOFF: claude-379c35e0
Updated: 2026-05-01T01:15:00Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-379c35e0
Topic: cam-hypermill-ms3-04-setup
Trigger phrase: "continue cam"

## STATE
MS3-03 SHIPPED (commit `e7c2270dd`, pushed `origin/work/cam-hypermill-ms1`). Phase 3 hyperMILL exhaust progress: MS3-01 + MS3-02 + MS3-03 all shipped + reviewer-PASS + scrutiny-marked. **67/67 tests passing**. Function-index now has **10 modules / 1524 params / 8 covered units**. Worktree clean.

## RESUME

**Execute CAM-EXHAUST-MS3-04: hyperMILL setup module.** Mirrors Fusion MS1-06 cadence. 9 ops × ~110 params, v1_menus shape catalog, 5 dialog tabs each. Foundational for all other modules — every machining op needs a setup, so this unlocks deeper queries downstream.

**Worktree**: `H:/prism-hypermill-ms1` branch `work/cam-hypermill-ms1` (HEAD = `e7c2270dd`).
Junction at `mcp-server/node_modules` -> `H:/prism-fusion-ms1/mcp-server/node_modules` already created.
Tests run via PowerShell with `NODE_OPTIONS=--max-old-space-size=12288 node ./node_modules/vitest/vitest.mjs run <path>`.

## MS3-04 SCOPE — 9 ops, ~110 params, 5 tabs each

| # | Operation | Tab focus | ~Params | Purpose |
|---|---|---|---|---|
| 1 | `workpiece_define` | Geometry | 14 | Stock geometry import (STEP/STL/box), material reference, density |
| 2 | `fixture_setup` | Setup | 14 | Workholding catalog selection, clamp force, jaw config |
| 3 | `wcs_define` | Setup | 12 | Origin offsets G54-G59.x, datum priority, zero-point probing |
| 4 | `kinematics_bind` | Process | 14 | Machine kinematic chain (3-axis/3+2/5-axis), RTCP enable, axis limits |
| 5 | `multi_setup_plan` | Setup | 14 | Multi-fixture sequencing, re-fixture rules, datum carry-over |
| 6 | `setup_sheet_generate` | Output | 10 | Operator sheet PDF/HTML, tool list, fixture diagram, GD&T notes |
| 7 | `tool_loadout` | Process | 12 | Tool list per setup, magazine slots, sister-tool plan |
| 8 | `probing_setup` | Validation | 10 | Pre-setup probe routines, wcs verification, datum-shift tolerance |
| 9 | `material_register` | Geometry | 10 | Material registry binding, certification tracking, heat-lot |

## COMMON 5-TAB STRUCTURE
- **Process** — kinematic mode, machine selection, sequence trigger
- **Geometry** — stock model, fixture geometry, datum features
- **Setup** — wcs offsets, fixture clamp force, multi-setup links
- **Validation** — probe routines, datum verification, tolerance gates
- **Output** — setup sheet format, tool loadout, operator notes

## PHYSICS LINKS (object shape `{formula_id, role, affects}` — NOT bare strings)
Define in setup.json:
- `WORKHOLDING_CLAMP_FORCE` (input → fixture_setup)
- `KINEMATIC_RTCP_OFFSET` (input → kinematics_bind)
- `TOLERANCE_STACK_DATUM` (output → wcs_define)
- `PROBE_DYNAMIC_ERROR` (input → probing_setup; reuse from inspection — bumps formula query to 3+ hits)
- `SETUP_TIME_ESTIMATE` (output → setup_sheet_generate)

## FILES

**Create:**
- `mcp-server/data/cam-functions/hypermill/setup.json` (~700 lines, v1_menus shape, parameter_count: ~110)

**Edit:**
- `mcp-server/data/cam-functions/hypermill/function-index.json` — append setup module entry (after inspection, before deprecation_notes); update coverage_summary `total_modules` 10→11, `parameter_total` 1524→~1634, +`U-CAM-MS3-04`, +`hyperMILL_Setup_Sheet_Reference.pdf`
- `mcp-server/src/__tests__/HyperMillFunctionIndexEngine.test.ts` — append `CAM-EXHAUST-MS3-04` describe block with ~12 tests; **also update prior MS3-03 snapshot tests** (they hardcode current totals):
  - line ~172: modules array length 10→11, append "setup"
  - line ~275: total_modules 10→11
  - line ~281: parameter_total 1524→~1634
  - line ~291: covered_units list 8→9 entries, append "U-CAM-MS3-04"
  - line ~428: totalParameterCount 1524→~1634, module_count 10→11

**No changes to:**
- `HyperMillFunctionIndexEngine.ts` (v1_menus shape passthrough — module-agnostic)
- `camDispatcher.ts` (existing actions module-agnostic)
- `src/physics/constants.ts` (stringly-typed catalog convention)

## TEST PLAN — ~12 tests (mirrors MS3-03 pattern)

1. modules array length 11, ends with `"setup"`
2. setup index entry: path, parameter_count_estimate≈110, dependencies=`["tool_database","stock_fixture"]`, covered_units=`["U-CAM-MS3-04"]`
3. `getModule("setup")` returns 9 menus
4. `findParameter("clamp_force_n")` resolves to `setup.fixture_setup` with concrete default value
5. `findParameter("rtcp_enabled")` resolves to `setup.kinematics_bind` with default `true`
6. `findParameter("wcs_offset_register")` resolves to `setup.wcs_define` with enum_values `["G54","G55","G56","G57","G58","G59","G59.1","G59.2","G59.3","G59.4"]`
7. `findParameter("multi_setup_count")` resolves to `setup.multi_setup_plan`
8. `totalParameterCount`: value≈1634, module_count=11
9. `getParametersByFormula("WORKHOLDING_CLAMP_FORCE")` returns ≥1 hits in `setup.fixture_setup`
10. `getParametersByFormula("PROBE_DYNAMIC_ERROR")` returns ≥3 hits (inspection×2 + setup.probing_setup×1)
11. `coverage_summary.total_modules=11` matches `modules.length`
12. `coverage_summary` lists `U-CAM-MS3-04` + binds `hyperMILL_Setup_Sheet_Reference.pdf`

**CRITICAL — test legitimacy hook regex blocks:** NO line-end `.toBeDefined()`/`.toBeTruthy()`/`.toBeUndefined()`/`.toBeFalsy()`. Use `if (!x) throw new Error(...)` for null guards. Full-list `.toEqual([...])` for sets. `.toBe(N)` for concrete counts. `.toBeGreaterThanOrEqual(N)` for lower-bound checks.

## SHIP SEQUENCE

```bash
cd H:/prism-hypermill-ms1

# 1. Stage MS3-04 files
rtk git add \
  mcp-server/data/cam-functions/hypermill/setup.json \
  mcp-server/data/cam-functions/hypermill/function-index.json \
  mcp-server/src/__tests__/HyperMillFunctionIndexEngine.test.ts

# 2. Commit (HEREDOC for multi-line message)
rtk git commit -m "$(cat <<'EOF'
CAM-EXHAUST-MS3-04: hyperMILL setup module (9 ops, ~110 params, +12 tests)

Mirrors Fusion MS1-06 cadence. Foundational for all hyperMILL machining
ops — every cycle binds to a setup. Adds workpiece_define, fixture_setup,
wcs_define, kinematics_bind, multi_setup_plan, setup_sheet_generate,
tool_loadout, probing_setup, material_register.

Physics links: WORKHOLDING_CLAMP_FORCE, KINEMATIC_RTCP_OFFSET,
TOLERANCE_STACK_DATUM, PROBE_DYNAMIC_ERROR (reused from inspection),
SETUP_TIME_ESTIMATE.

Coverage: total_modules 10->11, parameter_total 1524->~1634,
+U-CAM-MS3-04, +hyperMILL_Setup_Sheet_Reference.pdf.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

# 3. Push
rtk git push origin work/cam-hypermill-ms1

# 4. Reviewer agent (subagent_type=reviewer) — give it commit SHA, files in scope, MS3-04 context. Expect PASS.

# 5. Scrutiny mark
node H:/prism/.claude/scripts/scrutiny-mark.mjs --self --agent \
  --notes "CAM-EXHAUST-MS3-04 ship: hyperMILL setup module 9 ops ~110 params"
```

## AFTER MS3-04 — NEXT MILESTONE OPTIONS
- **(a) MS3-05** — hyperMILL `process_planning` module: feature recognition, op sequencing, automation rules (~10 ops, ~130 params)
- **(b) MS3-06** — Recreate phantom `2d_operations.json` with Fusion-parity depth (~600 params, big delivery; closes deprecation_notes from MS3-01)
- **(c) MS3-07** — MAXX deep tab pass: hyperMILL signature module deepening (current 156 params is shallow; aim for ~300 with full tab structure)
- **(d) Pivot to Mastercam** — start CAM-EXHAUST-MS4 (parallel to Fusion MS1 + hyperMILL MS3)

User priority is 100% input-field coverage across 6 CAM systems (Fusion → hyperMILL → Mastercam → Inventor HSM → Esprit → SolidCAM). hyperMILL track now ~71% indexed (10/14 expected modules; missing setup, process_planning, 2d_ops, 3d_ops). **Recommendation: finish hyperMILL track (MS3-04 → MS3-05 → MS3-06 → MS3-07) before pivoting to Mastercam** — keeps catalog cohesive and avoids context-switch cost.

## CONTEXT (carry-over from MS3-01/02/03)

### Engine schema normalizer in `HyperMillFunctionIndexEngine.ts` (from MS3-02)
3-shape detector + normalizer:
- `v1_menus` — passthrough (canonical, used by tool_database, stock_fixture, simulation, automation_center, post_processor, **inspection**, and now **setup**)
- `v1_nested_module` — handles `op.dialogs[]` OR flat `op.parameters[]` OR neither→empty (used by 5axis, millturn, maxx)
- `v2_categories` — synthesizes `_shared` menu + per-cycle menus, attaches cycle-level tribal_tips to first cycleSpecific param (used by drilling)

Public methods: `getModule`, `getModuleRaw`, `detectCatalogShape`, plus existing query API (`findParameter`, `getParametersByFormula`, `getParametersByDispatcher`, `getTribalTipsBySource`, `resolveDependencies`, `totalParameterCount`, `listModules`).

### Test runner gotchas
- esbuild OOMs with default Node memory; vitest needs `NODE_OPTIONS=--max-old-space-size=12288`
- Run via PowerShell with `node ./node_modules/vitest/vitest.mjs run <path>`, NOT `npx vitest` (npx not in PATH for some sessions)
- `npx tsc --noEmit` may report success then heap-OOM during cleanup — that's fine, the type check completed

### Cross-session warning
Multiple chats run concurrently. `work/cam-hypermill-ms1` worktree is OUR exclusive lane. Other lanes:
- `work/cam-fusion-ms1` (CAM-AUTOPOP-CORE-MS0 in flight)
- `work/cad-fidx-fus-93a0` (Fusion CAD function-index — complete)
- `work/engine-wire-ms0` (calcDispatcher phantom sweep — ~84 candidates remain)
- `work/intel-ollama-obsidian-ms1` (P5 multi-chat hardening)
- `work/tsc-cleanup-ms0` (paused — lane hot)

If `commit-ownership-guard` or `git-anti-clobber` blocks: do NOT fight for the same tree — fork to a fresh worktree, move work via `git stash → pop`.

## RECENT COMMITS (origin/work/cam-hypermill-ms1)
```
e7c2270dd CAM-EXHAUST-MS3-03: hyperMILL inspection module (10 ops, 78 params, +12 tests)
42a699740 CAM-EXHAUST-MS3-02: Schema normalization adapter — unlock deep queries on 4 new catalogs
aff05ab93 CAM-EXHAUST-MS3-01: hyperMILL function-index integrity + register 4 unindexed catalogs
```

## QUICK RESUME COMMAND
```bash
cd H:/prism-hypermill-ms1
rtk git status                              # confirm clean working tree on work/cam-hypermill-ms1
rtk git log --oneline -3                    # confirm e7c2270dd at HEAD
# Read inspection.json as v1_menus shape template, then write setup.json with the 9 ops above
```
