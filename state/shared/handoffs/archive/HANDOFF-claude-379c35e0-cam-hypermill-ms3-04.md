# HANDOFF: claude-379c35e0
Updated: 2026-05-01T01:18:00Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-379c35e0
Topic: cam-hypermill-ms3-04-setup
Trigger phrase: "continue cam"

## STATE
MS3-03 SHIPPED (commit `e7c2270dd`, pushed `origin/work/cam-hypermill-ms1`). Phase 3 hyperMILL exhaust progress: MS3-01 + MS3-02 + MS3-03 all shipped + reviewer-PASS + scrutiny-marked. **67/67 tests passing**. Function-index now has **10 modules / 1524 params / 8 covered units**. Worktree clean.

## RESUME

**Execute CAM-EXHAUST-MS3-04: hyperMILL setup module.** Mirrors Fusion MS1-06 cadence. 9 ops × ~110 params, v1_menus shape catalog, 5 dialog tabs each. Foundational for all other modules — every machining op needs a setup, so this unlocks deeper queries downstream.

**Worktree**: `H:/prism-hypermill-ms1` branch `work/cam-hypermill-ms1` (HEAD = `e7c2270dd`).

Full plan in: `H:/prism/state/shared/handoffs/HANDOFF-claude-379c35e0-cam-hypermill-ms3-04-setup.md`
Worktree pointer: `H:/prism-hypermill-ms1/CONTINUE-CAM.md`

## MS3-04 SCOPE — 9 ops, ~110 params, 5 tabs each

| # | Operation | ~Params | Purpose |
|---|---|---|---|
| 1 | `workpiece_define` | 14 | Stock geometry import (STEP/STL/box), material reference |
| 2 | `fixture_setup` | 14 | Workholding catalog selection, clamp force, jaw config |
| 3 | `wcs_define` | 12 | Origin offsets G54-G59.x, datum priority, zero-point probing |
| 4 | `kinematics_bind` | 14 | Machine kinematic chain, RTCP enable, axis limits |
| 5 | `multi_setup_plan` | 14 | Multi-fixture sequencing, re-fixture rules, datum carry-over |
| 6 | `setup_sheet_generate` | 10 | Operator sheet PDF/HTML, tool list, fixture diagram |
| 7 | `tool_loadout` | 12 | Tool list per setup, magazine slots, sister-tool plan |
| 8 | `probing_setup` | 10 | Pre-setup probe routines, wcs verification |
| 9 | `material_register` | 10 | Material registry binding, certification tracking |

5 tabs each: Process, Geometry, Setup, Validation, Output

## PHYSICS LINKS (object shape `{formula_id, role, affects}`)
- `WORKHOLDING_CLAMP_FORCE` (input → fixture_setup)
- `KINEMATIC_RTCP_OFFSET` (input → kinematics_bind)
- `TOLERANCE_STACK_DATUM` (output → wcs_define)
- `PROBE_DYNAMIC_ERROR` (input → probing_setup; reuse from inspection — bumps formula query to 3+ hits)
- `SETUP_TIME_ESTIMATE` (output → setup_sheet_generate)

## FILES TO TOUCH

**Create:**
- `mcp-server/data/cam-functions/hypermill/setup.json` (~700 lines, v1_menus shape, parameter_count: ~110)

**Edit:**
- `mcp-server/data/cam-functions/hypermill/function-index.json` — append setup entry (after inspection, before deprecation_notes); update coverage_summary `total_modules` 10→11, `parameter_total` 1524→~1634, +`U-CAM-MS3-04`, +`hyperMILL_Setup_Sheet_Reference.pdf`
- `mcp-server/src/__tests__/HyperMillFunctionIndexEngine.test.ts` — append MS3-04 describe block (~12 tests); update prior MS3-03 snapshot tests:
  - line ~172 modules length 10→11, append "setup"
  - line ~275 total_modules 10→11
  - line ~281 parameter_total 1524→~1634
  - line ~291 covered_units +U-CAM-MS3-04 (8→9)
  - line ~428 totalParameterCount 1524→~1634, module_count 10→11

