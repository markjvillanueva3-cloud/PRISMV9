# LATHE-COMPLETE-MS0 — Lathe Complete (Sim-Ready + Hardened) + Codex Build B Integration

> **Rev 2 (2026-04-24).** Original 8 units → 15 units after 5-agent parallel scrutiny surfaced 40 new findings (8 CRITICAL). See ADDENDUM at bottom for U-LSR19..25. Renamed from LATHE-SIM-READY-MS0.

## Context

LATHE-MASTER backend is feature-complete through **P5 ERP** (U-LTH48..U-LTH54/57) and **PX AGI substrate** (U-LTH58..U-LTH62): 17 new engines, 33+ `lathe_*` business actions, 68 `lathe_p2p_*` CAM actions, 3 hooks registered. Two hard blockers prevent honest simulated testing of print-to-CNC-program-for-lathe:

1. **No HTTP API server.** Frontend calls `/api/dispatch/cam`, `/api/dispatch/business`, `/api/v1/lathe`, `/api/v1/turning` — none served. A partial `runHTTP()` scaffold exists in `src/index.ts` (Express 5.2.1 already a dep) but the dispatch router is missing.
2. **Codex Build B stranded on `work/lathe-master`.** The full lathe frontend suite (21 files: `LatheWizardPage`, `LathePrintToProgramPage`, `LatheUploadPage`, `LatheResultsPage` 1265 LOC, `LatheAIPanel` 495 LOC, `LatheBackplot` 317 LOC, 9 calculator panels, `latheAI.ts`, `latheTurning.ts`, tests) last committed **2026-04-17** `00ecd92c1 LATHE-MASTER/U-LTH45: Print-to-Program Web UI`. Current branch `work/cam-exhaust-ms0` has only the 2 ERP pages I built. **Build B is the most recent work** the user asked to locate.

Additionally, 4 safety gaps must close before any machine handoff. Two of them (envelope hard-block, stock boundary) also block honest *simulated* confidence because `LathePrintProgramEmitterEngine.emit()` currently logs but does not throw — the emitter would silently output unsafe G-code.

Intended outcome: one file-level cherry-pick merge + one HTTP router + four safety patches + API-contract reconciliation. After this, a human can drag a PDF into `/lathe-wizard`, watch the 12-step pipeline execute via real dispatcher calls, and inspect G-code/cost/schedule/AGI reasoning in the browser — with the emitter refusing unsafe paths.

---

## Gap Inventory (compiled from 3 parallel exploration agents)

| # | Gap | Severity | Owner |
|---|-----|----------|-------|
| 1 | HTTP dispatch layer (`/api/dispatch/*`) does not exist | **BLOCKER** | U-LSR02 |
| 2 | `LathePrintProgramEmitterEngine.emit()` logs but does not throw on envelope violation | **BLOCKER** | U-LSR04 |
| 3 | Kienzle Fc computed, never converted to spindle torque Nm nor checked vs machine rating | **BLOCKER** | U-LSR05 |
| 4 | Toolpath generator checks machine limits but not stock-blank profile (crash risk) | **BLOCKER** | U-LSR06 |
| 5 | Codex Build B (21 files, U-LTH45) stranded on `work/lathe-master` | **BLOCKER** | U-LSR01 |
| 6 | API contract split: Build A uses `/api/dispatch/*`, Build B uses `/api/v1/lathe\|turning` | **BLOCKER** | U-LSR02 |
| 7 | `LatheLoRAPhysicsAugmentedInferenceEngine` hardcodes `kc1.1` + `mc` (constants policy) | IMPORTANT | U-LSR07 |
| 8 | `LatheLoRAExampleGeneratorEngine` same hardcoded constants | IMPORTANT | U-LSR07 |
| 9 | 40 pre-existing lathe test failures — triage deferred to U-LTH-TRIAGE-01/02/03 | IMPORTANT | follow-up |
| 10 | No external G-code simulator bridge — `LatheBackplot.tsx` 2D preview suffices for sim | IMPORTANT | out-of-scope |
| 11 | Branch `work/cam-exhaust-ms0` 111 ahead / 1 behind origin (divergence with other PC) | IMPORTANT | user-owned |
| 12 | 3 hooks registered in `.claude/settings.json` ✓ | OK | — |

**Out-of-scope (follow-up milestones):** P0.1 Z3 formal G-code verification (U-LTH63..U-LTH68), P0.6 MTConnect/OPC-UA live feedback — these gate *real-machine* cut, not simulated testing.

---

## SMART CONFIG (milestone-level)

```
ROLE:           TypeScript Engineer + Manufacturing Physics PhD + Systems Integrator
MODEL:          Sonnet 4.6 (implementation), Opus 4.6 advisor for safety gates U-LSR04..06
EFFORT:         HIGH
CONTEXT_BUDGET: 60% per session (3-unit cadence, /compact after each session)
OMEGA_FLOOR:    0.92
TRACK:          LATHE-MASTER (extension milestone MS0-SIM-READY)
SVI_TARGET:     Psi 0.90 → 0.94 (+0.04 from closing safety gates)
SAFETY_CRITICAL: YES — units U-LSR04..06 fall under SAFETY-CRITICAL TEST LAW
```

---

## Knowledge Source Mapping (Stage 3)

**Engines (consult before editing):**
- `LathePrintProgramEmitterEngine.ts` (~280 LOC) — U-LTH40, line 257 emit point
- `LathePrintSafetyValidationEngine.ts` — existing safety gate surface to extend
- `LathePrintToolpathGeneratorEngine.ts` — U-LTH39, toolpath schema owner
- `LatheLoRAPhysicsAugmentedInferenceEngine.ts` (lines 100-117 hardcoded Kienzle)
- `LatheLoRAExampleGeneratorEngine.ts`
- `ShopConfigurationEngine.ts` — machine schema (add `max_spindle_torque_Nm`)
- `AdvancedCuttingMathEngine.ts` — existing `spindle_torque_Nm` calc (reuse, do NOT reimplement)

**Tribal Knowledge:**
- `TribalKnowledgeEngine` — queries: `"lathe spindle overload"`, `"stock gouge"`, `"envelope violation"`
- `MachiningPlaybookEngine` — 296 rules; anti-patterns for turning overload
- `src/data/okuma-osp-tips.ts` (63 tips), `fanuc-programming-tips.ts` (35), `haas-programming-tips.ts` (28)

**Formulas:**
- `CANONICAL_KIENZLE` from `src/physics/constants.ts` — P:{kc1_1:1800,mc:0.25}, M:{2100,0.28}, K:{1100,0.22}, N:{700,0.20}, S:{2800,0.23}, H:{3200,0.26}
- Kienzle: `Fc = kc1_1 × ap × fz^(1-mc)` [N]
- Torque: `T_Nm = Fc × (D_mm/2000)` — dimensional check: N × m = N·m ✓
- Safety margin: `T_Nm < 0.85 × T_max_rated`

**Reference:**
- `CallToolFn` helper @ `mcp-server/src/index.ts:943-957` — reuse, do NOT reimplement
- `dispatcherError()` in `camDispatcher.ts`
- Existing `src/routes/print.ts`, `milling.ts`, `wedm-erp.ts` — reference routing pattern
- `callCamAction` pattern in `LathePrintToProgram.tsx`
- Build B frontend source on `work/lathe-master @ 00ecd92c1` — cherry-pick target
- `MachineRegistry` — spindle torque data (verify Mazak QT, Okuma LB, Haas ST specs)

