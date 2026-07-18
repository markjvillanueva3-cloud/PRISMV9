# ECHO LAUNCH GOAL — BOUNDED (loss-function layer over the existing roadmap)

> **Why this file exists:** the standing operator /goal ("finalize EVERY post processor for ALL machine /
> controller / spindle / optional-feature / brand combinations → launch on web + electron + iOS/Android")
> is **unbounded prose** — it has no deterministic stop test, so a /loop on it re-judges prose forever
> (the `/goal` pre-flight flagged exactly this; the prior loop ran `iter 7/20 → ended` with no terminal gate).
> This file is the **bounding layer**: the measurable loss function + the enumerated population (ALL-MEANS-ALL)
> + the launch done-gate. It does NOT re-derive the execution plan — that lives in
> `ECHO-FORGE-ROADMAP-2026-06-09.md` (dependency-ordered units) + `ECHO-OPEN-TASKS-LEDGER.md` (live status).
> Created 2026-06-24 (slot:echo, session 49ed5a8b) as the first step of the /goal per `feedback_goal_needs_loss_function`.

## 1. The combinatorial trap (why "all combinations" must be tiered, not enumerated)
Taken literally, "all machine × all controller × all spindle × all optional feature × all brand × all combinations"
is an **unbounded cross-product** (every vendor's every controller's every option) — uncomputable, untestable,
never "done". That is the slop generator. The fix: **bound by the LAUNCH population (JM fleet), gate global-brand
expansion as an explicit Phase-2 AFTER launch.** This matches the operator's own ledger wording: *"Complete
closed-loop testing for ALL JM machines… IF finished overnight, START building posts for the highest-selling
machines globally"* — JM-fleet is the launch gate; global brands are post-launch expansion.

## 2. Enumerated launch population (ALL-MEANS-ALL — real counts, from canonical sources)
| Axis | Count | Source |
|---|---|---|
| JM machines to post-prove closed-loop | **15** (12 sim-able + 3 EDM-routed) | `state/shared/cimco/jm-fleet-sim-map.json` |
| Distinct controllers in the `prism_pp` enum | **13** (transpiler currently real for **6**) | ppDispatcher enum + `GCodeTranspilerEngine` |
| JM `.cps` posts on hand | **12** (Haas/Hurco/Okuma/Fanuc; **wire-EDM post absent** → gen via `WEDMPostMitsubishiEngine`) | galaxy domain inject |
| Post-domain engines lacking a companion test | **~38** (several already done this session — see ledger §C) | live Glob `*Post*`/`GCode*`/`MasterPost*` 2026-06-23 |
| Dark/masked engines to make real | **~21** (~14 AGI + 4 WEDM + 3 lathe-learner) | ledger §B |
| `prism_pp` dispatcher actions (LIVE) | **654** | ppDispatcher (registered 2026-06-10) |

## 3. LOSS FUNCTION — the launch done-gate (deterministic; goal terminates when ALL hold)
`launch_ready == true` ⟺ every gate below is GREEN. Each is a command/metric, not an LLM re-judgement:
1. **G1 JM fleet post-proof 15/15** — `node scripts/cimco-post-proof.mjs` → 15/15 PASS *and* CIMCO live-sim verdict per sim-able machine is non-header-only (requires the `.mcfg` load-machine wire). Metric: `passed == 15`.
2. **G2 Dialect coverage 13/13 real** — every controller has a non-stub dialect path; `node scripts/post-nc-dialect-lint.mjs` clean on a reference NC per controller. Metric: dark `engine.method?.()` cases for echo-owned = 0.
3. **G3 Golden byte-equivalence CI** — `U-ECHO-GOLDEN-NC-CI` green for ≥6 controllers (Fanuc/Siemens/Heidenhain/Haas/Okuma/Hurco). Metric: CI job exit 0.
4. **G4 Test coverage 38/38** — every post-domain engine has a real reference-value companion test (`U-PP-MISSING-ENGINE-TESTS`). Metric: `vitest run` green + 0 untested post engines via the audit.
5. **G5 Dark-engine unmask** — the ~21 dark engines each have ≥1 real dispatcher-invoked case with a round-trip test. Metric: count == 0 remaining.
6. **G6 Launch surface reachable** — `prism_pp` generate/validate/translate actions round-trip through the HTTP bridge consumed by web + electron + mobile (quebec's `lib/api.ts`). Metric: an E2E asserts a real post comes back over the bridge.
7. **G7 (OPERATOR-GATED) U-LEGAL-13** — public-manuals-only provenance sign-off before any post reaches a live machine. Metric: operator sign-off recorded. **Cannot be auto-closed.**

**STOP condition:** all of G1–G7 green ⇒ launch-ready, goal COMPLETE. Phase-2 global-brand expansion is a SEPARATE goal (opened only after G1–G7).
**Iteration cap (if a gate stalls):** bound each /loop to its iter cap; if a gate cannot close autonomously (G7, live-CIMCO E2E), mark `[OPERATOR-GATED]`, queue it, and DO NOT spin — R12.

## 4. Dependency order (execution detail lives in the roadmap; this is the gate sequence)
`Phase 0 hygiene (ledger §C)` → `Phase 1 dark-engine unmask → G5` → `CIMCO closed-loop: .mcfg load-machine wire → G1` → `dialect/golden CI → G2,G3` → `test sweep → G4` → `bridge E2E → G6` → `G7 operator sign-off`.
The single highest-leverage **NOW** unit on the critical path: **U-CIMCO-COMBO-WRITE + LOAD-MACHINE** (ledger §D) — it converts every header-only sim into a real per-machine verdict, unblocking G1. Blast-radius for the queued `U-PP-GCODEVERIFY-CONTINUITY-FIX` is already cleared (separate; see `reference_echo_gcode_verification_continuity_quirk_2026_06_24`).

## 5. This session's status against the gate
Shipped 2026-06-24 toward G4: `U-PP-GCODEVERIFY-TEST` (19 tests) + `U-PP-GCODEVERIFY-CONTINUITY-WIKI` (bug lesson) + continuity-fix fully pre-staged. **Blocked from execution by the 5h session wall** (critical, ~minutes to fleet-block; account-switch RED/unsafe — cannot arm, prohibited credential op). This bounded-goal spec is the completable planning deliverable for the window; G1-driving execution (the `.mcfg` wire) resumes on fresh budget per the handoff.
