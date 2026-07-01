# Post-Processor Closed-Loop Confidence Report (slot:echo, 2026-06-28, session 50dfde83)

> **Operator goal (this /loop):** "100% confidence in the post processors we generate ... fully tested
> in cimco with machine simulations." This report states, honestly (R12), exactly where confidence
> stands, what reached the AUTONOMOUS CEILING, and the precise OPERATOR ACTIONS needed to reach true 100%.

## TL;DR
Autonomous post-processor confidence is **HIGH and rising**, but **true 100% is hard-gated on CIMCO
machine-simulation + a legal sign-off — neither is reachable without the operator.** Everything a chat
can verify without the CIMCO GUI is now verified + drift-locked. What remains is (a) operator-gated CIMCO
sim, (b) a designed sub-spindle feature, and (c) the tribal-maxing program (partly lima/hermes-gated).

## WHAT IS VERIFIED AUTONOMOUSLY (no CIMCO, no operator)

| Layer | State | Evidence |
|---|---|---|
| **Machine coverage** | **15/15** JM NC-programmable machines have a correct PRISM-routed master post | `verify-jm-fleet-coverage.ts` 20/20; ECHO-OPEN-TASKS-LEDGER 2026-06-28 |
| **Engine test coverage** | COMPLETE — 603 reference-value tests across all post engines | Track-A (2026-06-25) |
| **Feature depth (mill)** | canned cycles (5/5 mills), rigid-tap G84, high-speed smoothing, **5-axis TCP (VMC-02)** | this session + 2026-06-28 prior |
| **Feature depth (lathe)** | turning, C-axis live-tool (3 machines), G83 peck, machine-aware headers (7 Okuma) | verifier live-tool leg |
| **Drift protection** | **byte-lock goldens for all 5 mills + OkumaB250 lathe** + nightly drift cron (planted-drift fails) | `post-golden-drift-cron.mjs`; `PRISM Post Golden Drift` task active |
| **Physics/dialect correctness** | codes sourced from `ControllerDialectEngine`/cited `.cps`, never inlined; canonical Kienzle/Taylor | echo soul; physics-reviewer PASS |

**What "verified autonomously" means + its honest ceiling:** the closed loop proves each post emits
**dialect-correct, structurally-valid, non-finite-safe, machine-accurate-headered NC** and that the emit
logic is **drift-locked** against regression. It does NOT prove the toolpath geometry is collision-free on
the real machine kinematics+stock — that is exactly what CIMCO machine-sim adds (below).

## THE AUTONOMOUS CEILING — why 100% needs the operator

**A. CIMCO machine simulation (the operator's #1 north-star).** Code-correctness ≠ machine-correctness.
A post can emit perfect dialect and still drive a collision (the kinematics + stock + fixture only realize
in CIMCO's machine-sim, which is a PAID add-on that must be activated + needs the GUI open interactively).
Required operator action:
  1. Open `CIMCOEdit - H` (`H:/CIMCO 2026/CIMCOEdit/CIMCOEdit.exe`) FOREGROUND on the 3 baselines
     (Hurco VM30i, Okuma LB3000, Multus B250II) + load each `.mcfg` machine (per `jm-fleet-sim-map.json`).
  2. For each: run the sim against a KNOWN-GOOD production NC **and a KNOWN-BAD over-travel NC** — the
     bad NC MUST make the sim FAIL (that proves the loop catches problems, not just rubber-stamps).
  3. Report the CIMCO verdict + byte-equiv ratio back; echo wires the per-machine fidelity gate from there.

**B. U-LEGAL-13 provenance sign-off.** Public-manuals-only provenance must be operator-signed before ANY
post ships to a PHYSICAL machine and before MS-MASTERPOST (the saleable product) un-darks the ~14 AGI-tier
engines.

## REMAINING AUTONOMOUS FEATURE GAPS (echo can build, but each needs care)
- **Sub-spindle part-transfer (Multus/OkumaB250)** — `sub_spindle_enabled` config + M38/M39-sync tribal
  tip exist, but NO actual emit path. A real **safety-critical (phase-sync)** feature: a mis-emitted
  sub-spindle handoff crashes the machine. Needs design + handoff sync (cross-lane). NOT a quick exercise.
- **HurcoWinMaxLathe C-axis/live-tool parity** — OkumaB250 has it, the Hurco lathe doesn't. LOW priority;
  verify the real Hurco TM/TMX even has C-axis hardware FIRST.
- **5-axis TCP corpus depth** — the engine now emits TCP + A/C; richer 5-axis jobs (real CAM-driven A/C
  toolpaths, not the representative fixture) come from foxtrot/kilo (CAM owns the angles). Cross-lane.

## TRIBAL / WIKI MAXING (operator's "max tribal knowledge for ALL ...")
- **Done this session (in-lane):** advanced post-processor features (5-axis TCP dialect + drift-cron
  pattern) captured at `knowledge/wiki/code-tribal/okuma-5axis-tcp-and-golden-drift-cron-2026-06-28.md`.
- **Existing coverage:** `post-processor-knowledge-base.md` + `post-processor-controller-dialect-matrix.md`
  + `post-processor-cross-controller-corpus.md` + per-machine runbooks + 800+ domain tribal tips.
- **Gated:** the **hermes `/learn`** path the operator named is currently DOWN (proxy :8645, 100% fail —
  self-heal: `node scripts/hermes-proxy-ensure.mjs`). The per-machine academy runbook generator
  (`generate-jm-fleet-wiki-tribal.mjs`) is LIMA's (hardcoded `H:/prism-slot-lima`). Full
  all-machines×all-controllers×all-features maxing = a lima-collab + hermes-restore program, not a single
  echo unit.

## NEXT-ACTION (next echo session)
1. **If operator present + CIMCO open:** U-CIMCO-BASELINE-SIM (section A) — the single highest-value step
   toward true 100% confidence.
2. **Autonomous:** design + build sub-spindle part-transfer (with physics/safety review) OR Hurco-C-axis
   verification.
3. **If hermes restored:** run the `/learn` tribal-maxing across the remaining machines/controllers.

_Companion: ECHO-OPEN-TASKS-LEDGER.md (live thread state) · ECHO-ULTIMATE-ROADMAP-v3 (shipped-state) ·
POST-FEATURE-COVERAGE-MATRIX-2026-06-28 (ROI feature backlog) · the wiki entry above._
