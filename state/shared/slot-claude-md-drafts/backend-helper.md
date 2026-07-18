# backend-helper Galaxy — slot:papa
> Universal rails (R1-R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama->Sonnet->Opus ladder · wiki protocol):
> -> `H:/prism/CLAUDE.md`. THIS file = backend-helper domain doctrine ONLY; never re-inline universal prose.

## 1. Domain scope + slot identity

Papa is the **cross-cutting build assist slot** — not a domain specialist, a force multiplier behind every other slot.

**Owns:** mcp-server TypeScript build workspace, dispatcher wiring completeness, tsc error triage, Zod schema
validation at action boundaries, vitest harness health, Stop-hook gate integrity, refactor + type-narrowing
work, import-cost and stale-code sweeps, safe rollback scaffolding.

**EXCLUDES:** domain physics (mill/lathe/wedm/cam own their engines); tribal knowledge writes (use dispatcher);
GNN/LoRA training (india); system-viz graph regen (sierra); fleet reaper (golf).

**Slot:** papa | Worktree: `H:/prism-slot-papa` | Branch: `slot/papa`

**Elevated access:** per operator directive 2026-06-10 — papa builds+wires across all 34 galaxies; no
ownership/lane/claim/deference gate blocks papa. Universal safety rails and scrutiny still bind.

## 2. Verified engines

Engines live at `mcp-server/src/engines/` (top-level, not in a backend-helper/ subdir — no local subdir exists).

| Role | Engine file |
|---|---|
| Build advisory | `BuildAdvisorEngine.ts` — `prism_dev:build_advise` surface |
| Build debrief | `BuildDebriefEngine.ts` — `prism_dev:build_debrief` surface |
| Build guard chain | `BuildGuardChainEngine.ts` — `prism_dev:build_guard_chain` surface |
| Build planner | `BuildPlannerEngine.ts` — `prism_dev:build_plan` / `build_plan_from_unit` surface |
| Counterfactual build sim | `CounterfactualBuildSimulatorEngine.ts` — `prism_dev:simulate_build` surface |
| Cross-dispatcher routing | `BackendRouterEngine.ts` — cross-galaxy dispatch routing assist |

All six file-existence-confirmed (Glob `mcp-server/src/engines/Build*.ts` + manual check, 2026-06-13).

## 3. Dispatcher quick-ref

**Primary dispatcher: `prism_dev`** (devDispatcher.ts — 260+ actions). `prism_knowledge` is for tribal
capture only, NOT papa's primary surface (the PATHS.md auto-derive was wrong — corrected here).

| Action | Category | Use |
|---|---|---|
| `build_guard_chain` | gate | full pre-commit chain (validate+typecheck+tests) |
| `build_guard_validate` / `build_guard_typecheck` / `build_guard_affected_tests` | gate | unit/type/test sub-gates |
| `auto_wiring_analyze` / `auto_wiring_scan` | wiring | orphan+unwired-engine audit |
| `test_gap_scan` / `schema_gap_scan` / `gap_scan` / `schema_coverage_audit` | coverage | untested surface + Zod coverage |
| `build_advise` / `build_debrief` / `build_debrief_recent` | advisory | pre/post-build guidance |
| `simulate_build` / `build_plan` / `build_plan_from_unit` / `error_remediation` | plan | dry-run + roadmap plan + error fix |
| `type_aware_references` / `symbol_impact` / `type_flow_trace` | refactor | TS blast-radius before change |
| `rollback_plan` / `rollback_plan_and_verify` / `rollback_render_script` | safety | safe rollback scaffolding |
| `import_cost_analyze` / `import_cost_heavy` | cost | hot-path import-weight audit |
| `copy_paste_detect` / `stale_segment_record` / `stale_segment_prune` | hygiene | duplication + stale-code sweep |
| `quality_score` / `quality_dashboard` | quality | per-unit build quality scoring |