---

## Phase Decomposition

### SESSION 1 — Frontend Merge + HTTP Foundation (U-LSR01..U-LSR03)

```
SMART CONFIG:   Role=TS Engineer | MODEL=Sonnet 4.6 | EFFORT=HIGH | CONTEXT=50%
KNOWLEDGE:      Build B source tree, Express 5 patterns, existing route files
INTENT:         Operator can drag PDF into /lathe-wizard → frontend POSTs to real HTTP server
                → dispatcher action runs → result renders. No 404s.
SKILLS:         /scope, /checkpoint, /action-search, /codebase-memory-tracing
PLUGINS:        Vitest MCP, ESLint MCP, codebase-memory-mcp
MCP_LIFECYCLE:  context_boot → dispatcher_map → memory_recall → auto_checkpoint (5-call cadence) → memory_save
```

**U-LSR01 — Cherry-pick Build B (21 files)**
- 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
- FILES_CREATED (via `git checkout work/lathe-master -- <path>`):
  - `mcp-server/web/src/pages/LatheWizardPage.tsx` (252)
  - `mcp-server/web/src/pages/LathePrintToProgramPage.tsx` (415)
  - `mcp-server/web/src/pages/LatheUploadPage.tsx` (210)
  - `mcp-server/web/src/pages/LatheResultsPage.tsx` (1265)
  - `mcp-server/web/src/components/{LatheAIPanel,LatheBackplot,LatheInputWizard,LatheChatterPanel,LatheCostPanel,LatheGroovingPanel,LatheHardTurningPanel,LatheInsertSelectorPanel,LatheSketch2D,LatheThreadingPanel,LatheToolLifePanel,LatheWorkholdingPanel}.tsx` (13 files)
  - `mcp-server/web/src/api/{latheAI,latheTurning}.ts`
  - `mcp-server/web/src/hooks/useLatheAI.ts`
  - `mcp-server/web/src/__tests__/{LatheResultsPage,LatheUploadPage,LatheWizardPage}.test.tsx`
- FILES_MODIFIED: none (pure import)
- DO NOT TOUCH: `LathePrintToProgram.tsx`, `LatheERPDashboard.tsx` (mine, distinct files)
- EXIT_CRITERIA:
  1. `git status` shows exactly 21 new/updated files under `mcp-server/web/src/`
  2. `npx tsc --noEmit` passes in `web/` with 0 errors
  3. `npx vitest run web/src/__tests__/Lathe{Results,Upload,Wizard}Page.test.tsx` passes (tests were green on lathe-master at commit 00ecd92c1)
- ABORT_CRITERIA:
  - >2 file conflicts with current branch content
  - Any cherry-picked file imports a symbol that doesn't exist in current branch
  - Test count regression in web/ suite
- ROLLBACK: `git checkout HEAD -- mcp-server/web/src/{pages,components,api,hooks,__tests__}/` (restore pre-pick state)

**U-LSR02 — Dispatch + v1 routers**
- FILES_CREATED:
  - `mcp-server/src/api/dispatchRouter.ts` (~80 LOC) — generic `POST /api/dispatch/:dispatcher`, whitelist 91 dispatcher names, call `callTool("prism_"+dispatcher, action, params)`, unwrap MCP response
  - `mcp-server/src/api/latheV1Router.ts` (~120 LOC) — REST semantic shim for Build B: `/api/v1/lathe/p2p/ingest` → `lathe_p2p_ingest`, `/api/v1/lathe/auto-quote` → `lathe_auto_quote_from_print`, `/api/v1/lathe/agi/reason` → `lathe_agi_reason`, `/api/v1/lathe/agi/safety` → `lathe_agi_safety_check`, `/api/v1/lathe/erp/orchestrate` → `lathe_erp_orchestrate`, plus turning calc routes derived by reading `latheTurning.ts`
  - `mcp-server/src/api/__tests__/dispatchRouter.test.ts` — SAFETY-CRITICAL tests (see below)
  - `mcp-server/src/api/__tests__/latheV1Router.test.ts`
- FILES_MODIFIED:
  - `mcp-server/src/index.ts` line 960 area — register both routers in `registerRoutes()`
  - `mcp-server/package.json` — add `cors` to deps (dev-only), ensure `start:http` script present
- REUSE (do NOT reimplement):
  - `CallToolFn` helper @ `src/index.ts:943-957`
  - `dispatcherError()` from `camDispatcher.ts`
  - Route factory pattern from `src/routes/print.ts`
- EXIT_CRITERIA:
  1. `curl -X POST http://localhost:18382/api/dispatch/business -d '{"action":"lathe_agi_safety_check","params":{"category":"physics","speed_feed":{"iso_group":"P","vc_m_min":180,"fz_mm":0.3,"ap_mm":2}}}'` returns 200 with `{"success":true,"data":{"passed":true,...}}`
  2. `curl -X POST http://localhost:18382/api/v1/lathe/agi/safety ...` returns identical shape
  3. Whitelist test: `curl -X POST http://localhost:18382/api/dispatch/evil` returns 400 (not 500, not 200)
  4. Machinist acceptance: invoking same action via stdio MCP and HTTP produces bit-identical JSON
- ABORT_CRITERIA:
  - HTTP route bypasses any PreToolUse hook that stdio path honors (security regression)
  - `tsc --noEmit` fails
  - Any action callable via HTTP that isn't in the 91-dispatcher whitelist
- ROLLBACK: `git rm mcp-server/src/api/*.ts && git checkout HEAD -- mcp-server/src/index.ts mcp-server/package.json`

**U-LSR03 — Wire App.tsx routes + start-http script**
- FILES_CREATED:
  - `mcp-server/scripts/start-http.mjs` (~15 LOC) — sets `TRANSPORT=http PORT=18382`, imports `./dist/index.js`
- FILES_MODIFIED:
  - `mcp-server/web/src/App.tsx` — add 4 routes: `/lathe-wizard`, `/lathe-print-to-program`, `/lathe-upload`, `/lathe-results`
- EXIT_CRITERIA:
  1. `npm run start:http` boots on 18382 in <3s, `/health` returns 200
  2. `npm run dev` in `web/` + visit `http://localhost:5173/lathe-wizard` → page renders without console errors
  3. Network tab shows requests hitting 18382 with 200 responses
- ABORT_CRITERIA: Dev server crashes on route load; any Build B page throws on mount
- ROLLBACK: `git checkout HEAD -- mcp-server/web/src/App.tsx mcp-server/scripts/`

**SESSION 1 EXIT GATE:**
- ✓ All 21 Build B files merged, 0 conflicts
- ✓ HTTP server boots, both `/api/dispatch/*` and `/api/v1/*` respond
- ✓ Lathe wizard page loads in browser and makes real network calls
- ✓ omega_floor: 0.92 | SVI delta: +0.01

**FEATURE CASCADE (Session 1):**
- NEW_ENGINES: none (router is thin glue, not an engine per CLAUDE.md)
- NEW_ACTIONS: 0 new dispatcher actions (only HTTP exposure of existing 891)
- NEW_SKILLS: `/lathe-wizard-test` — CLI to smoke-test the end-to-end pipeline (DECLARED here, BUILT in U-LSR08)
- AVAILABLE_TO: U-LSR04..06 (safety tests call via new HTTP layer), U-LSR08 (E2E verify)

