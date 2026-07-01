## backend-helper — slot:papa

### Current state

**Size:** CLAUDE.md is 111 lines / ~6.3 KB. MEMORY.md is 98 lines. PATHS.md is 77 lines. TOOLBELT.md is 29 lines. SOUL.md is 47 lines. AWARENESS.md exists (not read — small by pattern).

**Quality grade: PARTIAL**

The current CLAUDE.md has a good core concept (cross-cutting build assist, not a domain specialist) and the anti-patterns list is genuinely useful. However it has several concrete problems:

1. **Fabricated/unverified path:** `outcome-bus-auto-tap.mjs` claimed in the closed-loop integration section — does NOT exist at `.claude/hooks/` OR `scripts/`. Both verified absent. The entire "closed-loop integration with india" section cites this as a live mechanism with dispatcher actions `xproc_outcome_publish`, `xproc_kg_project_features`, `xproc_calibration_monitor_record` — none of these were verified to exist in any dispatcher. R12 violation: these look like aspirational stubs treated as live.

2. **Wrong dispatcher cited:** PATHS.md auto-derives `prism_knowledge` as the primary dispatcher for this galaxy. This is incorrect — backend-helper's actual home dispatcher is `prism_dev` (verified: `devDispatcher.ts` exists with ~260+ actions including `build_advise`, `build_debrief`, `build_guard_chain`, `build_guard_validate`, `auto_wiring_analyze`, `test_gap_scan`, `schema_gap_scan`, `gap_scan`, `build_plan`, `simulate_build`, `schema_coverage_audit`, `build_guard_typecheck`, `build_guard_affected_tests`). `prism_knowledge` is used for tribal capture, not the primary build-infra surface.

3. **`audit-unwired-engines.mjs`:** cited as `.claude/hooks/audit-unwired-engines.mjs` in CLAUDE.md — does NOT exist there. Verified at `scripts/audit-unwired-engines.mjs` (correct path is scripts/, not hooks/).

4. **TOOLBELT.md lists only `prism_knowledge`** as "This galaxy's dispatchers" — stale/wrong. The critical `prism_dev` dispatcher (with its 260+ actions spanning build, test, schema, wiring, cost, token economy) is the real workhorse.

5. **Token bloat:** The "cross-cutting methodology" block (lines 85-111) largely repeats universal doctrine (Ollama model names, loop pattern, CAG/RAG/LoRA) that lives in the global CLAUDE.md. The AI-systems-fleet-state block (lines 97-104) is a generic boilerplate injected across all galaxies.

6. **PATHS.md engine list is auto-derived noise:** 24 engines name-matched to "backend-helper" include `CourseBuilderEngine`, `EmployeeShiftScheduleEngine`, `FiveAxisLoRADatasetBuilderEngine`, etc. — these are NOT backend-helper engines. They were auto-matched on name patterns. The real build-infra engines are: `BuildAdvisorEngine.ts`, `BuildDebriefEngine.ts`, `BuildGuardChainEngine.ts`, `BuildPlannerEngine.ts` (all four verified exist at `mcp-server/src/engines/`).

---

### KEEP

From current CLAUDE.md — accurate and load-bearing:

- **"What lives here" section (lines 8-27)** — correctly identifies the scope: mcp-server build workspace, TypeScript/esbuild/tsc, vitest harness, stop hooks (`stop_on_unwired_assets.mjs`, `stop_on_failing_tests.mjs`, `comprehensive-build-enforce.mjs` — all three verified at `.claude/hooks/`), dispatcher layer at `mcp-server/src/tools/dispatchers/`, `mcp-server/src/tools/index.ts`, Zod schema validation discipline, `subagent_type: dispatcher-wirer` and `build-doctor`.
- **"Anti-patterns" section (lines 31-37)** — the five refuses are precise, domain-correct, and worth keeping verbatim.
- **Karpathy R8/R9/R11/R12 applied to this domain (lines 39-44)** — concrete, build-domain-specific, non-duplicative of the global version.
- **"Related galaxies" cross-references (lines 46-51)** — the tango/bravo/alpha relationships are accurate and useful.
- **Wiki cross-refs block (lines 53-58)** — these wikilinks are domain-specific and should stay.
- **Mock discipline + action-enum regression class** — the `MockMCPServer` / z.enum false-green insight (lines 20, 57-58 in MEMORY.md) is the most important tribal knowledge this galaxy owns. Must be in CLAUDE.md, not just MEMORY.md.
- **"TSC bisect" pattern** from MEMORY.md — concrete, domain-specific, worth inlining in CLAUDE.md.

---

### DROP

