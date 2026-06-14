# MORNING RESUME — XPROC-NEURAL T2-T7+T10 build

**Wrote:** 2026-05-05 evening · **Read:** tomorrow morning at work PC
**Branch:** `work/cam-exhaust-ms0` · **Worktree:** `H:/prism` · **Session:** `claude-84c2d13a`

---

## TL;DR — What to do first thing tomorrow

1. **`cd H:/prism && git pull`** to get any peer commits that landed overnight
2. **`git log --oneline -10`** — confirm last commit is `ae5b81897 [MAIN] [INFRA-NEURAL-LEDGER-MS1]/U-XPROC-T8-COMPLETE`
3. **Run** `cd mcp-server && NODE_OPTIONS="--max-old-space-size=16384" node node_modules/vitest/vitest.mjs run src/__tests__/CrossProcess*.test.ts` to confirm 232 XPROC-NEURAL tests still pass
4. **Pick up next batch:** T5 (Bayesian / UQ — 4 engines)

---

## Where we are in the XPROC-NEURAL roadmap

**Roadmap file:** `H:/prism/state/shared/XPROC-NEURAL-ROADMAP.md`

| Tier | Engines | Status | Commit(s) |
|------|---------|--------|-----------|
| T1 | 5 | DONE on peer branch (`work/cad-fidx-solidworks`) — out of reach from this branch |
| **T2** Memory & Replay | 4 | ⏳ TODO — built without T1-02 dep using injection pattern |
| **T3** Online Learning & Drift | 4 | ⏳ TODO — same injection approach |
| **T4** RL | 4 | ⏳ TODO |
| **T5** Bayesian / UQ | 4 | ⏳ NEXT BATCH (best starting point — feeds T12-02 trust headlines) |
| **T6** Federated Learning | 4 | ⏳ TODO |
| **T7** Meta-Learning | 4 | ⏳ TODO |
| T8 | 4 | ✅ DONE (T8-01 8c3066612, T8-03 8c3066612, T8-02 + T8-04 ae5b81897) |
| T9 | 4 | ✅ DONE (commits d6b0f07d6 + 23a03a6ee) |
| **T10** Multi-Modal Fusion | 4 | ⏳ TODO |
| T11 | 4 | ✅ DONE (commit 3ad44a06d) |
| T12 | 2 | ✅ DONE (commit 9c285474b) |

**Built so far this session:** 14 engines / 232 tests / 7 commits.
**Remaining:** 24 engines (T2, T3, T4, T5, T6, T7, T10).

---

## Build pattern that works (apply to T2-T10)

### Engine file template (`mcp-server/src/engines/CrossProcess<Name>Engine.ts`)
- JSDoc header: motivation, algorithm reference (paper citation), per-CLAUDE.md note
- Zod input schema with `.describe()` on every field
- `static methods` on a class with `engineId/version/tier` constants
- Default-export wrapper `crossProcess<name>(action, params)` matching dispatcher pattern
- For tiers needing T1-02: accept network outputs as **scalar/sample inputs**, NOT model objects (decoupling)

### Test file template (`mcp-server/src/__tests__/CrossProcess<Name>Engine.test.ts`)
- ≥10 tests with **real assertions** (test legitimacy gate is strict — `expect(...).toBeTruthy()` and `toBeDefined()` are BLOCKED)
- Use `expect(x).toBeCloseTo(value, n)` for floats, `expect(x).toEqual(...)` for structures, `expect(x).toMatch(/regex/)` for strings
- Coverage: happy path + 3 failure modes (empty, oversize, NaN/Infinity) + Zod boundary checks
- Wrap each describe block by method
- Final 3 tests: dispatcher round-trip (`crossProcessXxx("xproc_action", params)`)

### Dispatcher wiring (`mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts`)
1. Add `_xprocXxx: any` to engine cache `let` declaration block (~line 33)
2. Add `case "xprocXxx": return _xprocXxx ??= (await import(...)).crossProcessXxx;` to `getEngine()` (~line 60)
3. Add 2 actions to `ACTIONS` enum
4. Add 2 entries to `CORE_ROUTING` map (action → engineName)