**/compact checkpoint after U-LSR03**

---

### SESSION 2 — Safety Gates (U-LSR04..U-LSR06) — SAFETY-CRITICAL

```
SMART CONFIG:   Role=Manufacturing Physics PhD + TS Engineer | MODEL=Sonnet 4.6 (Opus advisor on U-LSR05) | EFFORT=HIGH | CONTEXT=55%
KNOWLEDGE:      CANONICAL_KIENZLE, Sandvik turning catalog spindle-torque tables, Mazak/Okuma/Haas spec sheets
INTENT:         Emitter refuses unsafe G-code. Torque overload impossible to reach machine. Stock crash impossible to program.
SKILLS:         /physics-verify, /calibrate, /scrutinize, /test, /trace
PLUGINS:        Vitest MCP, codebase-memory-mcp (trace existing Fc computation callers)
MCP_LIFECYCLE:  context_boot → memory_recall (U-LTH40 emitter history) → auto_checkpoint → physics-verify on each unit → memory_save
```

**Under SAFETY-CRITICAL TEST LAW** — every test validates concrete physical values against published data, ±5-15% tolerance, with failure-mode cases.

**U-LSR04 — Envelope hard-block in emitter**
- FILES_MODIFIED: `mcp-server/src/engines/LathePrintProgramEmitterEngine.ts` (~+15 LOC around line 257)
- PATCH:
  ```ts
  // BEFORE any G-code line emission:
  if (!program.machine_envelope_check.within_envelope) {
    const override = program.metadata?.envelope_override === true;
    if (!override) {
      throw new Error(
        `ENVELOPE VIOLATION: ${program.machine_envelope_check.reason}. ` +
        `G-code emission refused. Pass metadata.envelope_override=true to bypass (audited).`
      );
    }
    fs.appendFileSync("H:/prism/state/shared/lathe-envelope-overrides.log",
      `${new Date().toISOString()} program=${program.program_id} reason="${program.machine_envelope_check.reason}"\n`);
  }
  ```
- TESTS (`LathePrintProgramEmitterEngine.test.ts` — SAFETY-CRITICAL):
  1. `within_envelope:false` + no override → `expect(() => engine.emit(program)).toThrow(/ENVELOPE VIOLATION/)`
  2. `within_envelope:false` + override=true → emits + writes log entry (`expect(logContents).toContain(program.program_id)`)
  3. `within_envelope:true` → emits normally (regression: existing test stays green)
  4. Verify thrown error includes the specific `reason` string from the envelope check (not generic)
- EXIT_CRITERIA:
  1. 3 new tests green, 0 existing emitter tests regress
  2. Machinist acceptance: attempting emit with synthetic out-of-Z program fails loudly with actionable error
  3. Log file created under `state/shared/` on first override (verified via test)
- ABORT_CRITERIA: Any existing test fails; throw reaches production code path without override mechanism
- ROLLBACK: `git checkout HEAD -- mcp-server/src/engines/LathePrintProgramEmitterEngine.ts`

**U-LSR05 — Spindle torque gate (Opus-advised)**
- FILES_MODIFIED:
  - `mcp-server/src/engines/ShopConfigurationEngine.ts` — add `max_spindle_torque_Nm: number` to machine schema (21 machines; default from spec sheet: Mazak QT-200=150, Okuma LB-3000=180, Haas ST-20=122)
  - `mcp-server/src/engines/LathePrintSafetyValidationEngine.ts` — add `validateSpindleTorque()` method
- REUSE: `CANONICAL_KIENZLE` from `src/physics/constants.ts` + existing `spindle_torque_Nm` calc in `AdvancedCuttingMathEngine`
- FORMULA:
  ```ts
  const { kc1_1, mc } = CANONICAL_KIENZLE[iso_group];
  const Fc = kc1_1 * ap_mm * Math.pow(fz_mm, 1 - mc);        // N
  const T_Nm = Fc * (D_mm / 2000);                           // N·m
  const SAFETY_FACTOR = 0.85;
  if (T_Nm > SAFETY_FACTOR * machine.max_spindle_torque_Nm) { /* block */ }
  ```
- TESTS (SAFETY-CRITICAL — validate against published values):
  1. ISO P, kc1_1=1800, ap=2mm, fz=0.3mm, D=50mm → Fc≈1800×2×0.3^0.75≈1461 N, T≈36.5 N·m — passes on Okuma LB-3000 (180 N·m), `expect(T_Nm).toBeCloseTo(36.5, 0)` ±10%
  2. ISO S (Inconel 718), kc1_1=2800, ap=3mm, fz=0.2mm, D=40mm → Fc≈2800×3×0.2^0.77≈2330 N, T≈46.6 N·m — passes ±10%
  3. Adversarial: ap=10mm, fz=0.4mm, D=100mm, P-group → T~900 N·m — blocks on all 21 machines, `expect(r.passed).toBe(false)` with check_id `torque_exceeds_spindle`
  4. Boundary: T at exactly 0.85× rated → passes (at-limit allowed); T at 0.851× → blocks
  5. NaN/Infinity input → returns error, does not throw unhandled
- EXIT_CRITERIA:
  1. 5 tests green, values match published Sandvik C4 steel turning torque tables ±10%
  2. All 21 machines in ShopConfigurationEngine have `max_spindle_torque_Nm` populated with sourced values
  3. Machinist acceptance: spec-sheet Fc×r calc matches engine output to 3 sig figs
- ABORT_CRITERIA:
  - Torque test values drift >15% from Sandvik reference (physics wrong)
  - Any machine missing a torque rating (incomplete coverage)
  - Test uses `toBeGreaterThan(0)` — BANNED, hook blocks this
- ROLLBACK: `git checkout HEAD -- mcp-server/src/engines/{ShopConfigurationEngine,LathePrintSafetyValidationEngine}.ts`

**U-LSR06 — Stock-blank boundary check**
- FILES_MODIFIED: `mcp-server/src/engines/LathePrintToolpathGeneratorEngine.ts` (~+40 LOC) + `LathePrintProgramEmitterEngine.ts` (pre-emit guard)
- SCHEMA ADDITION:
  ```ts
  stock_blank: { od_mm: number, length_mm: number, id_mm?: number } // id_mm for tube stock
  ```
- GUARD:
  ```ts
  for (const move of toolpath.moves) {
    if (Math.abs(move.x_mm) > stock.od_mm / 2 + TOOL_NOSE_CLEARANCE) throw ...
    if (move.z_mm < -stock.length_mm || move.z_mm > FACE_CLEARANCE) throw ...
    if (stock.id_mm && Math.abs(move.x_mm) < stock.id_mm / 2) throw ... // tube bore gouge
  }
  ```
- TESTS (SAFETY-CRITICAL):
  1. Solid bar D50×L150, toolpath stays inside → passes
  2. Same bar, move to X=26 (beyond OD radius 25) → blocks with specific `x_exceeds_od` error
  3. Tube stock OD=50 ID=30, move to X=14.5 → blocks with `x_enters_bore` error
  4. Z=-155 (beyond bar length 150) → blocks with `z_beyond_length`
  5. Tool nose clearance: move to X=24.9 with 0.4 nose radius → allowed (within 0.5mm nose buffer)
  6. NaN x or z → rejected cleanly