- **"Closed-loop integration with india" section (lines 62-77):** cites `outcome-bus-auto-tap.mjs` (unverified absent), `xproc_outcome_publish`, `xproc_kg_project_features`, `xproc_calibration_monitor_record` (unverified dispatcher actions). Drop until the actual wiring is verified. Replace with a single pointer to india's MEMORY.md if the integration is real.
- **"Cross-cutting methodology" block (lines 85-95):** Ollama model names, loop/vault/LoRA/CAG/RAG overview — this is the universal galaxy-enrichment boilerplate injected into all 34 galaxies. It belongs in the universal-core pointer, not duplicated here.
- **`<!-- AI-SYSTEMS-STATE:BEGIN -->` block (lines 97-104):** fleet-wide generic pointer; add to universal-core reference once, not in every galaxy file.
- **"OPERATIONAL CONTEXT" block in TOOLBELT.md** — pure copy of global doctrine (hardware specs, Ollama tiers, loop patterns). Should be a pointer, not inline.
- **PATHS.md auto-derived engine list** — 20 of 24 engines are noise (LoRA builders, scheduling engines, etc.). Should be replaced with the verified 4 build-infra engines + the actual `prism_dev` dispatcher reference.

---

### ADD (domain-specific — the heart of this assessment)

**1. Primary dispatcher — verified `prism_dev` actions papa uses daily:**
- `build_guard_validate`, `build_guard_typecheck`, `build_guard_affected_tests`, `build_guard_chain`, `build_guard_classify` — the pre-commit chain papa runs
- `auto_wiring_analyze`, `auto_wiring_scan` — wiring completeness audit
- `test_gap_scan`, `schema_gap_scan`, `gap_scan`, `gap_scan_file`, `gap_scan_batch` — coverage gap detection
- `build_advise`, `build_debrief`, `build_debrief_recent`, `simulate_build` — advisory + simulation
- `schema_coverage_audit`, `schema_coverage_audit_read`, `schema_coverage_audit_summary` — Zod schema coverage
- `build_plan`, `build_plan_from_unit` — roadmap-aware build planning
- `error_remediation` — tsc/build error fix pipeline
- `type_aware_references`, `symbol_impact`, `type_flow_trace` — TS type-impact blast radius
- `rollback_plan`, `rollback_verify`, `rollback_plan_and_verify`, `rollback_render_script` — safe-rollback for refactors
- `quality_score`, `quality_dashboard` — per-unit build quality scoring
- `import_cost_analyze`, `import_cost_heavy`, `import_cost_report` — import weight analysis (hot path lazy-import discipline)
- `copy_paste_detect` — duplication detection during refactor
- `stale_segment_record`, `stale_segment_prune` — stale-code sweep