Full action list: grep `const ACTIONS` in `mcp-server/src/tools/dispatchers/devDispatcher.ts`.

**MCP-down fallback:** `node scripts/audit-unwired-engines.mjs` (wiring backlog offline).

## 4. Canonical constants + data paths

No physics constants apply here (papa is infra, not domain physics). Domain analogs:

- **Action enum source of truth:** `mcp-server/src/tools/dispatchers/devDispatcher.ts` — `const ACTIONS` array.
- **Zod schema source:** `mcp-server/src/schemas/devActionSchemas.ts` — every action has a schema entry here.
- **NEVER full-read `devDispatcher.ts`** (>8000 lines) — grep for the specific case or action name.
- **Wiring backlog:** `scripts/audit-unwired-engines.mjs` (offline) or `prism_dev:auto_wiring_analyze`.
- **Stop gates:** `.claude/hooks/stop_on_unwired_assets.mjs`, `.claude/hooks/stop_on_failing_tests.mjs`,
  `.claude/hooks/comprehensive-build-enforce.mjs` — all three verified present in `.claude/hooks/`.
- **Stop gate bypass flag:** `PRISM_ALLOW_UNWIRED=1` currently bypasses `stop_on_unwired_assets` fleet-wide
  (set in `settings.json:45`). Papa should monitor whether this flag is still needed before every release.

## 5. Domain gotchas / safety rails

1. **`npm run build` exit-0 is NOT the green gate.** Must be `rtk tsc --noEmit` clean AND `rtk npx vitest run`
   all-pass AND all three Stop hooks cleared. Exit-0 hides tsc declaration errors when esbuild transpiles past them.

2. **Mock bypass false-green (verified regression — RGS-TOOL-AUTOINVOKE).** `MockMCPServer` that omits
   `z.enum(ACTIONS)` passes 9/9 tests while 100% of prod calls are broken. Every new dispatcher action MUST
   have a round-trip test through the real `MCPServer.callTool(action, params)`, not engine-direct.

3. **5-component wiring discipline.** A new `prism_dev` action is complete only when ALL five exist:
   (1) name in `ACTIONS` array, (2) Zod schema in `devActionSchemas.ts`, (3) `case` in dispatcher switch,
   (4) engine method, (5) round-trip integration test via `MCPServer.callTool`.

4. **TSC bisect pattern.** Large error counts: group by file first —
   `rtk tsc --noEmit 2>&1 | grep "^src" | awk -F: '{print $1}' | sort | uniq -c | sort -rn`.
   Fix the canonical definition site, not the 30+ consumers. Report error delta (`-N errors`) in commit body.
   Offload grouping/summarization to `qwen2.5-coder:32b` via `/ollama-*`.

5. **Lazy import discipline.** Dynamic `import()` inside a hot-path deadlocks under fleet load. Cache at first
   call: `let _mod = null; async function getMod() { return _mod ??= await import('./foo.js'); }`.
   Surface heaviest chains with `prism_dev:import_cost_heavy` before shipping.

6. **`WIRE-EXEMPT` is not a silence valve.** Only valid for an engine consumed exclusively through a singleton
   wrapper that IS wired. Never mark a genuine gap exempt to clear the audit.

## 6. What NOT to do (domain refuses)

- **NEVER** claim "build passes" from `npm run build` exit-0 alone — requires tsc+vitest+3 Stop hooks.
- **NEVER** add `.skip`, `// @ts-expect-error`, or `toBeDefined()` stubs to make a gate green — fix the root.
- **NEVER** widen a tsc error with `as any` or `!` — fix the type at the source definition.
- **NEVER** ship a dispatcher action with only an engine-direct test — must round-trip through the enum+schema gate.
- **NEVER** push to a peer slot's dispatcher without checking `file-claim-guard` first.
- **NEVER** mark a wiring gap `WIRE-EXEMPT` to silence `stop_on_unwired_assets` unless a singleton wrapper
  pattern truly applies — cite the wrapper engine by name in the comment.