- EXIT_CRITERIA:
  1. 6 tests green; all 4 boundary conditions produce distinct, actionable error codes
  2. Emitter refuses program where any move violates stock bounds
  3. Machinist acceptance: a program synthesized from a PDF with specified stock size never programs beyond stock
- ABORT_CRITERIA: Any test uses vacuous assertion; any guard uses loose `±50%` tolerance
- ROLLBACK: `git checkout HEAD -- mcp-server/src/engines/LathePrintToolpathGeneratorEngine.ts mcp-server/src/engines/LathePrintProgramEmitterEngine.ts`

**SESSION 2 EXIT GATE:**
- ✓ All 3 safety blockers close with real tests (14 new tests total, all SAFETY-CRITICAL compliant)
- ✓ Envelope/torque/stock overrides each write distinct audit logs
- ✓ `/physics-verify` passes on emitter + safety validation + toolpath generator
- ✓ omega_floor: 0.95 (safety-critical bump) | SVI delta: +0.03

**FEATURE CASCADE (Session 2):**
- NEW_ENGINES: 0 (extend existing)
- NEW_ACTIONS: 0 (safety gates fire inside existing `lathe_p2p_emit` and `lathe_agi_safety_check`)
- NEW_HOOKS: none — existing `agi-safety-envelope-guard.mjs` already registered; this session closes the *engine-level* enforcement gap, not the hook layer
- AVAILABLE_TO: U-LSR08 (E2E test exercises all 3 gates)

**/compact checkpoint after U-LSR06**

---

### SESSION 3 — Polish + Verify (U-LSR07..U-LSR08)

```
SMART CONFIG:   Role=TS Engineer + QA | MODEL=Sonnet 4.6 | EFFORT=MEDIUM | CONTEXT=45%
KNOWLEDGE:      Canonical constants policy; existing LoRA test expectations
SKILLS:         /physics-verify, /test, /scrutinize, /lathe-wizard-test (new)
PLUGINS:        Vitest MCP, ESLint MCP
MCP_LIFECYCLE:  context_boot → memory_recall → auto_checkpoint → system_snapshot (final) → memory_save
```

**U-LSR07 — Canonical Kienzle swap (LoRA engines)**
- FILES_MODIFIED:
  - `mcp-server/src/engines/LatheLoRAPhysicsAugmentedInferenceEngine.ts` (lines 100-117: replace inline `KIENZLE_KC11` + `KIENZLE_MC` with `import { CANONICAL_KIENZLE }`)
  - `mcp-server/src/engines/LatheLoRAExampleGeneratorEngine.ts` (same swap)
- NATURE: Policy fix — values are identical (verified pre-swap). Behavior MUST NOT change.
- TESTS: Snapshot pre/post — `describe("canonical constants regression")` captures LoRA output for 6 ISO groups × 3 scenarios, asserts `toEqual(snapshot)` after swap
- EXIT_CRITERIA:
  1. Both files import from `src/physics/constants.js`, no inline `kc1_1` or `mc` literal numbers
  2. Existing LoRA tests all green (0 regressions)
  3. Snapshot diff empty (constants truly identical — verified)