**2. Verified build-infra engines (these are papa's real owned engines):**
- `BuildAdvisorEngine.ts` — `prism_dev:build_advise` surface
- `BuildDebriefEngine.ts` — `prism_dev:build_debrief` surface
- `BuildGuardChainEngine.ts` — `prism_dev:build_guard_chain` surface
- `BuildPlannerEngine.ts` — `prism_dev:build_plan` / `build_plan_from_unit` surface
- `BackendRouterEngine.ts` — cross-dispatcher routing assist (verify before citing)
- `CounterfactualBuildSimulatorEngine.ts` — `prism_dev:simulate_build` surface

**3. The canonical build sequence papa enforces (must be in CLAUDE.md):**
```
1. rtk tsc --noEmit           → group errors by file/code; attack root-cause first
2. rtk vitest run              → zero skips; every failure is a real failure
3. stop_on_unwired_assets      → zero orphaned engines
4. comprehensive-build-enforce → zero stubs / placeholder returns
5. stop_on_failing_tests       → commit gate
```
All five must pass before any commit. "npm run build exits 0" is NOT the gate (tsc + vitest both must be clean).

**4. TSC bisect procedure (the #1 papa tribal pattern — must be in CLAUDE.md):**
- Large error counts: group by `tsc --noEmit 2>&1 | grep "^src" | awk -F: '{print $1}' | sort | uniq -c | sort -rn`
- Fix the canonical definition site first, not the 30+ consumers
- After each file fix, re-run `rtk tsc --noEmit` and report delta in commit body (`-N errors`)
- Offload grouping/summarization to `qwen2.5-coder:32b` via `/ollama-*` (free)

**5. Dispatcher wiring pattern (mock-bypass class — the #1 regression papa prevents):**
- NEW action must touch ALL FIVE: `ACTIONS` array in `devDispatcher.ts` + Zod schema in `devActionSchemas.ts` + `case` in dispatcher switch + engine method + **round-trip test through `MCPServer.callTool(action, params)`** (not `engine.method(params)` — the enum gate is bypassed by engine-direct calls)
- Pre-commit: one real `MCPServer.callTool(action, ...)` integration test per new action
- MockMCPServer MUST replicate the z.enum gate or the test is a false-green (verified regression: action passes 9/9 tests, 100% prod broken because Mock skipped enum)

**6. Lazy import discipline (hot-path performance — papa enforces fleet-wide):**
- Dynamic imports on hot paths deadlock under fleet load; cache the module reference at first call
- Pattern: `let _mod: typeof import('./foo.js') | null = null; async function getMod() { return _mod ??= await import('./foo.js'); }`
- `prism_dev:import_cost_analyze` / `import_cost_heavy` surfaces the heaviest import chains

**7. What NOT to do in this domain:**
- Never mark a genuine wiring gap as `WIRE-EXEMPT` to silence the audit — only valid for class-internal-only engines consumed by a singleton wrapper
- Never fix a tsc error by widening a type (`as any`, `!`) — fix the type at the source
- Never add `.skip` or `// @ts-expect-error` to make a gate green — remove the skip or fix the type
- Never claim "build passes" from `npm run build` exit-0 alone — must be `tsc --noEmit` clean + vitest all-pass
- Never ship a dispatcher action that only has an engine-direct test (must round-trip through the dispatcher's enum + schema gate)
- Never push to a peer slot's dispatcher without checking `file-claim-guard` first

**8. Canonical resources for backend-helper work:**
- `mcp-server/src/tools/dispatchers/devDispatcher.ts` — the primary dispatcher (260+ actions); grep this before adding new action
- `mcp-server/src/schemas/devActionSchemas.ts` — Zod schemas for all dev actions
- `mcp-server/src/tools/index.ts` — action registry / MCP tool registration surface
- `scripts/audit-unwired-engines.mjs` — wiring backlog report (tango-owned, papa-consumed)
- `.claude/hooks/stop_on_unwired_assets.mjs` — Stop-gate (currently bypassed by `PRISM_ALLOW_UNWIRED=1`; papa should monitor this flag)
- `.claude/hooks/stop_on_failing_tests.mjs` — Stop-gate
- `.claude/hooks/comprehensive-build-enforce.mjs` — Stop-gate
- `mcp-server/data/state/BASELINE_INVENTORY.json` — anti-regression snapshot (schemaVersion-gated)
- `state/shared/BUILD_STATE.md` / `.json` — wired/needs-wiring/pending build map
- `state/shared/USER-BUILD-REQUESTS-LOG.md` — every operator build request must be logged here

---

### IDEAL SECTION OUTLINE

```
1. IDENTITY — who papa is: cross-cutting build assist, not a domain specialist; slot:papa
2. SCOPE — what lives here (build infra, dispatcher layer, wiring audit, refactor, test harness)
3. PRIMARY DISPATCHER — prism_dev: the 15 most-used actions by category (build/wiring/test/schema/cost)
4. VERIFIED ENGINE MAP — 4-6 verified build engines + their dispatcher surface
5. CANONICAL BUILD SEQUENCE — the 5-step gate every commit must clear (tsc+vitest+3 stop hooks)
6. TSC BISECT PROCEDURE — group-by-file, fix canonical site first, report delta in commit
7. DISPATCHER WIRING DISCIPLINE — 5-component checklist + mock-bypass regression class
8. LAZY IMPORT DISCIPLINE — hot-path pattern + import_cost_analyze
9. ANTI-PATTERNS (refuses) — the 5 hard refuses from current file (keep verbatim)
10. RELATED GALAXIES — tango (wiring backlog), bravo (stub-hunter), alpha (RTK/tsc token cost), india (LoRA wiring)
11. CANONICAL RESOURCES — 8 verified paths/files
12. WIKI CROSS-REFS — domain-specific wikilinks
13. UNIVERSAL-CORE POINTER (one line) — see main CLAUDE.md for R1-R15, scrutiny 3-of-3, commit format, units-first, no-stub
```

---

### UNIVERSAL-CORE POINTER

The galaxy CLAUDE.md must NOT duplicate these — reference only via:
> "Universal doctrine: see `H:/prism/CLAUDE.md` for R1-R15 rules, SCRUTINY GATE (3-of-3), per-chat HANDOFF protocol, commit format `[SCOPE]/U-ID: title`, UNITS-FIRST safety rail, no-stub enforcement, and KARPATHY DISCIPLINE."

Specifically these universal rules apply to papa's work but must NOT be re-stated in the galaxy file:
- R9 (test intent), R12 (fail loud), R13 (comprehensive route), R15 (wire+test+validate+all-galaxies) — referenced in context only
- Scrutiny 3-of-3 gate procedure — universal, not backend-helper-specific
- Commit format and per-agent handoff — universal
- RTK prefix discipline — universal (one-liner pointer is fine)
- Ollama model roster and loop patterns — universal (pointer to main)
- Hardware/PC specs — universal (pointer to `CANONICAL-HOST-FACTS-2026-06-09.md`)