- **NEVER** cite `outcome-bus-auto-tap.mjs` — verified absent from both `.claude/hooks/` and `scripts/`.
- **NEVER** cite `xproc_outcome_publish`, `xproc_kg_project_features`, or `xproc_calibration_monitor_record`
  as live dispatcher actions — unverified; not present in `devDispatcher.ts` ACTIONS array.

## 7. Domain workflow / pipeline contract

Canonical pre-commit gate sequence (must all pass):

```
1. rtk tsc --noEmit              -> group errors by file/code; fix canonical definition site first
2. rtk npx vitest run            -> zero skips; every failure is a real failure
3. stop_on_unwired_assets        -> zero orphaned engines (check PRISM_ALLOW_UNWIRED=1 flag)
4. comprehensive-build-enforce   -> zero stubs / placeholder returns
5. stop_on_failing_tests         -> final commit gate
```

## 8. Tribal + corpus pointers

- Wiki: [[architecture/comprehensive-build-enforce]] · [[architecture/stop-on-unwired-assets]] ·
  [[lessons/u-dispatcher-mock-bypass-class]] · [[feedback_engine_tests_in_tests_dir]] ·
  [[feedback_parallel_scrutiny_per_file]]
- Tribal capture: `prism_knowledge:tribal_capture slot=papa` — NEVER write directly to
  `knowledge/tribal/backend-helper-*.md` (auto-overwritten on regen).
- No JM Die corpus paths — backend-helper is infra, not domain machining.

## 9. Cross-galaxy edges (PSN)

| Edge | Direction | Bridge |
|---|---|---|
| tango (discovery) | -> papa | papa consumes `scripts/audit-unwired-engines.mjs` output |
| bravo (hermes-zulu) | -> papa | papa runs stub-hunter audits bravo authored |
| alpha (token-optimization) | <-> papa | coordinate on tsc-error token cost + RTK piping |
| india (ai-training) | <- papa | papa reports build-gate outcomes for LoRA wiring |
| ALL galaxies | -> papa | papa assists every slot's build-side work |

## 10. Closed-loop integration (india)

Tribal capture: `prism_knowledge:tribal_capture slot=papa` after each backend-helper learning.
Closed-loop spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.
Note: `xproc_outcome_publish` and related xproc actions are NOT verified in devDispatcher.ts — do not cite
as live until grep-confirmed in the dispatcher ACTIONS array. // UNVERIFIED

## 11. Test commands

```bash
# Backend-helper domain tests (build engines + guard chain):
cd mcp-server && rtk npx vitest run -t "BuildAdvisor|BuildDebrief|BuildGuard|BuildPlanner|Counterfactual"

# Full workspace tsc clean check:
rtk tsc --noEmit 2>&1 | grep "^src" | awk -F: '{print $1}' | sort | uniq -c | sort -rn

# Wiring audit (offline):
node scripts/audit-unwired-engines.mjs

# Stop-hook self-test (verify hooks fire):
cd mcp-server && rtk npx vitest run -t "stop_on|comprehensive"
```

## 12. Known bugs / open threads

- `stop_on_unwired_assets.mjs` currently bypassed fleet-wide by `PRISM_ALLOW_UNWIRED=1` in `settings.json:45`.
  Papa should track when this bypass can be lifted (once the 2026-05-23 false-positive class is fully resolved).
- `BackendRouterEngine.ts` role in cross-dispatcher routing: verify its dispatcher wiring before citing
  `prism_dev` actions it exposes (file confirmed present; action surface not fully audited this session).

## 13. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs backend-helper "<question>"
```
Ollama routing: tsc errors/summarize -> `qwen2.5-coder:32b`; deep build-arch reasoning -> `gpt-oss:120b`; quick action/schema lookups -> `gpt-oss:20b`.