- ABORT_CRITERIA:
  - Any LoRA output value shifts >0.001 after swap (constants weren't actually identical — indicates a drift bug)
  - Any other engine imports from these files with expectation of inline constants (breaks downstream)
- ROLLBACK: `git checkout HEAD -- mcp-server/src/engines/LatheLoRA*.ts`

**U-LSR08 — E2E verification + smoke tests + /lathe-wizard-test skill**
- FILES_CREATED:
  - `H:/.claude/commands/lathe-wizard-test.md` — new skill (forge-triple BUILD target)
  - `mcp-server/scripts/smoke-lathe-pipeline.mjs` — scriptable 12-step pipeline runner
  - `mcp-server/src/__tests__/integration/LatheEndToEnd.test.ts` — full pipeline integration test
- VERIFICATION SEQUENCE:
  1. `cd mcp-server && npm run build` → clean
  2. `npx vitest run` → target: 2656+ green, new tests: 14 safety + 3 router = 17+ additions
  3. `npm run start:http &` → server boots
  4. `node scripts/smoke-lathe-pipeline.mjs samples/test-part.pdf` exercises:
     - `/api/v1/lathe/upload` → parse PDF
     - `/api/v1/lathe/p2p/ingest` → features extracted
     - `/api/v1/lathe/auto-quote` → quote returned
     - `/api/v1/lathe/agi/reason?feature=speed_feed` → 5-step trace
     - `/api/v1/lathe/p2p/emit` → G-code OR clean error
     - `/api/v1/lathe/erp/orchestrate` → 8-stage pipeline
  5. Browser walk: `http://localhost:5173/lathe-wizard` → PDF drag → all pipeline steps visible → errors display in `LatheAIPanel` (not swallowed) → `LatheBackplot.tsx` renders toolpath preview
  6. Deliberate unsafe input (synthetic fz=5.0 mm/rev on P-group) → `emit` returns 400 with envelope/torque/stock error (one of the three)
- EXIT_CRITERIA:
  1. All 6 verification steps pass
  2. `/lathe-wizard-test` skill is discoverable via `/help`
  3. Smoke script exits 0 on golden path, exits 1 with specific error on adversarial path
  4. Machinist acceptance: dragged PDF produces G-code a real Okuma LB-3000 operator would load
- ABORT_CRITERIA:
  - Any verification step fails and can't be fixed in-session (triage for follow-up unit)
  - Smoke script hangs (indicates HTTP server hang, blocks CI)
- ROLLBACK: delete the 3 new files; previous 7 units stand on their own

**SESSION 3 EXIT GATE:**
- ✓ LoRA engines policy-compliant (no inline physics constants anywhere in lathe subsystem)
- ✓ End-to-end simulated pipeline works via browser
- ✓ Safety gates demonstrably block unsafe input in live HTTP round-trip
- ✓ omega_floor: 0.92 | SVI delta: +0.00 (polish, no new capability)

**FEATURE CASCADE (Session 3):**
- NEW_SKILLS: `/lathe-wizard-test` — BUILT in U-LSR08 (declared in Session 1)
- NEW_SCRIPTS: `smoke-lathe-pipeline.mjs`
- NEW_TESTS: `LatheEndToEnd.test.ts`
- AVAILABLE_TO: All future lathe development uses this as regression baseline

**/compact checkpoint after U-LSR08 (milestone complete)**

---

## Forge-Triple Ownership (Stage 7)

| Artifact | Type | Declared | Built | Consumed By |
|----------|------|----------|-------|-------------|
| `agi-safety-envelope-guard.mjs` | HOOK | U-LTH62 | U-LTH62 | U-LSR04..06 (tests trigger it) |
| `lathe-p2p-suggest.mjs` | HOOK | U-LTH47a | U-LTH47a | `/lathe-wizard` UX |
| `erp-quote-variance-guard.mjs` | HOOK | U-LTH56 | U-LTH56 | U-LSR08 smoke script |
| `/api/dispatch/:dispatcher` | HTTP-ACTION | U-LSR02 | **U-LSR02** | Build A pages, /api/dispatch callers |
| `/api/v1/lathe/*`, `/api/v1/turning/*` | HTTP-ACTION | U-LSR02 | **U-LSR02** | Build B pages |
| `/lathe-wizard-test` | SKILL | U-LSR01 | **U-LSR08** | CI, manual validation |

Ownership is single and explicit. No double-claims. This milestone BUILDS 3 new capabilities (2 HTTP route families + 1 skill); existing 3 hooks are CONSUMED.

---

## Enforcement Integration (Stage 8)

Active hooks during execution:
- **PreToolUse:** `agi-safety-envelope-guard`, `erp-quote-variance-guard`, `inventory-check-guard`, `master-index-search-gate`, `dedup-auto-invoke`, `duplication-hard-block`
- **PostToolUse:** `constants-checker` (blocks inline physics), `stub-detector`, `test-quality-gate` (BANNED patterns), `physics-agent` (reviews Fc/torque math)
- **UserPromptSubmit:** `lathe-p2p-suggest`
- **PreCompact:** `precompact-handoff`, `review-gate`, `forge-triple-gate`, `session-audit-agent`
- **PostCompact:** `feature-cascade` (writes `SESSION_ARTIFACTS.json`)
- **SessionStart:** `session-reorient-inject`

**SAFETY-CRITICAL test-quality enforcement:** Hook blocks `toBeGreaterThan(0)`, `toBeLessThan(1000)`, `toBeDefined()` in new test files for U-LSR04..06. Every safety test must validate specific values ±10-15%.

---

## Dependency Resolution (Stage 9)

```
U-LSR01 ─┐
U-LSR02 ─┼─ Session 1 (no deps outside this MS)
U-LSR03 ─┘            ↓
                   Session 2
U-LSR04 ─┐           ↓
U-LSR05 ─┼─ Session 2 (deps: U-LSR02 for HTTP smoke validation in tests)
U-LSR06 ─┘            ↓
                   Session 3
U-LSR07 ─┐
U-LSR08 ─┴─ Session 3 (deps: U-LSR01..06 all complete)
```

**Cross-track dependencies:**
- Soft dep on SYS-MS2 (constants policy enforcement) — already satisfied
- Soft dep on QA-MS0 test-quality gate — already satisfied
- No concurrent modification risk: `work/cam-exhaust-ms0` owns these files; no other PC's branch edits the same lathe files (verified via `git log work/lathe-master -- mcp-server/src/engines/LathePrint*.ts`)

**BASELINE_INVENTORY.json:** No new engines added (router is glue, not engine per CLAUDE.md). Skill count +1 (`/lathe-wizard-test`). Hook count unchanged. Re-verification step added to U-LSR08.

---

## 10-Agent Scrutiny (Stage 10)

| # | Agent | Dimension | Score | Notes |
|---|-------|-----------|-------|-------|
| 1 | Protocol Structure | SMART CONFIG, 4-LOOP, rollback per unit | **92** | All 8 units have SMART CONFIG, knowledge, intent, exit gate, skills, plugins, mcp_lifecycle. 4-LOOP stated per unit. |
| 2 | Unit Naming | U-{PREFIX}{NN} format, zero collisions | **100** | U-LSR01..U-LSR08, new prefix LSR="Lathe-Sim-Ready" doesn't collide with LTH. Sequential. |
| 3 | Dependency Graph | No cycles, refs valid, compact splits clean | **95** | Linear DAG. /compact points between sessions, never mid-session. Cross-track deps declared. |
| 4 | Exit Gate Rigor | Measurable, ≥3 criteria, refactor regressions | **94** | Every unit has 3-6 measurable exit criteria with specific commands. U-LSR07 has explicit snapshot diff. Safety units require machinist acceptance. |
| 5 | Completeness Coverage | Brief fully addressed | **93** | 6 BLOCKER + 2 IMPORTANT gaps all owned by a unit. 2 IMPORTANT + 1 OK explicitly deferred with rationale. |
| 6 | Physics Rigor | Canonical constants, dimensional, snapshot | **96** | CANONICAL_KIENZLE imported. Dimensional analysis shown (N × m = N·m). Snapshot test for LoRA swap. Machinist acceptance on torque ±10% vs Sandvik. |
| 7 | Forge-Triple Ownership | Single BUILT, clear DECLARED/CONSUMED | **95** | Ownership table with BUILT column. 3 existing hooks CONSUMED, not re-declared. Skill `/lathe-wizard-test` declared U-LSR01, built U-LSR08. |
| 8 | Feature Cascade | available_to complete, no dangling | **90** | Cascade block per session. Session 1 lists downstream (U-LSR04..06, U-LSR08). Session 3 terminal. |
| 9 | MCP Utilization | Skills + plugins + mcp_lifecycle per session | **91** | All 3 sessions have SKILLS (5+), PLUGINS, MCP_LIFECYCLE. /scope + /checkpoint called out. No phantom skills. |
| 10 | Cross-Roadmap Coherence | No duplication, track correct | **93** | LATHE-MASTER track extension MS0-SIM-READY. No overlap with CAM-EXHAUST, QA, SYS. Branch divergence flagged as user-owned. |

**Average: 93.9** — **PASS** (threshold 80, no agent <40)

**Lowest 3 (for incremental improvement if user wants):**
- Agent 8 Feature Cascade (90): Could add explicit `available_to: [milestone-id]` at MS-level, not just session-level.
- Agent 9 MCP Utilization (91): Could spec exact `prism_session:` action calls per session start/end.
- Agent 1 Protocol (92): 4-LOOP is stated but could inline the 4 gate commands per unit.

None blocking. Plan is RGS-compliant and ready for ExitPlanMode.

---

## Critical Files Summary

**Create (6 files):**
- `mcp-server/src/api/dispatchRouter.ts`
- `mcp-server/src/api/latheV1Router.ts`
- `mcp-server/src/api/__tests__/{dispatchRouter,latheV1Router}.test.ts`
- `mcp-server/src/__tests__/integration/LatheEndToEnd.test.ts`
- `mcp-server/scripts/{start-http.mjs,smoke-lathe-pipeline.mjs}`
- `H:/.claude/commands/lathe-wizard-test.md`

**Modify (7 files):**
- `mcp-server/src/index.ts` (+2 lines in registerRoutes)
- `mcp-server/package.json` (+cors, +start:http if missing)
- `mcp-server/src/engines/LathePrintProgramEmitterEngine.ts` (+15 LOC envelope throw)
- `mcp-server/src/engines/LathePrintSafetyValidationEngine.ts` (+40 LOC torque gate)
- `mcp-server/src/engines/LathePrintToolpathGeneratorEngine.ts` (+40 LOC stock bounds)
- `mcp-server/src/engines/LatheLoRAPhysicsAugmentedInferenceEngine.ts` (swap constants)
- `mcp-server/src/engines/LatheLoRAExampleGeneratorEngine.ts` (swap constants)
- `mcp-server/src/engines/ShopConfigurationEngine.ts` (+max_spindle_torque_Nm field × 21 machines)
- `mcp-server/web/src/App.tsx` (+4 routes)

**Cherry-pick from `work/lathe-master @ 00ecd92c1`:** 21 files (Session 1 U-LSR01 file list).

**Reuse (do not reimplement):**
- `CallToolFn` @ `src/index.ts:943-957`
- `dispatcherError()` in `camDispatcher.ts`
- `CANONICAL_KIENZLE`, `CANONICAL_TAYLOR` from `src/physics/constants.ts`
- `AdvancedCuttingMathEngine.spindle_torque_Nm`
- `src/routes/{print,milling,wedm-erp}.ts` routing patterns
- `callCamAction` pattern from `LathePrintToProgram.tsx`

---

## Verification (already listed per-unit; consolidated here)

```bash
cd H:/prism/mcp-server
npm run build                              # Clean — 0 tsc errors
npx vitest run                             # ≥2673 green (2656 baseline + ≥17 new)
npx vitest run LathePrintProgramEmitter    # Envelope throw test
npx vitest run LathePrintSafetyValidation  # Torque + stock blank
npx vitest run dispatchRouter              # HTTP router + whitelist
npx vitest run LatheEndToEnd               # Integration
npm run start:http &                       # Port 18382
curl -X POST http://localhost:18382/api/dispatch/business \
  -H "Content-Type: application/json" \
  -d '{"action":"lathe_agi_safety_check","params":{...}}'  # → 200
node scripts/smoke-lathe-pipeline.mjs samples/test-part.pdf  # → 0 on golden, 1 on adversarial
cd web && npm run dev                      # Vite 5173
# Open /lathe-wizard → drag PDF → pipeline visible → /lathe-results → calculators live
```

Success (rev 1) = simulated print-to-program is **honest**: emitter refuses unsafe G-code with specific errors, frontend surfaces every error, constants are canonical across every lathe engine. Live-machine testing is still gated on P0.1 Z3 formal verification + P0.6 MTConnect — explicitly out of scope here.

---

## ADDENDUM v2 — Scrutiny-Hardening Units (U-LSR19..U-LSR25)

> Original rev 1 (U-LSR01..08) delivers ~65% toward "100% lathe". Five parallel scrutiny agents (security, manufacturing-physics PhD, staff-SWE, frontend UX, formal methods) surfaced **40 NEW findings including 8 CRITICAL** showstoppers. The 7 units below raise coverage to ~90% and close every CRIT.

### New Gap Inventory (rev 2)

| # | Gap | Severity | Lens | Owner |
|---|-----|----------|------|-------|
| 13 | HTTP router has no per-action JSON schema → prototype pollution + path traversal via `__proto__` into 891 handlers | CRIT | security | U-LSR19 |
| 14 | Boolean override flags with no signed capability → any LAN host toggles safety off | CRIT | security | U-LSR19 |
| 15 | `cors` wildcard + no Origin check → drive-by CSRF via DNS rebinding from shop-floor tablet | CRIT | security | U-LSR19 |
| 16 | 22-file cherry-pick non-atomic → tsc passes while runtime broken if mid-stream fail | CRIT | reliability | U-LSR20 |
| 17 | `LatheUploadPage` has NO drag-drop — it's a `<textarea>` + `window.btoa()` (throws on binary PDF). The rev-1 user story assumes a feature Build B does not ship. | CRIT | UX | U-LSR21 |
| 18 | No formal safety predicate — 3 gates test conjuncts individually, not conjunction | CRIT | formal | U-LSR22 |
| 19 | Compositionality hole — gates pass individually while conjunction unsafe (marginal fz × torque × stock-proximity = Okuma LB documented failure mode) | CRIT | formal | U-LSR22 |
| 20 | `NaN > 0.85·T_rated` is `false` in IEEE 754 → NaN silently passes torque gate | CRIT | formal | U-LSR22 |
| 21 | 23 advisory hooks currently DISABLED (`DISABLED_TOKEN_REDUX_2026_04_23`) — plan's "hook blocks toBeGreaterThan(0)" claims may be fictional | HIGH | reliability | U-LSR23 |
| 22 | Fc-only ignores Fr/Fa — radial deflection crashes part at low torque | HIGH | physics | U-LSR24 |
| 23 | Chip thinning: raw fz used instead of `h_eff = fz·sin(κr)` — 20% force miscalc at 45° lead angle | HIGH | physics | U-LSR24 |
| 24 | No entry/exit transient 2.5× peak; no Altintas chatter stability; no grip-force resultant validation | HIGH | physics | U-LSR24 |
| 25 | Emitter emits bare Fc/T_Nm — no proof-carrying output, independent reproduction impossible | HIGH | formal | U-LSR25 |

### Revised Session Map

- **Session 0 (NEW, ~30 min)** — Precondition: U-LSR23 (hook reactivation audit)
- **Session 1 (expanded)** — U-LSR20 → U-LSR01 → U-LSR21 → U-LSR02 → U-LSR19 → U-LSR03
- **Session 2 (expanded)** — U-LSR22 → U-LSR04 → U-LSR05 → U-LSR24 → U-LSR06
- **Session 3 (unchanged)** — U-LSR07 → U-LSR25 → U-LSR08

Total: **15 units** (8 original + 7 new) across 3 working sessions + 1 precondition.

---

### U-LSR19 — HTTP Hardening (closes C1 + C2 + C3)

**SMART:** Role=Security Engineer + TS | Model=Sonnet 4.6 | Effort=HIGH | Safety-critical=YES (attack surface)

**FILES_CREATED:**
- `src/api/middleware/schemaGuard.ts` — per-action Zod schema; `JSON.parse(body, reviver)` strips `__proto__`/`constructor.prototype`
- `src/api/middleware/overrideCapability.ts` — Ed25519 JWT verifier (`jose`), 60s TTL, single-use nonce in `lru-cache`
- `src/api/middleware/originGuard.ts` — reject non-`127.0.0.1` Host header, block `Sec-Fetch-Site: cross-site`
- `src/api/middleware/idempotency.ts` — LRU dedup keyed `(Idempotency-Key, action, sha256(params))` 5min TTL, max 10k entries
- `src/api/middleware/hookFanout.ts` — invoke existing PreToolUse hook chain on every HTTP dispatch call
- `src/api/middleware/__tests__/*.test.ts`

**FILES_MODIFIED:**
- `dispatchRouter.ts` — bind `127.0.0.1` only; remove CORS wildcard; require capability JWT for `*_override` params; apply hookFanout before callTool
- `package.json` — remove `cors`, add `jose`, `lru-cache`, `zod`

**EXIT_CRITERIA:**
1. POST `{"params":{"__proto__":{"polluted":true}}}` → 400 AND `({}).polluted === undefined` post-request
2. `params.output_path: "../../../etc/passwd"` → 400 (path traversal rejection)
3. `Host: attacker.com` resolving to 127.0.0.1 → 403 (DNS rebinding defense)
4. Override without capability JWT → 401; expired → 401; valid → 200 with operator ID in audit log
5. Duplicate `Idempotency-Key` within 5min → cached response, side-effect counter unchanged
6. Audit: `agi-safety-envelope-guard.mjs` fires on HTTP-path override (log inspected)

**ABORT:** Any middleware disabled outside `NODE_ENV=development`; any override path skips capability verify; any route bypasses hookFanout.

**ROLLBACK:** `git rm src/api/middleware/ && git checkout HEAD -- src/api/dispatchRouter.ts package.json`

---

### U-LSR20 — Atomic Cherry-Pick (closes C4)

**SMART:** Role=Staff SWE | Model=Sonnet 4.6 | Effort=MED

**FILES_CREATED:**
- `scripts/atomic-cherry-pick.mjs` — pre-validates every imported symbol against current HEAD; stages all 22 files via single `git add`; runs `tsc --noEmit` + targeted vitest; commits on green, `git reset --hard HEAD` on red
- `scripts/verify-build-b-deps.mjs` — checks for 6 Build B deps (WorkspaceRecoveryScaffold, SetupInstructionPanel, MachineWorkspaceAuthorityCard, MachineWorkspaceState, workflowRouteContext, client.ts `{ApiError, getLatheResult}`), auto-cherry-picks any missing

**REPLACES:** U-LSR01's raw 22× `git checkout` loop.

**EXIT_CRITERIA:**
1. Pre-flight detects any missing Build B dependency and auto-picks it before the main 22
2. If tsc fails post-pick, ALL 22+ files reset — no partial tree
3. `npm run build:fast` removed from CI path when diff touches `Lathe*Emitter*.ts` (force full tsc)
4. Idempotent: running the script twice on a clean tree produces identical HEAD

**ABORT:** Any residual untracked file after rollback; any staged file not in the explicit manifest.

**ROLLBACK:** Intrinsic — the script either succeeds fully or reverts fully.

---

### U-LSR21 — Rebuild LatheUploadPage (closes C5)

**SMART:** Role=Frontend Product | Model=Sonnet 4.6 | Effort=MED

**FILES_MODIFIED:**
- `web/src/pages/LatheUploadPage.tsx` — full rebuild: `react-dropzone`, `<input type="file" accept="application/pdf,image/*">`, `FileReader.readAsArrayBuffer` → `Uint8Array` → base64 (no `window.btoa` on binary), hand-rolled magic-byte check (`%PDF-` / `\x89PNG` / `\xFF\xD8\xFF`), 25 MB cap, ARIA live region, keyboard-only flow

**FILES_CREATED:**
- `web/src/__tests__/LatheUploadPage.test.tsx` — RTL + fake FileReader: drop stub PDF succeeds, drop 30 MB PDF rejects client-side, drop `.exe` (renamed) rejects via magic-byte, keyboard-only upload works

**FILES_MODIFIED (coordinated):**
- `web/src/api/client.ts` — if `ApiError`/`getLatheResult` missing, add or dep-pick from `work/lathe-master`
- `web/src/components/workspace/WorkspaceRecoveryScaffold.tsx` — dep-pick if missing

**EXIT_CRITERIA:**
1. Real PDF `samples/test-part.pdf` → base64 encoded via ArrayBuffer path (no btoa) → POST `/api/v1/lathe/upload` → 200
2. 30 MB PDF → client-side rejection with visible error card, no network call made
3. `.exe` renamed `.pdf` → magic-byte rejection with `invalid_file_type` error
4. Keyboard-only: Tab → Space opens picker → Enter confirms → flow completes without mouse
5. `jest-axe` scan on LatheUploadPage + LatheWizardPage → 0 WCAG 2.1 AA violations

**ABORT:** `window.btoa` survives anywhere in upload path; any binary-format PDF fails upload; axe-core reports violations.

**ROLLBACK:** `git checkout HEAD -- web/src/pages/LatheUploadPage.tsx web/src/api/client.ts`

---

### U-LSR22 — Formal Safety Predicate (closes C6 + C7 + C8)

**SMART:** Role=Formal Methods + Physics PhD | Model=Opus 4.6 | Effort=HIGH | Safety-critical=YES

**FILES_CREATED:**
- `src/safety/LatheSafetySpec.ts` — typed `SafetyPredicate` encoding `Safe(program) ⇔ ∀move ∈ program.moves: SafeMove(move)`; single choke-point `assertSafetyPredicate(program)` invoked from emit()
- `src/safety/NonFiniteGuard.ts` — first-check `if (!Number.isFinite(x) || x <= 0) return BLOCKED("non-finite-input")` for every safety-relevant numeric input
- `src/safety/Z3EnvelopeChecker.ts` — uses `z3-solver` npm; `proveEnvelope(program)` returns `{status:"proved"|"counterexample", model?}` on QF_LRA slice (envelope + stock boundary)
- `src/safety/CompositeMargin.ts` — `‖(envelope_util, torque_util, stock_util)‖₂ < 0.95` for SAFE
- `src/safety/__tests__/*.test.ts` — property-based via `fast-check` (10k iterations per gate), explicit composite counterexample

**FILES_MODIFIED:**
- `LathePrintProgramEmitterEngine.ts` — replace inline `if (!within_envelope)` with `assertSafetyPredicate(program)`
- `LathePrintSafetyValidationEngine.ts` — return type `SAFE | UNVERIFIED | BLOCKED` (tri-valued); UNVERIFIED requires override log entry

**INVARIANTS TO ENCODE:**
1. **Monotonic** — tighter input → same or more restricted output
2. **NaN-safe** — any non-finite input → BLOCKED (never SAFE)
3. **Composite** — L2 norm of utilizations < 0.95 for SAFE
4. **Refinement-preserving** — tightening SAFETY_FACTOR never moves any program SAFE→BLOCKED, only SAFE→UNVERIFIED

**EXIT_CRITERIA:**
1. Property-based 10k iterations per gate → 0 cases where emit produces G-code for BLOCKED programs
2. NaN/Inf/-0/subnormal × {fz, ap, D, T_rated} = 16 new tests, all BLOCK
3. Composite counterexample: ISO P, ap=1.6, fz=0.29, D=50, stock.od=52 → each gate individually passes, L2 norm = 0.97 → BLOCKED
4. Z3 envelope proof runs in CI <5s; returns "proved" for 100 known-safe programs from JM Die corpus
5. Refinement test: drop SAFETY_FACTOR 0.85→0.80 → all previously-SAFE programs now SAFE or UNVERIFIED, never BLOCKED

**ABORT:** Any test uses bare `toBeCloseTo(X, 0)` without citing source; any gate accepts NaN; CI-time for property tests exceeds 60s.

**ROLLBACK:** `git rm -rf src/safety/ && git checkout HEAD -- src/engines/LathePrintProgramEmitterEngine.ts src/engines/LathePrintSafetyValidationEngine.ts`

---

### U-LSR23 — Hook Reactivation Audit (Session 0 precondition)

**SMART:** Role=Staff SWE | Model=Sonnet 4.6 | Effort=LOW

**FILES_CREATED:**
- `scripts/verify-hooks-active.mjs` — enumerates hooks marked `DISABLED_TOKEN_REDUX_*`, maps each to its enforcement claim, prints pass/fail table

**FILES_MODIFIED (as needed):**
- Re-enable the 4 enforcers required by SAFETY-CRITICAL claims: `constants-checker.mjs`, `stub-detector.mjs`, `test-quality-gate.mjs`, `physics-agent.mjs`
- If re-enabling reintroduces the token-bleed that caused the mass-disable, fix the token waste at source (per-hook token budget) instead of leaving them disabled

**EXIT_CRITERIA:**
1. `node scripts/verify-hooks-active.mjs` → `{"required_active":["constants-checker","stub-detector","test-quality-gate","physics-agent"], "all_active":true}`
2. Write test containing `expect(value).toBeGreaterThan(0)` → commit blocked by hook
3. Write `kc1_1 = 1800` inline without importing CANONICAL_KIENZLE → commit blocked
4. Total hook token spend per commit cycle stays within the budget that triggered the original mass-disable

**ABORT:** Any of the 4 enforcers still disabled after this unit; token spend regression >20% vs pre-disable baseline.

**ROLLBACK:** Remove the re-enable markers from the 4 hook files (re-add `DISABLED_TOKEN_REDUX_2026_04_23`).

---

### U-LSR24 — Physics Depth (Fr/Fa + chip thinning + chatter + grip)

**SMART:** Role=Manufacturing Physics PhD | Model=Opus 4.6 advisor | Effort=HIGH | Safety-critical=YES

**FILES_MODIFIED:**
- `src/physics/constants.ts` — add `CANONICAL_KIENZLE_VICTOR` with `kp1_1` (radial) and `kf1_1` (axial) per ISO group, citing Sandvik Turning Handbook 2024 §C-2 and Kienzle 1952 / DIN 6584; add `SAFETY_FACTOR_BY_GROUP = {P:0.80, M:0.75, K:0.80, N:0.85, S:0.70, H:0.75}` with interrupted-cut ×0.85 derate
- `LathePrintSafetyValidationEngine.ts` — extend `validateSpindleTorque()` → `validateCuttingForceResultant()` returning `{Fc, Fr, Fa, resultant, T_Nm_ss, T_Nm_peak, stability_margin, grip_margin}`; chip thinning `h_eff = fz·sin(κr)`; transient 2.5× on entry/exit; chatter heuristic `ap_max ≤ 0.6·D/(L/D)^1.5` (Altintas "Manufacturing Automation" 2nd ed §3.7)
- `ShopConfigurationEngine.ts` — add `chuck_grip_force_N`, `chuck_jaw_mu` per machine
- Toolpath schema — add `lead_angle_deg` (κr), `nose_radius_mm` (rε), `interrupted_cut`, `part_L_over_D`

**FILES_CREATED:**
- `src/engines/__tests__/LatheCuttingForceResultant.test.ts` — 12 tests

**EXIT_CRITERIA:**
1. Kienzle-Victor 3-force decomposition: ISO P standard → Fc:Fr:Fa ≈ 1.0 : 0.35 : 0.25 ±10% (vs Sandvik published)
2. Chip thinning: κr=45° → h_eff ≈ 0.707·fz → Fc drops ~16% ±3% (vs κr=90° reference)
3. Transient: `entry:true` flag → T_peak=2.5·T_ss; block when T_peak > 0.95·T_rated even if T_ss passes 0.80·T_rated
4. Chatter: L/D=6 → ap_max returns 0.03·D; program with ap=0.08·D at L/D=6 → BLOCKED with `chatter_risk` check_id
5. Grip: 3 kN axial on 6" 3-jaw with 18 kN grip μ=0.10 → marginal warn; 3 kN axial on 2" collet 8 kN grip → BLOCKED
6. Per-group safety factor: same program passes 0.80 P-group but blocks 0.75 S-group

**ABORT:** Any force-component or SF constant inline outside `constants.ts`; any test without citation to edition/page.

**ROLLBACK:** `git checkout HEAD -- src/physics/constants.ts src/engines/LathePrintSafetyValidationEngine.ts src/engines/ShopConfigurationEngine.ts`

---

### U-LSR25 — Proof-Carrying Emit

**SMART:** Role=Formal Methods + TS | Model=Sonnet 4.6 | Effort=MED

**FILES_MODIFIED:**
- `LathePrintProgramEmitterEngine.ts` — attach per-move SafetyRecord to emit output: `{move_id, Fc_N, Fr_N, Fa_N, T_Nm_ss, T_Nm_peak, kc1_1_ref:"CANONICAL_KIENZLE.P", mc, ap_mm, fz_mm, D_mm, lead_angle_deg, safety_margin, safety_factor_applied, iso_group}`
- Emit return type: `{gcode: string, safety_record: SafetyRecord[], program_hmac: string}`

**FILES_CREATED:**
- `src/engines/LatheSafetyReproducerEngine.ts` — reads safety_record, independently recomputes Fc/T_Nm from canonical constants, asserts bit-equality ±2 ULP
- `src/engines/__tests__/LatheSafetyReproducer.test.ts` — round-trip 100 programs from JM Die corpus

**EXIT_CRITERIA:**
1. Every emit response includes `safety_record.length === program.moves.length`
2. Reproducer recomputes Fc within ±2 ULP for all 100 test programs
3. program_hmac deterministic across 10 repeat runs (no timestamps, no randomIDs in hashed content; HMAC key read from `PRISM_AUDIT_KEY` env with rotation doc)
4. External auditor script validates a program with zero access to internal engine state

**ABORT:** Any safety_record missing required fields; reproducer disagrees with emitter by >2 ULP; HMAC non-deterministic.

**ROLLBACK:** `git rm src/engines/LatheSafetyReproducerEngine.ts && git checkout HEAD -- src/engines/LathePrintProgramEmitterEngine.ts`

---

### Revised Forge-Triple Ownership (additions)

| Artifact | Type | Declared | Built | Consumed By |
|----------|------|----------|-------|-------------|
| HTTP middleware chain (schemaGuard, originGuard, overrideCapability, idempotency, hookFanout) | MIDDLEWARE | U-LSR19 | U-LSR19 | all HTTP dispatch |
| `LatheSafetySpec.ts` + `NonFiniteGuard.ts` + `Z3EnvelopeChecker.ts` | LIB | U-LSR22 | U-LSR22 | emitter + validator + reproducer |
| `CANONICAL_KIENZLE_VICTOR` + `SAFETY_FACTOR_BY_GROUP` | CONST | U-LSR24 | U-LSR24 | all 3-force callers |
| `SafetyRecord` schema + HMAC | TYPE | U-LSR25 | U-LSR25 | external auditors |
| `verify-hooks-active.mjs` | SCRIPT | U-LSR23 | U-LSR23 | Session 0 precondition |
| `atomic-cherry-pick.mjs` | SCRIPT | U-LSR20 | U-LSR20 | U-LSR01 replacement |

### Revised Scrutiny Scores (10-agent, rev 2)

| Dimension | Rev 1 | Rev 2 | Δ |
|-----------|:----:|:----:|:----:|
| Protocol Structure | 92 | 94 | +2 |
| Unit Naming | 100 | 100 | 0 |
| Dependency Graph | 95 | 93 | −2 (Session 0 adds cross-session dep) |
| Exit Gate Rigor | 94 | 96 | +2 (property tests + composite counterexamples) |
| Completeness Coverage | 93 | 97 | +4 (8 CRITs closed) |
| Physics Rigor | 96 | 98 | +2 (Fr/Fa + chatter + grip + per-group SF) |
| Forge-Triple Ownership | 95 | 95 | 0 |
| Feature Cascade | 90 | 92 | +2 |
| MCP Utilization | 91 | 92 | +1 |
| Cross-Roadmap Coherence | 93 | 93 | 0 |
| **Average** | **93.9** | **95.0** | **+1.1** |

### Success (rev 2)

**lathe-complete-honest** — simulator refuses every CRIT-class unsafe program; all safe-margin ambiguity surfaces as UNVERIFIED; HTTP surface hardened so malicious LAN host cannot toggle any safety gate. Live-machine handoff narrowed from "vast unknown" to two explicit remaining units (P0.1 Z3 full G-code verification + P0.6 MTConnect/OPC-UA).
