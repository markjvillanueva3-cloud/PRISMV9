# PRISM Daily Build & Test Validation Report

**Run:** 2026-06-26T12:30Z (automated, scheduled task `build-test-validate`)
**Runner environment:** Cowork Linux sandbox over the portable SSD (`H:`) — node v22.22.3, npm 10.9.8, **Windows-installed `node_modules`**, ~3.8 GB RAM cap

---

## ⚠️ Executive summary — build/test could NOT be executed this run

**Fourth consecutive run** blocked by the **same platform/resource mismatch** (carried from 2026-06-23 → 24 → 25): the toolchain on this SSD is installed with **Windows-native binaries**, but the scheduled task runs in a **Linux sandbox** with a hard ~3.8 GB memory ceiling. The typecheck OOMs; the test runner can't load its Linux native binding. **This is an environment mismatch, not a detected code regression.** Static analysis (test-file inventory, skip scan, SVI drift) completed and is valid.

**Action required:** run the real build + test validation on the **Windows host**, or provision Linux-native `node_modules` + ≥16 GB RAM for the sandbox runner.

| Gate | Result | Cause |
|------|--------|-------|
| `tsc --noEmit` | **Inconclusive** | OOM-killed. Sandbox has **3.8 GB total RAM** vs the project's `--max-old-space-size=16384` (16 GB) config. At 16 GB heap node was reaped (exit 137, empty output); at a constrained 3.2 GB heap it died with `FATAL ERROR: Reached heap limit` (exit 134) during GC scavenge, before emitting any diagnostic. 10,287 `.ts` source files cannot typecheck here. **0 TS errors observed, none confirmable.** |
| `vitest run` | **Cannot start** | Startup crash: `Cannot find module '../rolldown-binding.linux-x64-gnu.node'`. `rolldown` (vitest's bundler) ships only the Windows binding here. Aborts before collecting any test. (`better-sqlite3` *did* load on Linux — the blocker is specifically the rolldown native binding.) |

**Spec note:** the task file calls for `npx jest`. This project uses **vitest** (`package.json` → `"test": "… vitest.mjs"`); no jest config exists. Vitest is the correct runner and is what was attempted.

**To get real numbers (Windows host):**
```
cd H:/prism/mcp-server
npm run build        # full tsc --noEmit + esbuild (build gate)
npx vitest run       # test suite
```

---

## Build status: NOT VERIFIED this run

OOM-killed in-sandbox; no clean tsc completion. Per R12, a "build PASS / 0 errors" claim would be a fabrication and is **not** made. New-vs-pre-existing error categorization is N/A — no diagnostics were emitted. Confirm by reading host build output.

## Test status: NOT VERIFIED this run

No passed / failed / runtime-skipped counts available — the runner could not start. Per R12, "tests pass" would be a lie here, so nothing is inferred as passing. No new failures identified (suite did not run — absence of evidence, not evidence of absence).

---

## Static analysis (VALID — completed)

### Test inventory vs SVI — 🚩 DRIFT FLAGGED

| Source | Count |
|--------|-------|
| Test files on disk (`*.test.ts`, recursive under `src/__tests__/`) | **5,133** |
| All `.ts` under `src/__tests__/` | 5,148 |
| `SVI.json` → "Tests" entity `entities` | **4,866** |
| **Drift** | **+267 not reflected in SVI** |

**SVI is stale.** Update the "Tests" entity `4,866 → 5,133` (dims=3 → recompute `variability`/`reachable` = **15,399**, currently 14,598). SVI `timestamp` is 2026-06-26T10:51:47Z but the count is already behind.

**Persistent drift trend (4 runs):** 06-24 → 5,033 files / SVI 4,766 (+267); 06-25 → 5,106 / 4,839 (+267); 06-26 → 5,133 / 4,866 (+267). Both files and SVI grow in lockstep but the SVI updater holds a **constant +267 offset** — it is permanently lagging by 267 and never reconciling. Most SVI subsystems also read `growth_since_last: 0`, confirming the snapshot regenerator is not closing the gap.

### Skipped tests (Ψ opportunities — untested coverage)

Static scan under `src/__tests__/`. **21 files** carry real skip directives:

| Kind | Count | Nature |
|------|-------|--------|
| `.skipIf(...)` (conditional) | 39 | Environment-gated — skip only when CadQuery / JM Die drive / `ANTHROPIC_API_KEY` / PowerShell / a LIVE-mode flag is absent. They run on the host. **Not dead coverage.** |
| `describe.skip(...)` (unconditional) | 13 | **Genuinely dead** — the real Ψ backlog. |
| `it.skip(...)` (unconditional) | 4 | 2 real + 2 intentional fixtures inside `TestQualityAuditEngine.test.ts` (it tests the skip-detector itself). |
| `it.todo(...)` | 3 | Placeholders for unwritten tests. |

> Note: a naive `xit(` scan returns ~30 hits but they are **false positives** (`process.exit(`, `selectExit(`) — there are **no** real `xit`/`xdescribe` directives. Reported here to prevent over-counting.

**Top files by skip directive:** lathe-orchestration (11), jm-die-program-extraction (9), cad-bridge (7), OutboundPriceIndexEngine (5), lathe-threading-mastery (3), gcode-cycle-extraction (3), TestQualityAuditEngine (3, fixtures), FolderScannerEngine (3).

**Genuinely-dead blocks to triage first (unconditional, not fixtures):**

- `lathe-orchestration.test.ts` — **11 `describe.skip` blocks**: MACHINE_READINESS, EMERGENCY_RECOVERY, PROVE_OUT, and Stages 15–23 (TOOLPATH_GENERATE, GCODE_GENERATE, TNRC_RESOLVE, CSS_OPTIMIZE, TURRET_OPTIMIZE, CONTROLLER_DIALECT, SAFETY_VERIFY, COLLISION_CHECK). Entire lathe-orchestration pipeline stages are unverified.
- `lathe-threading-mastery.test.ts` — `describe.skip` (Dialect Formats; Spring Passes & Chamfer) + `it.skip` "NPT tapered thread includes taper R-word".
- `engines/jmDieCorpusPipeline.test.ts` — `it.skip("handles malformed timestamps")`.

(The 9 skips in jm-die-program-extraction and 7 in cad-bridge are `.skipIf` env-gated — they run on the Windows host with the JM Die drive / CadQuery present, so they rank below the unconditional lathe blocks.)

### Other findings

- **Corrupt backup test file STILL present (carried 06-23 → 24 → 25 → 26, 4 runs unaddressed):** `src/__tests__/calculatorProgrammingCatalog.test.ts.corrupt-20260420.bak` (12,121 bytes). Remove from the test tree.

---

## Regressions

**None detectable this run** — build and test runners could not execute in-sandbox. Run on the Windows host for a real pass/fail and regression delta.

## Recommendations

1. **Root cause (now 4 runs):** run this daily validation on the **Windows host**, or maintain a Linux-native `node_modules` + raise the sandbox RAM cap (≥16 GB). Until then this gate produces only static analysis. Consider rescheduling the task to a host-side runner.
2. **Update `SVI.json`** "Tests" entity `4,866 → 5,133` (recompute variability/reachable = 15,399) and fix the regenerator — it has lagged by a constant +267 for four runs.
3. **Triage the 13 unconditional `describe.skip` lathe blocks** (lathe-orchestration stages + lathe-threading-mastery) first — real untested coverage, not env-gated.
4. **Remove** `calculatorProgrammingCatalog.test.ts.corrupt-20260420.bak` (outstanding 4 runs).
5. **Fix the task spec** — it references `jest`; project uses `vitest`.

---
*Generated by the `build-test-validate` scheduled task. Build/test execution blocked by Linux-sandbox (3.8 GB RAM, no linux-native bindings) vs Windows-native 16 GB-heap toolchain mismatch; static checks valid.*