## TEST PLAN (~12 tests, mirrors MS3-03 pattern)
1. modules array length 11, ends with `"setup"`
2. setup index entry: path, parameter_count_estimate≈110, dependencies=`["tool_database","stock_fixture"]`, covered_units=`["U-CAM-MS3-04"]`
3. `getModule("setup")` returns 9 menus
4. `findParameter("clamp_force_n")` resolves to `setup.fixture_setup`
5. `findParameter("rtcp_enabled")` resolves to `setup.kinematics_bind` with default `true`
6. `findParameter("wcs_offset_register")` enum_values G54-G59.4
7. `findParameter("multi_setup_count")` resolves to `setup.multi_setup_plan`
8. `totalParameterCount`: value≈1634, module_count=11
9. `getParametersByFormula("WORKHOLDING_CLAMP_FORCE")` ≥1 hit in fixture_setup
10. `getParametersByFormula("PROBE_DYNAMIC_ERROR")` ≥3 hits (inspection×2 + probing_setup×1)
11. `coverage_summary.total_modules=11` matches modules.length
12. coverage_summary lists `U-CAM-MS3-04` + binds `hyperMILL_Setup_Sheet_Reference.pdf`

**CRITICAL** — test legitimacy hook regex blocks: NO line-end `.toBeDefined()`/`.toBeTruthy()`/`.toBeUndefined()`/`.toBeFalsy()`. Use `if (!x) throw new Error(...)` for null guards. Full-list `.toEqual([...])` for sets. `.toBe(N)` for concrete counts.

## SHIP SEQUENCE

```bash
cd H:/prism-hypermill-ms1

# 1. Stage
rtk git add \
  mcp-server/data/cam-functions/hypermill/setup.json \
  mcp-server/data/cam-functions/hypermill/function-index.json \
  mcp-server/src/__tests__/HyperMillFunctionIndexEngine.test.ts

# 2. Run tests (PowerShell, NODE_OPTIONS for esbuild)
NODE_OPTIONS="--max-old-space-size=12288" \
  node ./mcp-server/node_modules/vitest/vitest.mjs run \
  mcp-server/src/__tests__/HyperMillFunctionIndexEngine.test.ts
# Target: 79/79 (67 prior + 12 new)

# 3. Commit (HEREDOC)
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

# 4. Push
rtk git push origin work/cam-hypermill-ms1

# 5. Reviewer (subagent_type=reviewer): commit SHA + files in scope + MS3-04 context. Expect PASS.

# 6. Scrutiny mark
node H:/prism/.claude/scripts/scrutiny-mark.mjs --self --agent \
  --notes "CAM-EXHAUST-MS3-04 ship: hyperMILL setup module 9 ops ~110 params"
```

## AFTER MS3-04 — NEXT MILESTONE OPTIONS
- **(a) MS3-05** — process_planning module (~10 ops, ~130 params)
- **(b) MS3-06** — recreate phantom 2d_operations.json (~600 params, big delivery)
- **(c) MS3-07** — MAXX deep tab pass (156 → ~300 params)
- **(d) Pivot to Mastercam** — start CAM-EXHAUST-MS4

**Recommendation: finish hyperMILL track (MS3-04 → MS3-05 → MS3-06 → MS3-07) before pivoting to Mastercam.**

## RECENT COMMITS (origin/work/cam-hypermill-ms1)
```
e7c2270dd CAM-EXHAUST-MS3-03: hyperMILL inspection module (10 ops, 78 params, +12 tests)
42a699740 CAM-EXHAUST-MS3-02: Schema normalization adapter
aff05ab93 CAM-EXHAUST-MS3-01: hyperMILL function-index integrity + register 4 unindexed catalogs
```

## CONFLICT-FORK STATUS
`work/cam-hypermill-ms1` worktree is OUR exclusive lane. If `commit-ownership-guard` or `git-anti-clobber` blocks tomorrow: do NOT fight — fork to a fresh worktree, move work via `git stash → pop`.

## CONTEXT
Engine schema normalizer in `HyperMillFunctionIndexEngine.ts` handles 3 catalog shapes: `v1_menus` (passthrough — used by tool_database, stock_fixture, simulation, automation_center, post_processor, **inspection**, and now **setup**), `v1_nested_module` (5axis/millturn/maxx), `v2_categories` (drilling). MS3-04 setup uses `v1_menus` — no normalizer changes needed.

Test runner: PowerShell + `NODE_OPTIONS=--max-old-space-size=12288` + `node ./node_modules/vitest/vitest.mjs run`. `npx tsc --noEmit` may report success then heap-OOM during cleanup — that's fine.