### Schemas (`mcp-server/src/schemas/intelligenceActionSchemas.ts`)
1. Add Zod schemas at end of schema declarations (~line 660)
2. Add to `ACTION_INTELLIGENCE_SCHEMAS` map (~line 720)

### Commit
```
[MAIN] [INFRA-NEURAL-LEDGER-MS1]/U-XPROC-T<N>: ship Tier <N> <name> (<count> engines)
```

---

## T5 Bayesian — concrete starting plan (do this first tomorrow)

**Engines:**
- T5-01 `CrossProcessBayesianMLPEngine` — Monte Carlo Dropout (Gal & Ghahramani 2016). Input: K forward-pass outputs from a network. Output: mean + variance. Decoupled from T1-02 by accepting `Array<{ prediction: number }>`.
- T5-02 `CrossProcessConformalPredictionEngine` — Inductive conformal (Vovk). Input: holdout calibration set + new query. Output: prediction set [lo, hi] at confidence 1-α.
- T5-03 `CrossProcessDeepEnsembleEngine` — Average M independent predictions; epistemic uncertainty = stddev across ensemble.
- T5-04 `CrossProcessCalibrationAuditorEngine` — ECE / MCE / Brier over rolling window; auto-recommends temperature scaling when ECE > threshold.

**Acceptance:** T5-01 prediction interval covers true value at nominal rate ±2%; T5-02 marginal coverage ≥1-α on holdout; T5-03 ensemble Brier < single Brier; T5-04 ECE ≤0.05.

**Estimated cycle time:** ~15 minutes per engine (engine + tests + wiring + commit).

---

## Important gotchas the gates blocked on already

1. **Test legitimacy gate** blocks `toBeDefined()` and `toBeTruthy()` — replace with concrete value assertions like `expect(x.length).toBeGreaterThan(2)` or `expect(x.tier_id).toBe("T5-01")`.
2. **stop_on_unwired_assets** requires `<EngineName>.test.ts` exact match — never bundle multiple engines into one test file.
3. **Test heap** needs `NODE_OPTIONS="--max-old-space-size=16384"` for vitest. Always set this.
4. **`npx` is not on PATH** — use `node node_modules/vitest/vitest.mjs run <files>` and `node node_modules/typescript/bin/tsc`.
5. **Pre-existing TS errors** (CausalDAG casts, shopPracticeDispatcher, telemetryDispatcher) are NOT yours — pre-commit hook will list them but commit still succeeds. Filter your scope with `grep -E "intelligenceDispatcher|intelligenceActionSchemas|<your engine>"`.
6. **Magic-number warnings** — informational only, do not block. Magic numbers in tests are fine.

---

## Multi-chat coordination

This branch (`work/cam-exhaust-ms0`) is your lane. Other chats are working on:
- `claude-0354e2ef` — cam-ai integration tests in `H:/prism/mcp-server/src/__tests__/cam-ai/`
- `claude-32612444` — Mastercam/Okuma posts in `H:/prism-ppgh05/`
- `claude-aa6c77be` — Fusion 360 stuff (`H:/prism/mcp-server/scripts/run-fusion-test-rotor-live.ts`)
- `claude-ab827a19` — turning dispatcher in `H:/prism-lathe-pro-v3/`

**Avoid editing files in those paths.** All XPROC-NEURAL work is yours.

---

## Sync state

- C-to-H mirror: settings.json + helpers auto-mirrored from `C:\Users\wompu\.claude` → `H:\.claude` on save
- C drive sync triggered before this handoff was written (see follow-up sync log if present)
- All commits pushed to `origin/work/cam-exhaust-ms0` — verify with `git status` (should say "up to date")

---

## Resume directive (one-line)

**Build T5 Bayesian (4 engines) following the pattern in `mcp-server/src/engines/CrossProcess{RuleExtracted,FormulaNeuralEnsemble}*Engine.ts`. Wire each to `intelligenceDispatcher.ts` + schemas. Commit with `[MAIN] [INFRA-NEURAL-LEDGER-MS1]/U-XPROC-T5: ship Tier 5 Bayesian/UQ (4 engines)`.**

After T5 lands, continue T2 → T3 → T7 → T4 → T6 → T10 in that priority order.
